"use client";

import { Check } from "lucide-react";

import type { AreaState, Goal, Home } from "@/lib/inside/mock";
import { cn } from "@/lib/utils";

import { ARRIVE, BANDS, CARD, CARD_TITLE, LABEL, PAGE_TITLE, arrive, type T } from "./ui";

/**
 * Where you are, with everything that is known and how well, laid out like
 * the health dashboards people pay for (Bevel): one number with its ring,
 * the activity beside it, then every area on the same A1 to C2 ladder, its
 * span as wide as the uncertainty (`get_state_map`, floor to ceiling). An
 * area with nothing measured shows hatched and offers to measure it (the
 * grey with its action, onboarding v2). One letter never stands for the
 * whole (v5, D44): the estimate sits beside the areas.
 */
export function Progress({ home, t }: { home: Home; t: T }) {
  return (
    <div className="flex flex-col gap-5">
      <header className={cn("mb-1", ARRIVE)} style={arrive(0)}>
        <h1 className={PAGE_TITLE}>{t("progressView.title")}</h1>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Estimate home={home} t={t} />
        <Activity minutes={home.activity} t={t} />
      </div>
      <AreaMap areas={home.state.areas} t={t} />
      <Goals goals={home.goals} t={t} />
    </div>
  );
}

function Ring({ pct, children }: { pct: number; children: React.ReactNode }) {
  return (
    <div className="relative grid size-[148px] place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r="44" fill="none" strokeWidth="7" className="stroke-black/[0.06] dark:stroke-white/10" />
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100"
          strokeDashoffset={100 - pct}
          className="stroke-[var(--brand)] motion-safe:animate-[dash-in_1200ms_var(--ease-entrance)_both]"
          style={{ animationDelay: "300ms" }}
        />
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  );
}

function Estimate({ home, t }: { home: Home; t: T }) {
  const { level_estimate, confidence_pct } = home.state.headline;
  return (
    <section className={cn(CARD, "flex flex-col items-center p-6 text-center", ARRIVE)} style={arrive(1)}>
      <p className={cn(LABEL, "self-start")}>{t("progressView.estimate")}</p>
      <div className="mt-4">
        <Ring pct={confidence_pct}>
          <span className="font-heading text-foreground block text-[44px] leading-none font-semibold tracking-[-0.04em]">
            {level_estimate}
          </span>
        </Ring>
      </div>
      <p className="text-foreground mt-4 text-[14px] font-semibold tabular-nums">
        {t("progressView.confidence", { pct: confidence_pct })}
      </p>
      <p className="text-text-secondary mt-1 text-[13px] leading-snug">{t("progressView.estimateNote")}</p>
    </section>
  );
}

function Activity({ minutes, t }: { minutes: number[]; t: T }) {
  const max = Math.max(...minutes, 1);
  const total = minutes.reduce((a, b) => a + b, 0);
  const days = minutes.filter((m) => m > 0).length;
  return (
    <section className={cn(CARD, "flex flex-col p-6", ARRIVE)} style={arrive(2)}>
      <p className={LABEL}>{t("progressView.activity")}</p>
      <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-2">
        <div>
          <span className="font-heading text-foreground text-[32px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
            {total}
          </span>
          <span className="text-text-secondary ml-1.5 text-[14px]">{t("progressView.minutesUnit")}</span>
        </div>
        <div>
          <span className="font-heading text-foreground text-[32px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
            {days}
          </span>
          <span className="text-text-secondary ml-1.5 text-[14px]">{t("progressView.daysUnit")}</span>
        </div>
      </div>
      <div className="mt-auto flex h-28 items-end gap-[4px] pt-6" aria-hidden>
        {minutes.map((m, i) => (
          <span
            key={i}
            className={cn(
              "flex-1 origin-bottom rounded-[4px] motion-safe:animate-[bar-rise_800ms_var(--ease-entrance)_both]",
              m > 0 ? (i === minutes.length - 1 ? "bg-[var(--brand)]" : "bg-[var(--brand)]/45") : "bg-black/[0.05] dark:bg-white/10",
            )}
            style={{ height: m > 0 ? `${Math.max((m / max) * 100, 10)}%` : "6%", animationDelay: `${260 + i * 16}ms` }}
          />
        ))}
      </div>
    </section>
  );
}

