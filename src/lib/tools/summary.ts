import { completeJson } from "@/lib/ai/json";
import type { ReportProgress } from "@/lib/ai/jobs";
import { completeChat } from "@/lib/ai/ollama";
import {
  SUMMARY_SCHEMA,
  buildSectionSummaryMessages,
  buildSummaryMessages,
} from "@/lib/ai/tool-prompts";
import { config } from "@/lib/config";
import { prisma } from "@/lib/database/prisma";
import { summaryContentSchema, type DocumentSummary } from "@/models/study";
import { buildSections, loadDocumentChunks, pickEvenly } from "./passages";

// Sized for a small model on CPU: each section is about 600 tokens to read.
const SECTION_CHARS = 2400;
/** Documents up to this size are summarized in one step. */
const SINGLE_PASS_CHARS = 3200;
/** Longer documents are sampled, so the wait stays within a few minutes. */
const MAX_SECTIONS = 8;

/**
 * Summarize a document and store the result on it.
 *
 * Short documents: one call on the full text. Longer ones use map-reduce:
 * summarize each section on its own, then write the final summary from those
 * notes, since the whole text would not fit in the model's context window.
 */
export async function generateSummary(documentId: string, report: ReportProgress): Promise<null> {
  const { title, chunks } = await loadDocumentChunks(documentId);
  const allSections = buildSections(chunks, SECTION_CHARS);
  const fullText = allSections.join("\n\n");

  let material: string;
  let isNotes: boolean;
  let sectionsUsed: number;

  if (fullText.length <= SINGLE_PASS_CHARS) {
    report(1, 1, "Writing the summary…");
    material = fullText;
    isNotes = false;
    sectionsUsed = allSections.length;
  } else {
    const sections = pickEvenly(allSections, MAX_SECTIONS);
    const total = sections.length + 1;
    const notes: string[] = [];

    for (const [i, section] of sections.entries()) {
      report(i + 1, total, `Reading part ${i + 1} of ${sections.length}…`);
      const note = await completeChat({
        messages: buildSectionSummaryMessages(title, section),
        maxTokens: 160,
        temperature: 0.2,
      });
      if (note.trim()) notes.push(`Part ${i + 1}: ${note.trim()}`);
    }

    report(total, total, "Writing the summary…");
    material = notes.join("\n\n");
    isNotes = true;
    sectionsUsed = sections.length;
  }

  const content = await completeJson({
    messages: buildSummaryMessages(title, material, isNotes),
    format: SUMMARY_SCHEMA,
    schema: summaryContentSchema,
    maxTokens: 600,
    temperature: 0.2,
  });

  const summary: DocumentSummary = {
    ...content,
    generatedAt: new Date().toISOString(),
    model: config.ollama.model,
    coverage: { sectionsUsed, sectionsTotal: allSections.length },
  };
  await prisma.document.updateMany({ where: { id: documentId }, data: { summary } });
  return null;
}
