"use client";

import { useRef, useState } from "react";

/** How far a card has to travel before letting go answers it. */
export const CARD_COMMIT_PX = 110;
/**
 * A push that answers short of the line: let go while moving at least this
 * fast (px/ms, over the last ~100 ms) and past `FLICK_MIN_PX`, the way the
 * cards in Tinder and its kind read a throw. Without it only distance counted,
 * and a quick shove released short came back (Joaquin, 1/nov).
 */
const FLICK_PX_PER_MS = 0.45;
const FLICK_MIN_PX = 36;
const FLICK_WINDOW_MS = 100;
/** How far a side that does not answer still gives before it stops. */
const CARD_RESIST_PX = 56;

/** What a press belongs to rather than to the card under it. */
const INTERACTIVE = "button, input, textarea, select, a, [data-no-drag]";

export type Side = "left" | "right";

/**
 * Dragging a card sideways, and what that says. Carried over from the
 * onboarding's deck of 7/sep (`feat/contract-v2`, d85d301), which never
 * reached `main`.
 *
 * Pointer events rather than mouse and touch apart: one stream covers a mouse,
 * a finger and a pen, and capture keeps the card following a pointer that has
 * already left it — without that, dragging fast loses the card halfway across.
 *
 * Only the horizontal axis is read. A side that is not on offer still moves,
 * but only a little and never far enough to commit: a card that refuses to
 * budge reads as broken; one that gives a bit and comes back reads as a no.
 */
export function useCardDrag({
  allow = { left: true, right: true },
  onCommit,
}: {
  allow?: Record<Side, boolean>;
  /** Given the side and where the card was when it was let go. */
  onCommit: (side: Side, dx: number) => void;
}) {
  const [dx, setDx] = useState(0);
  /** True while the pointer is down: the card follows, it does not ease. */
  const [held, setHeld] = useState(false);
  const from = useRef(0);
  // ⚠ The handlers read these, never the state. A fast flick delivers down,
  // move and up before React renders in between, so all three run on one
  // render's closures: read from state, the up saw "not held", returned, and
  // the card stayed held with the button released, following the bare mouse
  // until a reload (Joaquin, 1/nov). The state is only what gets drawn.
  const heldNow = useRef(false);
  const dxNow = useRef(0);
  /** Recent positions, to read how fast the card was going when let go. */
  const trail = useRef<{ x: number; t: number }[]>([]);

  const release = () => {
    heldNow.current = false;
    dxNow.current = 0;
    trail.current = [];
    setHeld(false);
    setDx(0);
  };

  const clamp = (raw: number) => {
    const side: Side = raw < 0 ? "left" : "right";
    if (allow[side]) return raw;
    const over = Math.abs(raw);
    return Math.sign(raw) * CARD_RESIST_PX * (1 - 1 / (1 + over / 120));
  };

  const handleProps = {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      if (!event.isPrimary || event.button !== 0) return;
      // ⚠ A press that starts on a control is that control's: capturing would
      // send its click to the card instead, and every button on it goes dead.
      if ((event.target as HTMLElement).closest(INTERACTIVE)) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      from.current = event.clientX;
      heldNow.current = true;
      dxNow.current = 0;
      trail.current = [{ x: 0, t: event.timeStamp }];
      setHeld(true);
    },
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
      if (!heldNow.current) return;
      const next = clamp(event.clientX - from.current);
      dxNow.current = next;
      const t = event.timeStamp;
      trail.current = [...trail.current.filter((p) => t - p.t <= FLICK_WINDOW_MS), { x: next, t }];
      setDx(next);
    },
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => {
      if (!heldNow.current) return;
      const at = dxNow.current;
      const recent = trail.current.filter((p) => event.timeStamp - p.t <= FLICK_WINDOW_MS);
      const first = recent[0];
      const speed = first && event.timeStamp > first.t ? (at - first.x) / (event.timeStamp - first.t) : 0;
      release();
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      const side: Side = at < 0 ? "left" : "right";
      const thrown =
        Math.abs(at) >= FLICK_MIN_PX && Math.abs(speed) >= FLICK_PX_PER_MS && Math.sign(speed) === Math.sign(at);
      if ((Math.abs(at) >= CARD_COMMIT_PX || thrown) && allow[side]) onCommit(side, at);
    },
    onPointerCancel: () => {
      if (heldNow.current) release();
    },
    // The browser can take the pointer away without an up (the window loses
    // focus, a system gesture): the card goes back instead of staying held.
    onLostPointerCapture: () => {
      if (heldNow.current) release();
    },
  };

  return {
    dx,
    held,
    /** How close letting go is to answering, 0 to 1. Drives the stamps. */
    commitment: Math.min(Math.abs(dx) / CARD_COMMIT_PX, 1),
    handleProps,
  };
}
