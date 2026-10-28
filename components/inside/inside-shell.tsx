"use client";

import { House, Mic, TrendingUp, User, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { cn } from "@/lib/utils";

type Section = "home" | "practice" | "progress" | "profile";

const MAIN: { key: Section; Icon: LucideIcon }[] = [
  { key: "home", Icon: House },
  { key: "practice", Icon: Mic },
  { key: "progress", Icon: TrendingUp },
];

/**
 * The inside, as one page: a fixed rail on the left and a card on the right.
 *
 * The window never scrolls; only the card does. The rail does not expand: each
 * entry is an icon on a tile with its name under it. Switching sections is
 * state here and not a navigation, so nothing reloads.
 *
 * Sized after Cisma's rail, which Joaquin pointed at (27/oct): a narrow rail,
 * 40px tiles with a 12px corner and a 20px icon, the selected one filled solid
 * and flat. The profile sits at the bottom as a round avatar. The content runs
 * to the window's edges on the page's own colour, split from the rail by a
 * single line: as a rounded card in the card colour it read as a lighter grey
 * box set on the page (Joaquin, 27/oct).
 */
export function InsideShell() {
  const t = useTranslations("inside");
  const [section, setSection] = useState<Section>("home");

  return (
    <div
      data-slot="inside"
      className="bg-surface-sunken flex h-dvh overflow-hidden"
    >
      <nav
        aria-label={t("nav")}
        className="flex w-[72px] shrink-0 flex-col items-center py-4"
      >
        <div className="flex size-10 items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Talkeo" className="size-7" />
        </div>
        <div className="mt-6 flex flex-col gap-2">
          {MAIN.map(({ key, Icon }) => (
            <RailEntry
              key={key}
              Icon={Icon}
              label={t(`sections.${key}`)}
              active={key === section}
              onSelect={() => setSection(key)}
            />
          ))}
        </div>
        <div className="mt-auto">
          <RailEntry
            Icon={User}
            label={t("sections.profile")}
            active={section === "profile"}
            onSelect={() => setSection("profile")}
            round
          />
        </div>
      </nav>

      <main className="bg-background min-w-0 flex-1 overflow-y-auto border-l border-black/[0.06] dark:border-white/[0.07]">
        <div className="mx-auto w-full max-w-3xl px-8 py-8">
          <h1 className="font-heading text-foreground text-2xl font-semibold tracking-[-0.01em]">
            {t(`sections.${section}`)}
          </h1>
        </div>
      </main>
    </div>
  );
}

function RailEntry({
  Icon,
  label,
  active,
  onSelect,
  round = false,
}: {
  Icon: LucideIcon;
  label: string;
  active: boolean;
  onSelect: () => void;
  round?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      className="group focus-key:ring-ring flex w-14 cursor-pointer flex-col items-center gap-1 rounded-xl outline-none focus-key:ring-2"
    >
      <span
        className={cn(
          "flex size-10 items-center justify-center",
          round ? "rounded-full" : "rounded-xl",
          "transition-colors duration-(--duration-control) ease-(--ease-standard)",
          active
            ? "bg-surface-tertiary text-foreground"
            : round
              ? "bg-surface-secondary text-text-secondary group-hover:bg-surface-tertiary group-hover:text-foreground"
              : "text-text-secondary group-hover:bg-surface-secondary group-hover:text-foreground",
        )}
      >
        <Icon className="size-5" strokeWidth={active ? 2 : 1.75} />
      </span>
      <span
        className={cn(
          "text-[11px] leading-[14px] font-medium",
          "transition-colors duration-(--duration-control) ease-(--ease-standard)",
          active
            ? "text-foreground"
            : "text-text-secondary group-hover:text-foreground",
        )}
      >
        {label}
      </span>
    </button>
  );
}
