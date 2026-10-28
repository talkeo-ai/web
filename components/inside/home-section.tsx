"use client";

import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  ChevronsRight,
  Headphones,
  Mic,
  PenLine,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import type { Home, PlanStepKind } from "@/lib/inside/mock";
import { cn } from "@/lib/utils";

import { IsoTileSvg, type IsoState } from "./iso-tile";

const KIND_ICON: Record<PlanStepKind, LucideIcon> = {
  voice: Mic,
  writing: PenLine,
  listening: Headphones,
  reading: BookOpen,
};

type T = ReturnType<typeof useTranslations<"inside.home">>;
export type HomeView = "today" | "road";
const VIEWS: HomeView[] = ["today", "road"];

/** How long the leaving view takes to go before the next one comes in. */
const LEAVE_MS = 140;

/**
 * The home's two states and the swap between them. The tab (`view`) moves at
 * once; what is drawn (`shown`) waits for the leaving view to fade, then the
 * next one comes in. Held by the shell, because the tabs live in the panel's
 * bar and the views in its body.
 */
export function useHomeView() {
  const [view, setView] = useState<HomeView>("today");
  const [shown, setShown] = useState<HomeView>("today");
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const change = (next: HomeView) => {
    if (next === view) return;
    setView(next);
    setLeaving(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      document.querySelector("[data-slot='inside-scroll']")?.scrollTo({ top: 0 });
      setShown(next);
      setLeaving(false);
    }, LEAVE_MS);
  };

  return { view, shown, leaving, change };
}

/**
 * The home, in two states: today and the road. A tab switches between them
 * and the swap is animated: the view going fades out, the one coming fades
 * in where it stands. Scrolling down from one into the other
 * read as one long page (Joaquin, 27/oct).
 *
 * Both are the same drawing (`Path`): isometric tiles, after Cartesia's
 * layered stack, on a dotted curve that sways down the column, green up to
 * where you are and grey after. Today at the scale of one day, its steps; the
 * road at the scale of the course, its sessions. Data is mocked.
 */
export function HomeSection({
  home,
  shown,
  leaving,
}: {
  home: Home;
  shown: HomeView;
  leaving: boolean;
}) {
  const t = useTranslations("inside.home");

  return (
    <div
      key={shown}
      className={cn(
        "flex min-h-full w-full flex-col items-center",
        // Both start at the top, so the heading sits in the same place in
        // either view; centred, today's sat lower than the road's (Joaquin,
        // 27/oct).
        "pt-2 pb-10",
        leaving
          ? "opacity-0 blur-[2px] transition-[opacity,filter] duration-(--leave) ease-(--ease-exit)"
          : // A fade in place, no sideways slide: with the switch down in the
            // corner, a slide from the side read as the wrong way (Joaquin,
            // 27/oct).
            "animate-in fade-in-0 duration-300 ease-(--ease-entrance)",
      )}
      style={{ "--leave": `${LEAVE_MS}ms` } as React.CSSProperties}
    >
      {shown === "today" ? <Today home={home} t={t} /> : <Road home={home} t={t} />}
    </div>
  );
}

/**
 * The switch between today and the road, floating in the panel's corner: a
 * quiet tray with the lit segment as one piece that slides between the two,
 * so the switch is felt as a move and not a repaint. Rounded, not a pill:
 * 10px outside, 7px on the segment, so the gap around it stays even.
 *
 * In neutrals and small, so it sits back: a solid dark segment on a raised
 * white tray drew the eye first and looked big (Joaquin, 27/oct).
 */
