import { BookOpenText } from "lucide-react";
import type { MessageSource } from "@/models/chat";
import { Markdown } from "./markdown";
import { MessageSources } from "./message-sources";

export function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm break-words whitespace-pre-wrap text-primary-foreground">
        {content}
      </div>
    </div>
  );
}

type AssistantMessageProps = {
  content: string;
  sources: MessageSource[];
  existingDocumentIds: Set<string>;
  /** Shown instead of the text while nothing has arrived yet. */
  status?: string;
  streaming?: boolean;
};

export function AssistantMessage({
  content,
  sources,
  existingDocumentIds,
  status,
  streaming = false,
}: AssistantMessageProps) {
  return (
    <div className="flex gap-3">
      <span
        aria-hidden
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10"
      >
        <BookOpenText className="size-4 text-primary" />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        {content ? (
          <>
            <Markdown>{content}</Markdown>
            {streaming && (
              <span aria-hidden className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-foreground/60 align-text-bottom" />
            )}
          </>
        ) : (
          <p className="flex items-center gap-2 py-0.5 text-muted-foreground" role="status">
            <span className="flex gap-1" aria-hidden>
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70" />
            </span>
            {status}
          </p>
        )}
        {!streaming && (
          <MessageSources sources={sources} existingDocumentIds={existingDocumentIds} />
        )}
      </div>
    </div>
  );
}
