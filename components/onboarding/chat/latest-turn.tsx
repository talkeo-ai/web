"use client";

import { useState } from "react";

import { TalkeoSaid } from "@/components/onboarding/chat/bubble";
import { cn } from "@/lib/utils";

/**
 * The last thing Talkeo said, tucked behind the composer in the panel.
 *
 * What opens is the same bubble the transcript draws — same component, same
 * typography, same measure. Anything else would be a second way of showing the
 * assistant talking, and then the panel and the column would be two products
 * agreeing by accident.
 *
 * Collapsed it is one line; open, it grows upward and pushes nothing — the
 * composer is what the hand is on and it does not move.
 */

/** Longer than the row's own 320ms, so one settles inside the other. */
const REVEAL_MS = 460;

export function LatestTurn({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);

  return (
    // Inset just enough to sit inside the composer's edges. Any more and the
    // two read as unrelated boxes; flush, and the card stops being the one
    // behind.
    <div className="relative z-0 mx-4 -mb-5">
      <div
        data-slot="latest-turn"
        className={cn(
          // A step below the page rather than above it: it is being read from,
          // not typed into, and set into the panel is what puts it behind the
          // composer without a shadow saying so.
          //
          // Square along the bottom: that edge is under the composer, and a
          // radius nobody can see only pulls the fill away from it.
          "bg-surface-sunken border-border rounded-t-2xl border",
          // The clearance for the composer overlapping this edge, and on the
          // card rather than on what is inside it: collapsed, there is nothing
          // inside it to carry the padding and the header ends up underneath.
          "pb-6",
          "transition-colors duration-(--duration-control) ease-(--ease-standard)",
          // Lit from the control inside it rather than from the card, so what
          // reacts is what can actually be pressed.
          "has-[button:hover]:border-border-strong",
          "has-[button:focus-visible]:border-border-strong",
        )}
      >
        {/* Only the row is the control. The bubble under it is something to
            read — and text inside a button cannot be selected, which for the
            sentence that asked you the question is the whole use of having it
            here. */}
        <button
          type="button"
          onClick={() => setOpen((was) => !was)}
          aria-expanded={open}
          className="flex w-full cursor-pointer items-center gap-2 px-4 pt-2 pb-1 text-left outline-none"
        >
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
        </button>

        {/* `minmax(0, …)` on both ends: a bare `0fr` keeps the track at the
            content's own minimum and the row never actually closes. */}
        <div
          className="grid transition-[grid-template-rows] duration-(--duration-highlight-out) ease-(--ease-standard)"
          style={{
            gridTemplateRows: open ? "minmax(0, 1fr)" : "minmax(0, 0fr)",
          }}
        >
          <div className="overflow-hidden">
            {/* The row opening only uncovers the bubble; on its own that reads
                as a shutter going up over something already there. Resolving
                out of blur alongside it reads as the sentence arriving, which
                is how the same sentence arrives in the column.

                Slower than the row and starting with it, so the text is still
                settling when the height has finished — the two overlap instead
                of finishing together on a hard stop. */}
            <div
              className="px-3 pt-1"
              style={{
                opacity: open ? 1 : 0,
                filter: open ? "blur(0px)" : "blur(5px)",
                transition: `opacity ${REVEAL_MS}ms var(--ease-standard), filter ${REVEAL_MS}ms var(--ease-standard)`,
              }}
            >
              {/* Unsigned: the header above it already says whose turn this is. */}
              <TalkeoSaid text={text} signed={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