export function HomeTabs({
  view,
  onChange,
}: {
  view: HomeView;
  onChange: (view: HomeView) => void;
}) {
  const t = useTranslations("inside.home");
  const index = VIEWS.indexOf(view);
  return (
    <div
      role="tablist"
      className={cn(
        "bg-surface-secondary/90 relative grid grid-cols-2 rounded-[10px] border p-[3px] backdrop-blur-sm",
        "border-black/[0.06] dark:border-white/[0.08]",
        "shadow-[0_4px_12px_-6px_rgb(0_0_0/0.12)]",
      )}
    >
      <span
        aria-hidden
        className="bg-background dark:bg-surface-tertiary absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-[7px] border border-black/[0.06] shadow-xs transition-[translate] duration-250 ease-[cubic-bezier(0.37,0,0.63,1)] dark:border-white/[0.06]"
        style={{ translate: `${index * 100}% 0` }}
      />
      {VIEWS.map((key) => {
        const selected = key === view;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(key)}
            className={cn(
              "focus-key:ring-ring relative h-6.5 min-w-16 cursor-pointer rounded-[7px] px-3 text-[12px] font-medium outline-none focus-key:ring-2",
              "transition-colors duration-(--duration-highlight-out) hover:duration-(--duration-highlight-in)",
              selected ? "text-foreground" : "text-text-secondary hover:text-foreground",
            )}
          >
            {t(key)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A unit's heading on the road: one left-aligned line the width of the path,
 * with how far along it is at the end. Square-on, it cannot be mistaken for
 * the tiles; centred text over the curve read as one more piece of the
 * drawing (Joaquin, 27/oct). The unit you are in has its number in accent.
 */
function Heading({
  eyebrow,
  title,
  done,
  total,
  current,
  t,
}: {
  eyebrow: React.ReactNode;
  title: string;
  done: number;
  total: number;
  current: boolean;
  t: T;
}) {
  // Type and a hairline, nothing boxed: a tinted card with a bar read as
  // generic (Joaquin, 27/oct, "muy AI"). It sticks to the top while its
  // unit scrolls under it, on the panel's colour with a short fade below so
  // the stops slide out of sight instead of being cut.
  return (
    <div className="bg-background sticky top-0 z-30 flex w-full justify-center py-5 after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-6 after:bg-linear-to-b after:from-background after:to-transparent">
      {/* As wide as the drawing under it, tiles and labels: at the path's
          full width it started well left of the first tile (Joaquin, 27/oct). */}
      <div className="flex w-full max-w-md items-baseline gap-3">
        <span
          className={cn(
            "shrink-0 text-[15px] font-medium tabular-nums",
            current ? "text-accent-700 dark:text-accent-400" : "text-text-tertiary",
          )}
        >
          {eyebrow}
        </span>
        <h2 className="font-heading text-foreground min-w-0 truncate text-[21px] font-semibold tracking-[-0.015em]">
          {title}
        </h2>
        <span
          aria-hidden
          className="h-px min-w-6 flex-1 self-center bg-black/[0.08] dark:bg-white/[0.09]"
        />
        <span className="text-text-tertiary shrink-0 text-[14px] tabular-nums">
          {t("unitProgress", { share: done / total })}
        </span>
      </div>
    </div>
  );
}

/**
 * What pressing a stop does, by where it sits: the current one goes on, a
 * done one is repeated, one ahead is taken early. Every class can be done
 * again or ahead of time (Joaquin, 27/oct).
 */
function actionFor(state: IsoState, t: T, started: boolean): Action {
  if (state === "active")
    return { label: started ? t("continue") : t("start"), Icon: ArrowRight, primary: true };
  if (state === "done") return { label: t("repeat"), Icon: RotateCcw, primary: false };
  return { label: t("skipAhead"), Icon: ChevronsRight, primary: false };
}

/**
 * Today is only its steps, down the same curve as the road. The step that is
 * up is the way in, with its call over it the way Duolingo's current node has
 * one. Across read as too far from the road (Joaquin, 27/oct).
 */
function Today({ home, t }: { home: Home; t: T }) {
  const steps = home.plan;
  const currentIndex = steps.findIndex((step) => !step.done);

  const stops: Stop[] = steps.map((step, i) => {
    const now = i === currentIndex;
    const state: IsoState = step.done ? "done" : now ? "active" : "idle";
    return {
      id: step.id,
      title: t(`kind.${step.kind}`),
      // The step that is up says what it asks; the rest say how long.
      sub: now ? step.title : t("duration", { minutes: step.minutes }),
      state,
      Icon: step.done ? Check : KIND_ICON[step.kind],
      big: now,
      action: actionFor(state, t, currentIndex > 0),
    };
  });

  // Headed like a unit on the road: "Hoy", the unit today belongs to, and
  // how many of its steps are done (Joaquin, 27/oct). The session's own
  // title ("Qué hacés") read badly on its own.
  const unit = home.road.find((u) => u.nodes.some((node) => node.state === "today"));
  return (
    <div className="flex w-full flex-col items-center">
      <Heading
        eyebrow={t("today")}
        title={unit?.title ?? ""}
        done={steps.filter((step) => step.done).length}
        total={steps.length}
        current
        t={t}
      />
      <Path className="mt-8" stops={stops} step={84} sway={72} />
    </div>
  );
}

/**
 * The road, built to run long: each unit's heading sticks to the top while
 * its stops scroll under it, so you always know which unit you are looking
 * at; it opens on today's stop, not on the first unit; and once today is out
 * of sight a pill brings you back to it. Scrolling a long road with nothing
 * pinned read as awkward (Joaquin, 27/oct).
 */
function Road({ home, t }: { home: Home; t: T }) {
  const root = useRef<HTMLDivElement>(null);
  // Where today sits against the panel: in view, above it or below it.
  const [away, setAway] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    const current = root.current?.querySelector<HTMLElement>("[data-current]");
    const scroller = root.current?.closest<HTMLElement>("[data-slot='inside-scroll']");
    if (!current || !scroller) return;
    centre(scroller, current, "instant");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) return setAway(null);
        const top = entry.rootBounds?.top ?? 0;
        setAway(entry.boundingClientRect.top < top ? "up" : "down");
      },
      // The heading pinned at the top covers its strip, so a stop under it
      // counts as out of view.
      { root: scroller, rootMargin: "-72px 0px 0px 0px" },
    );
    observer.observe(current);
    return () => observer.disconnect();
  }, []);

  const backToToday = () => {
    const current = root.current?.querySelector<HTMLElement>("[data-current]");
    const scroller = root.current?.closest<HTMLElement>("[data-slot='inside-scroll']");
    if (current && scroller) centre(scroller, current, "smooth");
  };

  return (
    <div ref={root} className="flex w-full flex-col items-center gap-8">
      {home.road.map((unit, u) => (
        <section key={unit.id} className="flex w-full flex-col items-center">
          <Heading
            eyebrow={t("unit", { n: u + 1 })}
            title={unit.title}
            done={unit.nodes.filter((node) => node.state === "done").length}
            total={unit.nodes.length}
            current={unit.nodes.some((node) => node.state === "today")}
            t={t}
          />
          <Path
            className="mt-8"
            stops={unit.nodes.map((node) => {
              const state: IsoState =
                node.state === "done" ? "done" : node.state === "today" ? "active" : "idle";
              return {
                id: node.id,
                title: node.title,
                sub: node.state === "today" ? t("today") : node.when,
                state,
                Icon: node.state === "done" ? Check : KIND_ICON[node.kinds[0]],
                big: node.state === "today",
                action: actionFor(state, t, true),
              };
            })}
          />
        </section>
      ))}
      {/* Pinned to the panel's bottom by being last and sticky; it shows only
          while today is out of view and points the way to it. */}
      <button
        type="button"
        onClick={backToToday}
        tabIndex={away ? 0 : -1}
        aria-hidden={!away}
        className={cn(
          "bg-foreground text-background focus-key:ring-ring sticky bottom-6 z-30 flex h-8 cursor-pointer items-center gap-1.5 rounded-full pr-3.5 pl-3 text-[13px] font-semibold outline-none focus-key:ring-2",
          "shadow-[0_8px_20px_-8px_rgb(0_0_0/0.45)] transition-[opacity,scale]",
          away
            ? "scale-100 opacity-100 duration-200 ease-(--ease-entrance)"
            : "pointer-events-none scale-90 opacity-0 duration-150 ease-(--ease-exit)",
        )}
      >
        {away === "up" ? (
          <ArrowUp className="size-3.5" strokeWidth={2.5} />
        ) : (
          <ArrowDown className="size-3.5" strokeWidth={2.5} />
        )}
        {t("backToToday")}
      </button>
    </div>
  );
}

