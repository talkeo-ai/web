"use client";

import { cn } from "@/lib/utils";
import type { TurnLine } from "@/lib/talkeo/lines";

/**
 * What the assistant is saying, arriving a line at a time.
 *
 * Every line is in the DOM from the first frame and only its opacity moves, so
 * the paragraph has its final shape before a word of it is legible and nothing
 * reflows as the voice goes. Typing it out character by character would be the
 * other way round: cheaper to write, and a block that jumps on every frame.
 *
 * The fade is longer than the gap between lines on purpose — they overlap, so
 * the turn reads as one thing being said rather than a queue being drained.
 */
export function TurnText({
  lines,
  revealedLines,
  className,
}: {
  lines: TurnLine[];
  revealedLines: number;
  className?: string;
}) {
  return (
    <p className={cn("text-pretty", className)}>
      {lines.map((line, index) => (
        <span
          key={line.firstWordIndex}
          className={cn(
            "transition-opacity duration-200 ease-(--ease-standard)",
            index < revealedLines ? "opacity-100" : "opacity-0",
          )}
        >
          {line.words.join(" ")}
          {index < lines.length - 1 ? " " : null}
        </span>
      ))}
    </p>
  );
}
