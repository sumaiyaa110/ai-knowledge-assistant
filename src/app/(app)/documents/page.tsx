import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Documents" };

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Upload PDF, text and Markdown files to chat with."
      />
      <EmptyState
        icon={FileText}
        title="No documents yet"
        description="Uploading and processing arrive in the next phase."
        className="rounded-xl border border-dashed py-16"
      />
    </div>
  );
}
