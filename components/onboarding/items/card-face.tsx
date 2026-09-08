"use client";

import type { ReactNode } from "react";

import type { Side } from "@/lib/onboarding/use-card-drag";
import { cn } from "@/lib/utils";

/**
 * What every card looks like, so no two exercises look like two products.
 *
 * A card is one thing, large, in the middle, and whatever answers it
 * underneath. The size is fixed rather than fitted to the word: cards of
 * different heights make the deck twitch between items, and the thing being
 * measured is how fast someone answers, not how fast they re-find the card.
 */
export function CardFace({
  children,
  footer,
  hints,
  side,
  commitment,
}: {
  /** The exercise itself — the word, the sentence, whatever is being asked. */
  children: ReactNode;
  /** The way to answer without dragging. */
  footer?: ReactNode;
  /** What each side means, if the card says so. */
  hints?: Partial<Record<Side, string>>;
  side: Side | null;
  commitment: number;
}) {
  return (
    <div className="relative flex min-h-[19rem] flex-col p-6">
      {hints ? (
        <div className="pointer-events-none absolute inset-x-6 top-6 flex justify-between">
          <Hint text={hints.left} lit={side === "left" ? commitment : 0} />
          <Hint text={hints.right} lit={side === "right" ? commitment : 0} />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        {children}
      </div>

      {footer ? <div className="pt-6">{footer}</div> : null}
    </div>
  );
}

/**
 * What letting go would say, brightening as it gets closer to saying it.
 *
 * Tied to the drag rather than shown outright: a label that is always there is
 * instructions, and one that answers the hand reads as the card responding.
 */
function Hint({ text, lit }: { text?: string; lit: number }) {
  if (!text) return <span />;

  return (
    <span
      className={cn(
        "border-border bg-background rounded-full border px-3 py-1",
        "text-text-secondary text-xs font-semibold tracking-wide uppercase",
      )}
      style={{ opacity: 0.25 + lit * 0.75 }}
    >
      {text}
    </span>
  );
}
