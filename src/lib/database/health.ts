import type { ServiceStatus } from "@/lib/ai/ollama";
import { prisma } from "./prisma";

export { checkOllama, type ServiceStatus } from "@/lib/ai/ollama";

export async function checkDatabase(): Promise<ServiceStatus> {
  try {
    const rows = await prisma.$queryRaw<{ extversion: string }[]>`
      SELECT extversion FROM pg_extension WHERE extname = 'vector'
    `;
    if (rows.length === 0) {
      return { ok: false, detail: "Connected, but the pgvector extension is missing" };
    }
    return { ok: true, detail: `Connected, pgvector ${rows[0].extversion}` };
  } catch {
    return { ok: false, detail: "Not reachable. Run: npm run db:up" };
  }
}
