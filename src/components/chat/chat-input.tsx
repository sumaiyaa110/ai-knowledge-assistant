"use client";

import { ArrowUp, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MAX_QUESTION_CHARS } from "@/models/chat";

type ChatInputProps = {
  onSend: (text: string) => void;
  /** When set, the send button becomes a stop button while `busy`. */
  onStop?: () => void;
  busy?: boolean;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
};

const MAX_HEIGHT_PX = 200;

export function ChatInput({
  onSend,
  onStop,
  busy = false,
  disabled = false,
  placeholder = "Ask about your documents…",
  autoFocus = false,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Grow with the text, up to a limit, then scroll. Re-measured when the
  // text changes and when the box changes width (window resize, drawer
  // opening), since the same text wraps differently at another width.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    let lastWidth = -1;
    const fit = () => {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT_PX)}px`;
    };
    fit();

    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      if (width !== lastWidth) {
        lastWidth = width;
        fit();
      }
    });
    observer.observe(textarea);
    return () => observer.disconnect();
  }, [value]);

  const canSend = !busy && !disabled && value.trim().length > 0;

  function submit() {
    if (!canSend) return;
    onSend(value.trim());
    setValue("");
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-xs focus-within:ring-3 focus-within:ring-ring/40"
    >
      <label htmlFor="chat-input" className="sr-only">
        Your question
      </label>
      <textarea
        id="chat-input"
        ref={textareaRef}
        rows={1}
        value={value}
        maxLength={MAX_QUESTION_CHARS}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          // Enter sends, Shift+Enter makes a new line. Ignore Enter while an
          // IME composition (e.g. Bangla, Japanese input) is in progress.
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            submit();
          }
        }}
        className="max-h-[200px] min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
      />
      {busy && onStop ? (
        <Button type="button" size="icon" variant="outline" aria-label="Stop" onClick={onStop}>
          <Square className="fill-current" />
        </Button>
      ) : (
        <Button type="submit" size="icon" aria-label="Send" disabled={!canSend}>
          <ArrowUp />
        </Button>
      )}
    </form>
  );
}
