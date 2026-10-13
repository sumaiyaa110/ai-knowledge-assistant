"use client";

import { ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/models/study";

const LETTERS = ["A", "B", "C", "D"];

/** One question at a time: pick an answer, see whether it was right and why, move on. */
export function QuizPlayer({ questions }: { questions: QuizQuestion[] }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [finished, setFinished] = useState(false);

  const score = answers.filter((answer, i) => answer === questions[i].answerIndex).length;

  function restart() {
    setAnswers(questions.map(() => null));
    setIndex(0);
    setFinished(false);
  }

  if (finished) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Your score</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums">
            {score} / {questions.length}
          </p>
          <Button className="mt-4" onClick={restart}>
            <RotateCcw />
            Try again
          </Button>
        </div>

        <ol className="space-y-3">
          {questions.map((question, i) => {
            const correct = answers[i] === question.answerIndex;
            return (
              <li key={question.question} className="rounded-xl border bg-card p-4 text-sm">
                <p className="flex items-start gap-2 font-medium">
                  {correct ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <X className="mt-0.5 size-4 shrink-0 text-destructive" />
                  )}
                  <span>
                    <span className="sr-only">{correct ? "Correct: " : "Incorrect: "}</span>
                    {question.question}
                  </span>
                </p>
                <div className="mt-2 space-y-1 pl-6 text-muted-foreground">
                  {!correct && answers[i] !== null && (
                    <p>Your answer: {question.options[answers[i]!]}</p>
                  )}
                  <p>Correct answer: {question.options[question.answerIndex]}</p>
                  <p>{question.explanation}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  const question = questions[index];
  const chosen = answers[index];
  const answered = chosen !== null;
  const isLast = index === questions.length - 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          Question {index + 1} of {questions.length}
          {question.pageNumber !== null && ` · from page ${question.pageNumber}`}
        </span>
        <span className="tabular-nums">Score: {score}</span>
      </div>
      <div
        role="progressbar"
        aria-label="Quiz progress"
        aria-valuemin={0}
        aria-valuemax={questions.length}
        aria-valuenow={index + (answered ? 1 : 0)}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-medium">{question.question}</h2>

        <ul className="mt-4 space-y-2">
          {question.options.map((option, i) => {
            const isCorrect = i === question.answerIndex;
            const isChosen = i === chosen;
            return (
              <li key={option}>
                <button
                  type="button"
                  disabled={answered}
                  onClick={() => setAnswers((current) => current.map((a, j) => (j === index ? i : a)))}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    !answered && "hover:bg-muted",
                    answered && isCorrect && "border-emerald-600/40 bg-emerald-600/10",
                    answered && isChosen && !isCorrect && "border-destructive/40 bg-destructive/10",
                    answered && !isCorrect && !isChosen && "opacity-60",
                  )}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium">
                    {LETTERS[i]}
                  </span>
                  <span className="min-w-0 flex-1">{option}</span>
                  {answered && isCorrect && (
                    <Check aria-label="Correct answer" className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  )}
                  {answered && isChosen && !isCorrect && (
                    <X aria-label="Your answer, incorrect" className="size-4 shrink-0 text-destructive" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {answered && (
          <div role="status" className="mt-4 rounded-lg bg-muted px-3.5 py-3 text-sm">
            <p className="font-medium">
              {chosen === question.answerIndex ? "Correct." : "Not quite."}
            </p>
            <p className="mt-1 text-muted-foreground">{question.explanation}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          disabled={!answered}
          onClick={() => (isLast ? setFinished(true) : setIndex(index + 1))}
        >
          {isLast ? "See results" : "Next question"}
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
