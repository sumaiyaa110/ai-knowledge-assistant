import type { LucideIcon } from "lucide-react";

type ProblemScreenProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Shell commands or steps that usually fix the problem. */
  steps?: string[];
  children?: React.ReactNode;
};

/** Full-area message for "this page cannot be shown right now", with what to do about it. */
export function ProblemScreen({ icon: Icon, title, description, steps, children }: ProblemScreenProps) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-4 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </span>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {steps && steps.length > 0 && (
        <ol className="mt-5 w-full max-w-md space-y-2 text-left text-sm">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-3 rounded-lg border bg-card px-3 py-2">
              <span className="text-muted-foreground tabular-nums">{i + 1}.</span>
              <code className="min-w-0 font-mono text-[0.8rem] break-words">{step}</code>
            </li>
          ))}
        </ol>
      )}
      {children && <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
