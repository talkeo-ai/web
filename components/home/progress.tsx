"use client";

import { Check } from "lucide-react";

import type { AreaState, Goal, Home } from "@/lib/inside/mock";
import { cn } from "@/lib/utils";

import { ARRIVE, BANDS, CARD, LEAD_FILL, arrive, type T } from "./ui";

/**
 * Where you are, with everything that is known and how well: the estimate and
 * its confidence, then every area on the same A1 to C2 ladder, the span it
 * sits in drawn as wide as the uncertainty is (`get_state_map`, floor to
 * ceiling). An area with nothing measured shows its span hatched and offers to
 * measure it: the grey with its action (onboarding v2). One letter never
 * stands for the whole (v5, D44): the estimate sits beside the areas.
 */
export function Progress({ home, t }: { home: Home; t: T }) {
  return (
    <div className="mx-auto flex w-full max-w-[980px] flex-col gap-5 pb-6">
      <header className={ARRIVE} style={arrive(0)}>
        <h1 className="font-heading text-foreground text-[30px] leading-[1.05] font-medium tracking-[-0.035em] lg:text-[40px]">
          {t("progressView.title")}
        </h1>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Estimate home={home} t={t} />
        <Activity minutes={home.activity} t={t} />
      </div>

      <AreaMap areas={home.state.areas} t={t} />
      <Goals goals={home.goals} t={t} />
    </div>
  );
}

function Estimate({ home, t }: { home: Home; t: T }) {
  const { level_estimate, confidence_pct } = home.state.headline;
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-[24px] p-6 text-white",
        "shadow-[0_1px_2px_rgb(28_25_23/0.08),0_24px_48px_-24px_rgb(30_80_180/0.6)]",
        LEAD_FILL,
        ARRIVE,
      )}
      style={arrive(1)}
    >
      <div aria-hidden className="pointer-events-none absolute -top-20 -right-10 -z-10 size-[260px] rounded-full bg-white/25 blur-3xl" />
      <p className="text-[13px] font-medium text-white/80">{t("progressView.estimate")}</p>
      <div className="mt-2 flex items-end gap-3">
        <span className="font-heading text-[56px] leading-none font-semibold tracking-[-0.04em]">{level_estimate}</span>
        <span className="mb-1.5 rounded-full bg-white/18 px-2.5 py-1 text-[13px] font-medium ring-1 ring-white/25">
          {t("progressView.confidence", { pct: confidence_pct })}
        </span>
      </div>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/22">
        <div
          className="h-full origin-left rounded-full bg-white motion-safe:animate-[bar-grow_1100ms_var(--ease-entrance)_both]"
          style={{ width: `${confidence_pct}%`, animationDelay: "300ms" }}
        />
      </div>
      <p className="mt-3 text-[13px] leading-snug text-white/80">{t("progressView.estimateNote")}</p>
    </section>
  );
}

function Activity({ minutes, t }: { minutes: number[]; t: T }) {
  const max = Math.max(...minutes, 1);
  const total = minutes.reduce((a, b) => a + b, 0);
  const days = minutes.filter((m) => m > 0).length;
  return (
    <section className={cn(CARD, "flex flex-col p-6", ARRIVE)} style={arrive(2)}>
      <p className="text-text-secondary text-[13px] font-medium">{t("progressView.activity")}</p>
      <p className="font-heading text-foreground mt-1 text-[22px] font-medium tracking-[-0.02em] tabular-nums">
        {t("progressView.minutesTotal", { minutes: total })}
      </p>
      <p className="text-text-tertiary text-[13px] tabular-nums">{t("progressView.daysActive", { days })}</p>
      <div className="mt-auto flex h-24 items-end gap-[3px] pt-4" aria-hidden>
        {minutes.map((m, i) => (
          <span
            key={i}
            className={cn(
              "flex-1 origin-bottom rounded-full motion-safe:animate-[bar-rise_800ms_var(--ease-entrance)_both]",
              m > 0 ? "bg-[linear-gradient(to_top,var(--brand),oklch(0.72_0.12_230))]" : "bg-surface-secondary",
              i === minutes.length - 1 && "ring-2 ring-[var(--brand)]/30 ring-offset-1 ring-offset-[var(--card)]",
            )}
            style={{ height: m > 0 ? `${Math.max((m / max) * 100, 12)}%` : "8%", animationDelay: `${260 + i * 18}ms` }}
          />
        ))}
      </div>
    </section>
  );
}

