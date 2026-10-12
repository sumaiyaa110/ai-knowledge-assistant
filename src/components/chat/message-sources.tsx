import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { MessageSource } from "@/models/chat";

type MessageSourcesProps = {
  sources: MessageSource[];
  /** Documents that still exist; sources from deleted ones are shown without a link. */
  existingDocumentIds: Set<string>;
};

export function MessageSources({ sources, existingDocumentIds }: MessageSourcesProps) {
  if (sources.length === 0) return null;

  // Show what the answer actually cited. If the model cited nothing, show
  // everything it was given, labelled accordingly.
  const cited = sources.filter((source) => source.cited);
  const shown = cited.length > 0 ? cited : sources;

  return (
    <div className="mt-3 border-t pt-3">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
        {cited.length > 0 ? "Sources" : "Passages consulted"}
      </p>
      <ul className="space-y-1">
        {shown.map((source) => {
          const exists = existingDocumentIds.has(source.documentId);
          return (
            <li key={source.number}>
              <details className="group rounded-lg border bg-background text-sm">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-1.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                  <span className="shrink-0 font-medium tabular-nums">[{source.number}]</span>
                  <span className="min-w-0 truncate">{source.documentTitle}</span>
                  {source.pageNumber !== null && (
                    <span className="shrink-0 text-muted-foreground">page {source.pageNumber}</span>
                  )}
                  {!exists && <span className="shrink-0 text-muted-foreground">(deleted)</span>}
                </summary>
                <div className="space-y-2 border-t px-2.5 py-2">
                  <p className="text-sm break-words whitespace-pre-wrap text-muted-foreground">
                    {source.excerpt}
                  </p>
                  {exists && (
                    <Link
                      href={`/documents/${source.documentId}`}
                      className="text-xs font-medium underline underline-offset-4"
                    >
                      Open document
                    </Link>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
