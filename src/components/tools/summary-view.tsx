import type { DocumentSummary } from "@/models/study";

/** A stored document summary: overview, main points and key concepts. */
export function SummaryView({ summary }: { summary: DocumentSummary }) {
  const { sectionsUsed, sectionsTotal } = summary.coverage;

  return (
    <div className="space-y-5 text-sm">
      <p className="leading-relaxed">{summary.short}</p>

      <div>
        <h4 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Main points
        </h4>
        <ul className="list-disc space-y-1.5 pl-5">
          {summary.mainPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Important concepts
        </h4>
        <dl className="grid gap-2 sm:grid-cols-2">
          {summary.concepts.map((concept) => (
            <div key={concept.term} className="rounded-lg border bg-background px-3 py-2">
              <dt className="font-medium">{concept.term}</dt>
              <dd className="mt-0.5 text-muted-foreground">{concept.explanation}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="text-xs text-muted-foreground">
        Written by {summary.model} on{" "}
        {new Date(summary.generatedAt).toLocaleDateString("en", { dateStyle: "medium" })}.
        {sectionsUsed < sectionsTotal &&
          ` Based on ${sectionsUsed} of ${sectionsTotal} sections sampled across the document.`}{" "}
        It may contain mistakes; check the document for anything important.
      </p>
    </div>
  );
}