function AreaMap({ areas, t }: { areas: AreaState[]; t: T }) {
  const at = (band: string) => BANDS.indexOf(band as (typeof BANDS)[number]);
  return (
    <section className={cn(CARD, "p-5 sm:p-6", ARRIVE)} style={arrive(3)}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-heading text-foreground text-[18px] font-semibold tracking-[-0.01em]">{t("progressView.areas")}</h2>
        <p className="text-text-tertiary text-[13px]">{t("levelNote")}</p>
      </div>

      {/* The ladder: one column per band, the same for every row, so the
          areas can be read against each other at a glance. */}
      <div className="grid grid-cols-[minmax(96px,150px)_minmax(0,1fr)] items-center gap-x-4 gap-y-3 sm:grid-cols-[170px_minmax(0,1fr)_88px]">
        <span />
        <div className="grid grid-cols-6">
          {BANDS.map((b) => (
            <span key={b} className="text-text-tertiary text-center text-[11px] font-semibold tracking-[0.04em]">
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
            <Row key={area.area}>
              <div className="min-w-0">
                <p className="text-foreground truncate text-[14px] font-medium">{t(`area.${area.area}`)}</p>
                <p className="text-text-tertiary text-[12px]">
                  {from === to
                    ? t("progressView.exact", { band: area.floor })
                    : t("progressView.range", { floor: area.floor, ceiling: area.ceiling })}
                </p>
              </div>
              <div className="bg-surface-secondary/70 relative grid h-9 grid-cols-6 rounded-full">
                {BANDS.map((b, k) => (
                  <span key={b} className={cn(k > 0 && "border-l border-white/80 dark:border-white/5")} />
                ))}
                <span
                  className={cn(
                    "absolute inset-y-1 rounded-full motion-safe:animate-[span-in_900ms_var(--ease-entrance)_both]",
                    measured
                      ? "bg-[linear-gradient(90deg,var(--brand),oklch(0.72_0.12_230))] shadow-[0_6px_14px_-6px_rgb(40_90_170/0.6)]"
                      : "bg-[repeating-linear-gradient(135deg,var(--surface-tertiary)_0_5px,transparent_5px_10px)] ring-1 ring-black/[0.06] ring-inset",
                  )}
                  style={{
                    left: `calc(${(from / 6) * 100}% + 4px)`,
                    width: `calc(${((to - from + 1) / 6) * 100}% - 8px)`,
                    animationDelay: `${360 + i * 70}ms`,
                  }}
                />
              </div>
              <div className="col-span-2 -mt-1 flex justify-end sm:col-span-1 sm:mt-0">
                {measured ? (
                  <span className="text-text-secondary text-[12px] tabular-nums">
                    {t("progressView.measured", { pct: area.measured_pct })}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="font-heading cursor-pointer rounded-full px-3 py-1 text-[12px] font-semibold text-[var(--brand-text)] ring-1 ring-[var(--brand)]/30 transition-colors hover:bg-[var(--brand-soft)]"
                  >
                    {t("measure")}
                  </button>
                )}
              </div>
            </Row>
          );
        })}
      </div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Goals({ goals, t }: { goals: Goal[]; t: T }) {
  return (
    <section className={cn(CARD, "p-5 sm:p-6", ARRIVE)} style={arrive(4)}>
      <h2 className="font-heading text-foreground mb-2 text-[18px] font-semibold tracking-[-0.01em]">{t("goals")}</h2>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-x-8 md:grid-cols-3">
        {goals.map((goal, i) => (
          <li key={goal.goal_id} className="py-3">
            <p className="text-foreground flex items-center gap-1.5 text-[15px] font-medium">
              {goal.status === "completed" ? <Check className="size-4 text-[var(--brand)]" /> : null}
              {goal.name}
            </p>
            {goal.focus ? <p className="text-text-secondary text-[13px]">{goal.focus}</p> : null}
            {goal.cells ? (
              <>
                <div className="bg-surface-secondary mt-2.5 h-1.5 overflow-hidden rounded-full">
                  <div
                    className="h-full origin-left rounded-full bg-[var(--brand)] motion-safe:animate-[bar-grow_1000ms_var(--ease-entrance)_both]"
                    style={{ width: `${(goal.cells.used / goal.cells.total) * 100}%`, animationDelay: `${500 + i * 80}ms` }}
                  />
                </div>
                <p className="text-text-tertiary mt-1.5 text-[12px] tabular-nums">
                  {t("cells", { used: goal.cells.used, total: goal.cells.total })}
                </p>
              </>
            ) : (
              <p className="text-text-tertiary mt-1.5 text-[12px]">{t("open")}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
