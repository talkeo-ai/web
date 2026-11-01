"use client";

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * The hero's full-bleed background: a morning sky behind the whole first
 * screen, header included, fading into the page at the bottom so the section
 * below starts on plain ground. The stage (`LevelCheck`) keeps it under a
 * frosted veil, and `/level` renders it too.
 *
 * Two sizes, so a phone does not download the 2560px file.
 *
 * TEMPORARY (1/nov): `?bg=a1..a4` swaps in alternative skies while the sky is
 * being decided. Read on the client so the landing stays static; this goes
 * away once one is kept.
 */
const SKY = { src: "/hero/sky.webp", small: "/hero/sky-1280.webp" };
const ALTERNATIVES: Record<string, string> = {
  a1: "/hero/alt-pastel.webp",
  a2: "/hero/alt-cloudwall.webp",
  a3: "/hero/alt-stratosphere.webp",
  a4: "/hero/alt-techsky.webp",
};

export function HeroBackdrop() {
  const alternative = useSyncExternalStore(
    noSubscribe,
    () => ALTERNATIVES[new URLSearchParams(window.location.search).get("bg") ?? ""] ?? null,
    () => null,
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={alternative ?? SKY.src}
        srcSet={alternative ? undefined : `${SKY.small} 1280w, ${SKY.src} 2560w`}
        sizes="100vw"
        alt=""
        fetchPriority="high"
        // The phone crops a narrow window out of a wide picture: there it
        // takes the open sky, so the clouds do not sit behind the headline.
        className="size-full object-cover object-[28%_50%] lg:object-right"
      />
      {/* A faint light from the left, under the copy: the wisps that drift
          toward the middle otherwise cross the headline and the line below. */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/35 via-white/10 to-transparent dark:from-black/30 dark:via-black/10" />
      <div className="to-background absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent" />
    </div>
  );
}
