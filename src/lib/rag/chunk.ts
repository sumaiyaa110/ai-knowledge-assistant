import type { ExtractedPage } from "./extract";

export type Chunk = {
  index: number;
  content: string;
  tokenCount: number;
  pageNumber: number | null;
};

export type ChunkOptions = {
  /** Target maximum characters per chunk, overlap included. */
  chunkSize: number;
  /** Characters repeated from the end of the previous chunk. */
  overlap: number;
};

export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = { chunkSize: 800, overlap: 150 };

// Tried in order: split on the coarsest boundary that produces pieces small
// enough. All are zero-width, so splitting never drops a character and every
// piece maps back to an exact range of the source text.
const SEPARATORS: RegExp[] = [
  /(?=\n#{1,6} )/, // before a Markdown heading
  /(?<=\n\n)/, // paragraphs
  /(?<=\n)/, // lines
  /(?<=[.!?]["')\]]?\s)/, // sentences
  /(?<=\s)/, // words
];

type Range = { start: number; end: number };

/**
 * Recursively split `text` into contiguous ranges of at most `size` characters,
 * merging neighbouring small pieces so chunks are as full as possible.
 */
function splitIntoRanges(text: string, offset: number, size: number, level = 0): Range[] {
  if (text.length <= size) return [{ start: offset, end: offset + text.length }];

  if (level >= SEPARATORS.length) {
    // No natural boundary left (e.g. one enormous token): cut at fixed width.
    const ranges: Range[] = [];
    for (let i = 0; i < text.length; i += size) {
      ranges.push({ start: offset + i, end: offset + Math.min(i + size, text.length) });
    }
    return ranges;
  }

  const parts = text.split(SEPARATORS[level]).filter((part) => part.length > 0);
  if (parts.length <= 1) return splitIntoRanges(text, offset, size, level + 1);

  const ranges: Range[] = [];
  let current: Range | null = null;
  let position = offset;

  for (const part of parts) {
    const partRange = { start: position, end: position + part.length };
    position = partRange.end;

    if (part.length > size) {
      if (current) ranges.push(current);
      current = null;
      ranges.push(...splitIntoRanges(part, partRange.start, size, level + 1));
    } else if (current && partRange.end - current.start <= size) {
      current.end = partRange.end;
    } else {
      if (current) ranges.push(current);
      current = partRange;
    }
  }
  if (current) ranges.push(current);
  return ranges;
}

const MIN_STANDALONE_CHARS = 100;

/**
 * A short piece that sits before a long one (typically a heading before its
 * section) would otherwise become a near-empty chunk. Attach it to the range
 * that follows, or to the previous one if it is the last.
 */
function mergeTinyRanges(ranges: Range[], text: string, maxSize: number): Range[] {
  const merged: Range[] = [];
  let carriedStart: number | null = null;

  ranges.forEach((range, i) => {
    const start = carriedStart ?? range.start;
    const next = ranges[i + 1];
    const tiny = text.slice(start, range.end).trim().length < MIN_STANDALONE_CHARS;

    if (tiny && next && next.end - start <= maxSize) {
      carriedStart = start;
      return;
    }
    const previous = merged[merged.length - 1];
    if (tiny && !next && previous && range.end - previous.start <= maxSize) {
      previous.end = range.end;
    } else {
      merged.push({ start, end: range.end });
    }
    carriedStart = null;
  });
  return merged;
}

/** Where the overlap before `start` begins, moved forward to a word boundary. */
function overlapStart(text: string, start: number, overlap: number): number {
  let position = Math.max(0, start - overlap);
  if (position === 0) return 0;
  while (position < start && !/\s/.test(text[position - 1])) position++;
  return position;
}

/** Rough token estimate (about 4 characters per token for English text). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split extracted pages into overlapping chunks. Pages are joined first so a
 * sentence that runs across a page break stays together; each chunk records
 * the page its own (non-overlap) text starts on.
 */
export function chunkPages(
  pages: ExtractedPage[],
  options: ChunkOptions = DEFAULT_CHUNK_OPTIONS,
): Chunk[] {
  const PAGE_BREAK = "\n\n";
  const pageStarts: { offset: number; pageNumber: number | null }[] = [];
  let fullText = "";

  for (const page of pages) {
    if (!page.text.trim()) continue;
    if (fullText) fullText += PAGE_BREAK;
    pageStarts.push({ offset: fullText.length, pageNumber: page.pageNumber });
    fullText += page.text;
  }
  if (!fullText) return [];

  const pageAt = (offset: number) => {
    let pageNumber = pageStarts[0].pageNumber;
    for (const page of pageStarts) {
      if (page.offset > offset) break;
      pageNumber = page.pageNumber;
    }
    return pageNumber;
  };

  const coreSize = Math.max(1, options.chunkSize - options.overlap);
  const chunks: Chunk[] = [];

  const ranges = mergeTinyRanges(
    splitIntoRanges(fullText, 0, coreSize),
    fullText,
    options.chunkSize,
  );

  for (const range of ranges) {
    const core = fullText.slice(range.start, range.end);
    if (!core.trim()) continue;

    // A range that absorbed a short lead-in can be longer than coreSize, so
    // give it only as much overlap as still fits in chunkSize.
    const room = Math.min(options.overlap, options.chunkSize - core.length);
    const start =
      chunks.length === 0 || room <= 0
        ? range.start
        : overlapStart(fullText, range.start, room);
    const content = fullText.slice(start, range.end).trim();
    // Page of the first real character, not of leading whitespace or overlap.
    const firstContentOffset = range.start + (core.length - core.trimStart().length);

    chunks.push({
      index: chunks.length,
      content,
      tokenCount: estimateTokens(content),
      pageNumber: pageAt(firstContentOffset),
    });
  }
  return chunks;
}
