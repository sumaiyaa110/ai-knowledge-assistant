import { config } from "@/lib/config";
import { prisma } from "@/lib/database/prisma";
import type { ActivityItem, DashboardData } from "@/models/dashboard";

const RECENT_LIMIT = 5;
const ACTIVITY_LIMIT = 6;

/** Everything the dashboard shows, scoped to one user. */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [
    totalDocuments,
    readyDocuments,
    totalConversations,
    questionsAsked,
    storage,
    recentConversations,
    recentDocuments,
  ] = await Promise.all([
    prisma.document.count({ where: { userId } }),
    prisma.document.count({ where: { userId, status: "READY" } }),
    prisma.conversation.count({ where: { userId } }),
    prisma.message.count({ where: { role: "USER", conversation: { userId } } }),
    prisma.document.aggregate({ where: { userId }, _sum: { sizeBytes: true } }),
    prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: RECENT_LIMIT,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    }),
    prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: ACTIVITY_LIMIT,
      select: { id: true, title: true, createdAt: true },
    }),
  ]);

  const activity: ActivityItem[] = [
    ...recentDocuments.map((doc) => ({
      id: `doc-${doc.id}`,
      type: "document_uploaded" as const,
      title: doc.title,
      href: `/documents/${doc.id}`,
      at: doc.createdAt,
    })),
    ...recentConversations.map((conversation) => ({
      id: `conv-${conversation.id}`,
      type: "conversation_started" as const,
      title: conversation.title,
      href: `/chat/${conversation.id}`,
      at: conversation.createdAt,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, ACTIVITY_LIMIT);

  return {
    documents: { total: totalDocuments, ready: readyDocuments },
    conversations: {
      total: totalConversations,
      recent: recentConversations.map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        messageCount: conversation._count.messages,
        updatedAt: conversation.updatedAt,
      })),
    },
    questionsAsked,
    storage: {
      usedBytes: storage._sum.sizeBytes ?? 0,
      quotaBytes: config.uploads.quotaBytes,
    },
    activity,
  };
}
