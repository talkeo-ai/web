"use client";

import { useState, type ReactNode } from "react";

/**
 * Keeps something on screen until its exit has played.
 *
 * Unmounting the moment `show` turns false cuts the element mid-frame; this
 * holds the last content with `data-state="closed"` until its animation ends,
 * so the leaving is seen. The CSS for each state lives with the class the
 * caller passes (`auth-presence` in `globals.css` by default). Reduced motion
 * shortens every animation to nothing there but still ends it, so the content
 * then goes at once.
 */
export function Presence({
  show,
  children,
  className = "auth-presence",
}: {
  show: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [held, setHeld] = useState<ReactNode>(show ? children : null);
  const [mounted, setMounted] = useState(show);

  if (show && (!mounted || held !== children)) {
    setMounted(true);
    setHeld(children);
  }

  if (!mounted) return null;
  return (
    <div
      className={className}
      data-state={show ? "open" : "closed"}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget && !show) setMounted(false);
      }}
    >
      {held}
    </div>
  );
}
