"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sendJson } from "@/lib/api/client";
import type { ConversationSummaryDTO } from "@/models/chat";
import { ChatInput } from "./chat-input";
import { pendingQuestionKey } from "./chat-window";
import { MobileConversations } from "./mobile-conversations";

type NewChatProps = {
  /** Documents that are ready to be searched. */
  documents: { id: string; title: string }[];
};

/** Start screen: choose what to chat with, then ask the first question. */
export function NewChat({ documents }: NewChatProps) {
  const router = useRouter();
  const [allDocuments, setAllDocuments] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsSelection = !allDocuments && selected.length === 0;

  async function start(question: string) {
    setBusy(true);
    setError(null);
    const result = await sendJson<{ conversation: ConversationSummaryDTO }>(
      "/api/conversations",
      "POST",
      { documentIds: allDocuments ? [] : selected },
    );
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    const { id } = result.data.conversation;
    try {
      sessionStorage.setItem(pendingQuestionKey(id), question);
    } catch {
      // Without storage the chat simply opens empty.
    }
    router.push(`/chat/${id}`);
    router.refresh();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5 sm:px-6 lg:hidden">
        <h1 className="text-sm font-medium">New chat</h1>
        <MobileConversations />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center gap-6 px-4 py-8 sm:px-6">
          <div className="text-center">
            <p className="text-2xl font-semibold tracking-tight">Ask your documents</p>
            <p className="mt-1 text-muted-foreground">
              Answers are written by your local model, using only what your documents say.
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Search in</legend>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border bg-card px-3.5 py-2.5 text-sm has-checked:border-primary">
              <input
                type="radio"
                name="scope"
                checked={allDocuments}
                onChange={() => setAllDocuments(true)}
                className="accent-primary"
              />
              All documents ({documents.length})
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border bg-card px-3.5 py-2.5 text-sm has-checked:border-primary">
              <input
                type="radio"
                name="scope"
                checked={!allDocuments}
                onChange={() => setAllDocuments(false)}
                className="accent-primary"
              />
              Only the documents I choose
            </label>

            {!allDocuments && (
              <ul className="max-h-56 space-y-1 overflow-y-auto rounded-xl border p-2">
                {documents.map((document) => (
                  <li key={document.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                      <input
                        type="checkbox"
                        checked={selected.includes(document.id)}
                        onChange={(event) =>
                          setSelected((current) =>
                            event.target.checked
                              ? [...current, document.id]
                              : current.filter((id) => id !== document.id),
                          )
                        }
                        className="accent-primary"
                      />
                      <span className="truncate">{document.title}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>

          <div className="space-y-2">
            <ChatInput
              onSend={(text) => void start(text)}
              busy={busy}
              disabled={needsSelection}
              placeholder={needsSelection ? "Choose at least one document first" : undefined}
              autoFocus
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
