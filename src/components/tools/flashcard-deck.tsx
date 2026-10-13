"use client";

import { ArrowLeft, ArrowRight, RotateCw, Shuffle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Flashcard } from "@/models/study";

/** A deck to flip through: click the card (or press Space/Enter) to see the answer. */
export function FlashcardDeck({ cards }: { cards: Flashcard[] }) {
  const [order, setOrder] = useState(() => cards.map((_, i) => i));
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = cards[order[position]];

  function go(next: number) {
    setPosition(Math.min(Math.max(next, 0), cards.length - 1));
    setFlipped(false);
  }

  function shuffle() {
    const next = [...order];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    setOrder(next);
    setPosition(0);
    setFlipped(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span className="tabular-nums">
          Card {position + 1} of {cards.length}
          {card.pageNumber !== null && ` · from page ${card.pageNumber}`}
        </span>
        <Button variant="ghost" size="sm" onClick={shuffle}>
          <Shuffle />
          Shuffle
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setFlipped(!flipped)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") go(position + 1);
          if (event.key === "ArrowLeft") go(position - 1);
        }}
        aria-label={flipped ? "Showing the answer. Show the question" : "Showing the question. Show the answer"}
        className="flex min-h-64 w-full flex-col items-center justify-center gap-4 rounded-2xl border bg-card p-6 text-center transition-colors outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-10"
      >
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {flipped ? "Answer" : "Question"}
        </span>
        <span aria-live="polite" className={flipped ? "text-base leading-relaxed" : "text-xl font-medium"}>
          {flipped ? card.back : card.front}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <RotateCw className="size-3" />
          {flipped ? "Click to see the question" : "Click to see the answer"}
        </span>
      </button>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" disabled={position === 0} onClick={() => go(position - 1)}>
          <ArrowLeft />
          Previous
        </Button>
        <Button disabled={position === cards.length - 1} onClick={() => go(position + 1)}>
          Next
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
