"use client";

import { useCallback, useEffect, useState } from "react";
import { sendJson } from "@/lib/api/client";
import { formatBytes } from "@/lib/format";
import {
  isProcessing,
  type DocumentDTO,
  type DocumentListResponse,
  type StorageUsage,
  type UploadLimits,
} from "@/models/document";
import { DocumentList } from "./document-list";
import { DocumentUploader } from "./document-uploader";

const POLL_INTERVAL_MS = 1500;

type DocumentsManagerProps = {
  initialDocuments: DocumentDTO[];
  initialStorage: StorageUsage;
  limits: UploadLimits;
};

/** Owns the document list state: uploads, polling while processing, deletes. */
export function DocumentsManager({ initialDocuments, initialStorage, limits }: DocumentsManagerProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [storage, setStorage] = useState(initialStorage);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/documents", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as DocumentListResponse;
      setDocuments(data.documents);
      setStorage(data.storage);
    } catch {
      // Transient network error: the next poll will try again.
    }
  }, []);

  // Poll only while something is still moving through the pipeline.
  const anyProcessing = documents.some((document) => isProcessing(document.status));
  useEffect(() => {
    if (!anyProcessing) return;
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [anyProcessing, refresh]);

  function handleUploaded(document: DocumentDTO) {
    setError(null);
    setDocuments((current) => [document, ...current.filter((d) => d.id !== document.id)]);
    setStorage((current) => ({ ...current, usedBytes: current.usedBytes + document.sizeBytes }));
  }

  async function handleDelete(id: string) {
    const result = await sendJson(`/api/documents/${id}`, "DELETE");
    setError(result.ok ? null : result.error);
    await refresh();
  }

  async function handleRetry(id: string) {
    const result = await sendJson(`/api/documents/${id}/reprocess`, "POST");
    setError(result.ok ? null : result.error);
    await refresh();
  }

  const usedPercent = Math.min(100, (storage.usedBytes / storage.quotaBytes) * 100);

  return (
    <div className="space-y-6">
      <DocumentUploader
        maxFileBytes={limits.maxFileBytes}
        storage={storage}
        onUploaded={handleUploaded}
      />

      <div>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {documents.length === 1 ? "1 document" : `${documents.length} documents`}
          </h2>
          <div className="w-48 max-w-full">
            <p className="text-right text-xs text-muted-foreground">
              {formatBytes(storage.usedBytes)} of {formatBytes(storage.quotaBytes)} used
            </p>
            <div
              role="progressbar"
              aria-label="Storage used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(usedPercent)}
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div className="h-full rounded-full bg-primary" style={{ width: `${usedPercent}%` }} />
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <DocumentList documents={documents} onDelete={handleDelete} onRetry={handleRetry} />
      </div>
    </div>
  );
}
