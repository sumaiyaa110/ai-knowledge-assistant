import type { DocumentStatus } from "@prisma/client";

export type { DocumentStatus };

export type DocumentKind = "pdf" | "text" | "markdown";

type FileTypeInfo = { kind: DocumentKind; mimeType: string; label: string };

/** Accepted uploads, keyed by lowercase extension. Safe to import in the browser. */
export const FILE_TYPES: Record<string, FileTypeInfo> = {
  pdf: { kind: "pdf", mimeType: "application/pdf", label: "PDF" },
  txt: { kind: "text", mimeType: "text/plain", label: "Text" },
  md: { kind: "markdown", mimeType: "text/markdown", label: "Markdown" },
  markdown: { kind: "markdown", mimeType: "text/markdown", label: "Markdown" },
};

export const ACCEPT_ATTRIBUTE = Object.keys(FILE_TYPES)
  .map((extension) => `.${extension}`)
  .join(",");

export function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

export function getFileType(fileName: string): FileTypeInfo | null {
  return FILE_TYPES[getExtension(fileName)] ?? null;
}

export function getKindFromMime(mimeType: string): DocumentKind {
  const match = Object.values(FILE_TYPES).find((type) => type.mimeType === mimeType);
  return match?.kind ?? "text";
}

export function getTypeLabel(mimeType: string): string {
  return Object.values(FILE_TYPES).find((type) => type.mimeType === mimeType)?.label ?? "File";
}

/** Statuses where the pipeline is still working and the UI should keep polling. */
export const PROCESSING_STATUSES: DocumentStatus[] = [
  "UPLOADED",
  "EXTRACTING",
  "CHUNKING",
  "EMBEDDING",
];

export function isProcessing(status: DocumentStatus): boolean {
  return PROCESSING_STATUSES.includes(status);
}

/** A document as sent to the browser: dates are ISO strings. */
export type DocumentDTO = {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  error: string | null;
  pageCount: number | null;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
};

export type StorageUsage = { usedBytes: number; quotaBytes: number };

export type DocumentListResponse = { documents: DocumentDTO[]; storage: StorageUsage };

export type UploadLimits = { maxFileBytes: number };
