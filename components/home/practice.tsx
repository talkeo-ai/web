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
import { ARRIVE, CARD, MUTED, PAGE_TITLE, arrive, type T } from "./ui";

const GROUPS: SurfaceGroup[] = ["speak", "write", "listen", "play", "tools", "people"];

/**
 * Icons in neutral squares, no colour per group (Joaquin, 1/nov: the
 * coloured tiles read "de juguete"). The words carry the catalog; colour is
 * kept for what you have to act on.
 */
const GROUP_ICON: Record<SurfaceGroup, LucideIcon> = {
  speak: Mic,
  write: PenLine,
  listen: Headphones,
  play: Gamepad2,
  tools: Wrench,
  people: Users,
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
    <div className="mx-auto w-full max-w-[960px]">
      <header className={cn("mb-5", ARRIVE)} style={arrive(0)}>
        <h1 className={PAGE_TITLE}>{t("practice.title")}</h1>
        <p className={cn(MUTED, "mt-1 text-[14px]")}>{t("practice.lead")}</p>
      </header>

      {/* Scrolls sideways on a phone rather than wrapping into two rows. */}
      <div className={cn("-mx-4 mb-7 overflow-x-auto px-4 pb-1 [scrollbar-width:none]", ARRIVE)} style={arrive(1)}>
        <Segmented
          tone="neutral"
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
                <h2 className="text-text-secondary mb-2.5 text-[12px] font-semibold tracking-[0.06em] uppercase">
                  {t(`practice.group.${g}`)}
                </h2>
              )}
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5">
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
  const Icon = ICON[item.id] ?? GROUP_ICON[item.group];
  const body = (
    <>
      <span
        className={cn(
          "bg-surface-secondary grid size-9 shrink-0 place-items-center rounded-[10px]",
          item.soon ? "text-text-tertiary" : "text-foreground/80",
        )}
      >
        <Icon className="size-[18px]" strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className={cn("text-[14px] leading-snug font-semibold",item.soon ? "text-text-secondary" : "text-foreground")}>{item.title}</p>
          {item.soon ? (
            <span className="text-text-tertiary shrink-0 rounded-full px-1.5 text-[11px] font-medium shadow-[inset_0_0_0_1px_rgb(15_30_60/0.1)]">
              {t("practice.soon")}
            </span>
          ) : item.minutes ? (
            <span className="text-text-tertiary ml-auto shrink-0 text-[12px] tabular-nums">{t("minutes", { minutes: item.minutes })}</span>
          ) : null}
        </div>
        <p className="text-text-secondary mt-0.5 line-clamp-2 text-[13px] leading-snug">{item.line}</p>
      </div>
    </>
  );

  const shell = cn(
    CARD,
    "flex h-full items-start gap-3 p-3.5 text-left",
    "transition-[background-color,border-color,box-shadow] duration-200",
    !item.soon && "cursor-pointer hover:border-black/[0.14] hover:shadow-[0_4px_14px_-6px_rgb(15_30_60/0.18)] active:bg-surface-secondary/40",
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
