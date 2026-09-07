"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * The last thing Talkeo said, tucked behind the composer in the panel.
 *
 * Narrower than the composer and overlapped by it, so it reads as a card
 * behind the one you are using rather than as a second control stacked on top.
 * Collapsed it is one line; open, it grows upward and pushes nothing — the
 * composer is what the hand is on and it does not move.
 */

/** Longer than the row's own 320ms, so one settles inside the other. */
const REVEAL_MS = 460;

export function LatestTurn({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative z-0 mx-6 -mb-5">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        data-slot="latest-turn"
        className={cn(
          "bg-surface-tertiary border-border w-full cursor-pointer rounded-2xl border",
          // Enough padding under the header to clear the composer overlapping
          // it, and no more: the rest was height the collapsed card did not
          // need.
          "pt-2 pb-6 text-left outline-none",
          "transition-colors duration-(--duration-control) ease-(--ease-standard)",
          "hover:border-border-strong focus-visible:border-border-strong",
        )}
      >
        <span className="flex items-center gap-2 px-4">
          <span className="text-text-secondary flex-1 truncate text-sm">
            {label}
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className={cn(
              "text-text-tertiary size-4 shrink-0",
              "transition-transform duration-(--duration-control) ease-(--ease-standard)",
              open ? "rotate-90" : "rotate-0",
            )}
          >
            <path d="m9 5 7 7-7 7" />
          </svg>
        </span>

        {/* `minmax(0, …)` on both ends: a bare `0fr` keeps the track at the
            content's own minimum and the row never actually closes. */}
        <span
          className="grid transition-[grid-template-rows] duration-(--duration-highlight-out) ease-(--ease-standard)"
          style={{
            gridTemplateRows: open ? "minmax(0, 1fr)" : "minmax(0, 0fr)",
          }}
        >
          <span className="overflow-hidden">
            {/* The row opening only uncovers the text; on its own that reads
                as a shutter going up over something already there. Resolving
                out of blur alongside it reads as the sentence arriving, which
                is how the same sentence arrives in the column.

                Slower than the row and starting with it, so the text is still
                settling when the height has finished — the two overlap instead
                of finishing together on a hard stop. */}
            <span
              className="text-foreground block px-4 pt-2 text-[15px] leading-[1.6] text-pretty"
              style={{
                opacity: open ? 1 : 0,
                filter: open ? "blur(0px)" : "blur(5px)",
                transition: `opacity ${REVEAL_MS}ms var(--ease-standard), filter ${REVEAL_MS}ms var(--ease-standard)`,
              }}
            >
              {text}
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}
