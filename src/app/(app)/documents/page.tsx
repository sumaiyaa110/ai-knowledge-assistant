import type { Metadata } from "next";
import { DocumentsManager } from "@/components/documents/documents-manager";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/lib/auth/session";
import { config } from "@/lib/config";
import { getStorageUsage, listDocuments } from "@/lib/documents/service";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const user = await requireUser();
  const [documents, storage] = await Promise.all([
    listDocuments(user.id),
    getStorageUsage(user.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Upload PDF, text and Markdown files to chat with."
      />
      <DocumentsManager
        initialDocuments={documents}
        initialStorage={storage}
        limits={{ maxFileBytes: config.uploads.maxBytes }}
      />
    </div>
  );
}