/**
 * Scrolls only the panel so `el` sits in its middle. `scrollIntoView` would
 * also move the clipped boxes around it.
 */
function centre(scroller: HTMLElement, el: HTMLElement, behavior: ScrollBehavior) {
  const box = scroller.getBoundingClientRect();
  const at = el.getBoundingClientRect();
  const top = scroller.scrollTop + at.top - box.top - (box.height - at.height) / 2;
  scroller.scrollTo({ top: Math.max(0, top), behavior });
}

type Action = { label: string; Icon: LucideIcon; primary: boolean };

type Stop = {
  id: string;
  title: string;
  sub?: string;
  state: IsoState;
  Icon: LucideIcon;
  big: boolean;
  action: Action;
};

const STEP = 112;
const SWAY = 88;

type Placed = { stop: Stop; x: number; y: number };

/**
 * Tiles on a dotted curve that sways down the column, green up to the lit
 * stop and grey after, the name of each on the outer side of the sway.
 */
function Path({
  stops,
  step = STEP,
  sway = SWAY,
  className,
}: {
  stops: Stop[];
  step?: number;
  sway?: number;
  className?: string;
}) {
  const placed: Placed[] = stops.map((stop, i) => ({
    stop,
    x: Math.sin((i * Math.PI) / 2) * sway,
    y: step / 2 + i * step,
  }));
  const height = stops.length * step;
  const lit = stops.findIndex((s) => s.state === "active");

  const curve = (points: Placed[]) =>
    points
      .map((p, k) => {
        if (k === 0) return `M ${p.x} ${p.y}`;
        const prev = points[k - 1];
        const mid = (p.y - prev.y) / 2;
        return `C ${prev.x} ${prev.y + mid} ${p.x} ${p.y - mid} ${p.x} ${p.y}`;
      })
      .join(" ");

  return (
    <div className={cn("group/path relative w-full max-w-xl", className)} style={{ height }}>
      {/* Zero-size at the column's centre top, so the curve's coordinates are
          the same offsets the stops are placed with, at any width. */}
      <svg
        className="absolute top-0 left-1/2 overflow-visible"
        width={1}
        height={1}
        aria-hidden
      >
        <path
          d={curve(placed)}
          fill="none"
          strokeDasharray="1 7"
          strokeLinecap="round"
          strokeWidth={2}
          className="stroke-foreground/20"
        />
        {lit > 0 && (
          <path
            d={curve(placed.slice(0, lit + 1))}
            fill="none"
            strokeDasharray="1 7"
            strokeLinecap="round"
            strokeWidth={2}
            className="stroke-accent-500"
          />
        )}
      </svg>

      {placed.map(({ stop, x, y }) => (
        <PathStop key={stop.id} stop={stop} x={x} y={y} />
      ))}
    </div>
  );
}

