"use client";

import { LocaleSelector } from "@/components/locale-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { scrollBehavior } from "@/lib/motion";

/**
 * Floating header: a fixed wrapper that centres a rounded bar over the page
 * rather than a full-width band pinned to the top edge.
 *
 * It is translucent and blurred, so whatever scrolls underneath stays visible
 * through it. Pages reserve the space it covers themselves — the bar is out of
 * the flow and cannot push anything down.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <div className="fixed top-4 right-0 left-0 z-50 flex justify-center px-6">
      <nav className="bg-background/90 border-separator flex w-full max-w-6xl items-center justify-between rounded-2xl border px-3 py-2.5 shadow-sm backdrop-blur-xl sm:px-4 sm:py-3">
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
          className="text-foreground font-heading flex items-center gap-1.5 text-base font-semibold sm:gap-2 sm:text-lg"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Talkeo"
            className="size-6 rounded-full sm:size-7"
          />
          Talkeo
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <LocaleSelector />
        </div>
      </nav>
    </div>
  );
}
