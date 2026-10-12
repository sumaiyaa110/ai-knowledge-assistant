"use client";

import { ExternalLink, RotateCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { sendJson } from "@/lib/api/client";
import { isProcessing, type DocumentStatus } from "@/models/document";

const POLL_INTERVAL_MS = 1500;

type DocumentActionsProps = { documentId: string; status: DocumentStatus };

/** Detail-page actions. Also refreshes the page while the document is processing. */
export function DocumentActions({ documentId, status }: DocumentActionsProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processing = isProcessing(status);
  useEffect(() => {
    if (!processing) return;
    // Re-render the server component so status, metadata and chunks stay current.
    const timer = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [processing, router]);

  async function retry() {
    setBusy(true);
    const result = await sendJson(`/api/documents/${documentId}/reprocess`, "POST");
    setError(result.ok ? null : result.error);
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    const result = await sendJson(`/api/documents/${documentId}`, "DELETE");
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push("/documents");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <a
          href={`/api/documents/${documentId}/file`}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "outline" })}
        >
          <ExternalLink />
          Open original
        </a>
        {status === "FAILED" && (
          <Button variant="outline" disabled={busy} onClick={retry}>
            <RotateCw />
            Retry
          </Button>
        )}
        {confirming ? (
          <>
            <Button variant="destructive" disabled={busy} onClick={remove}>
              {busy ? "Deleting…" : "Confirm delete"}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => setConfirming(true)}>
            <Trash2 />
            Delete
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
