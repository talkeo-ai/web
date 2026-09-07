"use client";

import { useEffect, useRef, useState } from "react";

/** How far from the bottom still counts as following along. */
const NEAR_BOTTOM_PX = 160;

function atBottom(node: HTMLElement): boolean {
  return (
    node.scrollTop + node.clientHeight >= node.scrollHeight - NEAR_BOTTOM_PX
  );
}

/**
 * A transcript that follows itself down, and stops the moment you read back.
 *
 * Three rules that each cost a bug to find:
 *
 * - It follows the **column's own height**, not how many words have been
 *   revealed. A bubble grows through a transition, so between one word and the
 *   next the box keeps getting taller; a scroll that only fires on the word
 *   falls behind and catches up in steps, which is a sawtooth. A
 *   `ResizeObserver` reports every frame the box actually changes, whatever
 *   moved it.
 * - Following is the default and stays that way **until the person scrolls
 *   up**. A programmatic scroll ends at the bottom too, so following keeps
 *   following without any flag to unset.
 * - It scrolls its own box rather than the page, because the page holds a
 *   second column that scrolls on its own.
 */
export function useFollowingScroll() {
  const viewport = useRef<HTMLDivElement>(null);
  const column = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const node = viewport.current;
    if (!node) return;

    const onScroll = () => {
      following.current = atBottom(node);
      // Only when something has actually gone under the top edge. With a short
      // conversation there is nothing above to fade, and a band of solid
      // colour over empty space reads as taller than the one at the foot,
      // which always has text running into it.
      setScrolled((was) => {
        const now = node.scrollTop > 1;
        return was === now ? was : now;
      });
    };

    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const node = column.current;
    const box = viewport.current;
    if (!node || !box) return;

    const observer = new ResizeObserver(() => {
      if (!following.current) return;
      box.scrollTop = box.scrollHeight;
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /** Takes the view back to the foot, whatever the person was reading. */
  const follow = () => {
    following.current = true;
  };

  return { viewport, column, scrolled, follow };
}
