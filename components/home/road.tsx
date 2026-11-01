"use client";

import { Check, Lock } from "lucide-react";

import type { Home } from "@/lib/inside/mock";
import { cn } from "@/lib/utils";

import { ARRIVE, CARD, LABEL, PAGE_TITLE, arrive, type T } from "./ui";

/**
 * The fixed path, on its own tab (Joaquin, 1/nov: "para inicio dejamos solo
 * lo que nosotros hacemos y en los tabs agregamos uno aparte para el
 * roadmap"). The unit you are in, stop by stop, and the ones after it locked.
 */
export function Road({ home, t }: { home: Home; t: T }) {
  const [current, ...after] = home.road;
  if (!current) return null;
  const done = current.nodes.filter((n) => n.state === "done").length;

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
      <header className={ARRIVE} style={arrive(0)}>
        <h1 className={PAGE_TITLE}>{t("road")}</h1>
        <p className="text-text-secondary mt-1.5 text-[16px]">{t("roadLead", { goal: home.plan.goal })}</p>
      </header>

      <section className={cn(CARD, "p-6 sm:p-8", ARRIVE)} style={arrive(1)}>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className={LABEL}>
              {t("unit", { n: 1 })} · {t("forGoal", { goal: current.goal })}
            </p>
            <h2 className="font-heading text-foreground mt-1 text-[24px] font-semibold tracking-[-0.02em]">{current.title}</h2>
          </div>
          <span className="text-text-secondary text-[13px] font-medium tabular-nums">
            {t("progress", { done, total: current.nodes.length })}
          </span>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/10">
          <div
            className="h-full origin-left rounded-full bg-[var(--brand)] motion-safe:animate-[bar-grow_900ms_var(--ease-entrance)_both]"
            style={{ width: `${(done / current.nodes.length) * 100}%`, animationDelay: "300ms" }}
          />
        </div>

        <ol className="relative mt-7">
          {current.nodes.map((node, i) => {
            const last = i === current.nodes.length - 1;
            return (
              <li key={node.id} className="relative flex gap-4 pb-6 last:pb-0">
                {/* The line between stops, solid where you have been. */}
                {!last && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-10 bottom-1 left-[19px] w-0.5 rounded-full",
                      node.state === "done" ? "bg-foreground" : "bg-black/[0.08] dark:bg-white/10",
                    )}
                  />
                )}
                <span className="relative grid size-10 shrink-0 place-items-center">
                  {node.state === "today" && (
                    <span
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-[var(--brand)]/30 motion-safe:animate-[ring-pulse_2.4s_var(--ease-standard)_infinite]"
                    />
                  )}
                  <span
                    className={cn(
                      "relative grid size-10 place-items-center rounded-full text-[14px] font-semibold",
                      node.state === "done" && "bg-foreground text-background",
                      node.state === "today" && "bg-[var(--brand)] text-white shadow-[0_6px_16px_-6px_var(--brand)]",
                      node.state === "next" && "bg-card text-text-tertiary shadow-[inset_0_0_0_1.5px_rgb(16_24_40/0.12)]",
                    )}
                  >
                    {node.state === "done" ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                  </span>
                </span>
                <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pt-2">
                  <p
                    className={cn(
                      "truncate text-[16px]",
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
      </section>

      {after.map((unit, u) => (
        <section
          key={unit.id}
          className={cn(CARD, "flex items-center gap-4 p-5", ARRIVE)}
          style={arrive(2 + u)}
        >
          <span className="text-text-tertiary grid size-10 shrink-0 place-items-center rounded-full bg-black/[0.05] dark:bg-white/10">
            <Lock className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-[16px] font-semibold">{unit.title}</p>
            <p className="text-text-tertiary text-[13px]">
              {t("unit", { n: u + 2 })} · {t("forGoal", { goal: unit.goal })} · {t("lessons", { n: unit.nodes.length })}
            </p>
          </div>
        </section>
      ))}
    </div>
  );
}
