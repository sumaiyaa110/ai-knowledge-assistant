import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ToolsWorkspace } from "@/components/tools/tools-workspace";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { getDocumentToolsState, listStudySets } from "@/lib/tools/service";

export const metadata: Metadata = { title: "AI Tools" };

type PageProps = { searchParams: Promise<{ document?: string }> };

export default async function ToolsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const documents = await prisma.document.findMany({
    where: { userId: user.id, status: "READY" },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true },
  });

  const header = (
    <PageHeader
      title="AI Tools"
      description="Summaries, quizzes and flashcards generated from your documents by your local model."
    />
  );

  if (documents.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={FileText}
          title="No documents to work with yet"
          description="Upload a document and wait until it is ready, then come back to summarize it or make study material from it."
          action={{ label: "Go to documents", href: "/documents" }}
          className="rounded-xl border border-dashed py-16"
        />
      </div>
    );
  }

  // Preselect the document named in the URL (e.g. from a document's page), if it is the user's.
  const requested = (await searchParams).document;
  const selected = documents.find((document) => document.id === requested) ?? documents[0];
  const [state, studySets] = await Promise.all([
    getDocumentToolsState(user.id, selected.id),
    listStudySets(user.id),
  ]);

  return (
    <div className="space-y-6">
      {header}
      <ToolsWorkspace
        // Remount when a different document is linked to, so its state is used.
        key={selected.id}
        documents={documents}
        initialDocumentId={selected.id}
        initialState={state ?? { summary: null, jobs: {}, studySets: [] }}
        initialStudySets={studySets}
      />
    </div>
  );
}
