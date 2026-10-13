import { ArrowLeft, FileSearch } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/dashboard/empty-state";
import { DocumentActions } from "@/components/documents/document-actions";
import { StatusBadge } from "@/components/documents/status-badge";
import { SummaryView } from "@/components/tools/summary-view";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { getDocument } from "@/lib/documents/service";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getTypeLabel, isProcessing } from "@/models/document";
import type { DocumentSummary } from "@/models/study";

const CHUNKS_PER_PAGE = 20;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const user = await requireUser();
  const document = await getDocument(user.id, (await params).id);
  return { title: document?.title ?? "Document" };
}

export default async function DocumentDetailPage({ params, searchParams }: PageProps) {
  const user = await requireUser();
  const document = await getDocument(user.id, (await params).id);
  if (!document) notFound();

  const pageCount = Math.max(1, Math.ceil(document.chunkCount / CHUNKS_PER_PAGE));
  const requested = Number((await searchParams).page);
  const page = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), pageCount) : 1;

  const [chunks, vectorCount] = await Promise.all([
    prisma.documentChunk.findMany({
      where: { documentId: document.id },
      orderBy: { index: "asc" },
      skip: (page - 1) * CHUNKS_PER_PAGE,
      take: CHUNKS_PER_PAGE,
      select: { id: true, index: true, content: true, tokenCount: true, pageNumber: true },
    }),
    prisma.embedding.count({ where: { chunk: { documentId: document.id } } }),
  ]);

  const summary = document.summary as unknown as DocumentSummary | null;

  const metadata = [
    { label: "Type", value: getTypeLabel(document.mimeType) },
    { label: "Size", value: formatBytes(document.sizeBytes) },
    { label: "Pages", value: document.pageCount ?? "n/a" },
    { label: "Chunks", value: document.chunkCount },
    { label: "Embedded", value: `${vectorCount} of ${document.chunkCount}` },
    {
      label: "Uploaded",
      value: document.createdAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" }),
    },
  ];

  const pageLink = (target: number, label: string, disabled: boolean) =>
    disabled ? (
      <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-50")}>
        {label}
      </span>
    ) : (
      <Link
        href={`/documents/${document.id}?page=${target}`}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        {label}
      </Link>
    );

  return (
    <div className="space-y-6">
      <Link
        href="/documents"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All documents
      </Link>

      <div className="space-y-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight break-words">{document.title}</h1>
            <StatusBadge status={document.status} />
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">{document.fileName}</p>
        </div>
        <DocumentActions documentId={document.id} status={document.status} />
      </div>

      {document.status === "FAILED" && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {document.error ?? "Processing failed."}
        </p>
      )}

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {metadata.map((item) => (
          <div key={item.label} className="rounded-xl border bg-card px-4 py-3">
            <dt className="text-sm text-muted-foreground">{item.label}</dt>
            <dd className="mt-1 font-medium">{item.value}</dd>
          </div>
        ))}
      </dl>

      {summary && (
        <section aria-labelledby="document-summary" className="space-y-3">
          <h2 id="document-summary" className="text-sm font-medium text-muted-foreground">
            Summary
          </h2>
          <div className="rounded-xl border bg-card p-4">
            <SummaryView summary={summary} />
          </div>
        </section>
      )}

      <section aria-labelledby="extracted-content" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="extracted-content" className="text-sm font-medium text-muted-foreground">
            Extracted content
            {document.chunkCount > 0 &&
              ` · chunks ${(page - 1) * CHUNKS_PER_PAGE + 1}-${(page - 1) * CHUNKS_PER_PAGE + chunks.length} of ${document.chunkCount}`}
          </h2>
          {pageCount > 1 && (
            <div className="flex items-center gap-2">
              {pageLink(page - 1, "Previous", page <= 1)}
              {pageLink(page + 1, "Next", page >= pageCount)}
            </div>
          )}
        </div>

        {chunks.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title={isProcessing(document.status) ? "Processing…" : "No extracted content"}
            description={
              isProcessing(document.status)
                ? "The text will appear here as soon as the document has been split into chunks."
                : "Nothing could be extracted from this file."
            }
            className="rounded-xl border border-dashed"
          />
        ) : (
          <ol className="space-y-3">
            {chunks.map((chunk) => (
              <li key={chunk.id} className="rounded-xl border bg-card p-4">
                <p className="mb-2 text-xs text-muted-foreground">
                  Chunk {chunk.index + 1}
                  {chunk.pageNumber !== null && ` · Page ${chunk.pageNumber}`}
                  {` · ${chunk.content.length} characters · ${chunk.tokenCount} tokens`}
                </p>
                <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                  {chunk.content}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
