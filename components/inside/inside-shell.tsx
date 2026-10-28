"use client";

import {
  ChartNoAxesColumn,
  House,
  Mic,
  User,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { cn } from "@/lib/utils";

type Section = "home" | "practice" | "progress" | "profile";

const MAIN: { key: Section; Icon: LucideIcon }[] = [
  { key: "home", Icon: House },
  { key: "practice", Icon: Mic },
  { key: "progress", Icon: ChartNoAxesColumn },
];

/**
 * The inside, as one page: a fixed rail on the left and a card on the right.
 *
 * The window never scrolls; only the card does. The rail does not expand: each
 * entry is a large icon with its name under it. Switching sections is state
 * here and not a navigation, so nothing reloads.
 *
 * Everything sits on one 4px grid with a single gutter (12px): the space
 * around the card and the rail's own top and bottom are the same, so the logo
 * lines up with the card's top edge and the last entry with its bottom.
 */
export function InsideShell() {
  const t = useTranslations("inside");
  const [section, setSection] = useState<Section>("home");

  const entry = (key: Section, Icon: LucideIcon) => (
    <RailEntry
      key={key}
      Icon={Icon}
      label={t(`sections.${key}`)}
      active={key === section}
      onSelect={() => setSection(key)}
    />
  );

  return (
    <div
      data-slot="inside"
      className="bg-surface-sunken flex h-dvh overflow-hidden p-3"
    >
      <nav
        aria-label={t("nav")}
        className="flex w-[76px] shrink-0 flex-col items-center"
      >
        <div className="flex h-14 items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Talkeo" className="size-8" />
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {MAIN.map(({ key, Icon }) => entry(key, Icon))}
        </div>
        <div className="mt-auto">{entry("profile", User)}</div>
      </nav>

      <main className="bg-card ml-3 min-w-0 flex-1 overflow-y-auto rounded-[20px] border border-black/[0.05] shadow-xs dark:border-white/[0.06]">
        <div className="mx-auto w-full max-w-3xl px-10 py-10">
          <h1 className="font-heading text-foreground text-[28px] leading-tight font-semibold tracking-[-0.01em]">
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
}: {
  Icon: LucideIcon;
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      className="group focus-key:ring-ring flex w-16 cursor-pointer flex-col items-center gap-1 rounded-xl outline-none focus-key:ring-2"
    >
      {/* The indicator is the only thing that marks the section: a pill
          behind the icon, wider than tall, the label left alone under it. */}
      <span
        className={cn(
          "flex h-8 w-14 items-center justify-center rounded-full",
          "transition-colors duration-(--duration-control) ease-(--ease-standard)",
          active
            ? "bg-foreground/[0.08] text-foreground"
            : "text-text-secondary group-hover:bg-foreground/[0.04] group-hover:text-foreground",
        )}
      >
        <Icon className="size-[22px]" strokeWidth={active ? 2.1 : 1.8} />
      </span>
      <span
        className={cn(
          "text-[11.5px] leading-4 font-medium",
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
