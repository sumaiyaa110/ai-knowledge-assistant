"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { sendJson } from "@/lib/api/client";

/** Two-step delete for the study set page; returns to the tools screen afterwards. */
export function DeleteStudySetButton({ studySetId, documentId }: { studySetId: string; documentId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    const result = await sendJson(`/api/study-sets/${studySetId}`, "DELETE");
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push(`/tools?document=${documentId}`);
    router.refresh();
  }

  if (!confirming) {
    return (
      <Button variant="outline" onClick={() => setConfirming(true)}>
        <Trash2 />
        Delete
      </Button>
    );
  }
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <Button variant="destructive" disabled={busy} onClick={remove}>
          {busy ? "Deleting…" : "Confirm delete"}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
