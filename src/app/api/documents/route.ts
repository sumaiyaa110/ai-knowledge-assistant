import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { config } from "@/lib/config";
import {
  UploadError,
  createDocumentFromUpload,
  getStorageUsage,
  listDocuments,
} from "@/lib/documents/service";
import { formatBytes } from "@/lib/format";
import type { DocumentListResponse } from "@/models/document";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);

  const [documents, storage] = await Promise.all([
    listDocuments(user.id),
    getStorageUsage(user.id),
  ]);
  return NextResponse.json<DocumentListResponse>({ documents, storage });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);

  const tooLarge = () =>
    jsonError(`The file is too large. The limit is ${formatBytes(config.uploads.maxBytes)}.`, 413);

  // Reject obviously oversized requests before reading the body. The multipart
  // envelope adds a little on top of the file itself, hence the allowance.
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > config.uploads.maxBytes + 1024 * 1024) return tooLarge();

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    // Also reached when the body was cut off by the server's size limit.
    return declaredLength > config.uploads.maxBytes
      ? tooLarge()
      : jsonError("The upload could not be read. Please try again.", 400);
  }
  if (!(file instanceof File)) return jsonError("No file was provided.", 400);

  try {
    const document = await createDocumentFromUpload(user.id, file);
    // 202: the file is stored, processing continues in the background.
    return NextResponse.json({ document }, { status: 202 });
  } catch (error) {
    if (error instanceof UploadError) return jsonError(error.message, error.status);
    console.error("Upload failed", error);
    return jsonError("The upload failed. Please try again.", 500);
  }
}
