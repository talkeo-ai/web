"use client";

import { useEffect, useRef, useState } from "react";

/** How far from the bottom still counts as following along. */
const NEAR_BOTTOM_PX = 160;
/**
 * How quickly the view closes on the foot: each frame it covers the share of
 * the way left that this time constant gives. 70 ms is most of the way in a
 * fifth of a second, which reads as a glide and still keeps a growing card in
 * view.
 */
const CATCH_UP_MS = 70;

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
 * The glide is ours, one loop that closes on the foot a share at a time, and
 * not the browser's `behavior: "smooth"`.
 *
 * ⚠ A card comes in growing over a few hundred milliseconds, and every frame of
 * that growth asked for a new smooth scroll. Each one restarted the browser's
 * own animation from where it stood, so it never caught up: the card sat cut
 * off at the foot for most of a second (Joaquin, 22/oct). A loop that is only
 * ever told where the foot is now cannot restart.
 */
export function useFollowingScroll() {
  const viewport = useRef<HTMLDivElement>(null);
  const column = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  // Where the loop last put the view, so its own scrolling is not read as
  // theirs. Null when it is not moving it.
  const placed = useRef<number | null>(null);
  const glide = useRef(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const node = viewport.current;
    if (!node) return;

    let lastTop = node.scrollTop;
    const onScroll = () => {
      // Only their scrolling UP lets go. A card growing faster than our own
      // glide toward the foot left the view more than the margin behind for a
      // moment, and judging by distance alone read that as them reading back:
      // the scroll stopped halfway down the card.
      const top = node.scrollTop;
      const ours = placed.current !== null && Math.abs(top - placed.current) < 1;
      if (atBottom(node)) following.current = true;
      else if (!ours && top < lastTop) following.current = false;
      lastTop = top;
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

    let last = 0;
    const step = (now: number) => {
      const foot = box.scrollHeight - box.clientHeight;
      const behind = foot - box.scrollTop;
      if (!following.current || Math.abs(behind) < 0.5) {
        glide.current = 0;
        placed.current = null;
        return;
      }
      // The first frame of a glide has no frame before it; one at 60 Hz.
      const dt = last ? Math.min(now - last, 50) : 16;
      last = now;
      const share = 1 - Math.exp(-dt / CATCH_UP_MS);
      // A couple of pixels are simply closed, and a step is never under one:
      // the browser rounds the scroll position, and a step it rounded away
      // would leave the view a hair off the foot for good.
      const move = Math.sign(behind) * Math.max(1, Math.abs(behind) * share);
      const top = Math.abs(behind) <= 2 ? foot : box.scrollTop + move;
      placed.current = top;
      box.scrollTop = top;
      glide.current = requestAnimationFrame(step);
    };

    const observer = new ResizeObserver(() => {
      if (!following.current || glide.current) return;
      last = 0;
      glide.current = requestAnimationFrame(step);
    });

    observer.observe(inner);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(glide.current);
      glide.current = 0;
    };
  }, []);

  /** Take the view back to the foot, whatever they were reading. */
  const follow = () => {
    following.current = true;
    const box = viewport.current;
    if (box) box.scrollTop = box.scrollHeight;
  };

  return { viewport, column, scrolled, follow };
}
