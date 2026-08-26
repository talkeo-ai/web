"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useRef } from "react";

import { scrollBehavior } from "@/lib/motion";

import { SURFACES } from "./surfaces";

/** How many items an arrow press moves. */
const STEP = 2;

/**
 * A single row of practice types that pages sideways.
 *
 * The row is a real scroll container rather than a transformed track, so a
 * touch drag works without any code and the keyboard can reach every item.
 * The arrows drive the same scroll position they would.
 *
 * Distance per press is measured off the rendered items instead of assumed:
 * the labels are translated, so their widths change with the locale and any
 * hard-coded figure would page past items in one language and stop short in
 * another.
 *
 * At either end the next press wraps to the other end — a rotating list would
 * mean cloning nodes, and there is no gain in it for ten items.
 */
export function SurfacesBar() {
  const t = useTranslations("surfaces");
  const trackRef = useRef<HTMLDivElement>(null);
  // Where the arrows have driven the row to. Kept here rather than read back
  // from `scrollLeft`, because a smooth scroll reports its old position until
  // the animation lands — so two quick presses would both read the same
  // starting offset and the second would be swallowed.
  const targetRef = useRef(0);

  const page = useCallback((direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;

    const items = track.children;
    if (items.length === 0) return;

    // `scrollWidth - clientWidth` is the furthest the row can go. Zero means
    // everything already fits and there is nothing to page through.
    const max = track.scrollWidth - track.clientWidth;
    if (max <= 0) return;

    // Item pitch, gap included: the distance between two consecutive left
    // edges. Falls back to the first item's own width when there is only one.
    const first = items[0] as HTMLElement;
    const second = items[1] as HTMLElement | undefined;
    const pitch = second
      ? second.offsetLeft - first.offsetLeft
      : first.offsetWidth;

    // The 1px of slack absorbs subpixel rounding, which otherwise leaves an
    // end permanently just out of reach and the wrap never fires.
    const current = targetRef.current;
    const next = current + direction * pitch * STEP;
    const target =
      direction === 1
        ? current >= max - 1
          ? 0
          : Math.min(next, max)
        : current <= 1
          ? max
          : Math.max(next, 0);

    targetRef.current = target;
    track.scrollTo({ left: target, behavior: scrollBehavior() });
  }, []);

  // A touch drag moves the row without going through the arrows, which would
  // leave the tracked position stale. `scrollend` fires once the row settles,
  // whichever moved it.
  const syncTarget = useCallback(() => {
    if (trackRef.current) targetRef.current = trackRef.current.scrollLeft;
  }, []);

  return (
    <section className="border-border/60 border-t">
      {/* Tighter at phone sizes: the row shares the first screen with the
          whole hero there, so it keeps its story in about two-thirds of the
          height it gets on desktop. */}
      <div className="mx-auto flex max-w-6xl items-center gap-1.5 px-3 py-3 sm:gap-4 sm:px-6 sm:py-5">
        <Arrow
          direction="left"
          onClick={() => page(-1)}
          label={t("previous")}
        />

        <div
          ref={trackRef}
          data-slot="surfaces-track"
          onScrollEnd={syncTarget}
          className={[
            // No `scroll-smooth`: the arrows pass an explicit behaviour, which
            // by spec wins over the CSS property anyway.
            "flex flex-1 gap-4 overflow-x-auto select-none sm:gap-8",
            // The row pages in whole items, so the native scrollbar would only
            // duplicate a control that is already on screen.
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          ].join(" ")}
        >
          {SURFACES.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="text-text-secondary flex shrink-0 items-center gap-2 sm:gap-2.5"
            >
              <Icon className="size-4 shrink-0 sm:size-5" aria-hidden />
              <span className="text-[11px] font-bold tracking-[0.8px] whitespace-nowrap uppercase sm:text-[13px]">
                {t(key)}
              </span>
            </div>
          ))}
        </div>

        <Arrow direction="right" onClick={() => page(1)} label={t("next")} />
      </div>
    </section>
  );
}

function Arrow({
  direction,
  onClick,
  label,
}: {
  direction: "left" | "right";
  onClick: () => void;
  label: string;
}) {
  const Icon = direction === "left" ? ChevronLeftIcon : ChevronRightIcon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="text-text-tertiary hover:text-foreground focus-visible:ring-ring shrink-0 cursor-pointer rounded-lg p-1 transition-colors duration-(--duration-control) ease-(--ease-standard) focus-visible:ring-2 focus-visible:outline-none"
    >
      <Icon className="size-5" />
    </button>
  );
}
