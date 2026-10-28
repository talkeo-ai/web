import { Check, Flame, Lock, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { Inside, PathNode, PathUnit } from "@/lib/inside/mock";
import { cn } from "@/lib/utils";

/**
 * What comes after the onboarding: the day's dose up top and the road below.
 *
 * The shape is Duolingo's home, on purpose: a column of steps that zigzags,
 * the one to do now raised and labelled, the rest done or locked. The data is
 * mocked (`lib/inside/mock.ts`) until the Core serves it.
 */
export async function InsideScreen({ inside }: { inside: Inside }) {
  const t = await getTranslations("inside");
  const dose = Math.min(1, inside.doseMinutes / inside.doseGoalMinutes);

  return (
    <div data-slot="inside" className="flex min-h-dvh flex-col">
      <header className="bg-background/90 sticky top-0 z-10 w-full border-b px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-center gap-4">
          <div
            className="flex items-center gap-1.5 font-heading text-[15px] font-semibold"
            aria-label={t("streak", { days: inside.streakDays })}
          >
            <Flame className="size-5 text-orange-500" />
            {inside.streakDays}
          </div>
          <div className="flex flex-1 items-center gap-2">
            <div
              className="bg-surface-tertiary h-2.5 flex-1 overflow-hidden rounded-full"
              role="progressbar"
              aria-valuenow={inside.doseMinutes}
              aria-valuemax={inside.doseGoalMinutes}
              aria-label={t("dose", {
                minutes: inside.doseMinutes,
                goal: inside.doseGoalMinutes,
              })}
            >
              <div
                className="bg-accent-500 h-full rounded-full"
                style={{ width: `${dose * 100}%` }}
              />
            </div>
            <span className="text-text-secondary text-[13px] tabular-nums">
              {inside.doseMinutes}/{inside.doseGoalMinutes} min
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-10 px-4 py-6">
        {inside.units.map((unit) => (
          <Unit key={unit.id} unit={unit} start={t("start")} />
        ))}
      </main>
    </div>
  );
}

function Unit({ unit, start }: { unit: PathUnit; start: string }) {
  return (
    <section className="flex flex-col gap-6">
      <div className="bg-surface-secondary rounded-2xl border border-black/[0.06] px-5 py-4 dark:border-white/[0.06]">
        <p className="text-text-secondary text-[13px]">{unit.subtitle}</p>
        <h2 className="font-heading text-foreground text-[17px] font-semibold">
          {unit.title}
        </h2>
      </div>
      <ol className="flex flex-col items-center gap-5">
        {unit.nodes.map((node, i) => (
          <Step key={node.id} node={node} offset={zigzag(i)} start={start} />
        ))}
      </ol>
    </section>
  );
}

/** The road's sway: right, back, left, back, as Duolingo draws it. */
function zigzag(i: number) {
  return [0, 1, 0, -1][i % 4] * 56;
}

function Step({
  node,
  offset,
  start,
}: {
  node: PathNode;
  offset: number;
  start: string;
}) {
  const Icon =
    node.state === "done" ? Check : node.state === "current" ? Star : Lock;

  return (
    <li
      className="relative flex flex-col items-center"
      style={{ transform: `translateX(${offset}px)` }}
    >
      {node.state === "current" && (
        <span className="bg-background text-foreground mb-2 rounded-xl border px-3 py-1.5 font-heading text-[13px] font-semibold shadow-sm">
          {start}
        </span>
      )}
      <button
        type="button"
        disabled={node.state === "locked"}
        aria-label={node.title}
        title={node.title}
        className={cn(
          "flex size-16 items-center justify-center rounded-full transition-transform",
          "active:translate-y-0.5 disabled:cursor-not-allowed",
          node.state === "done" &&
            "bg-accent-500 text-white shadow-[0_4px_0_0_var(--color-accent-700)]",
          node.state === "current" &&
            "bg-accent-500 text-white shadow-[0_4px_0_0_var(--color-accent-700)] ring-accent-200 ring-4 ring-offset-2 ring-offset-background",
          node.state === "locked" &&
            "bg-surface-tertiary text-text-tertiary shadow-[0_4px_0_0_var(--surface-quaternary)]",
        )}
      >
        <Icon className="size-7" strokeWidth={2.5} />
      </button>
    </li>
  );
}