function PathStop({ stop, x, y }: { stop: Stop; x: number; y: number }) {
  const tone =
    stop.state === "active"
      ? "text-foreground font-medium"
      : stop.state === "done"
        ? "text-text-secondary"
        : "text-text-tertiary";
  const label =
    x < 0
      ? "top-1/2 right-full mr-4 w-max max-w-[220px] -translate-y-1/2 text-right"
      : "top-1/2 left-full ml-4 w-max max-w-[220px] -translate-y-1/2";

  const { action } = stop;

  return (
    // The stop under the pointer rises above its neighbours, so its call is
    // never covered by the next tile.
    <div
      className="absolute has-[:hover]:z-20 has-[:focus-visible]:z-20"
      style={{ top: y, left: `calc(50% + ${x}px)` }}
    >
      <button
        type="button"
        aria-label={`${action.label}: ${stop.sub ?? stop.title}`}
        // Marks the stops whose call only shows on hover, so the current
        // one's can step back while another is pointed at.
        data-hover-call={action.primary ? undefined : ""}
        data-current={stop.state === "active" ? "" : undefined}
        className="group focus-key:ring-ring relative block -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-xl text-left outline-none focus-key:ring-2"
      >
        <Call action={action} />
        {/* Every stop answers the pointer in light, not by moving: a lift
            read as too much, and a new colour as overdone (Joaquin, 27/oct). */}
        <IsoTileSvg s={stop.big ? 66 : 50} state={stop.state} Icon={stop.Icon} interactive />
        <span
          className={cn(
            "absolute text-[13px] leading-snug transition-colors duration-(--duration-highlight-out) group-hover:duration-(--duration-highlight-in)",
            stop.state !== "active" && "group-hover:text-foreground",
            label,
            tone,
          )}
        >
          {stop.title}
          {stop.sub && (
            <span
              className={cn(
                "block text-[12px] font-normal",
                stop.state === "active" ? "text-accent-600 dark:text-accent-400" : "text-text-tertiary",
              )}
            >
              {stop.sub}
            </span>
          )}
        </span>
      </button>
    </div>
  );
}

