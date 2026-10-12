import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "AI Tools" };

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Tools"
        description="Summaries, quizzes and flashcards generated from your documents."
      />
      <EmptyState
        icon={Sparkles}
        title="Tools are not available yet"
        description="They unlock once documents can be uploaded and indexed."
        action={{ label: "Go to documents", href: "/documents" }}
        className="rounded-xl border border-dashed py-16"
      />
    </div>
  );
}
