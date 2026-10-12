import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isProcessing, type DocumentStatus } from "@/models/document";

const STATUS_LABELS: Record<DocumentStatus, string> = {
  UPLOADED: "Queued",
  EXTRACTING: "Extracting text",
  CHUNKING: "Splitting",
  EMBEDDING: "Indexing",
  READY: "Ready",
  FAILED: "Failed",
};

export function StatusBadge({ status, className }: { status: DocumentStatus; className?: string }) {
  const processing = isProcessing(status);
  const Icon = processing ? Loader2 : status === "READY" ? CheckCircle2 : AlertCircle;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        processing && "border-transparent bg-muted text-muted-foreground",
        status === "READY" &&
          "border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
        status === "FAILED" && "border-destructive/30 bg-destructive/10 text-destructive",
        className,
      )}
    >
      <Icon className={cn("size-3", processing && "animate-spin")} />
      {STATUS_LABELS[status]}
    </span>
  );
}
