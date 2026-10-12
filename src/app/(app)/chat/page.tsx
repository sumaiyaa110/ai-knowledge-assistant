import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { MobileConversations } from "@/components/chat/mobile-conversations";
import { NewChat } from "@/components/chat/new-chat";
import { EmptyState } from "@/components/dashboard/empty-state";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { PROCESSING_STATUSES } from "@/models/document";

export const metadata: Metadata = { title: "Chat" };

export default async function NewChatPage() {
  const user = await requireUser();
  const [documents, processing] = await Promise.all([
    prisma.document.findMany({
      where: { userId: user.id, status: "READY" },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true },
    }),
    prisma.document.count({ where: { userId: user.id, status: { in: PROCESSING_STATUSES } } }),
  ]);

  if (documents.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex justify-end px-4 py-2.5 lg:hidden">
          <MobileConversations />
        </div>
        <div className="flex flex-1 items-center justify-center p-4">
          <EmptyState
            icon={FileText}
            title={processing > 0 ? "Your documents are still processing" : "No documents to chat with yet"}
            description={
              processing > 0
                ? "Chat becomes available as soon as one of them is ready."
                : "Upload a PDF, text or Markdown file first, then come back to ask questions about it."
            }
            action={{ label: "Go to documents", href: "/documents" }}
          />
        </div>
      </div>
    );
  }

  return <NewChat documents={documents} />;
}
