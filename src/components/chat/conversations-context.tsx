"use client";

import { createContext, useContext } from "react";
import type { ConversationSummaryDTO } from "@/models/chat";

// The chat layout loads the conversation list once on the server. The context
// hands it to both the desktop sidebar and the mobile drawer in the page header.
const ConversationsContext = createContext<ConversationSummaryDTO[]>([]);

export function ConversationsProvider({
  conversations,
  children,
}: {
  conversations: ConversationSummaryDTO[];
  children: React.ReactNode;
}) {
  return <ConversationsContext value={conversations}>{children}</ConversationsContext>;
}

export const useConversations = () => useContext(ConversationsContext);
