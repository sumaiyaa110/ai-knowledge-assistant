import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/format";
import type { ConversationSummary } from "@/models/dashboard";
import { EmptyState } from "./empty-state";

export function RecentConversations({ conversations }: { conversations: ConversationSummary[] }) {
  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No conversations yet"
        description="Ask a question about one of your documents and it will show up here."
        action={{ label: "Start a chat", href: "/chat" }}
      />
    );
  }

  return (
    <ul className="-mx-2 divide-y">
      {conversations.map((conversation) => (
        <li key={conversation.id}>
          <Link
            href={`/chat/${conversation.id}`}
            className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted"
          >
            <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {conversation.title}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {conversation.messageCount} {conversation.messageCount === 1 ? "message" : "messages"}
              {" · "}
              {formatRelativeTime(conversation.updatedAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
