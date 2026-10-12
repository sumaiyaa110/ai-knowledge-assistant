"use client";

import { AlertCircle, FileText, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { streamAnswer } from "@/lib/api/chat-stream";
import type { ChatMessageDTO, ConversationScope, MessageSource } from "@/models/chat";
import { ChatInput } from "./chat-input";
import { AssistantMessage, UserMessage } from "./message-bubble";
import { MobileConversations } from "./mobile-conversations";
import { SuggestedQuestions } from "./suggested-questions";

/** Where a question typed on the "new chat" screen waits until this page loads. */
export const pendingQuestionKey = (conversationId: string) => `aika:pending:${conversationId}`;

type ChatWindowProps = {
  conversationId: string;
  initialTitle: string;
  initialMessages: ChatMessageDTO[];
  scope: ConversationScope;
  existingDocumentIds: string[];
  /** Why the local model cannot be used right now, if it cannot. */
  modelProblem: string | null;
};

/** The answer currently being produced. */
type Pending = {
  question: string;
  questionSaved: boolean;
  stage: "searching" | "generating";
  answer: string;
  sources: MessageSource[];
};

const STAGE_LABELS: Record<Pending["stage"], string> = {
  searching: "Searching your documents…",
  generating: "Reading the sources…",
};

export function ChatWindow({
  conversationId,
  initialTitle,
  initialMessages,
  scope,
  existingDocumentIds,
  modelProblem,
}: ChatWindowProps) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [title, setTitle] = useState(initialTitle);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<{ message: string; question: string } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  // Documents cited by new answers exist by definition, so add them as they come.
  const knownDocuments = useMemo(() => {
    const ids = new Set(existingDocumentIds);
    for (const document of scope.documents) ids.add(document.id);
    return ids;
  }, [existingDocumentIds, scope.documents]);
  const [liveDocuments, setLiveDocuments] = useState<string[]>([]);
  const existing = useMemo(
    () => new Set([...knownDocuments, ...liveDocuments]),
    [knownDocuments, liveDocuments],
  );

  /** Reload the saved conversation, e.g. after stopping an answer midway. */
  const reload = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { conversation: { messages: ChatMessageDTO[]; title: string } };
      setMessages(data.conversation.messages);
      setTitle(data.conversation.title);
    } catch {
      // Keep what is on screen.
    }
  }, [conversationId]);

  const send = useCallback(
    async (question: string) => {
      if (abortRef.current) return; // one answer at a time
      const controller = new AbortController();
      abortRef.current = controller;
      stickToBottom.current = true;
      setError(null);
      setPending({ question, questionSaved: false, stage: "searching", answer: "", sources: [] });

      let finished = false;
      await streamAnswer(
        conversationId,
        question,
        (event) => {
          switch (event.type) {
            case "user_message":
              setMessages((current) => [...current, event.message]);
              setPending((p) => p && { ...p, questionSaved: true });
              break;
            case "status":
              setPending((p) => p && { ...p, stage: event.stage });
              break;
            case "sources":
              setLiveDocuments((ids) => [...ids, ...event.sources.map((s) => s.documentId)]);
              setPending((p) => p && { ...p, sources: event.sources });
              break;
            case "token":
              setPending((p) => p && { ...p, answer: p.answer + event.text });
              break;
            case "done":
              finished = true;
              setMessages((current) => [...current, event.message]);
              setTitle(event.title);
              setPending(null);
              break;
            case "error":
              finished = true;
              // The server discarded the unanswered question; do the same here.
              setMessages((current) =>
                current.at(-1)?.role === "USER" ? current.slice(0, -1) : current,
              );
              setError({ message: event.error, question });
              setPending(null);
              break;
          }
        },
        controller.signal,
      );

      abortRef.current = null;
      if (!finished) {
        // Stopped by the user: the server saves whatever was written so far.
        setPending(null);
        await new Promise((resolve) => setTimeout(resolve, 600));
        await reload();
      }
      router.refresh(); // update the title and order in the conversation list
    },
    [conversationId, reload, router],
  );

  // A question typed on the "new chat" screen is handed over through
  // sessionStorage. In development React mounts, unmounts and remounts every
  // component once; deferring to a timer that the cleanup cancels means the
  // question is read and sent by the final mount only.
  useEffect(() => {
    const timer = setTimeout(() => {
      let question: string | null = null;
      try {
        const key = pendingQuestionKey(conversationId);
        question = sessionStorage.getItem(key);
        sessionStorage.removeItem(key);
      } catch {
        // Storage unavailable: nothing was handed over.
      }
      if (question) void send(question);
    }, 0);
    return () => clearTimeout(timer);
  }, [conversationId, send]);

  // Stop generating if the user leaves the page.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      abortRef.current = null;
    },
    [],
  );

  // Follow the answer as it grows, unless the user has scrolled up to read.
  useEffect(() => {
    if (stickToBottom.current) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, pending, error]);

  const scopeLabel = scope.allDocuments
    ? "All documents"
    : scope.documents.length === 0
      ? "Documents deleted"
      : scope.documents.map((document) => document.title).join(", ");
  const isEmpty = messages.length === 0 && !pending && !error;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-2.5 sm:px-6">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-medium">{title}</h1>
          <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <FileText className="size-3 shrink-0" />
            <span className="truncate">{scopeLabel}</span>
          </p>
        </div>
        <MobileConversations />
      </div>

      <div
        ref={scrollerRef}
        onScroll={(event) => {
          const el = event.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
          {isEmpty ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 py-8 text-center">
              <div>
                <p className="text-lg font-medium">What would you like to know?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Answers come only from your documents, with the passages they are based on.
                </p>
              </div>
              <SuggestedQuestions conversationId={conversationId} onPick={(q) => void send(q)} />
            </div>
          ) : (
            <>
              {messages.map((message) =>
                message.role === "USER" ? (
                  <UserMessage key={message.id} content={message.content} />
                ) : (
                  <AssistantMessage
                    key={message.id}
                    content={message.content}
                    sources={message.sources}
                    existingDocumentIds={existing}
                  />
                ),
              )}
              {pending && (
                <>
                  {!pending.questionSaved && <UserMessage content={pending.question} />}
                  <AssistantMessage
                    content={pending.answer}
                    sources={pending.sources}
                    existingDocumentIds={existing}
                    status={STAGE_LABELS[pending.stage]}
                    streaming
                  />
                </>
              )}
              {error && (
                <div
                  role="alert"
                  className="flex flex-wrap items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <div className="min-w-0 flex-1">
                    <p className="text-destructive">{error.message}</p>
                    <p className="mt-1 truncate text-muted-foreground">
                      Your question: {error.question}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => void send(error.question)}>
                    <RotateCw />
                    Try again
                  </Button>
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 px-4 pt-2 pb-4 sm:px-6">
        <div className="mx-auto w-full max-w-3xl space-y-2">
          {modelProblem && (
            <p className="flex items-start gap-2 rounded-lg border px-3 py-2 text-xs text-muted-foreground">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>Local model: {modelProblem}. Questions will fail until this is fixed.</span>
            </p>
          )}
          <ChatInput
            onSend={(text) => void send(text)}
            onStop={() => abortRef.current?.abort()}
            busy={pending !== null}
            autoFocus
          />
          <p className="text-center text-xs text-muted-foreground">
            Answered locally by your own model. It can still make mistakes, so check the sources.
          </p>
        </div>
      </div>
    </div>
  );
}
