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

import type { SurfaceGroup, SurfaceItem } from "@/lib/inside/mock";
import { cn } from "@/lib/utils";

/**
 * What a way of practising looks like wherever it shows: the day's steps, the
 * practice shelves. One pastel per family and one icon per surface, so the
 * same surface is recognised in both places (Balance's pastel card art,
 * Appllama, 1/nov).
 */
export const GROUP_ART: Record<SurfaceGroup, { icon: LucideIcon; bg: string; ink: string; chip: string }> = {
  speak: {
    icon: Mic,
    bg: "bg-[linear-gradient(140deg,oklch(0.95_0.035_245),oklch(0.87_0.07_252))]",
    ink: "text-[oklch(0.45_0.15_258)]",
    chip: "bg-[oklch(0.95_0.03_250)] text-[oklch(0.48_0.15_256)]",
  },
  write: {
    icon: PenLine,
    bg: "bg-[linear-gradient(140deg,oklch(0.95_0.035_300),oklch(0.87_0.07_295))]",
    ink: "text-[oklch(0.45_0.15_295)]",
    chip: "bg-[oklch(0.95_0.03_295)] text-[oklch(0.48_0.15_295)]",
  },
  listen: {
    icon: Headphones,
    bg: "bg-[linear-gradient(140deg,oklch(0.96_0.035_185),oklch(0.88_0.07_195))]",
    ink: "text-[oklch(0.45_0.09_205)]",
    chip: "bg-[oklch(0.95_0.03_195)] text-[oklch(0.46_0.09_205)]",
  },
  play: {
    icon: Gamepad2,
    bg: "bg-[linear-gradient(140deg,oklch(0.97_0.04_85),oklch(0.9_0.09_70))]",
    ink: "text-[oklch(0.52_0.13_55)]",
    chip: "bg-[oklch(0.96_0.04_75)] text-[oklch(0.54_0.13_58)]",
  },
  tools: {
    icon: Wrench,
    bg: "bg-[linear-gradient(140deg,oklch(0.96_0.008_250),oklch(0.89_0.015_250))]",
    ink: "text-[oklch(0.42_0.03_255)]",
    chip: "bg-[oklch(0.95_0.006_250)] text-[oklch(0.44_0.03_255)]",
  },
  people: {
    icon: Users,
    bg: "bg-[linear-gradient(140deg,oklch(0.96_0.03_20),oklch(0.88_0.07_15))]",
    ink: "text-[oklch(0.5_0.14_18)]",
    chip: "bg-[oklch(0.95_0.03_15)] text-[oklch(0.52_0.14_18)]",
  },
};

export const SURFACE_ICON: Record<string, LucideIcon> = {
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
 * The picture of a surface: its family's pastel, two soft rings and its icon
 * on a white tile. The call is the one exception, painted with the same sky as
 * the onboarding and the class, because it is a conversation with Talkeo.
 */
export function SurfaceArt({
  item,
  className,
  size = "md",
}: {
  item: SurfaceItem;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = SURFACE_ICON[item.id] ?? GROUP_ART[item.group].icon;
  const art = GROUP_ART[item.group];
  const sky = item.id === "call";
  return (
    <span
      aria-hidden
      className={cn(
        "relative isolate grid place-items-center overflow-hidden",
        sky ? "bg-[oklch(0.82_0.07_235)]" : art.bg,
        item.soon && "saturate-[0.35]",
        className,
      )}
    >
      {sky ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/hero/sky-1280.webp" alt="" className="absolute inset-0 -z-10 size-full object-cover object-[70%_40%]" />
      ) : (
        <>
          <span className="absolute -top-1/3 -right-1/4 -z-10 aspect-square w-3/4 rounded-full bg-white/35" />
          <span className="absolute -bottom-1/2 -left-1/4 -z-10 aspect-square w-3/4 rounded-full bg-white/20" />
        </>
      )}
      <span
        className={cn(
          "grid place-items-center bg-white/85 shadow-[0_8px_20px_-10px_rgb(16_24_40/0.35)] backdrop-blur-sm",
          size === "sm" && "size-8 rounded-[10px]",
          size === "md" && "size-14 rounded-[18px]",
          size === "lg" && "size-16 rounded-[20px]",
          sky ? "text-[oklch(0.42_0.14_256)]" : art.ink,
        )}
      >
        <Icon className={cn(size === "sm" ? "size-4" : "size-7")} strokeWidth={1.9} />
      </span>
    </span>
  );
}
