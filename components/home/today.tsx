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
import { ARRIVE, CARD, MUTED, PAGE_TITLE, PRIMARY, SECONDARY, SECTION_TITLE, arrive, type T } from "./ui";

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
 * toca hacer y no muchas cosas más"). One list of the day's steps with the
 * one to do now set apart, one action, and the week in a single quiet line.
 * The fixed path is the same place, switched in.
 */
export function Today({ home, t }: { home: Home; t: T }) {
  const [view, setView] = useState<View>("class");

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col">
      <header className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", ARRIVE)} style={arrive(0)}>
        <div>
          <h1 className={PAGE_TITLE}>{t("greeting", { name: home.name })}</h1>
          <p className={cn(MUTED, "mt-1 text-[14px]")}>{t("lead", { goal: home.plan.goal })}</p>
        </div>
        <Segmented
          tone="neutral"
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { value: "class", label: t("views.class") },
            { value: "road", label: t("views.road") },
          ]}
        />
      </header>

      <div key={view} className="motion-safe:animate-[view-in_380ms_var(--ease-entrance)_both]">
        {view === "class" ? (
          <div className="flex flex-col gap-4">
            {!home.saved && <SaveNotice t={t} />}
            <ClassCard home={home} t={t} onRoad={() => setView("road")} />
            <WeekLine home={home} t={t} />
          </div>
        ) : (
          <Road units={home.road} t={t} />
        )}
      </div>
    </div>
  );
}

function ClassCard({ home, t, onRoad }: { home: Home; t: T; onRoad: () => void }) {
  const { blocks } = home.plan;
  const done = blocks.filter((b) => b.done).length;
  const current = blocks.find((b) => !b.done);
  const total = blocks.reduce((sum, b) => sum + b.minutes, 0);

  return (
    <section aria-label={t("today")} className={cn(CARD, "overflow-hidden", ARRIVE)} style={arrive(1)}>
      <header className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
        <div className="min-w-0">
          <h2 className="font-heading text-foreground text-[19px] font-semibold tracking-[-0.02em]">{home.plan.title}</h2>
          <p className={cn(MUTED, "mt-0.5 text-[13px]")}>
            {home.plan.goal} · <span className="whitespace-nowrap">{t("minutes", { minutes: total })}</span>
          </p>
        </div>
        {/* Done so far as segments, one per step: a count you can see. */}
        <div className="flex shrink-0 flex-col items-end gap-1.5 pt-1">
          <div className="flex gap-1">
            {blocks.map((b, i) => (
              <span
                key={b.index}
                className={cn(
                  "h-1.5 w-5 origin-left rounded-full",
                  b.done ? "bg-foreground motion-safe:animate-[bar-grow_600ms_var(--ease-entrance)_both]" : "bg-surface-tertiary",
                  b === current && "bg-[var(--brand)]/35",
                )}
                style={{ animationDelay: `${260 + i * 70}ms` }}
              />
            ))}
          </div>
          <span className="text-text-tertiary text-[12px] tabular-nums">{t("class.done", { done, total: blocks.length })}</span>
        </div>
      </header>

      <ol className="border-t border-black/[0.06]">
        {blocks.map((block) => {
          const Icon = KIND_ICON[block.kind];
          const now = block === current;
          return (
            <li
              key={block.index}
              className={cn(
                "relative flex items-center gap-3.5 border-b border-black/[0.05] px-5 py-3 last:border-b-0",
                now && "bg-[var(--brand-soft)]/60",
              )}
            >
              {now && <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-[var(--brand)]" />}
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-lg",
                  block.done ? "bg-surface-secondary text-text-tertiary" : now ? "bg-card text-[var(--brand)] shadow-[0_0_0_1px_rgb(15_30_60/0.08)]" : "bg-surface-secondary text-foreground/70",
                )}
              >
                {block.done ? <Check className="size-4" strokeWidth={2.5} /> : <Icon className="size-4" strokeWidth={2} />}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-[14px]",
                    block.done ? "text-text-tertiary line-through decoration-black/20" : "text-foreground",
                    now && "font-medium",
                  )}
                >
                  {block.objective}
                </p>
                <p className="text-text-tertiary text-[12px]">{t(`kind.${block.kind}`)}</p>
              </div>
              {now ? (
                <span className="font-heading rounded-full bg-[var(--brand)] px-2 py-0.5 text-[11px] font-semibold text-white">
                  {t("class.now")}
                </span>
              ) : null}
              <span className="text-text-tertiary w-12 shrink-0 text-right text-[12px] tabular-nums">
                {t("minutes", { minutes: block.minutes })}
              </span>
            </li>
          );
        })}
      </ol>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] bg-surface-secondary/40 px-5 py-3.5">
        <button type="button" onClick={onRoad} className="text-text-secondary hover:text-foreground cursor-pointer text-[13px] transition-colors">
          {t("class.seeRoad")}
        </button>
        <button type="button" className={cn(PRIMARY, "group")}>
          {current ? t("class.continueWith", { step: t(`kind.${current.kind}`) }) : t("start")}
          <ArrowRight className="size-4 transition-transform duration-300 ease-(--ease-entrance) group-hover:translate-x-0.5" />
        </button>
      </footer>
    </section>
  );
}

const noSubscribe = () => () => {};

