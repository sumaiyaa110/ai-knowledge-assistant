import { prisma } from "./prisma";
import { config } from "@/lib/config";

export type ServiceStatus = { ok: boolean; detail: string };

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

export async function checkOllama(): Promise<ServiceStatus> {
  try {
    const res = await fetch(`${config.ollama.baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(2000),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, detail: `Ollama responded with ${res.status}` };
    const data = (await res.json()) as { models?: { name: string }[] };
    const installed = data.models?.some((m) => m.name === config.ollama.model);
    return installed
      ? { ok: true, detail: `Running, ${config.ollama.model} installed` }
      : { ok: false, detail: `Running, but run: ollama pull ${config.ollama.model}` };
  } catch {
    return { ok: false, detail: `Not reachable at ${config.ollama.baseUrl}` };
  }
}
