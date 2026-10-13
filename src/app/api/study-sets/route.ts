import { NextResponse } from "next/server";
import { jsonError, parseBody } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { respondToStart } from "@/lib/tools/respond";
import { listStudySets, startStudySet } from "@/lib/tools/service";
import { createStudySetSchema } from "@/models/study";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);
  return NextResponse.json({ studySets: await listStudySets(user.id) });
}

/** Start generating a quiz or a flashcard deck for a document. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);

  const { data, response } = await parseBody(request, createStudySetSchema);
  if (response) return response;

  return respondToStart(await startStudySet(user.id, data.documentId, data.type, data.count));
}
