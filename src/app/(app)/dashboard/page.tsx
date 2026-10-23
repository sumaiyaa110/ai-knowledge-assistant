import {
  FileText,
  HardDrive,
  HelpCircle,
  Layers,
  MessageSquare,
  MessageSquarePlus,
  Sparkles,
  Upload,
} from "lucide-react";
import type { Metadata } from "next";
import { QuickActionCard } from "@/components/dashboard/quick-action-card";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";
import { RecentConversations } from "@/components/dashboard/recent-conversations";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { requireUser } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/dashboard/queries";
import { formatBytes } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

const QUICK_ACTIONS = [
  {
    title: "Upload a document",
    description: "Add a PDF, text or Markdown file.",
    href: "/documents",
    icon: Upload,
  },
  {
    title: "Start a chat",
    description: "Ask questions about your documents.",
    href: "/chat",
    icon: MessageSquarePlus,
  },
  {
    title: "Summarize a document",
    description: "Get the main points and key concepts.",
    href: "/tools",
    icon: Sparkles,
  },
  {
    title: "Make a quiz or flashcards",
    description: "Turn a document into study material.",
    href: "/tools",
    icon: Layers,
  },
];

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);

  const { usedBytes, quotaBytes } = data.storage;
  const firstName = user.name?.split(" ")[0];
  const isNewUser = data.documents.total === 0;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">
          {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {isNewUser
            ? "Upload your first document to start asking questions about it."
            : "Here is what is happening in your knowledge base."}
        </p>
      </section>

      <section aria-label="Usage" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Documents"
          value={data.documents.total}
          hint={isNewUser ? "None uploaded yet" : `${data.documents.ready} ready for chat`}
          icon={FileText}
        />
        <StatCard
          label="Conversations"
          value={data.conversations.total}
          hint={data.conversations.total === 0 ? "None started yet" : "Across all documents"}
          icon={MessageSquare}
        />
        <StatCard
          label="Questions asked"
          value={data.questionsAsked}
          hint="Answered by your local model"
          icon={HelpCircle}
        />
        <StatCard
          label="Storage used"
          value={formatBytes(usedBytes)}
          hint={`of ${formatBytes(quotaBytes)}`}
          icon={HardDrive}
          progress={(usedBytes / quotaBytes) * 100}
        />
      </section>

      <section aria-labelledby="quick-actions">
        <h2 id="quick-actions" className="mb-3 text-sm font-medium text-muted-foreground">
          Quick actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {QUICK_ACTIONS.map((action) => (
            <QuickActionCard key={action.title} {...action} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <SectionCard
          title="Recent conversations"
          viewAll={
            data.conversations.total > 0 ? { label: "View all", href: "/chat" } : undefined
          }
        >
          <RecentConversations conversations={data.conversations.recent} />
        </SectionCard>
        <SectionCard title="Recent activity">
          <RecentActivityList items={data.activity} />
        </SectionCard>
      </section>
    </div>
  );
}
