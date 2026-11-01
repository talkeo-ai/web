"use client";

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * The hero's full-bleed background: a generated image behind the whole first
 * screen, header included, fading into the page at the bottom so the section
 * below starts on plain ground.
 *
 * TEMPORARY while one is picked (1/nov): `?bg=1..4` switches between the four
 * candidates in `public/hero/`. Read on the client so the landing stays a
 * static page; once one is chosen this becomes a plain image and the query
 * goes away.
 */
const CANDIDATES = {
  "1": "/hero/bg1-subtle.webp",
  "2": "/hero/bg2-sky.webp",
  "3": "/hero/bg3-aurora.webp",
  "4": "/hero/bg4-glass.webp",
} as const;
type Pick = keyof typeof CANDIDATES;
const DEFAULT: Pick = "3";

export function HeroBackdrop() {
  // The query is read as an external store: the server renders the default,
  // the client swaps in what the URL asks for after hydration.
  const pick = useSyncExternalStore(
    noSubscribe,
    () => {
      const asked = new URLSearchParams(window.location.search).get("bg");
      return asked && asked in CANDIDATES ? (asked as Pick) : DEFAULT;
    },
    () => DEFAULT,
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CANDIDATES[pick]}
        alt=""
        fetchPriority="high"
        className="size-full object-cover object-right"
      />
      <div className="to-background absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent" />
    </div>
  );
}
