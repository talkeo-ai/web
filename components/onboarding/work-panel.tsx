"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import {
  CONTENT_BLUR_PX,
  CONTENT_IN_DELAY_MS,
  CONTENT_IN_MS,
  CONTENT_OUT_MS,
} from "@/lib/onboarding/motion";
import { cn } from "@/lib/utils";

/**
 * Where the work happens, beside the conversation instead of after it.
 *
 * An exercise is not the next page. It is something Talkeo hands you while it
 * is still there — you answer, it reacts, you keep going. Taking over the
 * screen would mean leaving the conversation to do it, and coming back to a
 * thread you have to re-read.
 *
 * So the column narrows and the panel takes the room it gave up. Nothing is
 * covered: both sides stay usable at once, which is the whole point of not
 * making this a page.
 */

const MIN_FRACTION = 0.3;
const MAX_FRACTION = 0.7;
const DEFAULT_FRACTION = 0.5;
/** Remembered, because how you like to split a screen is not per-exercise. */
const WIDTH_KEY = "talkeo-panel-width";

function readStoredWidth(): number {
  if (typeof window === "undefined") return DEFAULT_FRACTION;

  const stored = Number(window.localStorage.getItem(WIDTH_KEY));
  return stored >= MIN_FRACTION && stored <= MAX_FRACTION
    ? stored
    : DEFAULT_FRACTION;
}

export function usePanelWidth() {
  // Read on the first render rather than in an effect: it decides how wide the
  // panel opens, so arriving a frame later means opening at one width and
  // jumping to another.
  //
  // Guarded, because a client component still renders on the server, where
  // there is no `localStorage`. The server's answer and the browser's may
  // differ and that is fine here: the panel starts closed, so nothing rendered
  // on either side depends on this until someone has already interacted.
  const [fraction, setFraction] = useState(readStoredWidth);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!dragging) return;
      const next = 1 - event.clientX / window.innerWidth;
      setFraction(Math.min(MAX_FRACTION, Math.max(MIN_FRACTION, next)));
    },
    [dragging],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent) => {
      event.currentTarget.releasePointerCapture(event.pointerId);
      setDragging(false);
      localStorage.setItem(WIDTH_KEY, String(fraction));
    },
    [fraction],
  );

  return {
    fraction,
    dragging,
    handleProps: { onPointerDown, onPointerMove, onPointerUp },
  };
}

export type PanelHandleProps = {
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerUp: (event: React.PointerEvent) => void;
};

