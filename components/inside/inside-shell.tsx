"use client";

import {
  House,
  Mic,
  PanelLeft,
  TrendingUp,
  User,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type Section = "home" | "practice" | "progress" | "profile";

const MAIN: { key: Section; Icon: LucideIcon }[] = [
  { key: "home", Icon: House },
  { key: "practice", Icon: Mic },
  { key: "progress", Icon: TrendingUp },
];

const SIDEBAR_WIDTH = "w-[272px]";

/** A long, soft settle: quick off the mark, no visible end to the motion. */
const SMOOTH = "ease-[cubic-bezier(0.32,0.72,0,1)]";

/**
 * The inside, as one page, drawn after Linear (Joaquin, 27/oct): a sidebar of
 * rows on the page's sunken colour and the content in a panel set on it, with
 * an 8px gutter, a quiet edge and a 10px corner. Only the panel scrolls.
 * Linear's own sizes (13px text, 30px rows) read as too small here (Joaquin,
 * 27/oct), so everything is a step up: 15px text, 36px rows, 18px icons.
 *
 * The sidebar folds away with the button in the panel's bar or `[`. Folded, it
 * comes back floating over the panel while the pointer rests on the window's
 * left edge, and leaves when the pointer does. Switching sections is state
 * here and not a navigation, so nothing reloads.
 */
export function InsideShell() {
  const t = useTranslations("inside");
  const [section, setSection] = useState<Section>("home");
  const [folded, setFolded] = useState(false);
  const [peek, setPeek] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "[" || event.metaKey || event.ctrlKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      setFolded((value) => !value);
      setPeek(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggle = () => {
    setFolded((value) => !value);
    setPeek(false);
  };

  const nav = (floating: boolean) => (
    <SidebarContent
      section={section}
      onSelect={setSection}
      floating={floating}
      t={t}
    />
  );

  return (
    <div
      data-slot="inside"
      className="bg-surface-sunken relative flex h-dvh overflow-hidden"
    >
      {/* Docked: the width closes and opens, the rows inside keep theirs so
          nothing rewraps on the way, and fade as they go. Folded it keeps 8px,
          which is the panel's gutter: the panel's own padding never changes,
          so the only thing moving is this width. Two properties moving at once
          on different curves is what read as not smooth (Joaquin, 27/oct). */}
      <aside
        aria-label={t("nav")}
        aria-hidden={folded}
        inert={folded}
        className={cn(
          "shrink-0 overflow-hidden",
          "transition-[width] duration-300",
          SMOOTH,
          folded ? "w-2" : SIDEBAR_WIDTH,
        )}
      >
        <div
          className={cn(
            "h-full transition-opacity duration-300",
            SMOOTH,
            SIDEBAR_WIDTH,
            folded ? "opacity-0" : "opacity-100",
          )}
        >
          {nav(false)}
        </div>
      </aside>

      {/* Folded: a strip on the left edge calls the sidebar back, floating. */}
      {folded && (
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 z-20 w-2"
          onMouseEnter={() => setPeek(true)}
        />
      )}
      <aside
        aria-label={t("nav")}
        aria-hidden={!(folded && peek)}
        inert={!(folded && peek)}
        onMouseLeave={() => setPeek(false)}
        className={cn(
          "bg-surface-sunken absolute top-4 bottom-0 left-0 z-30 overflow-hidden rounded-tr-[10px] border border-b-0 border-l-0",
          "border-black/[0.08] shadow-[0_8px_24px_-8px_rgb(0_0_0/0.25)] dark:border-white/[0.08]",
          "transition-[translate,opacity]",
          SMOOTH,
          SIDEBAR_WIDTH,
          folded && peek
            ? "translate-x-0 opacity-100 duration-300"
            : "pointer-events-none -translate-x-full opacity-0 duration-200",
        )}
      >
        {nav(true)}
      </aside>

      <div className="flex min-w-0 flex-1 p-2 pl-0">
        <main className="bg-background flex min-w-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-black/[0.06] dark:border-white/[0.07]">
          {/* The fold button lives here in both states, first in the bar, so
              the title never moves. Shown only while folded, it pushed the
              title over each time (Joaquin, 27/oct). */}
          <header className="flex h-13 shrink-0 items-center gap-2 px-3">
            <IconButton
              label={folded ? t("expand") : t("collapse")}
              onClick={toggle}
              Icon={PanelLeft}
            />
            <h1 className="text-foreground text-[15px] font-medium">
              {t(`sections.${section}`)}
            </h1>
          </header>
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-8 py-8" />
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  section,
  onSelect,
  floating,
  t,
}: {
  section: Section;
  onSelect: (section: Section) => void;
  floating: boolean;
  t: ReturnType<typeof useTranslations<"inside">>;
}) {
  // Floating, the box sits 16px in from the top and its rows start at its top
  // edge; it runs down to the window's edge, so they keep the bottom 8px, and
  // the last row lands where it was docked. Inset at the bottom it sat on the
  // box's edge, and 8px from the top read as cramped (Joaquin, 27/oct).
  return (
    <div className={cn("flex h-full flex-col px-3 pb-2", !floating && "pt-2")}>
      <div className="flex h-13 items-center gap-2.5 px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="size-6 rounded-md" />
        <span className="text-foreground flex-1 text-[15px] font-semibold">
          Talkeo
        </span>
      </div>

      <nav className="mt-3 flex flex-col gap-0.5">
        {MAIN.map(({ key, Icon }) => (
          <Row
            key={key}
            Icon={Icon}
            label={t(`sections.${key}`)}
            active={key === section}
            onSelect={() => onSelect(key)}
          />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5">
        <Row
          Icon={User}
          label={t("sections.profile")}
          active={section === "profile"}
          onSelect={() => onSelect("profile")}
        />
      </div>
    </div>
  );
}

function Row({
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
      className={cn(
        "focus-key:ring-ring flex h-9 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-left text-[15px] outline-none focus-key:ring-2",
        "transition-colors duration-(--duration-control) ease-(--ease-standard)",
        active
          ? "bg-foreground/[0.07] text-foreground font-medium"
          : "text-foreground/80 hover:bg-foreground/[0.04] hover:text-foreground",
      )}
    >
      <Icon
        className={cn("size-[18px]", active ? "opacity-100" : "opacity-70")}
        strokeWidth={1.75}
      />
      {label}
    </button>
  );
}

function IconButton({
  label,
  onClick,
  Icon,
}: {
  label: string;
  onClick: () => void;
  Icon: LucideIcon;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={`${label}  [`}
      className="text-text-secondary hover:text-foreground hover:bg-foreground/[0.05] focus-key:ring-ring flex size-8 cursor-pointer items-center justify-center rounded-lg outline-none transition-colors duration-(--duration-control) focus-key:ring-2"
    >
      <Icon className="size-[18px]" strokeWidth={1.75} />
    </button>
  );
}
