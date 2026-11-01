"use client";

import {
  ArrowRight,
  BookOpen,
  Check,
  Flame,
  Headphones,
  Mic,
  PenLine,
  RotateCcw,
  X,
  type LucideIcon,
} from "lucide-react";
import { useLocale } from "next-intl";
import { useState, useSyncExternalStore } from "react";

import { Link } from "@/lib/i18n/navigation";
import type { Home, PlanBlock, RoadUnit } from "@/lib/inside/mock";
import { cn } from "@/lib/utils";

import { Segmented } from "./segmented";
import { ARRIVE, BRAND_FILL, CARD, GLASS, LEAD_FILL, arrive, type T } from "./ui";

const KIND_ICON: Record<PlanBlock["kind"], LucideIcon> = {
  speak: Mic,
  write: PenLine,
  listen: Headphones,
  read: BookOpen,
  review: RotateCcw,
};

type View = "class" | "road";

/**
 * Today: what to do now, and little else (Joaquin, 1/nov: "hacer lo que te
 * toca hacer y no muchas cosas más"). The day's class or the fixed path,
 * switched in place, the week in one line, and the account ask that does not
 * block. On a desktop it fits the window; nothing on it needs a scroll.
 */
export function Today({ home, t }: { home: Home; t: T }) {
  const [view, setView] = useState<View>("class");

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[860px] flex-col">
      <header className={cn("mb-5 flex flex-wrap items-end justify-between gap-4", ARRIVE)} style={arrive(0)}>
        <div>
          <h1 className="font-heading text-foreground text-[30px] leading-[1.05] font-medium tracking-[-0.035em] lg:text-[40px]">
            {t("greeting", { name: home.name })}
          </h1>
          <p className="text-foreground/65 mt-1.5 text-[15px] lg:text-[17px]">
            {t("lead", { goal: home.plan.goal })}
          </p>
        </div>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "class", label: t("views.class") },
            { value: "road", label: t("views.road") },
          ]}
        />
      </header>

      {/* The two views share one place: the one leaving fades, the one
          arriving rises in, keyed so each switch replays it. */}
      <div key={view} className="motion-safe:animate-[view-in_420ms_var(--ease-entrance)_both]">
        {view === "class" ? (
          <div className="flex flex-col gap-4">
            <TodayCard home={home} t={t} />
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <WeekStrip home={home} t={t} />
              {!home.saved && <SaveBar t={t} />}
            </div>
          </div>
        ) : (
          <Road units={home.road} t={t} />
        )}
      </div>
    </div>
  );
}

