import { jsonError } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { getDocument } from "@/lib/documents/service";
import { readUpload } from "@/lib/documents/storage";
import { getKindFromMime } from "@/models/document";

/** Serve the original uploaded file to its owner. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);

  const document = await getDocument(user.id, (await params).id);
  if (!document) return jsonError("Document not found", 404);

  let data: Buffer;
  try {
    data = await readUpload(document.storagePath);
  } catch {
    return jsonError("The original file is missing from storage", 404);
  }

  const isPdf = getKindFromMime(document.mimeType) === "pdf";
  return new Response(new Uint8Array(data), {
    headers: {
      // Text and Markdown are always sent as plain text so the browser never
      // interprets uploaded content as HTML.
      "Content-Type": isPdf ? "application/pdf" : "text/plain; charset=utf-8",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
