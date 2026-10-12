"use client";

import { FileText, RotateCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { formatBytes, formatRelativeTime } from "@/lib/format";
import { getTypeLabel, type DocumentDTO } from "@/models/document";
import { StatusBadge } from "./status-badge";

type DocumentListProps = {
  documents: DocumentDTO[];
  onDelete: (id: string) => Promise<void>;
  onRetry: (id: string) => Promise<void>;
};

function describe(document: DocumentDTO): string {
  const parts = [getTypeLabel(document.mimeType), formatBytes(document.sizeBytes)];
  if (document.pageCount) parts.push(`${document.pageCount} ${document.pageCount === 1 ? "page" : "pages"}`);
  if (document.chunkCount) parts.push(`${document.chunkCount} chunks`);
  return parts.join(" · ");
}

function DocumentRow({ document, onDelete, onRetry }: { document: DocumentDTO } & Omit<DocumentListProps, "documents">) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(action: (id: string) => Promise<void>) {
    setBusy(true);
    await action(document.id);
    setBusy(false);
    setConfirming(false);
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <FileText className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 basis-48">
        <Link
          href={`/documents/${document.id}`}
          className="block truncate text-sm font-medium hover:underline"
        >
          {document.title}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {describe(document)}
          {" · "}
          <span suppressHydrationWarning>{formatRelativeTime(new Date(document.createdAt))}</span>
        </p>
        {document.status === "FAILED" && document.error && (
          <p className="mt-1 text-xs text-destructive">{document.error}</p>
        )}
      </div>

      <StatusBadge status={document.status} />

      <div className="flex shrink-0 items-center gap-1">
        {confirming ? (
          <>
            <Button variant="destructive" size="sm" disabled={busy} onClick={() => run(onDelete)}>
              {busy ? "Deleting…" : "Delete"}
            </Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            {document.status === "FAILED" && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Retry processing ${document.title}`}
                disabled={busy}
                onClick={() => run(onRetry)}
              >
                <RotateCw />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${document.title}`}
              onClick={() => setConfirming(true)}
            >
              <Trash2 />
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

export function DocumentList({ documents, onDelete, onRetry }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents yet"
        description="Files you upload appear here with their processing status."
        className="rounded-xl border"
      />
    );
  }

  return (
    <ul className="divide-y rounded-xl border bg-card">
      {documents.map((document) => (
        <DocumentRow key={document.id} document={document} onDelete={onDelete} onRetry={onRetry} />
      ))}
    </ul>
  );
}
