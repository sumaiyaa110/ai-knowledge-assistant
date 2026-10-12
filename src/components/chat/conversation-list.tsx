"use client";

import { Check, MessageSquare, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { sendJson } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { ConversationSummaryDTO } from "@/models/chat";
import { useConversations } from "./conversations-context";

type Mode = "idle" | "renaming" | "deleting";

function ConversationItem({
  conversation,
  active,
  onNavigate,
}: {
  conversation: ConversationSummaryDTO;
  active: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [title, setTitle] = useState(conversation.title);
  const [busy, setBusy] = useState(false);

  async function rename() {
    const next = title.trim();
    if (!next || next === conversation.title) {
      setTitle(conversation.title);
      setMode("idle");
      return;
    }
    setBusy(true);
    const result = await sendJson(`/api/conversations/${conversation.id}`, "PATCH", { title: next });
    setBusy(false);
    if (!result.ok) setTitle(conversation.title);
    setMode("idle");
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    const result = await sendJson(`/api/conversations/${conversation.id}`, "DELETE");
    setBusy(false);
    setMode("idle");
    if (result.ok && active) router.push("/chat");
    router.refresh();
  }

  if (mode === "renaming") {
    return (
      <li>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void rename();
          }}
          className="flex items-center gap-1 rounded-lg bg-sidebar-accent px-2 py-1"
        >
          <input
            autoFocus
            aria-label="Conversation title"
            value={title}
            maxLength={120}
            disabled={busy}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setTitle(conversation.title);
                setMode("idle");
              }
            }}
            className="min-w-0 flex-1 rounded bg-background px-1.5 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <Button type="submit" variant="ghost" size="icon-sm" aria-label="Save title" disabled={busy}>
            <Check />
          </Button>
        </form>
      </li>
    );
  }

  if (mode === "deleting") {
    return (
      <li className="flex items-center gap-1 rounded-lg bg-sidebar-accent px-2 py-1">
        <span className="min-w-0 flex-1 truncate text-sm">Delete this chat?</span>
        <Button variant="destructive" size="sm" disabled={busy} onClick={remove}>
          Delete
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Cancel" disabled={busy} onClick={() => setMode("idle")}>
          <X />
        </Button>
      </li>
    );
  }

  return (
    <li
      className={cn(
        "group flex items-center rounded-lg",
        active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60",
      )}
    >
      <Link
        href={`/chat/${conversation.id}`}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{conversation.title}</span>
      </Link>
      {/* Always visible on touch screens; revealed on hover or focus elsewhere. */}
      <div className="flex shrink-0 pr-1 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Rename ${conversation.title}`}
          onClick={() => setMode("renaming")}
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${conversation.title}`}
          onClick={() => setMode("deleting")}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}

/** "New chat" button plus the user's conversations, newest first. */
export function ConversationList({ onNavigate }: { onNavigate?: () => void }) {
  const conversations = useConversations();
  const pathname = usePathname();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="p-3">
        <Link
          href="/chat"
          onClick={onNavigate}
          className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start")}
        >
          <Plus />
          New chat
        </Link>
      </div>
      <nav aria-label="Conversations" className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {conversations.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            Your conversations will appear here.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                active={pathname === `/chat/${conversation.id}`}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        )}
      </nav>
    </div>
  );
}
