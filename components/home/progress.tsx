"use client";

import { Check } from "lucide-react";
import { useLocale } from "next-intl";

import type { AreaState, Cell, Goal, Home } from "@/lib/inside/mock";
import { cn } from "@/lib/utils";

import { ARRIVE, BANDS, CARD, CARD_TITLE, LABEL, PAGE_TITLE, QUIET, arrive, type T } from "./ui";

/**
 * Where you are, with everything that is known and how well, laid out like
 * the health dashboards people pay for (Bevel): one number with its ring,
 * the activity beside it, then a card per area (`get_state_map`, floor to
 * ceiling), the words, and the goals. An area with nothing measured says so
 * and offers to measure it (the grey with its action, onboarding v2). One
 * letter never stands for the whole (v5, D44): the estimate sits beside the
 * areas.
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
      <Words home={home} t={t} />
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

/**
 * One card per area, each with its own six steps from A1 to C2 and the
 * letters under them, so nothing has to be read against a ruler at the top
 * (Joaquin, 1/nov, on the shared ladder: "parece que está bugueado y es
 * difícil de leer"). The steps the area may sit on are lit; how wide that is,
 * is how unsure we are. An area with nothing measured says so in words and
 * carries the button to measure it.
 */
function AreaMap({ areas, t }: { areas: AreaState[]; t: T }) {
  const at = (band: string) => BANDS.indexOf(band as (typeof BANDS)[number]);
  const sorted = [...areas].sort((a, b) => Number(b.measured_pct > 0) - Number(a.measured_pct > 0));
  return (
    <section className={ARRIVE} style={arrive(3)}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 px-1">
        <h2 className={cn(CARD_TITLE, "text-[19px]")}>{t("progressView.areas")}</h2>
        <p className="text-text-tertiary text-[13px]">{t("progressView.areasNote")}</p>
      </div>

      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sorted.map((area, i) => {
          const from = at(area.floor);
          const to = at(area.ceiling);
          const measured = area.measured_pct > 0;
          return (
            <li key={area.area} className={cn(CARD, "flex flex-col p-5")}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-foreground text-[15px] font-semibold">{t(`area.${area.area}`)}</p>
                {measured ? (
                  <span className="text-text-tertiary text-[12px] font-medium tabular-nums">
                    {t("progressView.measured", { pct: area.measured_pct })}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="font-heading -mt-0.5 cursor-pointer rounded-full bg-[var(--brand-soft)] px-3 py-1 text-[12px] font-semibold text-[var(--brand-text)] transition-colors hover:bg-[var(--brand)] hover:text-white"
                  >
                    {t("measure")}
                  </button>
                )}
              </div>

              <p
                className={cn(
                  "font-heading mt-3 text-[28px] leading-none font-semibold tracking-[-0.03em]",
                  measured ? "text-foreground" : "text-text-tertiary text-[20px]",
                )}
              >
                {measured ? (from === to ? area.floor : `${area.floor}–${area.ceiling}`) : t("unmeasured")}
              </p>
              <p className="text-text-tertiary mt-1.5 min-h-[18px] text-[12px]">
                {measured
                  ? from === to
                    ? t("progressView.sure")
                    : t("progressView.between", { floor: area.floor, ceiling: area.ceiling })
                  : t("progressView.unknownYet")}
              </p>

              <ol className="mt-4 grid grid-cols-6 gap-1">
                {BANDS.map((band, b) => {
                  const lit = b >= from && b <= to;
                  return (
                    <li key={band} className="flex flex-col items-center gap-1.5">
                      <span
                        className={cn(
                          "h-2 w-full rounded-full",
                          lit
                            ? measured
                              ? "bg-[var(--brand)] motion-safe:animate-[bar-grow_700ms_var(--ease-entrance)_both]"
                              : "bg-[repeating-linear-gradient(135deg,rgb(16_24_40/0.16)_0_3px,rgb(16_24_40/0.05)_3px_6px)]"
                            : "bg-black/[0.05] dark:bg-white/10",
                        )}
                        style={lit ? { animationDelay: `${300 + i * 60 + b * 40}ms` } : undefined}
                      />
                      <span
                        className={cn(
                          "text-[10.5px] font-semibold tabular-nums",
                          lit && measured ? "text-foreground" : "text-text-tertiary",
                        )}
                      >
                        {band}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The four states of a cell, in the order they are told (`Cell`: 1, 3, 2, 0). */
const STATES = [
  { key: "known", cell: 1, dot: "bg-[oklch(0.7_0.13_155)]" },
  { key: "partly", cell: 3, dot: "bg-[oklch(0.84_0.13_85)]" },
  { key: "unknown", cell: 2, dot: "bg-[oklch(0.7_0.15_28)]" },
  { key: "unmeasured", cell: 0, dot: "bg-black/[0.07] dark:bg-white/10" },
] as const;
const CELL_COLOR: Record<Cell, string> = {
  0: STATES[3].dot,
  1: STATES[0].dot,
  2: STATES[2].dot,
  3: STATES[1].dot,
};
/** The 18 columns: three blocks, three aspects each, recognising then producing. */
const BLOCKS = [
  { key: "form", aspects: ["spoken", "written", "parts"] },
  { key: "meaning", aspects: ["meaning", "concept", "association"] },
  { key: "use", aspects: ["grammar", "collocation", "register"] },
] as const;

/**
 * The word store, summed up so it scales to every word in English (Joaquin,
 * 1/nov, optional): how many words of each band you know, half know, do not
 * know or we have not seen, and under it a handful of words cell by cell, the
 * 18 things there are to know about a word (ARQUITECTURA-V5 §5 bis).
 */
function Words({ home, t }: { home: Home; t: T }) {
  const { bands, sample } = home.words;
  const total = bands.reduce((s, b) => s + b.known + b.partly + b.unknown + b.unmeasured, 0);
  const sums = {
    known: bands.reduce((s, b) => s + b.known, 0),
    partly: bands.reduce((s, b) => s + b.partly, 0),
    unknown: bands.reduce((s, b) => s + b.unknown, 0),
    unmeasured: bands.reduce((s, b) => s + b.unmeasured, 0),
  };
  const biggest = Math.max(...bands.map((b) => b.known + b.partly + b.unknown + b.unmeasured));
  const fmt = new Intl.NumberFormat(useLocale());

  return (
    <section className={cn(CARD, "p-6 sm:p-7", ARRIVE)} style={arrive(4)}>
      <h2 className={cn(CARD_TITLE, "text-[19px]")}>{t("words.title")}</h2>
      <p className="text-text-secondary mt-1 text-[14px]">{t("words.line", { total: fmt.format(total) })}</p>

      <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
        {STATES.map((s) => (
          <li key={s.key}>
            <p className="text-text-secondary flex items-center gap-2 text-[13px] font-medium">
              <span className={cn("size-2.5 rounded-full", s.dot)} />
              {t(`words.${s.key}`)}
            </p>
            <p className="font-heading text-foreground mt-1 text-[24px] leading-none font-semibold tracking-[-0.02em] tabular-nums">
              {fmt.format(sums[s.key])}
            </p>
          </li>
        ))}
      </ul>

      {/* By band: one stacked bar per band, as long as the band is big. */}
      <ol className="mt-6 flex flex-col gap-2.5">
        {bands.map((b, i) => {
          const size = b.known + b.partly + b.unknown + b.unmeasured;
          return (
            <li key={b.band} className="grid grid-cols-[28px_minmax(0,1fr)_52px] items-center gap-3">
              <span className="text-foreground text-[12px] font-semibold">{b.band}</span>
              <span className="flex h-3 overflow-hidden rounded-full" style={{ width: `${(size / biggest) * 100}%` }}>
                {STATES.map((s) =>
                  b[s.key] ? (
                    <span
                      key={s.key}
                      className={cn("h-full origin-left motion-safe:animate-[bar-grow_900ms_var(--ease-entrance)_both]", s.dot)}
                      style={{ width: `${(b[s.key] / size) * 100}%`, animationDelay: `${300 + i * 60}ms` }}
                    />
                  ) : null,
                )}
              </span>
              <span className="text-text-tertiary text-right text-[12px] tabular-nums">{fmt.format(size)}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 border-t border-black/[0.05] pt-6 dark:border-white/[0.06]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-foreground text-[15px] font-semibold">{t("words.byWord")}</h3>
          <p className="text-text-tertiary text-[12px]">{t("words.modes")}</p>
        </div>

        <div className="mt-4 grid max-w-[620px] grid-cols-[84px_minmax(0,1fr)] gap-x-3 sm:grid-cols-[110px_minmax(0,1fr)]">
          <span />
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {BLOCKS.map((block) => (
              <span key={block.key} className="text-text-secondary truncate text-[12px] font-semibold">
                {t(`words.block.${block.key}`)}
              </span>
            ))}
          </div>

          {sample.map((w) => (
            <div key={w.word} className="contents">
              <p className="mt-1.5 flex items-baseline gap-1.5 truncate">
                <span className="text-foreground truncate text-[13px] font-medium">{w.word}</span>
                <span className="text-text-tertiary text-[10px] font-semibold">{w.band}</span>
              </p>
              <div className="mt-1.5 grid grid-cols-3 gap-2 sm:gap-3">
                {BLOCKS.map((block, bi) => (
                  <div key={block.key} className="grid grid-cols-3 gap-[5px]">
                    {block.aspects.map((aspect, ai) => (
                      <div key={aspect} className="grid grid-cols-2 gap-[2px]">
                        {[0, 1].map((mode) => {
                          const cell = w.cells[bi * 6 + ai * 2 + mode] ?? 0;
                          return (
                            <span
                              key={mode}
                              title={`${w.word} · ${t(`words.aspect.${aspect}`)} · ${t(mode ? "words.produce" : "words.recognise")}`}
                              className={cn("aspect-square rounded-[4px]", CELL_COLOR[cell])}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-text-tertiary mt-4 text-[12px] leading-relaxed">
          {BLOCKS.map((block) => (
            <span key={block.key} className="mr-3 inline-block">
              <span className="text-text-secondary font-semibold">{t(`words.block.${block.key}`)}:</span>{" "}
              {block.aspects.map((a) => t(`words.aspect.${a}`)).join(", ")}
            </span>
          ))}
        </p>

        <button type="button" className={cn(QUIET, "mt-5")}>
          {t("words.all", { total: fmt.format(total) })}
        </button>
      </div>
    </section>
  );
}

function Goals({ goals, t }: { goals: Goal[]; t: T }) {
  return (
    <section className={ARRIVE} style={arrive(5)}>
      <h2 className={cn(CARD_TITLE, "mb-3 px-1 text-[19px]")}>{t("goals")}</h2>
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
