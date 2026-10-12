export type ActivityType = "document_uploaded" | "conversation_started";

export type ActivityItem = {
  id: string;
  type: ActivityType;
  title: string;
  href: string;
  at: Date;
};

export type ConversationSummary = {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: Date;
};

export type DashboardData = {
  documents: { total: number; ready: number };
  conversations: { total: number; recent: ConversationSummary[] };
  questionsAsked: number;
  storage: { usedBytes: number; quotaBytes: number };
  activity: ActivityItem[];
};
