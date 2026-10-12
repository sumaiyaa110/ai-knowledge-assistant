import type { Document } from "@prisma/client";
import { config } from "@/lib/config";
import { prisma } from "@/lib/database/prisma";
import { formatBytes } from "@/lib/format";
import { looksLikePdf, looksLikeText } from "@/lib/rag/extract";
import { enqueueDocument } from "@/lib/rag/queue";
import {
  getExtension,
  getFileType,
  type DocumentDTO,
  type StorageUsage,
} from "@/models/document";
import { buildStoragePath, deleteUpload, saveUpload } from "./storage";

/** A rejected upload, with the HTTP status the API should answer with. */
export class UploadError extends Error {
  constructor(
    message: string,
    public status: 400 | 413 | 415,
  ) {
    super(message);
  }
}

const MAX_FILE_NAME_LENGTH = 200;

/** Keep only the base name and strip characters that are unsafe to display or store. */
function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  return cleaned.slice(-MAX_FILE_NAME_LENGTH) || "document";
}

export function toDocumentDTO(document: Document): DocumentDTO {
  return {
    id: document.id,
    title: document.title,
    fileName: document.fileName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    status: document.status,
    error: document.error,
    pageCount: document.pageCount,
    chunkCount: document.chunkCount,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export async function getStorageUsage(userId: string): Promise<StorageUsage> {
  const { _sum } = await prisma.document.aggregate({
    where: { userId },
    _sum: { sizeBytes: true },
  });
  return { usedBytes: _sum.sizeBytes ?? 0, quotaBytes: config.uploads.quotaBytes };
}

export async function listDocuments(userId: string): Promise<DocumentDTO[]> {
  const documents = await prisma.document.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return documents.map(toDocumentDTO);
}

/** Null when the document does not exist or belongs to someone else. */
export function getDocument(userId: string, documentId: string): Promise<Document | null> {
  return prisma.document.findFirst({ where: { id: documentId, userId } });
}

/**
 * Validate an uploaded file, store it under uploads/<userId>/ and queue it
 * for processing. Throws UploadError for anything the user did wrong.
 */
export async function createDocumentFromUpload(userId: string, file: File): Promise<DocumentDTO> {
  const fileName = sanitizeFileName(file.name);
  const fileType = getFileType(fileName);
  if (!fileType) {
    throw new UploadError("Unsupported file type. Upload a PDF, TXT or Markdown file.", 415);
  }
  if (file.size === 0) throw new UploadError("The file is empty.", 400);
  if (file.size > config.uploads.maxBytes) {
    throw new UploadError(
      `The file is ${formatBytes(file.size)}. The limit is ${formatBytes(config.uploads.maxBytes)}.`,
      413,
    );
  }

  const { usedBytes, quotaBytes } = await getStorageUsage(userId);
  if (usedBytes + file.size > quotaBytes) {
    throw new UploadError(
      `Not enough storage: ${formatBytes(Math.max(0, quotaBytes - usedBytes))} of ${formatBytes(quotaBytes)} left. Delete a document to free up space.`,
      413,
    );
  }

  // The extension is only a claim; check the bytes match it.
  const data = new Uint8Array(await file.arrayBuffer());
  const contentMatches = fileType.kind === "pdf" ? looksLikePdf(data) : looksLikeText(data);
  if (!contentMatches) {
    throw new UploadError(`This does not look like a valid ${fileType.label} file.`, 415);
  }

  const document = await prisma.document.create({
    data: {
      userId,
      title: fileName.replace(/\.[^.]+$/, "") || fileName,
      fileName,
      mimeType: fileType.mimeType,
      sizeBytes: file.size,
      storagePath: "", // set below, once the generated id is known
    },
  });

  try {
    const storagePath = buildStoragePath(userId, document.id, getExtension(fileName));
    await saveUpload(storagePath, data);
    const saved = await prisma.document.update({
      where: { id: document.id },
      data: { storagePath },
    });
    enqueueDocument(saved.id);
    return toDocumentDTO(saved);
  } catch (error) {
    // Don't leave a record without a file behind.
    await prisma.document.delete({ where: { id: document.id } }).catch(() => {});
    throw error;
  }
}

/** Delete a document, its chunks (by cascade) and its file. False if not found. */
export async function deleteDocument(userId: string, documentId: string): Promise<boolean> {
  const document = await getDocument(userId, documentId);
  if (!document) return false;

  await prisma.document.delete({ where: { id: document.id } });
  await deleteUpload(document.storagePath).catch((error) =>
    console.error(`Could not remove file for document ${document.id}`, error),
  );
  return true;
}

/** Run the pipeline again, e.g. after a failure. False if not found. */
export async function reprocessDocument(userId: string, documentId: string): Promise<boolean> {
  const { count } = await prisma.document.updateMany({
    where: { id: documentId, userId },
    data: { status: "UPLOADED", error: null },
  });
  if (count === 0) return false;
  enqueueDocument(documentId);
  return true;
}