function AreaMap({ areas, t }: { areas: AreaState[]; t: T }) {
  const at = (band: string) => BANDS.indexOf(band as (typeof BANDS)[number]);
  return (
    <section className={cn(CARD, "p-6", ARRIVE)} style={arrive(3)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={CARD_TITLE}>{t("progressView.areas")}</h2>
        <p className="text-text-tertiary text-[13px]">{t("levelNote")}</p>
      </div>

      {/* The ladder: the same columns for every row, so the areas read
          against each other at a glance. */}
      <div className="mt-5 grid grid-cols-[minmax(0,120px)_minmax(0,1fr)] items-center gap-x-5 gap-y-4 sm:grid-cols-[160px_minmax(0,1fr)_96px]">
        <span />
        <div className="grid grid-cols-6">
          {BANDS.map((b) => (
            <span key={b} className="text-text-tertiary text-center text-[11px] font-semibold">
              {b}
            </span>
          ))}
        </div>
        <span className="hidden sm:block" />

        {areas.map((area, i) => {
          const from = at(area.floor);
          const to = at(area.ceiling);
          const measured = area.measured_pct > 0;
          return (
            <div key={area.area} className="contents">
              <div className="min-w-0">
                <p className="text-foreground truncate text-[15px] font-medium">{t(`area.${area.area}`)}</p>
                <p className="text-text-tertiary text-[12px]">
                  {from === to
                    ? t("progressView.exact", { band: area.floor })
                    : t("progressView.range", { floor: area.floor, ceiling: area.ceiling })}
                </p>
              </div>
              <div className="relative grid h-3 grid-cols-6 rounded-full bg-black/[0.05] dark:bg-white/10">
                <span
                  className={cn(
                    "absolute inset-y-0 rounded-full motion-safe:animate-[span-in_900ms_var(--ease-entrance)_both]",
                    measured
                      ? "bg-[var(--brand)]"
                      : "bg-[repeating-linear-gradient(135deg,rgb(16_24_40/0.14)_0_4px,transparent_4px_8px)]",
                  )}
                  style={{
                    left: `${(from / 6) * 100}%`,
                    width: `${((to - from + 1) / 6) * 100}%`,
                    animationDelay: `${360 + i * 70}ms`,
                  }}
                />
              </div>
              <div className="col-span-2 -mt-2 flex justify-end sm:col-span-1 sm:mt-0">
                {measured ? (
                  <span className="text-text-secondary text-[13px] tabular-nums">
                    {t("progressView.measured", { pct: area.measured_pct })}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="font-heading cursor-pointer rounded-full bg-[var(--brand-soft)] px-3 py-1 text-[12px] font-semibold text-[var(--brand-text)] transition-colors hover:bg-[var(--brand)] hover:text-white"
                  >
                    {t("measure")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Goals({ goals, t }: { goals: Goal[]; t: T }) {
  return (
    <section className={ARRIVE} style={arrive(4)}>
      <h2 className={cn(CARD_TITLE, "mb-3 px-1")}>{t("goals")}</h2>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
        {goals.map((goal, i) => (
          <li key={goal.goal_id} className={cn(CARD, "flex flex-col p-5")}>
            <p className="text-foreground flex items-center gap-1.5 text-[16px] font-semibold">
              {goal.status === "completed" ? <Check className="size-4 text-[var(--brand)]" /> : null}
              {goal.name}
            </p>
            <p className="text-text-secondary mt-0.5 min-h-[20px] text-[13px]">{goal.focus ?? t("open")}</p>
            {goal.cells ? (
              <div className="mt-auto pt-5">
                <div className="h-2 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/10">
                  <div
                    className="h-full origin-left rounded-full bg-[var(--brand)] motion-safe:animate-[bar-grow_1000ms_var(--ease-entrance)_both]"
                    style={{ width: `${(goal.cells.used / goal.cells.total) * 100}%`, animationDelay: `${500 + i * 80}ms` }}
                  />
                </div>
                <p className="text-text-tertiary mt-2 text-[12px] tabular-nums">
                  {t("cells", { used: goal.cells.used, total: goal.cells.total })}
                </p>
              </div>
            ) : (
              <p className="text-text-tertiary mt-auto pt-5 text-[12px]">{t("noBar")}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
