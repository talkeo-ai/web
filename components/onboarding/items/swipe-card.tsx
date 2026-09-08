"use client";

import { useState, type ReactNode } from "react";

import { CARD_IN_MS } from "@/lib/onboarding/motion";
import { useCardDrag, type Side } from "@/lib/onboarding/use-card-drag";
import { cn } from "@/lib/utils";

/**
 * Degrees per pixel of drag. Enough to feel hinged, short of spinning.
 *
 * The deck needs it too: a card leaves from the angle the hand left it at, so
 * both have to derive the tilt from the same number.
 */
export const CARD_TILT = 1 / 16;

/** Where a card was when it was answered, so it can carry on from there. */
export type CardExit = { side: Side; fromX: number };

export type CardControls = {
  /** Answer with a side, from a button rather than a drag. */
  answer: (side: Side) => void;
  /** Which way it is being pulled, and how close that is to answering. */
  side: Side | null;
  commitment: number;
};

/**
 * One card, and the hand on it.
 *
 * It follows the pointer, tips as it goes, and springs back if let go short of
 * an answer. What it does not do is leave: a card that has been answered is
 * still on screen, and putting the exit here would mean the card animating
 * itself out of a tree that is about to unmount it. The deck owns leaving,
 * because the deck is what outlives a card.
 *
 * Once answered it goes still — held where it was let go, deaf to everything.
 * A card that can be answered twice while it flies away is a card that sends
 * two attempts for one word.
 */
export function SwipeCard({
  allow = { left: true, right: true },
  onSwipe,
  children,
}: {
  /** Which sides answer this card. A side left out resists and never commits. */
  allow?: Record<Side, boolean>;
  onSwipe: (exit: CardExit) => void;
  children: (controls: CardControls) => ReactNode;
}) {
  const [spent, setSpent] = useState(false);

  const play = (side: Side, fromX: number) => {
    if (spent) return;
    setSpent(true);
    onSwipe({ side, fromX });
  };

  // The offset comes back with the side rather than being read from state: it
  // is about to be cleared, and a card flicked halfway across has to leave from
  // halfway across instead of snapping back to centre first.
  const { dx, held, commitment, handleProps } = useCardDrag({
    allow,
    onCommit: play,
  });

  const side: Side | null = dx === 0 ? null : dx < 0 ? "left" : "right";

  return (
    <div
      {...(spent ? {} : handleProps)}
      className={cn(
        "border-border bg-surface-tertiary rounded-3xl border select-none",
        // Vertical scrolling still belongs to the page: a deck that swallows it
        // traps a phone on the card.
        "touch-pan-y",
        spent ? "pointer-events-none" : held ? "cursor-grabbing" : "cursor-grab",
      )}
      style={{
        transform: `translate3d(${dx}px, 0, 0) rotate(${dx * CARD_TILT}deg)`,
        // Nothing eases while it is held: the pointer is the animation, and
        // easing behind it turns dragging into chasing.
        transition:
          held || spent
            ? undefined
            : `transform ${CARD_IN_MS}ms var(--ease-entrance)`,
      }}
    >
      {children({ answer: (chosen) => play(chosen, dx), side, commitment })}
    </div>
  );
}
