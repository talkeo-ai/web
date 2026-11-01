"use client";

import { useSyncExternalStore } from "react";

import { LocaleSelector } from "@/components/locale-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { DARK_MODE_ENABLED } from "@/lib/theme";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { scrollBehavior } from "@/lib/motion";
import { cn } from "@/lib/utils";

const onScroll = (notify: () => void) => {
  window.addEventListener("scroll", notify, { passive: true });
  return () => window.removeEventListener("scroll", notify);
};

/**
 * Floating header. At the top of the page it has no bar at all: the logo and
 * the two controls sit straight on the page, on the same left edge as the
 * headline, the way the reference landings do it (1/nov) — a bar over a full
 * background read as a strip pasted on top. Once the page scrolls, a glass
 * bar fades in under them so they stay legible over whatever passes below.
 *
 * Pages reserve the space it covers themselves — it is out of the flow and
 * cannot push anything down.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const scrolled = useSyncExternalStore(
    onScroll,
    () => window.scrollY > 8,
    () => false,
  );

  return (
    // Leaves with the rest of the hero while the level check is on stage.
    <div className="fixed top-4 right-0 left-0 z-50 flex justify-center px-6 transition-opacity duration-500 in-data-level-stage:pointer-events-none in-data-level-stage:opacity-0">
      <nav
        className={cn(
          "flex w-full max-w-6xl items-center justify-between rounded-2xl py-2.5 sm:py-3",
          "transition-[background-color,box-shadow,padding] duration-300 ease-(--ease-standard)",
          scrolled
            ? "bg-background/85 px-3 shadow-[0_0_0_1px_rgb(255_255_255/0.6),0_1px_2px_rgb(28_25_23/0.05),0_8px_24px_-12px_rgb(28_25_23/0.12)] backdrop-blur-xl backdrop-saturate-150 sm:px-4 dark:shadow-[0_0_0_1px_rgb(255_255_255/0.08)]"
            : "bg-transparent px-0 shadow-none",
        )}
      >
        {/* A real link, so it is the way back from anywhere. On the home page
            there is nowhere to go, so it scrolls to the top instead — which is
            what it did everywhere before, and why deeper pages had to carry
            their own back link.
            Modifier clicks are left alone: swallowing them would turn
            "open in a new tab" into a scroll, on a link that looks ordinary. */}
        <Link
          href="/"
          onClick={(event) => {
            if (!isHome) return;
            if (
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey ||
              event.button !== 0
            ) {
              return;
            }
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: scrollBehavior() });
          }}
          className="text-foreground font-heading flex items-center gap-2 text-[19px] font-semibold tracking-[-0.025em] sm:gap-2.5 sm:text-[21px]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Talkeo"
            // A white ring around the orb: its blues are the sky's blues, and
            // without an edge it dissolved into the background (1/nov).
            className="size-7 rounded-full shadow-[0_0_0_2px_rgb(255_255_255),0_4px_12px_-2px_rgb(30_70_160/0.35)] sm:size-8"
          />
          Talkeo
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {DARK_MODE_ENABLED && <ThemeToggle />}
          <LocaleSelector />
        </div>
      </nav>
    </div>
  );
}
