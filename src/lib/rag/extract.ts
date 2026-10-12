import { extractText, getDocumentProxy } from "unpdf";
import type { DocumentKind } from "@/models/document";

export type ExtractedPage = {
  /** 1-based page number for PDFs; null for formats without pages. */
  pageNumber: number | null;
  text: string;
};

export type ExtractionResult = {
  pages: ExtractedPage[];
  /** Number of pages in the source file, or null when the format has none. */
  pageCount: number | null;
};

/** Thrown for problems the user can understand and act on. */
export class ExtractionError extends Error {}

const PDF_MAGIC = "%PDF-";

export function looksLikePdf(data: Uint8Array): boolean {
  // The header may be preceded by a few junk bytes, so search the first 1 KB.
  const head = Buffer.from(data.subarray(0, 1024)).toString("latin1");
  return head.includes(PDF_MAGIC);
}

function hasUtf16Bom(data: Uint8Array): "utf-16le" | "utf-16be" | null {
  if (data[0] === 0xff && data[1] === 0xfe) return "utf-16le";
  if (data[0] === 0xfe && data[1] === 0xff) return "utf-16be";
  return null;
}

/** Plain text never contains NUL bytes (unless it is UTF-16, which has a BOM). */
export function looksLikeText(data: Uint8Array): boolean {
  if (hasUtf16Bom(data)) return true;
  return !data.subarray(0, 8192).includes(0);
}

function decodeText(data: Uint8Array): string {
  const utf16 = hasUtf16Bom(data);
  if (utf16) return new TextDecoder(utf16).decode(data);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(data);
  } catch {
    // Not valid UTF-8: most likely an older Windows-encoded file.
    return new TextDecoder("windows-1252").decode(data);
  }
}

async function extractPdf(data: Uint8Array): Promise<ExtractionResult> {
  let result: { totalPages: number; text: string[] };
  try {
    // pdf.js takes ownership of the buffer it is given, so hand it a copy.
    const pdf = await getDocumentProxy(new Uint8Array(data));
    result = await extractText(pdf, { mergePages: false });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (/password/i.test(reason)) {
      throw new ExtractionError("This PDF is password-protected and cannot be read.");
    }
    throw new ExtractionError("This PDF could not be read. It may be damaged.");
  }

  return {
    pageCount: result.totalPages,
    pages: result.text.map((text, index) => ({ pageNumber: index + 1, text })),
  };
}

export async function extractPages(data: Uint8Array, kind: DocumentKind): Promise<ExtractionResult> {
  if (kind === "pdf") return extractPdf(data);
  return { pageCount: null, pages: [{ pageNumber: null, text: decodeText(data) }] };
}
