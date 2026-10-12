import { NextResponse } from "next/server";
import { checkDatabase, checkOllama } from "@/lib/database/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const [database, ollama] = await Promise.all([checkDatabase(), checkOllama()]);
  return NextResponse.json({ database, ollama }, { status: database.ok ? 200 : 503 });
}