function TodayCard({ home, t }: { home: Home; t: T }) {
  const { blocks } = home.plan;
  const done = blocks.filter((b) => b.done).length;
  const current = blocks.find((b) => !b.done);
  const total = blocks.reduce((sum, b) => sum + b.minutes, 0);

  return (
    <section
      aria-label={t("today")}
      className={cn(
        "relative isolate overflow-hidden rounded-[28px] p-6 text-white sm:p-7",
        "shadow-[0_1px_2px_rgb(28_25_23/0.08),0_30px_60px_-24px_rgb(30_80_180/0.6)]",
        LEAD_FILL,
        ARRIVE,
      )}
      style={arrive(1)}
    >
      {/* Light on the card, so the fill reads as a lit surface rather than a
          flat swatch: a soft bloom in the corner and a fine top edge. */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 -z-10 size-[340px] rounded-full bg-white/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 -z-10 size-[300px] rounded-full bg-[oklch(0.8_0.1_220)]/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 rounded-[28px] shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]" />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-7">
        <div className="flex min-w-0 flex-col">
          <span className="font-heading inline-flex w-fit items-center gap-2 rounded-full bg-white/18 px-3 py-1 text-[13px] font-medium ring-1 ring-white/25 backdrop-blur">
            {t("today")}
            <span className="size-1 rounded-full bg-white/70" />
            {t("minutes", { minutes: total })}
          </span>
          <h2 className="font-heading mt-4 text-[28px] leading-[1.05] font-medium tracking-[-0.03em] sm:text-[34px]">
            {home.plan.title}
          </h2>
          <p className="mt-2 text-[15px] text-white/80">{t("forGoal", { goal: home.plan.goal })}</p>

          <div className="mt-auto pt-6">
            <p className="mb-2.5 text-[13px] text-white/80 tabular-nums">{t("progress", { done, total: blocks.length })}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/22">
              <div
                className="h-full origin-left rounded-full bg-white motion-safe:animate-[bar-grow_1100ms_var(--ease-entrance)_both]"
                style={{ width: `${(done / blocks.length) * 100}%`, animationDelay: "380ms" }}
              />
            </div>
            <button
              type="button"
              className={cn(
                "font-heading group mt-5 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-6 text-[16px] font-semibold text-[var(--brand-text)] sm:w-auto",
                "shadow-[0_10px_24px_-10px_rgb(10_30_90/0.55)]",
                "transition-transform duration-(--duration-press-out) ease-(--ease-standard) active:scale-[0.97] active:duration-(--duration-press-in)",
              )}
            >
              {done === 0 ? t("start") : t("continue")}
              <ArrowRight className="size-[18px] transition-transform duration-300 ease-(--ease-entrance) group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        <ol className="flex min-w-0 flex-col gap-1.5">
          {blocks.map((block) => {
            const Icon = block.done ? Check : KIND_ICON[block.kind];
            const now = block === current;
            return (
              <li
                key={block.index}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5",
                  now ? "bg-white text-foreground shadow-[0_8px_20px_-10px_rgb(10_30_90/0.5)]" : "bg-white/[0.08]",
                )}
              >
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-full",
                    block.done && "bg-white/90 text-[var(--brand)]",
                    now && "bg-[var(--brand)] text-white",
                    !block.done && !now && "bg-white/15 text-white",
                  )}
                >
                  <Icon className="size-[17px]" strokeWidth={block.done ? 2.75 : 2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[12px] font-medium", now ? "text-[var(--brand-text)]" : "text-white/65")}>
                    {t(`kind.${block.kind}`)}
                  </span>
                  <span className={cn("block truncate text-[15px] leading-snug", block.done && "text-white/70")}>
                    {block.objective}
                  </span>
                </span>
                <span className={cn("shrink-0 text-[13px] tabular-nums", now ? "text-text-secondary" : "text-white/60")}>
                  {t("minutes", { minutes: block.minutes })}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

const noSubscribe = () => () => {};

/** The week in one line: the streak, seven days and today's minutes. */
function WeekStrip({ home, t }: { home: Home; t: T }) {
  const locale = useLocale();
  // Today is read only in the browser: read while prerendering, it would be
  // frozen at whatever day the page was built. A day string, so the snapshot
  // stays the same value between renders.
  const day = useSyncExternalStore(noSubscribe, () => new Date().toDateString(), () => null);
  const narrow = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
  const days = home.week.map((practised, i) => {
    let label = "";
    if (day) {
      const date = new Date(day);
      date.setDate(date.getDate() - (home.week.length - 1 - i));
      label = narrow.format(date);
    }
    return { practised, label, today: i === home.week.length - 1 };
  });
  const { produced_minutes_today: produced, target_session_minutes: target } = home.dose;

  return (
    <section className={cn(CARD, "flex items-center gap-4 p-4", ARRIVE)} style={arrive(2)}>
      <div className="min-w-0 flex-1">
        <p className="font-heading text-foreground flex items-center gap-1.5 text-[16px] font-medium">
          <Flame className="size-4 text-[oklch(0.7_0.17_55)]" strokeWidth={2.25} />
          {t("streak", { days: home.dose.streak_days })}
        </p>
        <ol className="mt-2.5 flex gap-1.5">
          {days.map((d, i) => (
            <li key={i} className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "grid size-7 place-items-center rounded-full",
                  d.practised ? cn(BRAND_FILL, "text-white") : "bg-surface-secondary",
                  d.today && !d.practised && "ring-2 ring-[var(--brand)]/40 ring-offset-1 ring-offset-[var(--card)]",
                )}
              >
                {d.practised ? <Check className="size-3.5" strokeWidth={3} /> : null}
              </span>
              <span className={cn("h-3 text-[10px] font-medium uppercase", d.today ? "text-foreground" : "text-text-tertiary")}>
                {d.label}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex flex-col items-center gap-1">
        <MinutesRing share={Math.min(produced / target, 1)} />
        <span className="text-text-secondary text-[11px] tabular-nums">
          {Math.round(produced)}/{target} min
        </span>
      </div>
    </section>
  );
}

/** Today's minutes against the session target, as a small ring. */
function MinutesRing({ share }: { share: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 44 44" className="size-11 -rotate-90" aria-hidden>
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--surface-secondary)" strokeWidth="5" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke="var(--brand)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - share)}
        className="motion-safe:animate-[ring-fill_1200ms_var(--ease-entrance)_both]"
        style={{ "--ring-from": `${c}`, animationDelay: "420ms" } as React.CSSProperties}
      />
    </svg>
  );
}

/** The account ask: on the page, never in the way (onboarding v2, step 7). */
function SaveBar({ t }: { t: T }) {
  const [gone, setGone] = useState(false);
  const [closing, setClosing] = useState(false);
  if (gone) return null;
  return (
    <section
      className={cn(
        "relative flex items-center gap-3 rounded-[24px] p-4 pr-10",
        GLASS,
        ARRIVE,
        closing && "pointer-events-none !animate-[view-out_260ms_var(--ease-standard)_both]",
      )}
      style={arrive(3)}
      onAnimationEnd={() => closing && setGone(true)}
    >
      <div className="min-w-0 flex-1">
        <h2 className="font-heading text-foreground text-[15px] font-semibold">{t("save.title")}</h2>
        <p className="text-text-secondary mt-0.5 text-[13px] leading-snug">{t("save.body")}</p>
      </div>
      <Link
        href="/login"
        prefetch={false}
        className="font-heading inline-flex h-9 shrink-0 items-center rounded-full bg-[var(--brand)] px-4 text-[14px] font-semibold text-white shadow-[0_8px_18px_-8px_rgb(40_90_170/0.7)] transition-colors hover:bg-[var(--brand-hover)]"
      >
        {t("save.cta")}
      </Link>
      <button
        type="button"
        aria-label={t("save.later")}
        title={t("save.later")}
        onClick={() => setClosing(true)}
        className="text-text-tertiary hover:text-foreground absolute top-2.5 right-2.5 grid size-7 cursor-pointer place-items-center rounded-full transition-colors hover:bg-white/60"
      >
        <X className="size-4" />
      </button>
    </section>
  );
}

function Road({ units, t }: { units: RoadUnit[]; t: T }) {
  return (
    <div className="flex flex-col gap-4 pb-4">
      {units.map((unit, u) => {
        const done = unit.nodes.filter((n) => n.state === "done").length;
        return (
          <article key={unit.id} className={cn(CARD, "p-5 sm:p-6", ARRIVE)} style={arrive(u + 1)}>
            <header className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-text-tertiary text-[12px] font-semibold tracking-[0.06em] uppercase">
                  {t("unit", { n: u + 1 })}
                </p>
                <h3 className="font-heading text-foreground mt-0.5 text-[20px] font-medium tracking-[-0.02em]">{unit.title}</h3>
                <p className="text-text-secondary text-[13px]">{t("forGoal", { goal: unit.goal })}</p>
              </div>
              <span className="text-text-secondary bg-surface-secondary rounded-full px-2.5 py-1 text-[12px] font-medium tabular-nums">
                {t("progress", { done, total: unit.nodes.length })}
              </span>
            </header>

            <ol>
              {unit.nodes.map((node, i) => {
                const last = i === unit.nodes.length - 1;
                return (
                  <li key={node.id} className="relative flex gap-4 pb-5 last:pb-0">
                    {/* The line to the next stop, blue as far as you have got. */}
                    {!last && (
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-10 bottom-0 left-[19px] w-0.5 rounded-full",
                          node.state === "done" ? "bg-[var(--brand)]/70" : "bg-surface-tertiary",
                        )}
                      />
                    )}
                    <span className="relative grid size-10 shrink-0 place-items-center">
                      {node.state === "today" && (
                        <span
                          aria-hidden
                          className="absolute inset-0 rounded-full bg-[var(--brand)]/35 motion-safe:animate-[ring-pulse_2400ms_var(--ease-standard)_infinite]"
                        />
                      )}
                      <span
                        className={cn(
                          "font-heading relative grid size-10 place-items-center rounded-full text-[14px] font-semibold",
                          node.state === "done" && "bg-[var(--brand)] text-white",
                          node.state === "today" &&
                            cn(BRAND_FILL, "text-white shadow-[0_0_0_4px_var(--card),0_8px_18px_-6px_rgb(40_90_170/0.7)]"),
                          node.state === "next" && "bg-surface-secondary text-text-tertiary",
                        )}
                      >
                        {node.state === "done" ? <Check className="size-[18px]" strokeWidth={3} /> : i + 1}
                      </span>
                    </span>
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pt-1.5">
                      <div className="min-w-0">
                        <p className={cn("truncate text-[15px]", node.state === "next" ? "text-text-secondary" : "text-foreground font-medium")}>
                          {node.title}
                        </p>
                        <p className="text-text-tertiary text-[12px] tabular-nums">{t("minutes", { minutes: node.minutes })}</p>
                      </div>
                      {node.state === "today" && (
                        <span className="font-heading shrink-0 rounded-full bg-[var(--brand-soft)] px-3 py-1 text-[12px] font-semibold text-[var(--brand-text)]">
                          {t("today")}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </article>
        );
      })}
    </div>
  );
}
