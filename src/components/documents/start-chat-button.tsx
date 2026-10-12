"use client";

import { MessageSquarePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { sendJson } from "@/lib/api/client";
import type { ConversationSummaryDTO } from "@/models/chat";

/** Opens a new chat limited to one document. */
export function StartChatButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    const result = await sendJson<{ conversation: ConversationSummaryDTO }>(
      "/api/conversations",
      "POST",
      { documentIds: [documentId] },
    );
    if (!result.ok) {
      setBusy(false);
      return;
    }
    router.push(`/chat/${result.data.conversation.id}`);
  }

  return (
    <Button disabled={busy} onClick={start}>
      <MessageSquarePlus />
      {busy ? "Opening…" : "Chat with this document"}
    </Button>
  );
}