/** The week in one quiet line: the streak, seven days, today's minutes. */
function WeekLine({ home, t }: { home: Home; t: T }) {
  const locale = useLocale();
  // Today is read only in the browser: read while prerendering, it would be
  // frozen at whatever day the page was built.
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
    <section className={cn(CARD, "flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4", ARRIVE)} style={arrive(2)}>
      <p className="text-foreground flex items-center gap-1.5 text-[14px] font-medium">
        <Flame className="size-4 text-[oklch(0.7_0.17_55)]" strokeWidth={2.25} />
        {t("streak", { days: home.dose.streak_days })}
      </p>
      <ol className="flex gap-2">
        {days.map((d, i) => (
          <li key={i} className="flex flex-col items-center gap-1">
            <span
              className={cn(
                "size-2.5 rounded-full",
                d.practised ? "bg-foreground" : "bg-surface-tertiary",
                d.today && "ring-2 ring-[var(--brand)]/40 ring-offset-2 ring-offset-[var(--card)]",
              )}
            />
            <span className={cn("h-3 text-[10px] uppercase", d.today ? "text-foreground font-semibold" : "text-text-tertiary")}>
              {d.label}
            </span>
          </li>
        ))}
      </ol>
      <div className="ml-auto flex min-w-[150px] items-center gap-3">
        <div className="bg-surface-tertiary h-1.5 flex-1 overflow-hidden rounded-full">
          <div
            className="h-full origin-left rounded-full bg-[var(--brand)] motion-safe:animate-[bar-grow_900ms_var(--ease-entrance)_both]"
            style={{ width: `${Math.min(produced / target, 1) * 100}%`, animationDelay: "380ms" }}
          />
        </div>
        <span className="text-text-secondary text-[12px] tabular-nums">{t("todayMinutes", { done: Math.round(produced), target })}</span>
      </div>
    </section>
  );
}

/** The account ask: a notice at the top, never in the way (onboarding v2, step 7). */
function SaveNotice({ t }: { t: T }) {
  const [gone, setGone] = useState(false);
  const [closing, setClosing] = useState(false);
  if (gone) return null;
  return (
    <section
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-[var(--brand)]/15 bg-[var(--brand-soft)]/50 py-2.5 pr-2 pl-4",
        ARRIVE,
        closing && "pointer-events-none !animate-[view-out_240ms_var(--ease-standard)_both]",
      )}
      style={arrive(1)}
      onAnimationEnd={() => closing && setGone(true)}
    >
      <p className="text-foreground min-w-0 flex-1 text-[13px]">
        <span className="font-medium">{t("save.title")}.</span> <span className={MUTED}>{t("save.body")}</span>
      </p>
      <Link href="/login" prefetch={false} className={cn(SECONDARY, "h-8 px-3 text-[13px]")}>
        {t("save.cta")}
      </Link>
      <button
        type="button"
        aria-label={t("save.later")}
        title={t("save.later")}
        onClick={() => setClosing(true)}
        className="text-text-tertiary hover:text-foreground grid size-8 cursor-pointer place-items-center rounded-full transition-colors hover:bg-white/70"
      >
        <X className="size-4" />
      </button>
    </section>
  );
}

function Road({ units, t }: { units: RoadUnit[]; t: T }) {
  return (
    <div className="flex flex-col gap-4 pb-2">
      {units.map((unit, u) => {
        const done = unit.nodes.filter((n) => n.state === "done").length;
        return (
          <article key={unit.id} className={cn(CARD, "overflow-hidden", ARRIVE)} style={arrive(u + 1)}>
            <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
              <div>
                <p className="text-text-tertiary text-[11px] font-semibold tracking-[0.06em] uppercase">{t("unit", { n: u + 1 })}</p>
                <h3 className={cn(SECTION_TITLE, "mt-0.5 text-[16px]")}>{unit.title}</h3>
                <p className={cn(MUTED, "text-[13px]")}>{t("forGoal", { goal: unit.goal })}</p>
              </div>
              <span className="text-text-tertiary text-[12px] tabular-nums">{t("progress", { done, total: unit.nodes.length })}</span>
            </header>
            <ol className="border-t border-black/[0.06]">
              {unit.nodes.map((node, i) => (
                <li
                  key={node.id}
                  className={cn(
                    "relative flex items-center gap-3.5 border-b border-black/[0.05] px-5 py-3 last:border-b-0",
                    node.state === "today" && "bg-[var(--brand-soft)]/60",
                  )}
                >
                  {node.state === "today" && <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-[var(--brand)]" />}
                  <span
                    className={cn(
                      "font-heading grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold",
                      node.state === "done" && "bg-foreground text-background",
                      node.state === "today" && "bg-[var(--brand)] text-white",
                      node.state === "next" && "text-text-tertiary shadow-[inset_0_0_0_1px_rgb(15_30_60/0.12)]",
                    )}
                  >
                    {node.state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                  </span>
                  <p className={cn("min-w-0 flex-1 truncate text-[14px]", node.state === "next" ? "text-text-secondary" : "text-foreground", node.state === "today" && "font-medium")}>
                    {node.title}
                  </p>
                  {node.state === "today" && (
                    <span className="font-heading rounded-full bg-[var(--brand)] px-2 py-0.5 text-[11px] font-semibold text-white">{t("today")}</span>
                  )}
                  <span className="text-text-tertiary w-12 shrink-0 text-right text-[12px] tabular-nums">{t("minutes", { minutes: node.minutes })}</span>
                </li>
              ))}
            </ol>
          </article>
        );
      })}
    </div>
  );
}
