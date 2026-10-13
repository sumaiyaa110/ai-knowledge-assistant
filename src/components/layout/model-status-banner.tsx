import { AlertCircle } from "lucide-react";

/** Warning shown on pages that need the local model while it cannot be used. */
export function ModelStatusBanner({ problem }: { problem: string | null }) {
  if (!problem) return null;
  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>
        The local AI model is not available ({problem}). Generating will fail until Ollama is
        running with the configured model.
      </span>
    </p>
  );
}
