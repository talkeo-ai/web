"use client";

import { useEffect, useRef, useState } from "react";

/** How far from the bottom still counts as following along. */
const NEAR_BOTTOM_PX = 160;

function atBottom(node: HTMLElement): boolean {
  return node.scrollTop + node.clientHeight >= node.scrollHeight - NEAR_BOTTOM_PX;
}

/**
 * A thread that follows itself down, and stops the moment somebody reads back.
 *
 * Three rules, each of which cost a bug to find:
 *
 * - It follows the **column's own height**, not how many words have been
 *   revealed. A bubble grows through a transition, so between one word and the
 *   next the box keeps getting taller; a scroll that only fires on the word
 *   falls behind and catches up in steps, which is a sawtooth. A
 *   `ResizeObserver` reports every frame the box actually changes, whatever
 *   moved it.
 * - Following is the default and stays that way **until they scroll up**. A
 *   programmatic scroll ends at the bottom too, so following keeps following
 *   with no flag to unset.
 * - It scrolls **its own box** and not the page, because the page holds another
 *   view that scrolls on its own.
 *
 * The smoothness comes from how often it runs, not from `behavior: "smooth"` —
 * so there is no animation of ours for the person's own scrolling to fight.
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
      // conversation there is nothing above to fade, and a band of colour over
      // empty space reads as taller than the one at the foot, which always has
      // text running into it.
      setScrolled((was) => {
        const now = node.scrollTop > 1;
        return was === now ? was : now;
      });
    };

    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const inner = column.current;
    const box = viewport.current;
    if (!inner || !box) return;

    const observer = new ResizeObserver(() => {
      if (!following.current) return;
      box.scrollTop = box.scrollHeight;
    });

    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  /** Take the view back to the foot, whatever they were reading. */
  const follow = () => {
    following.current = true;
    const box = viewport.current;
    if (box) box.scrollTop = box.scrollHeight;
  };

  return { viewport, column, scrolled, follow };
}
