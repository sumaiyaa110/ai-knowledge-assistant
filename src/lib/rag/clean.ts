import type { ExtractedPage } from "./extract";

/** Normalise whitespace and remove characters that carry no meaning for retrieval. */
export function cleanText(text: string): string {
  return (
    text
      .normalize("NFC")
      .replace(/\r\n?/g, "\n")
      // Control characters other than tab and newline (includes NUL, which Postgres rejects).
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F﻿]/g, "")
      .replace(/­/g, "") // soft hyphens
      // Words hyphenated across a line break: "infor-\nmation" -> "information"
      .replace(/(\p{Ll})-\n(\p{Ll})/gu, "$1$2")
      .replace(/[ \t ]+/g, " ")
      .replace(/ ?\n ?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

const MIN_PAGES_FOR_REPEAT_DETECTION = 4;
const REPEAT_THRESHOLD = 0.6;

/** Digits vary between pages in headers like "Page 3 of 12", so compare without them. */
const normaliseLine = (line: string) => line.trim().replace(/\d+/g, "#").toLowerCase();

/**
 * Drop running headers and footers: a first or last line that repeats on most
 * pages (ignoring page numbers) is layout, not content.
 */
export function removeRepeatedLines(pages: ExtractedPage[]): ExtractedPage[] {
  if (pages.length < MIN_PAGES_FOR_REPEAT_DETECTION) return pages;

  const counts = new Map<string, number>();
  const edgeLines = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim());
    return lines.length > 1 ? [lines[0], lines[lines.length - 1]] : lines;
  };

  for (const page of pages) {
    for (const key of new Set(edgeLines(page.text).map(normaliseLine))) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const repeated = new Set(
    [...counts]
      .filter(([key, count]) => key.length <= 120 && count / pages.length >= REPEAT_THRESHOLD)
      .map(([key]) => key),
  );
  if (repeated.size === 0) return pages;

  return pages.map((page) => {
    const lines = page.text.split("\n");
    const first = lines.findIndex((line) => line.trim());
    const last = lines.findLastIndex((line) => line.trim());
    const kept = lines.filter(
      (line, index) => !((index === first || index === last) && repeated.has(normaliseLine(line))),
    );
    return { ...page, text: kept.join("\n").trim() };
  });
}
