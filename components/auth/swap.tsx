"use client";

import { useState, type ReactNode } from "react";

/**
 * One step at a time, in place: the step that is leaving fades out, and only
 * then does the next one rise in where it was.
 *
 * Two `Presence`s side by side would overlap for the length of the exit and
 * push the card around; here the outgoing step keeps the space until it is
 * gone. Reduced motion shortens the animations to nothing in `globals.css`
 * but still ends them, so the swap is then immediate.
 */
export function Swap<Step extends string>({
  step,
  render,
}: {
  step: Step;
  render: (step: Step) => ReactNode;
}) {
  const [shown, setShown] = useState(step);
  const leaving = shown !== step;

  return (
    <div
      key={shown}
      className="auth-presence"
      data-state={leaving ? "closed" : "open"}
      onAnimationEnd={(event) => {
        // A line animating inside the step bubbles its own end up to here.
        if (event.target === event.currentTarget && leaving) setShown(step);
      }}
    >
      {render(shown)}
    </div>
  );
}
