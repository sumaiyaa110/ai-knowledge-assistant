import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "@/lib/config";

const uploadRoot = () => path.resolve(config.uploads.dir);

/** Path stored in the database: "<userId>/<documentId>.<extension>". */
export function buildStoragePath(userId: string, documentId: string, extension: string): string {
  return `${userId}/${documentId}.${extension}`;
}

/** Absolute path for a stored file, refusing anything outside the upload folder. */
function resolveStoragePath(storagePath: string): string {
  const root = uploadRoot();
  const absolute = path.resolve(root, storagePath);
  if (!absolute.startsWith(root + path.sep)) {
    throw new Error("Storage path escapes the upload directory");
  }
  return absolute;
}

export async function saveUpload(storagePath: string, data: Uint8Array): Promise<void> {
  const absolute = resolveStoragePath(storagePath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, data);
}

export function readUpload(storagePath: string): Promise<Buffer> {
  return readFile(resolveStoragePath(storagePath));
}

export async function deleteUpload(storagePath: string): Promise<void> {
  if (!storagePath) return;
  await rm(resolveStoragePath(storagePath), { force: true });
}
