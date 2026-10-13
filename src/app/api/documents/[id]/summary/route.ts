import { jsonError } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { respondToStart } from "@/lib/tools/respond";
import { startSummary } from "@/lib/tools/service";

/** Start (or redo) the summary of a document. Progress is read from ../tools. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Not signed in", 401);

  return respondToStart(await startSummary(user.id, (await params).id));
}
