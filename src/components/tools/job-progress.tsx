import { AlertCircle, Loader2 } from "lucide-react";
import type { ToolJobDTO } from "@/models/study";

/** Progress bar for a running job, or the error of a failed one. Nothing otherwise. */
export function JobProgress({ job }: { job: ToolJobDTO | undefined }) {
  if (!job || job.status === "done") return null;

  if (job.status === "failed") {
    return (
      <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        {job.error}
      </p>
    );
  }

  const percent = job.total > 0 ? Math.round((job.step / job.total) * 100) : 0;
  return (
    <div role="status" className="space-y-1.5">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-3.5 shrink-0 animate-spin" />
        {job.message}
      </p>
      <div
        role="progressbar"
        aria-label={job.message}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          // A sliver even at 0%, so the bar reads as "started".
          style={{ width: `${Math.max(percent, 4)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        This runs on your computer and can take a few minutes. You can leave this page.
      </p>
    </div>
  );
}
