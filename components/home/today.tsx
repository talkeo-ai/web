"use client";

import { ArrowUpRight, Check, ChevronDown, Lock, Play, X } from "lucide-react";
import { useLocale } from "next-intl";
import { useState, useSyncExternalStore } from "react";

import { Link } from "@/lib/i18n/navigation";
import { MOCK_TALKEO, type Home, type RoadUnit } from "@/lib/inside/mock";
import { cn } from "@/lib/utils";

import type { Section } from "./home";
import { Avatar } from "./talkeo";
import { ARRIVE, CARD, CARD_TITLE, LABEL, PAGE_TITLE, PRIMARY, arrive, type T } from "./ui";

const noSubscribe = () => () => {};
/** Today, read only in the browser: read while prerendering it would freeze at build day. */
function useToday() {
  const day = useSyncExternalStore(noSubscribe, () => new Date().toDateString(), () => null);
  return day ? new Date(day) : null;
}

/**
 * Today: one thing in front, the rest beside it (Joaquin, 1/nov: "hacer lo
 * que te toca hacer y no muchas cosas más"). The day's class is the one big
 * card with the sky in it, the way Ladder, Elevate and Calm open on a single
 * hero; its steps fold away until asked for. Beside it, the week, Talkeo
 * and the account ask; below it, the fixed path for whoever wants to see
 * where this is going.
 */
