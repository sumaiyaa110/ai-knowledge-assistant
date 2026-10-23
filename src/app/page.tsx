import {
  CheckCircle2,
  GraduationCap,
  MessagesSquare,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { config } from "@/lib/config";
import {
  checkDatabase,
  checkOllama,
  type ServiceStatus,
} from "@/lib/database/health";

export const dynamic = "force-dynamic";

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: MessagesSquare,
    title: "Answers with sources",
    description:
      "Ask questions about your PDFs, notes and Markdown files. Every answer cites the passages it came from, and says so when your documents do not cover the question.",
  },
  {
    icon: GraduationCap,
    title: "Study tools",
    description:
      "Turn any document into a summary, a multiple-choice quiz or a deck of flashcards, saved so you can come back to them.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    description:
      "The database, the search index and the language model all run on this computer. No document or question is sent anywhere else.",
  },
];

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
  const allRunning = database.ok && ollama.ok;

  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(60%_50%_at_30%_0%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent)]"
      />
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
        <Brand href="/" />
        <div className="flex items-center gap-2">
          {!session && (
            <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
              Sign in
            </Link>
          )}
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-12 px-4 py-12 sm:px-6 sm:py-16">
        <section className="max-w-2xl space-y-5">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            Chat with your documents,{" "}
            <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              entirely on your machine
            </span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Upload PDFs, text and Markdown files, then ask questions, get summaries and
            build study material with a local AI model.
          </p>
          <div className="flex flex-wrap gap-3">
            {session ? (
              <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
                Open your dashboard
              </Link>
            ) : (
              <>
                <Link href="/register" className={buttonVariants({ size: "lg" })}>
                  Create an account
                </Link>
                <Link href="/login" className={buttonVariants({ size: "lg", variant: "outline" })}>
                  Sign in
                </Link>
              </>
            )}
          </div>
        </section>

        <section aria-label="Features">
          <ul className="grid gap-4 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <li key={title} className="rounded-xl border bg-card p-4 transition-colors hover:border-primary/30">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-4 text-primary" />
                </span>
                <h2 className="mt-3 font-medium">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </li>
            ))}
          </ul>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Local services</CardTitle>
            <CardDescription>
              {allRunning
                ? "Everything the app needs is running."
                : "Both need to be running for uploads and chat. Run npm run setup to fix what is missing."}
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

      <footer className="border-t px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
        Built with Next.js, PostgreSQL + pgvector and Ollama. Runs locally with free, open-source tools.
      </footer>
    </div>
  );
}
