import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/respond";
import type { StartResult } from "./service";

const FAILURES = {
  not_found: { status: 404, message: "Document not found" },
  not_ready: { status: 409, message: "The document has not finished processing yet." },
  already_running: { status: 409, message: "This is already being generated for the document." },
} as const;

/** 202 with the queued job, or the matching error response. */
export function respondToStart(result: StartResult) {
  if (result.ok) return NextResponse.json({ job: result.job }, { status: 202 });
  const failure = FAILURES[result.reason];
  return jsonError(failure.message, failure.status);
}
