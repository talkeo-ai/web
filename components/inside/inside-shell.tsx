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

const SIDEBAR_WIDTH = "w-[244px]";

/**
 * The inside, as one page, drawn after Linear (Joaquin, 27/oct): a sidebar of
 * rows on the page's sunken colour and the content in a panel set on it, with
 * an 8px gutter, a quiet edge and an 8px corner. Only the panel scrolls.
 *
 * The sidebar folds away with its button or `[`, as Linear's does. Folded, it
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

  const nav = (
    <SidebarContent
      section={section}
      onSelect={setSection}
      onToggle={toggle}
      t={t}
    />
  );

  return (
    <div
      data-slot="inside"
      className="bg-surface-sunken relative flex h-dvh overflow-hidden"
    >
      {/* Docked: the width closes and opens, the rows inside keep theirs so
          nothing rewraps on the way. */}
      <aside
        aria-label={t("nav")}
        aria-hidden={folded}
        inert={folded}
        className={cn(
          "shrink-0 overflow-hidden",
          "transition-[width] duration-200 ease-(--ease-standard)",
          folded ? "w-0" : SIDEBAR_WIDTH,
        )}
      >
        <div className={cn("h-full", SIDEBAR_WIDTH)}>{nav}</div>
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
          "bg-surface-sunken absolute inset-y-2 left-0 z-30 overflow-hidden rounded-r-lg border border-l-0",
          "border-black/[0.08] shadow-[0_8px_24px_-8px_rgb(0_0_0/0.25)] dark:border-white/[0.08]",
          "transition-[translate,opacity] duration-200",
          SIDEBAR_WIDTH,
          folded && peek
            ? "translate-x-0 opacity-100 ease-(--ease-entrance)"
            : "pointer-events-none -translate-x-full opacity-0 ease-(--ease-exit)",
        )}
      >
        {nav}
      </aside>

      <div
        className={cn(
          "flex min-w-0 flex-1 p-2 transition-[padding] duration-200",
          !folded && "pl-0",
        )}
      >
        <main className="bg-background flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-black/[0.06] dark:border-white/[0.07]">
          <header className="flex h-11 shrink-0 items-center gap-1.5 border-b border-black/[0.05] px-3 dark:border-white/[0.05]">
            {folded && (
              <IconButton
                label={t("expand")}
                onClick={toggle}
                Icon={PanelLeft}
              />
            )}
            <h1 className="text-foreground text-[13px] font-medium">
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
  onToggle,
  t,
}: {
  section: Section;
  onSelect: (section: Section) => void;
  onToggle: () => void;
  t: ReturnType<typeof useTranslations<"inside">>;
}) {
  return (
    <div className="flex h-full flex-col px-3 py-2">
      <div className="flex h-11 items-center gap-2 px-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="size-5 rounded-[5px]" />
        <span className="text-foreground flex-1 text-[13px] font-semibold">
          Talkeo
        </span>
        <IconButton label={t("collapse")} onClick={onToggle} Icon={PanelLeft} />
      </div>

      <nav className="mt-2 flex flex-col gap-px">
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

      <div className="mt-auto flex flex-col gap-px">
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
        "focus-key:ring-ring flex h-[30px] cursor-pointer items-center gap-2.5 rounded-md px-2 text-left text-[13px] outline-none focus-key:ring-2",
        "transition-colors duration-(--duration-control) ease-(--ease-standard)",
        active
          ? "bg-foreground/[0.07] text-foreground font-medium"
          : "text-foreground/80 hover:bg-foreground/[0.04] hover:text-foreground",
      )}
    >
      <Icon
        className={cn("size-4", active ? "opacity-100" : "opacity-70")}
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
      className="text-text-secondary hover:text-foreground hover:bg-foreground/[0.05] focus-key:ring-ring flex size-7 cursor-pointer items-center justify-center rounded-md outline-none transition-colors duration-(--duration-control) focus-key:ring-2"
    >
      <Icon className="size-4" strokeWidth={1.75} />
    </button>
  );
}
