"use client";

import {
  AudioLines,
  Bot,
  Captions,
  ChevronRight,
  Drama,
  Gamepad2,
  GraduationCap,
  Headphones,
  Languages,
  Layers,
  MessageSquareText,
  MessagesSquare,
  Mic,
  MonitorPlay,
  PenLine,
  Phone,
  Radio,
  RectangleEllipsis,
  RotateCcw,
  Shuffle,
  Speech,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { Link } from "@/lib/i18n/navigation";
import type { Home, SurfaceGroup, SurfaceItem } from "@/lib/inside/mock";
import { cn } from "@/lib/utils";

import { Segmented } from "./segmented";
import { ARRIVE, CARD, CARD_TITLE, PAGE_TITLE, arrive, type T } from "./ui";

const GROUPS: SurfaceGroup[] = ["speak", "write", "listen", "play", "tools", "people"];

/**
 * One soft tint per group, on the icon only (Loora's practice list): enough
 * to find a family at a glance, never a box of crayons.
 */
const TINT: Record<SurfaceGroup, { icon: LucideIcon; chip: string }> = {
  speak: { icon: Mic, chip: "bg-[oklch(0.95_0.03_250)] text-[oklch(0.5_0.17_256)]" },
  write: { icon: PenLine, chip: "bg-[oklch(0.95_0.03_290)] text-[oklch(0.5_0.16_290)]" },
  listen: { icon: Headphones, chip: "bg-[oklch(0.95_0.03_195)] text-[oklch(0.5_0.1_200)]" },
  play: { icon: Gamepad2, chip: "bg-[oklch(0.96_0.04_75)] text-[oklch(0.58_0.14_60)]" },
  tools: { icon: Wrench, chip: "bg-[oklch(0.95_0.005_250)] text-[oklch(0.45_0.02_250)]" },
  people: { icon: Users, chip: "bg-[oklch(0.95_0.03_15)] text-[oklch(0.55_0.15_15)]" },
};

const ICON: Record<string, LucideIcon> = {
  call: Phone,
  roleplay: Drama,
  pronunciation: Speech,
  shadowing: AudioLines,
  readAloud: Mic,
  chat: MessagesSquare,
  writeAndFix: PenLine,
  fillTheGap: RectangleEllipsis,
  dictation: Headphones,
  yourContent: MonitorPlay,
  podcast: Radio,
  swipe: Layers,
  order: Shuffle,
  pairs: MessageSquareText,
  review: RotateCcw,
  liveTranscribe: AudioLines,
  subtitles: Captions,
  translate: Languages,
  agents: Bot,
  realPeople: Users,
  tutor: GraduationCap,
};

/**
 * Every way to practise, outside the day's plan. The two most used up top
 * as large cards; then every family as a short list of rows, the way the
 * paying apps lay out their practice tab (Praktika, Loora, Speak). What is
 * not built yet stays visible, so the catalog shows where this is going.
 */
export function Practice({ home, t }: { home: Home; t: T }) {
  const [group, setGroup] = useState<SurfaceGroup | "all">("all");
  const shown = group === "all" ? GROUPS : [group];
  const call = home.surfaces.find((s) => s.id === "call");
  const roleplay = home.surfaces.find((s) => s.id === "roleplay");

  return (
    <div className="flex flex-col gap-6">
      <header className={ARRIVE} style={arrive(0)}>
        <h1 className={PAGE_TITLE}>{t("practice.title")}</h1>
        <p className="text-text-secondary mt-1.5 text-[16px]">{t("practice.lead")}</p>
      </header>

      {call && roleplay && (
        <div className={cn("grid gap-4 sm:grid-cols-2", ARRIVE)} style={arrive(1)}>
          <Feature item={call} t={t} dark />
          <Feature item={roleplay} t={t} />
        </div>
      )}

      {/* Scrolls sideways on a phone rather than wrapping into two rows. */}
      <div className={cn("-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0", ARRIVE)} style={arrive(2)}>
        <Segmented
          className="w-fit"
          size="sm"
          value={group}
          onChange={setGroup}
          options={[
            { value: "all" as const, label: t("practice.all") },
            ...GROUPS.map((g) => ({ value: g, label: t(`practice.group.${g}`) })),
          ]}
        />
      </div>

      <div key={group} className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 motion-safe:animate-[view-in_380ms_var(--ease-entrance)_both] md:grid-cols-2">
        {shown.map((g, i) => {
          const items = home.surfaces.filter((s) => s.group === g);
          return (
            <section key={g} className={cn(CARD, "p-2", ARRIVE)} style={arrive(i)}>
              <h2 className={cn(CARD_TITLE, "px-3 pt-3 pb-1")}>{t(`practice.group.${g}`)}</h2>
              <ul>
                {items.map((item) => (
                  <li key={item.id}>
                    <Row item={item} t={t} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Feature({ item, t, dark = false }: { item: SurfaceItem; t: T; dark?: boolean }) {
  const Icon = ICON[item.id] ?? TINT[item.group].icon;
  return (
    <button
      type="button"
      className={cn(
        "group relative isolate flex min-h-[180px] cursor-pointer flex-col items-start overflow-hidden rounded-[24px] p-6 text-left",
        "transition-transform duration-300 ease-(--ease-entrance) hover:-translate-y-0.5 active:scale-[0.99]",
        dark ? "bg-[#0E1626] text-white" : cn(CARD, "text-foreground"),
      )}
    >
      {dark && (
        <span
          aria-hidden
          className="absolute -top-20 -right-16 -z-10 size-64 rounded-full bg-[oklch(0.6_0.17_250/0.5)] blur-3xl transition-transform duration-700 group-hover:scale-110"
        />
      )}
      <span
        className={cn(
          "grid size-11 place-items-center rounded-full",
          dark ? "bg-white/12 ring-1 ring-white/20" : TINT[item.group].chip,
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="font-heading mt-auto pt-8 text-[20px] font-semibold tracking-[-0.02em]">{item.title}</span>
      <span className={cn("mt-1 text-[14px]", dark ? "text-white/65" : "text-text-secondary")}>
        {item.line}
        {item.minutes ? ` · ${t("minutes", { minutes: item.minutes })}` : ""}
      </span>
    </button>
  );
}

function Row({ item, t }: { item: SurfaceItem; t: T }) {
  const Icon = ICON[item.id] ?? TINT[item.group].icon;
  const body = (
    <>
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", TINT[item.group].chip, item.soon && "opacity-50 grayscale")}>
        <Icon className="size-[19px]" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[15px] font-semibold", item.soon ? "text-text-secondary" : "text-foreground")}>
          {item.title}
        </span>
        <span className="text-text-secondary block truncate text-[13px]">{item.line}</span>
      </span>
      {item.soon ? (
        <span className="text-text-tertiary shrink-0 rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] font-semibold dark:bg-white/10">
          {t("practice.soon")}
        </span>
      ) : (
        <>
          {item.minutes ? (
            <span className="text-text-tertiary shrink-0 text-[13px] tabular-nums">{t("minutes", { minutes: item.minutes })}</span>
          ) : null}
          <ChevronRight className="text-text-tertiary size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
        </>
      )}
    </>
  );

  const shell = cn(
    "group flex w-full items-center gap-3.5 rounded-2xl px-3 py-3 text-left transition-colors duration-150",
    !item.soon && "cursor-pointer hover:bg-black/[0.035] active:bg-black/[0.06] dark:hover:bg-white/[0.05]",
  );

  if (item.href && !item.soon) {
    return (
      <Link href={item.href} prefetch={false} className={shell}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" disabled={item.soon} className={cn(shell, "disabled:cursor-default")}>
      {body}
    </button>
  );
}
