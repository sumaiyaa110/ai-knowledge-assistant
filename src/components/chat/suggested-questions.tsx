"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

type SuggestedQuestionsProps = {
  conversationId: string;
  onPick: (question: string) => void;
};

/** Starter questions for an empty chat. Renders nothing if none are available. */
export function SuggestedQuestions({ conversationId, onPick }: SuggestedQuestionsProps) {
  const [questions, setQuestions] = useState<string[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/conversations/${conversationId}/suggestions`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { questions: [] }))
      .then((data: { questions: string[] }) => setQuestions(data.questions))
      .catch(() => {
        if (!controller.signal.aborted) setQuestions([]);
      });
    return () => controller.abort();
  }, [conversationId]);

  if (questions !== null && questions.length === 0) return null;

  return (
    <div className="w-full max-w-xl space-y-2">
      <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Sparkles className="size-3.5" />
        Suggested questions
      </p>
      {questions === null ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading suggested questions">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 rounded-xl" />
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {questions.map((question) => (
            <li key={question}>
              <button
                type="button"
                onClick={() => onPick(question)}
                className="w-full rounded-xl border bg-card px-3.5 py-2.5 text-left text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {question}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
