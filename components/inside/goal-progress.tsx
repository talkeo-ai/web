"use client";

import { Flame } from "lucide-react";
import { useTranslations } from "next-intl";
import { HoverCard } from "radix-ui";

import type { Home } from "@/lib/inside/mock";
import { cn } from "@/lib/utils";

/**
 * The day's goal as one thin bar in the panel's bar, with the streak beside
 * it. Resting on it opens the details: minutes today and each goal's progress.
 * Data is mocked.
 */
export function GoalProgress({ home }: { home: Home }) {
  const t = useTranslations("inside.home");
  const today = Math.min(1, home.minutesToday / home.minutesGoal);

  return (
    <HoverCard.Root openDelay={120} closeDelay={120}>
      <HoverCard.Trigger asChild>
        <button
          type="button"
          aria-label={t("todayGoal", {
            minutes: home.minutesToday,
            goal: home.minutesGoal,
          })}
          className="hover:bg-foreground/[0.05] focus-key:ring-ring flex h-8 cursor-default items-center gap-3 rounded-lg px-2.5 outline-none transition-colors duration-(--duration-control) focus-key:ring-2"
        >
          <span className="flex items-center gap-1">
            <Flame className="size-4 text-orange-500" strokeWidth={2} />
            <span className="text-foreground text-[13px] font-semibold tabular-nums">
              {home.streakDays}
            </span>
          </span>
          <Bar value={today} className="w-28" />
        </button>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          align="end"
          sideOffset={6}
          className={cn(
            "bg-popover text-popover-foreground z-50 w-72 rounded-xl border border-black/[0.07] p-4 dark:border-white/[0.08]",
            "shadow-[0_1px_2px_rgb(0_0_0/0.06),0_16px_40px_-12px_rgb(0_0_0/0.3)]",
            "origin-(--radix-hover-card-content-transform-origin)",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-150",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-100",
          )}
        >
          <div className="flex items-baseline justify-between">
            <span className="text-foreground text-[14px] font-medium">
              {t("today")}
            </span>
            <span className="text-text-secondary text-[13px] tabular-nums">
              {home.minutesToday}/{home.minutesGoal} min
            </span>
          </div>
          <Bar value={today} className="mt-2" />
          <p className="text-text-secondary mt-2 flex items-center gap-1.5 text-[13px]">
            <Flame className="size-3.5 text-orange-500" strokeWidth={2} />
            {t("streakLong", { days: home.streakDays })}
          </p>

          <div className="bg-foreground/[0.07] my-3.5 h-px" />

          <p className="text-text-secondary mb-2.5 text-[12px] font-medium">
            {t("goals")}
          </p>
          <ul className="flex flex-col gap-2.5">
            {home.goals.map((goal) => (
              <li key={goal.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-foreground truncate text-[13px]">
                    {goal.title}
                  </span>
                  <span className="text-text-secondary text-[12px] tabular-nums">
                    {Math.round(goal.progress * 100)}%
                  </span>
                </div>
                <Bar value={goal.progress} thin />
              </li>
            ))}
          </ul>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}

function Bar({
  value,
  className,
  thin = false,
}: {
  value: number;
  className?: string;
  thin?: boolean;
}) {
  return (
    <span
      className={cn(
        "bg-foreground/[0.08] block overflow-hidden rounded-full",
        thin ? "h-1" : "h-1.5",
        className,
      )}
    >
      <span
        className="bg-accent-500 block h-full rounded-full"
        style={{ width: `${value * 100}%` }}
      />
    </span>
  );
}
