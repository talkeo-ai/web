import {
  AudioLines,
  Captions,
  Drama,
  Headphones,
  Languages,
  MessagesSquare,
  Mic,
  MonitorPlay,
  PenLine,
  RectangleEllipsis,
  RotateCcw,
  Speech,
  Users,
  type LucideIcon,
} from "lucide-react";

export type Surface = {
  /** Key under `surfaces` in `messages/`. */
  key: string;
  icon: LucideIcon;
};

/**
 * The row is two things at once. The first six items are the shop window —
 * roughly what a desktop shows without paging, and the first two are all a
 * phone shows — so the most recognisable and most asked-for kinds of practice
 * sit there. The tail is for the reader who pages through checking that what
 * they already do, or came looking for, is here; it trades recognition for
 * coverage.
 *
 * Within the window the order still alternates kinds where it can:
 * consecutive items of the same kind make the row look shorter than it is.
 */
export const SURFACES: Surface[] = [
  { key: "conversation", icon: MessagesSquare },
  { key: "pronunciation", icon: Speech },
  { key: "writeAndFix", icon: PenLine },
  { key: "rolePlay", icon: Drama },
  { key: "yourContent", icon: MonitorPlay },
  { key: "fillTheGap", icon: RectangleEllipsis },
  { key: "shadowing", icon: AudioLines },
  { key: "dictation", icon: Headphones },
  { key: "readAloud", icon: Mic },
  { key: "subtitles", icon: Captions },
  { key: "translate", icon: Languages },
  { key: "realPeople", icon: Users },
  { key: "review", icon: RotateCcw },
];
