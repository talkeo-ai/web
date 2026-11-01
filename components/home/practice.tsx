"use client";

import {
  AudioLines,
  Bot,
  Captions,
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
import { ARRIVE, CARD, arrive, type T } from "./ui";

const GROUPS: SurfaceGroup[] = ["speak", "write", "listen", "play", "tools", "people"];

/**
 * One tint per group, all drawn from around the sky's blue so the grid reads
 * as one family and not as a box of crayons: the hue moves, the softness stays.
 */
const TINT: Record<SurfaceGroup, { tile: string; icon: LucideIcon }> = {
  speak: { tile: "bg-[linear-gradient(135deg,oklch(0.56_0.17_252),oklch(0.7_0.12_230))]", icon: Mic },
  write: { tile: "bg-[linear-gradient(135deg,oklch(0.55_0.16_285),oklch(0.7_0.11_265))]", icon: PenLine },
  listen: { tile: "bg-[linear-gradient(135deg,oklch(0.6_0.12_205),oklch(0.75_0.1_190))]", icon: Headphones },
  play: { tile: "bg-[linear-gradient(135deg,oklch(0.7_0.15_60),oklch(0.8_0.12_80))]", icon: Gamepad2 },
  tools: { tile: "bg-[linear-gradient(135deg,oklch(0.5_0.04_255),oklch(0.65_0.04_240))]", icon: Wrench },
  people: { tile: "bg-[linear-gradient(135deg,oklch(0.62_0.15_10),oklch(0.74_0.11_30))]", icon: Users },
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
 * Every way to practise, outside the day's plan, for when you want one in
 * particular. Grouped by what you do with it; what is not built yet says so
 * and stays visible, so the catalog shows where the product is going.
 */
export function Practice({ home, t }: { home: Home; t: T }) {
  const [group, setGroup] = useState<SurfaceGroup | "all">("all");
  const shown = group === "all" ? GROUPS : [group];

  return (
    <div className="mx-auto w-full max-w-[980px] pb-6">
      <header className={cn("mb-5", ARRIVE)} style={arrive(0)}>
        <h1 className="font-heading text-foreground text-[30px] leading-[1.05] font-medium tracking-[-0.035em] lg:text-[40px]">
          {t("practice.title")}
        </h1>
        <p className="text-foreground/65 mt-1.5 text-[15px] lg:text-[17px]">{t("practice.lead")}</p>
      </header>

      {/* Scrolls sideways on a phone rather than wrapping into two rows. */}
      <div className={cn("-mx-4 mb-6 overflow-x-auto px-4 pb-1 [scrollbar-width:none]", ARRIVE)} style={arrive(1)}>
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

      <div key={group} className="flex flex-col gap-8 motion-safe:animate-[view-in_420ms_var(--ease-entrance)_both]">
        {shown.map((g) => {
          const items = home.surfaces.filter((s) => s.group === g);
          return (
            <section key={g}>
              {group === "all" && (
                <h2 className="font-heading text-foreground mb-3 px-1 text-[18px] font-medium tracking-[-0.015em]">
                  {t(`practice.group.${g}`)}
                </h2>
              )}
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(156px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))]">
                {items.map((item, i) => (
                  <li key={item.id} className={ARRIVE} style={arrive(i)}>
                    <Tile item={item} t={t} />
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

function Tile({ item, t }: { item: SurfaceItem; t: T }) {
  const Icon = ICON[item.id] ?? TINT[item.group].icon;
  const body = (
    <>
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "grid size-11 place-items-center rounded-[14px] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_6px_14px_-6px_rgb(30_60_140/0.45)]",
            TINT[item.group].tile,
            item.soon && "opacity-60 saturate-50",
          )}
        >
          <Icon className="size-5" strokeWidth={2} />
        </span>
        {item.soon ? (
          <span className="bg-surface-secondary text-text-secondary rounded-full px-2 py-0.5 text-[11px] font-semibold">
            {t("practice.soon")}
          </span>
        ) : item.minutes ? (
          <span className="text-text-tertiary text-[12px] tabular-nums">{t("minutes", { minutes: item.minutes })}</span>
        ) : null}
      </div>
      <p className={cn("font-heading mt-4 text-[16px] font-semibold tracking-[-0.01em]", item.soon ? "text-text-secondary" : "text-foreground")}>
        {item.title}
      </p>
      <p className="text-text-secondary mt-1 text-[13px] leading-snug">{item.line}</p>
    </>
  );

  const shell = cn(
    CARD,
    "flex h-full flex-col p-4 text-left",
    "transition-[transform,box-shadow] duration-300 ease-(--ease-entrance)",
    !item.soon && "cursor-pointer hover:-translate-y-0.5 hover:shadow-[var(--sky-card-shadow),0_18px_36px_-18px_rgb(40_90_170/0.45)] active:translate-y-0 active:scale-[0.99]",
  );

  if (item.href && !item.soon) {
    return (
      <Link href={item.href} prefetch={false} className={shell}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" disabled={item.soon} className={cn(shell, "w-full disabled:cursor-default")}>
      {body}
    </button>
  );
}
