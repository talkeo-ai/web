"use client";

import { useRef, useState } from "react";

import { CARD_COMMIT_PX, CARD_RESIST_PX } from "@/lib/onboarding/motion";

/** What a press belongs to rather than to the card under it. */
const INTERACTIVE = "button, input, textarea, select, a, [data-no-drag]";

export type Side = "left" | "right";

/**
 * Dragging a card sideways, and what that says.
 *
 * Pointer events rather than mouse and touch apart: one stream covers a mouse,
 * a finger and a pen, and capture keeps the card following a pointer that has
 * already left it — without that, dragging fast enough to matter loses the
 * card halfway across.
 *
 * Only the horizontal axis is read. A card is a yes or a no, and honouring
 * vertical drag would mean deciding what up means.
 *
 * A side that is not on offer still moves, but only a little and never far
 * enough to commit. A card that refuses to budge reads as broken; one that
 * gives a bit and comes back reads as a no.
 */
export function useCardDrag({
  allow,
  onCommit,
}: {
  /** Which sides answer. A side left out resists instead. */
  allow: Record<Side, boolean>;
  /** Given the side and where the card was when it was let go. */
  onCommit: (side: Side, dx: number) => void;
}) {
  const [dx, setDx] = useState(0);
  /** True while the pointer is down: the card follows, it does not ease. */
  const [held, setHeld] = useState(false);
  const from = useRef(0);

  const clamp = (raw: number) => {
    const side: Side = raw < 0 ? "left" : "right";
    if (allow[side]) return raw;
    // Diminishing return rather than a hard stop, so the edge is felt instead
    // of hit.
    const over = Math.abs(raw);
    return Math.sign(raw) * CARD_RESIST_PX * (1 - 1 / (1 + over / 120));
  };

  const handleProps = {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      // A primary press only: a right-click or a second finger mid-drag would
      // otherwise reset the origin and make the card jump.
      if (!event.isPrimary || event.button !== 0) return;

      // ⚠ A press that starts on a control is that control's, and the card
      // must not take the pointer off it. Capturing sends the click to the
      // capturing element instead of the button under the finger, so with this
      // missing every button inside a card is dead and the field cannot be
      // typed into — while the card itself looks perfectly fine.
      if ((event.target as HTMLElement).closest(INTERACTIVE)) return;

      event.currentTarget.setPointerCapture(event.pointerId);
      from.current = event.clientX;
      setHeld(true);
    },
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
      if (!held) return;
      setDx(clamp(event.clientX - from.current));
    },
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => {
      if (!held) return;
      event.currentTarget.releasePointerCapture(event.pointerId);
      setHeld(false);

      const side: Side = dx < 0 ? "left" : "right";
      if (Math.abs(dx) >= CARD_COMMIT_PX && allow[side]) onCommit(side, dx);
      setDx(0);
    },
    onPointerCancel: () => {
      setHeld(false);
      setDx(0);
    },
  };

  return {
    dx,
    held,
    /** How close letting go is to answering, 0 to 1. Drives the hints. */
    commitment: Math.min(Math.abs(dx) / CARD_COMMIT_PX, 1),
    handleProps,
  };
}
