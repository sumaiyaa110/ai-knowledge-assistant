import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChatWindow } from "@/components/chat/chat-window";
import { checkOllama } from "@/lib/ai/ollama";
import { requireUser } from "@/lib/auth/session";
import { getConversation } from "@/lib/chat/service";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const user = await requireUser();
  const conversation = await getConversation(user.id, (await params).id);
  return { title: conversation?.title ?? "Chat" };
}

export default async function ConversationPage({ params }: PageProps) {
  const user = await requireUser();
  const [conversation, ollama] = await Promise.all([
    getConversation(user.id, (await params).id),
    checkOllama(),
  ]);
  if (!conversation) notFound();

  return (
    <ChatWindow
      // A fresh component per conversation, so no state leaks between chats.
      key={conversation.id}
      conversationId={conversation.id}
      initialTitle={conversation.title}
      initialMessages={conversation.messages}
      scope={conversation.scope}
      existingDocumentIds={conversation.existingDocumentIds}
      modelProblem={ollama.ok ? null : ollama.detail}
    />
  );
}
