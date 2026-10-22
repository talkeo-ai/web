"use client";

import { useEffect } from "react";

/**
 * Says on <html> whether the last thing somebody did was the keyboard, which is
 * what the `focus-key` variant draws rings on (`globals.css`).
 *
 * Only the keys that move focus count: typing a message is not navigating, and
 * a ring popping up on the send button mid-sentence would be the same stray
 * ring this exists to stop.
 */
const NAVIGATING = new Set([
  "Tab",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
]);

export function FocusModality() {
  useEffect(() => {
    const root = document.documentElement;
    const onKey = (event: KeyboardEvent) => {
      if (NAVIGATING.has(event.key)) root.dataset.modality = "keyboard";
    };
    const onPointer = () => {
      delete root.dataset.modality;
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointer, true);
    };
  }, []);
  return null;
}
