import {
  AudioLines,
  Captions,
  Drama,
  Headphones,
  Languages,
  MessagesSquare,
  Mic,
  PenLine,
  RotateCcw,
  SquareDashedBottom,
  type LucideIcon,
} from "lucide-react";

export type Surface = {
  /** Key under `surfaces` in `messages/`. */
  key: string;
  icon: LucideIcon;
};

/**
 * A shortlist, not the catalogue. The bar exists to show the range of ways
 * practice happens, and a reader stops taking in new items long before a full
 * list ends — so the ones here are the ones that read as clearly different
 * from each other.
 *
 * Order alternates between speaking, writing and listening rather than
 * grouping them: consecutive items of the same kind make the row look shorter
 * than it is.
 */
export const SURFACES: Surface[] = [
  { key: "conversation", icon: MessagesSquare },
  { key: "writeAndFix", icon: PenLine },
  { key: "readAloud", icon: Mic },
  { key: "dictation", icon: Headphones },
  { key: "rolePlay", icon: Drama },
  { key: "fillTheGap", icon: SquareDashedBottom },
  { key: "shadowing", icon: AudioLines },
  { key: "translate", icon: Languages },
  { key: "subtitles", icon: Captions },
  { key: "review", icon: RotateCcw },
];
