import { MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Chat" };

export default function ChatPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Chat" description="Ask questions answered from your documents." />
      <EmptyState
        icon={MessageSquare}
        title="Chat is not available yet"
        description="It unlocks once documents can be uploaded and indexed."
        action={{ label: "Go to documents", href: "/documents" }}
        className="rounded-xl border border-dashed py-16"
      />
    </div>
  );
}