export function WorkPanel({
  title,
  width,
  travelMs,
  open,
  dragging,
  resizable,
  handleProps,
  onDock,
  children,
}: {
  title: string;
  /** What the panel will be once it has finished opening, in pixels. */
  width: number;
  /** How long the track outside is taking to get there, so both move as one. */
  travelMs: number;
  /** False from the moment it is dismissed, while it is still on screen. */
  open: boolean;
  dragging: boolean;
  resizable: boolean;
  handleProps: PanelHandleProps;
  /** Hands out the foot of the panel, for the conversation to fill. */
  onDock?: (node: HTMLDivElement | null) => void;
  children: ReactNode;
}) {
  const [shown, setShown] = useState(false);

  // Adjusted during render on the way out, so the fade starts in the same
  // commit as the dismissal rather than a frame later.
  if (!open && shown) setShown(false);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  return (
    <aside
      data-slot="work-panel"
      // No fill of its own: the track is just the window, and the surface is
      // the card inside it. That is what lets the panel sit off the edges
      // instead of being flush against them.
      className="relative min-h-0 overflow-hidden"
    >
      {/* Laid out at its final width and pinned to the right, so widening the
          aside uncovers more of it from the left instead of squeezing what is
          already there. A panel whose header re-wraps on the way in reads as
          something being crushed, not as something opening.

          Opening, that width does not change: only the window over it does.
          Going full screen it does, and then it has to travel on the same
          clock as the track outside — landing there instantly while the
          window is still moving is what reads as the panel re-centring itself
          halfway through. */}
      <div
        className="absolute inset-y-0 right-0 flex flex-col"
        style={{
          width: `${width}px`,
          opacity: shown ? 1 : 0,
          filter: shown ? "blur(0px)" : `blur(${CONTENT_BLUR_PX}px)`,
          transition: [
            dragging ? null : `width ${travelMs}ms var(--ease-entrance)`,
            shown
              ? `opacity ${CONTENT_IN_MS}ms var(--ease-standard) ${CONTENT_IN_DELAY_MS}ms, filter ${CONTENT_IN_MS}ms var(--ease-standard) ${CONTENT_IN_DELAY_MS}ms`
              : `opacity ${CONTENT_OUT_MS}ms var(--ease-exit), filter ${CONTENT_OUT_MS}ms var(--ease-exit)`,
          ]
            .filter(Boolean)
            .join(", "),
        }}
      >
        {/* The same surface as the page, edge included: no seam between the
            conversation and the work beside it. What separates them is the gap
            and the cards, not a change of fill. */}
        <div className="bg-background border-background relative flex min-h-0 flex-1 flex-col overflow-hidden border-l">
          {/* No rule under it: the panel already sits on its own surface, and a
              line there draws a box around a header that is mostly empty. The
              right side is left clear for the controls, which live outside the
              panel so that they never come and go with it. */}
          <header className="flex h-11 shrink-0 items-center pr-24 pl-5">
            <h2 className="text-text-secondary truncate text-sm font-medium">
              {title}
            </h2>
          </header>

          <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto">
            {children}
          </div>

          {/* The panel's own foot, for the conversation to fill when the panel
              has the screen to itself. It lives here rather than over the page,
              so it arrives and leaves with everything else in the panel instead
              of on a clock of its own. */}
          {onDock ? (
            <div
              ref={onDock}
              // The same distance from the foot of the window as the composer
              // in the column, so the two sit on one line whichever one you
              // are using.
              className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-6 pb-5"
            />
          ) : null}
        </div>
      </div>

      {/* The grab area is wider than the line it draws: a 1px target is a
          precision task, and this one gets dragged with a whole hand. */}
      {resizable ? (
        <div
          role="separator"
          aria-orientation="vertical"
          data-slot="panel-handle"
          data-dragging={dragging ? "true" : "false"}
          {...handleProps}
          className="group absolute inset-y-0 left-0 z-10 hidden w-3 cursor-col-resize touch-none lg:block"
        >
          {/* Nothing drawn at rest. The gap between the card and the column is
              already the division, and a rule inside it draws the same line
              twice. It shows up under the pointer, which is the only moment
              anyone needs to know it is draggable. */}
          <span
            className={cn(
              "absolute inset-y-0 left-0 w-px bg-transparent",
              "transition-colors duration-(--duration-control) ease-(--ease-standard)",
              "group-hover:bg-border-strong",
              dragging && "bg-border-strong",
            )}
          />
        </div>
      ) : null}
    </aside>
  );
}

/** The panel's own controls: quiet, and only ever icons. */
export function PanelButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "text-text-secondary hover:text-foreground hover:bg-surface-tertiary",
        "grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg",
        "transition-colors duration-(--duration-control) ease-(--ease-standard)",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="size-[18px]"
      >
        {children}
      </svg>
    </button>
  );
}

/** A frame with its right third filled: the panel, as a picture of itself. */
export const PanelIcon = (
  <>
    <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
    <path d="M14.5 4.5v15" />
  </>
);

export const ExpandIcon = (
  <path d="M14 4.5h5.5V10M10 19.5H4.5V14M19.5 4.5 14 10M4.5 19.5 10 14" />
);

export const CollapseIcon = (
  <path d="M19.5 9.5H14V4M4.5 14.5H10V20M14 9.5l5.5-5.5M10 14.5 4.5 20" />
);
