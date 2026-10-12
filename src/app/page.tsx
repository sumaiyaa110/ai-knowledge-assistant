import { CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { config } from "@/lib/config";
import {
  checkDatabase,
  checkOllama,
  type ServiceStatus,
} from "@/lib/database/health";

export const dynamic = "force-dynamic";

function StatusRow({ name, status }: { name: string; status: ServiceStatus }) {
  return (
    <li className="flex items-start gap-3">
      {status.ok ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-sm text-muted-foreground">{status.detail}</p>
      </div>
    </li>
  );
}

export default async function Home() {
  const [database, ollama, session] = await Promise.all([
    checkDatabase(),
    checkOllama(),
    getSession(),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
        <span className="font-semibold">AI Knowledge Assistant</span>
        <div className="flex items-center gap-2">
          <Link
            href={session ? "/dashboard" : "/login"}
            className={buttonVariants({ variant: "outline" })}
          >
            {session ? "Dashboard" : "Sign in"}
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-4 py-12 sm:px-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Chat with your documents, entirely on your machine
          </h1>
          <p className="text-muted-foreground">
            Upload PDFs, text and Markdown files, then ask questions answered
            by a local model. Nothing leaves this computer.
          </p>
          {!session && (
            <Link href="/register" className={buttonVariants({ size: "lg" })}>
              Create an account
            </Link>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Local services</CardTitle>
            <CardDescription>
              Both need to be running for uploads and chat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              <StatusRow name="PostgreSQL + pgvector" status={database} />
              <StatusRow name={`Ollama (${config.ollama.model})`} status={ollama} />
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
