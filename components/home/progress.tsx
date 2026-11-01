"use client";

import { Check } from "lucide-react";

import type { AreaState, Goal, Home } from "@/lib/inside/mock";
import { cn } from "@/lib/utils";

import { ARRIVE, BANDS, CARD, MUTED, PAGE_TITLE, SECTION_TITLE, arrive, type T } from "./ui";

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
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4">
      <header className={cn("mb-1", ARRIVE)} style={arrive(0)}>
        <h1 className={PAGE_TITLE}>{t("progressView.title")}</h1>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
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
  // Certainty in three steps, read at a glance like a risk meter, with the
  // exact percent beside it for whoever wants it.
  const step = confidence_pct < 40 ? 1 : confidence_pct < 70 ? 2 : 3;
  const word = t(`progressView.${step === 1 ? "low" : step === 2 ? "medium" : "high"}`);
  return (
    <section className={cn(CARD, "flex flex-col p-5", ARRIVE)} style={arrive(1)}>
      <p className={cn(SECTION_TITLE)}>{t("progressView.estimate")}</p>
      <span className="font-heading text-foreground mt-3 text-[44px] leading-none font-semibold tracking-[-0.04em]">
        {level_estimate}
      </span>
      <div className="mt-auto pt-5">
        <div className="flex items-baseline justify-between text-[13px]">
          <span className={MUTED}>{t("progressView.certainty")}</span>
          <span className="text-foreground font-medium">
            {word} <span className="text-text-tertiary font-normal tabular-nums">· {t("progressView.confidence", { pct: confidence_pct })}</span>
          </span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1">
          {[1, 2, 3].map((k) => (
            <span
              key={k}
              className={cn(
                "h-1.5 origin-left rounded-full",
                k <= step ? "bg-[var(--brand)] motion-safe:animate-[bar-grow_600ms_var(--ease-entrance)_both]" : "bg-surface-tertiary",
              )}
              style={{ animationDelay: `${300 + k * 90}ms` }}
            />
          ))}
        </div>
        <p className="text-text-tertiary mt-3 text-[12px] leading-snug">{t("progressView.estimateNote")}</p>
      </div>
    </section>
  );
}

function Activity({ minutes, t }: { minutes: number[]; t: T }) {
  const max = Math.max(...minutes, 1);
  const total = minutes.reduce((a, b) => a + b, 0);
  const days = minutes.filter((m) => m > 0).length;
  return (
    <section className={cn(CARD, "flex flex-col p-5", ARRIVE)} style={arrive(2)}>
      <p className={SECTION_TITLE}>{t("progressView.activity")}</p>
      <p className="text-foreground mt-3 text-[15px] font-medium tabular-nums">{t("progressView.minutesTotal", { minutes: total })}</p>
      <p className="text-text-tertiary text-[13px] tabular-nums">{t("progressView.daysActive", { days })}</p>
      <div className="mt-auto flex h-20 items-end gap-[3px] pt-4" aria-hidden>
        {minutes.map((m, i) => (
          <span
            key={i}
            className={cn(
              "flex-1 origin-bottom rounded-[3px] motion-safe:animate-[bar-rise_800ms_var(--ease-entrance)_both]",
              m > 0 ? (i === minutes.length - 1 ? "bg-[var(--brand)]" : "bg-[var(--brand)]/55") : "bg-surface-secondary",
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
    <section className={cn(CARD, "p-5", ARRIVE)} style={arrive(3)}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className={SECTION_TITLE}>{t("progressView.areas")}</h2>
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
              <div className="bg-surface-secondary/60 relative grid h-6 grid-cols-6 rounded-md">
                {BANDS.map((b, k) => (
                  <span key={b} className={cn(k > 0 && "border-l border-white dark:border-white/5")} />
                ))}
                <span
                  className={cn(
                    "absolute inset-y-[5px] rounded-[4px] motion-safe:animate-[span-in_900ms_var(--ease-entrance)_both]",
                    measured
                      ? "bg-[var(--brand)]"
                      : "bg-[repeating-linear-gradient(135deg,var(--surface-tertiary)_0_4px,transparent_4px_8px)] ring-1 ring-black/[0.08] ring-inset",
                  )}
                  style={{
                    left: `calc(${(from / 6) * 100}% + 3px)`,
                    width: `calc(${((to - from + 1) / 6) * 100}% - 6px)`,
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
                    className="text-foreground hover:bg-surface-secondary cursor-pointer rounded-full px-2.5 py-0.5 text-[12px] font-medium shadow-[inset_0_0_0_1px_rgb(15_30_60/0.14)] transition-colors"
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
    <section className={cn(CARD, "p-5", ARRIVE)} style={arrive(4)}>
      <h2 className={cn(SECTION_TITLE, "mb-1")}>{t("goals")}</h2>
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