export function Today({
  home,
  t,
  onAsk,
  onSection,
}: {
  home: Home;
  t: T;
  onAsk: (text: string) => void;
  onSection: (s: Section) => void;
}) {
  const locale = useLocale();
  const today = useToday();
  const date = today
    ? new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(today)
    : " ";

  return (
    <div className="flex flex-col gap-6">
      <header className={ARRIVE} style={arrive(0)}>
        <p className="text-text-secondary text-[14px] font-medium first-letter:uppercase">{date}</p>
        <h1 className={cn(PAGE_TITLE, "mt-1")}>{t("greeting", { name: home.name })}</h1>
      </header>

      {/* On a phone: the class, then the week and Talkeo, then the path.
          On a wide screen the side column runs beside both. */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <Hero home={home} t={t} />
        </div>
        <aside className="flex min-w-0 flex-col gap-5 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <Week home={home} t={t} />
          <Ask t={t} onAsk={onAsk} onOpen={() => onSection("talkeo")} />
          {!home.saved && <Save t={t} />}
        </aside>
        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <Road units={home.road} t={t} />
        </div>
      </div>
    </div>
  );
}

function Hero({ home, t }: { home: Home; t: T }) {
  const [open, setOpen] = useState(false);
  const { blocks } = home.plan;
  const done = blocks.filter((b) => b.done).length;
  const current = blocks.find((b) => !b.done);
  const total = blocks.reduce((sum, b) => sum + b.minutes, 0);

  return (
    <section className={cn(CARD, "overflow-hidden rounded-[28px]", ARRIVE)} style={arrive(1)}>
      <div className="relative isolate flex min-h-[360px] flex-col overflow-hidden p-6 text-white sm:p-8">
        {/* The sky the measurement and the interview stood on, now the
            picture of today's class. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero/sky-1280.webp"
          alt=""
          className="absolute inset-0 -z-20 size-full scale-105 object-cover object-[70%_40%] motion-safe:animate-[hero-drift_24s_ease-in-out_infinite_alternate]"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgb(9_28_66/0.86)_0%,rgb(12_40_92/0.62)_45%,rgb(20_60_130/0.1)_100%)]"
        />

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1 text-[13px] font-semibold ring-1 ring-white/25 backdrop-blur-md">
            {t("hero.label")}
          </span>
          <span className="text-[13px] font-medium text-white/75">
            {home.plan.goal} · {t("minutes", { minutes: total })}
          </span>
        </div>

        <div className="mt-auto pt-14">
          <h2 className="font-heading max-w-[460px] text-[34px] leading-[1.05] font-semibold tracking-[-0.03em] sm:text-[42px]">
            {home.plan.title}
          </h2>
          {current && (
            <p className="mt-3 max-w-[460px] text-[15px] text-white/80">
              <span className="font-semibold text-white">{t("hero.now")}:</span> {current.objective} ·{" "}
              {t("minutes", { minutes: current.minutes })}
            </p>
          )}

          {/* One segment per step: the count you can see at a glance. */}
          <div className="mt-6 flex max-w-[360px] items-center gap-3">
            <div className="flex flex-1 gap-1.5">
              {blocks.map((b, i) => (
                <span key={b.index} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
                  <span
                    className={cn(
                      "block h-full origin-left rounded-full",
                      b.done && "bg-white motion-safe:animate-[bar-grow_700ms_var(--ease-entrance)_both]",
                      b === current && "w-1/3 bg-white/70",
                    )}
                    style={{ animationDelay: `${400 + i * 90}ms` }}
                  />
                </span>
              ))}
            </div>
            <span className="text-[13px] font-medium text-white/80 tabular-nums">
              {t("hero.steps", { done, total: blocks.length })}
            </span>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="font-heading inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-white px-6 text-[16px] font-semibold text-[#0B1730] shadow-[0_10px_30px_-10px_rgb(0_0_0/0.5)] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.97]"
            >
              <Play className="size-4 fill-current" />
              {done ? t("continue") : t("start")}
            </button>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="inline-flex h-12 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white"
            >
              {open ? t("hero.hide") : t("hero.see")}
              <ChevronDown className={cn("size-4 transition-transform duration-300", open && "rotate-180")} />
            </button>
          </div>
        </div>
      </div>

      {/* The steps, folded until asked for: a list on the home was what
          read as "lleno" (1/nov). Grid rows animate the height. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-[420ms] ease-(--ease-entrance)",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <ol className="min-h-0 overflow-hidden" inert={!open}>
          {blocks.map((b) => {
            const now = b === current;
            return (
              <li key={b.index} className="flex items-center gap-4 border-t border-black/[0.05] px-6 py-3.5 sm:px-8 dark:border-white/[0.06]">
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold",
                    b.done && "bg-foreground text-background",
                    now && "bg-[var(--brand)] text-white",
                    !b.done && !now && "text-text-tertiary shadow-[inset_0_0_0_1.5px_rgb(16_24_40/0.12)]",
                  )}
                >
                  {b.done ? <Check className="size-3.5" strokeWidth={3} /> : b.index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[15px]", b.done ? "text-text-tertiary" : "text-foreground", now && "font-semibold")}>
                    {b.objective}
                  </p>
                  <p className="text-text-tertiary text-[12px]">{t(`kind.${b.kind}`)}</p>
                </div>
                <span className="text-text-tertiary text-[13px] tabular-nums">{t("minutes", { minutes: b.minutes })}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function Week({ home, t }: { home: Home; t: T }) {
  const locale = useLocale();
  const today = useToday();
  const narrow = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
  const days = home.week.map((practised, i) => {
    let label = "";
    if (today) {
      const d = new Date(today);
      d.setDate(d.getDate() - (home.week.length - 1 - i));
      label = narrow.format(d);
    }
    return { practised, label, today: i === home.week.length - 1 };
  });
  const { produced_minutes_today: produced, target_session_minutes: target, streak_days } = home.dose;
  const share = Math.min(produced / target, 1);

  return (
    <section className={cn(CARD, "p-5", ARRIVE)} style={arrive(2)}>
      <p className={LABEL}>{t("week")}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-heading text-foreground text-[40px] leading-none font-semibold tracking-[-0.04em] tabular-nums">
          {streak_days}
        </span>
        <span className="text-text-secondary text-[15px]">{t("streakDays", { days: streak_days })}</span>
      </div>

      <ol className="mt-5 grid grid-cols-7 gap-1">
        {days.map((d, i) => (
          <li key={i} className="flex flex-col items-center gap-1.5">
            <span
              className={cn(
                "grid size-8 place-items-center rounded-full",
                d.practised ? "bg-[oklch(0.7_0.17_55)] text-white" : "bg-black/[0.05] dark:bg-white/10",
                d.today && !d.practised && "bg-transparent shadow-[inset_0_0_0_1.5px_oklch(0.7_0.17_55)]",
              )}
            >
              {d.practised ? <Check className="size-3.5" strokeWidth={3} /> : null}
            </span>
            <span className={cn("h-3.5 text-[11px] font-medium uppercase", d.today ? "text-foreground" : "text-text-tertiary")}>
              {d.label}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-5 border-t border-black/[0.05] pt-4 dark:border-white/[0.06]">
        <div className="flex items-baseline justify-between">
          <span className="text-foreground text-[14px] font-medium">{t("hero.todayLabel")}</span>
          <span className="text-text-secondary text-[13px] tabular-nums">{t("todayMinutes", { done: Math.round(produced), target })}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/10">
          <div
            className="h-full origin-left rounded-full bg-[var(--brand)] motion-safe:animate-[bar-grow_900ms_var(--ease-entrance)_both]"
            style={{ width: `${share * 100}%`, animationDelay: "420ms" }}
          />
        </div>
      </div>
    </section>
  );
}

/** Talkeo on the page itself, with the three things people ask it first. */
function Ask({ t, onAsk, onOpen }: { t: T; onAsk: (text: string) => void; onOpen: () => void }) {
  return (
    <section className={cn(CARD, "p-5", ARRIVE)} style={arrive(3)}>
      <div className="flex items-center gap-3">
        <Avatar className="size-10" />
        <div className="min-w-0 flex-1">
          <p className={CARD_TITLE}>{t("ask.title")}</p>
          <p className="text-text-secondary text-[13px]">{t("ask.line")}</p>
        </div>
      </div>
      <ul className="mt-4 flex flex-col gap-1">
        {MOCK_TALKEO.suggestions.map((s) => (
          <li key={s.ask}>
            <button
              type="button"
              onClick={() => onAsk(s.ask)}
              className="text-foreground group flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            >
              {s.ask}
              <ArrowUpRight className="text-text-tertiary size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onOpen}
        className="text-text-secondary hover:text-foreground mt-2 w-full cursor-pointer px-3 text-left text-[13px] font-medium transition-colors"
      >
        {t("ask.open")}
      </button>
    </section>
  );
}

/** The account ask: present, never in the way (onboarding v2, step 7). */
function Save({ t }: { t: T }) {
  const [gone, setGone] = useState(false);
  const [closing, setClosing] = useState(false);
  if (gone) return null;
  return (
    <section
      className={cn(CARD, "relative p-5", ARRIVE, closing && "pointer-events-none !animate-[view-out_240ms_var(--ease-standard)_both]")}
      style={arrive(4)}
      onAnimationEnd={() => closing && setGone(true)}
    >
      <button
        type="button"
        aria-label={t("save.later")}
        title={t("save.later")}
        onClick={() => setClosing(true)}
        className="text-text-tertiary hover:text-foreground absolute top-3 right-3 grid size-8 cursor-pointer place-items-center rounded-full transition-colors hover:bg-black/[0.05]"
      >
        <X className="size-4" />
      </button>
      <p className={cn(CARD_TITLE, "pr-8")}>{t("save.title")}</p>
      <p className="text-text-secondary mt-1 text-[14px] leading-snug">{t("save.body")}</p>
      <Link href="/login" prefetch={false} className={cn(PRIMARY, "mt-4 h-10 w-full text-[14px]")}>
        {t("save.cta")}
      </Link>
    </section>
  );
}

/** The fixed path: the unit you are in, step by step, and what comes after. */
function Road({ units, t }: { units: RoadUnit[]; t: T }) {
  const [current, ...after] = units;
  if (!current) return null;
  const done = current.nodes.filter((n) => n.state === "done").length;

  return (
    <section className={cn(CARD, "p-6 sm:p-8", ARRIVE)} style={arrive(3)}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className={LABEL}>{t("road")}</p>
          <h2 className="font-heading text-foreground mt-1 text-[22px] font-semibold tracking-[-0.02em]">{current.title}</h2>
          <p className="text-text-secondary text-[14px]">
            {t("unit", { n: 1 })} · {t("forGoal", { goal: current.goal })}
          </p>
        </div>
        <span className="text-text-secondary text-[13px] font-medium tabular-nums">
          {t("progress", { done, total: current.nodes.length })}
        </span>
      </div>

      <ol className="relative mt-6">
        {current.nodes.map((node, i) => {
          const last = i === current.nodes.length - 1;
          return (
            <li key={node.id} className="relative flex gap-4 pb-5 last:pb-0">
              {/* The line between stops, solid where you have been. */}
              {!last && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-9 bottom-1 left-[17px] w-0.5 rounded-full",
                    node.state === "done" ? "bg-foreground" : "bg-black/[0.08] dark:bg-white/10",
                  )}
                />
              )}
              <span className="relative grid size-9 shrink-0 place-items-center">
                {node.state === "today" && (
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-[var(--brand)]/30 motion-safe:animate-[ring-pulse_2.4s_var(--ease-standard)_infinite]"
                  />
                )}
                <span
                  className={cn(
                    "relative grid size-9 place-items-center rounded-full text-[13px] font-semibold",
                    node.state === "done" && "bg-foreground text-background",
                    node.state === "today" && "bg-[var(--brand)] text-white shadow-[0_6px_16px_-6px_var(--brand)]",
                    node.state === "next" && "bg-card text-text-tertiary shadow-[inset_0_0_0_1.5px_rgb(16_24_40/0.12)]",
                  )}
                >
                  {node.state === "done" ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                </span>
              </span>
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pt-1.5">
                <p
                  className={cn(
                    "truncate text-[15px]",
                    node.state === "next" ? "text-text-secondary" : "text-foreground",
                    node.state === "today" && "font-semibold",
                  )}
                >
                  {node.title}
                  {node.state === "today" && (
                    <span className="ml-2 rounded-full bg-[var(--brand-soft)] px-2 py-0.5 align-middle text-[11px] font-semibold text-[var(--brand-text)]">
                      {t("today")}
                    </span>
                  )}
                </p>
                <span className="text-text-tertiary shrink-0 text-[13px] tabular-nums">{t("minutes", { minutes: node.minutes })}</span>
              </div>
            </li>
          );
        })}
      </ol>

      {after.map((unit, u) => (
        <div key={unit.id} className="mt-6 flex items-center gap-4 rounded-2xl bg-black/[0.03] px-4 py-3.5 dark:bg-white/[0.04]">
          <span className="text-text-tertiary grid size-9 shrink-0 place-items-center rounded-full bg-black/[0.05] dark:bg-white/10">
            <Lock className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-[15px] font-medium">{unit.title}</p>
            <p className="text-text-tertiary text-[13px]">
              {t("unit", { n: u + 2 })} · {t("lessons", { n: unit.nodes.length })}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}