/**
 * The call over a stop: a small pill with a point toward its tile. One shape
 * for every stop, so going back and going ahead feel like the same gesture.
 *
 * - The current stop's is solid and always there: it is the way in.
 * - A done or upcoming stop's is quiet (the page's face, an edge) and comes
 *   only under the pointer or focus, growing out of its tile: opacity and
 *   scale from the bottom centre, in on the entrance curve, out faster.
 * - While another stop's call is up, the current one's steps back, so there
 *   is one call on screen at a time.
 */
function Call({ action }: { action: Action }) {
  const face = action.primary
    ? "bg-foreground text-background"
    : "bg-popover text-foreground border border-black/[0.08] dark:border-white/[0.1]";
  const point = action.primary
    ? "bg-foreground"
    : "bg-popover border-r border-b border-black/[0.08] dark:border-white/[0.1]";
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute bottom-full left-1/2 mb-2.5 flex h-7 -translate-x-1/2 origin-bottom items-center gap-1.5 rounded-full pr-2.5 pl-3 text-[12px] font-semibold whitespace-nowrap",
        "shadow-[0_6px_16px_-6px_rgb(0_0_0/0.4)]",
        "transition-[opacity,scale] ease-(--ease-entrance)",
        face,
        action.primary
          ? // Back in only after a pause and slowly, so crossing from one stop
            // to the next does not flash it; out quick, as the other call
            // comes in. Back at once, it popped in (Joaquin, 27/oct).
            "delay-200 duration-300 ease-(--ease-standard) group-has-[[data-hover-call]:hover]/path:scale-95 group-has-[[data-hover-call]:hover]/path:opacity-0 group-has-[[data-hover-call]:hover]/path:delay-0 group-has-[[data-hover-call]:hover]/path:duration-150 group-has-[[data-hover-call]:hover]/path:ease-(--ease-exit)"
          : "scale-90 opacity-0 duration-150 ease-(--ease-exit) group-hover:scale-100 group-hover:opacity-100 group-hover:duration-200 group-hover:ease-(--ease-entrance) group-focus-visible:scale-100 group-focus-visible:opacity-100",
      )}
    >
      {action.label}
      <action.Icon className="size-3.5" strokeWidth={2.5} />
      <span
        className={cn(
          "absolute top-full left-1/2 size-2 -translate-x-1/2 -translate-y-1 rotate-45 rounded-[1px]",
          point,
        )}
      />
    </span>
  );
}
