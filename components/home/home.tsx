"use client";

import { Flame, House, MessageCircle, Mic, TrendingUp, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { HeroBackdrop } from "@/components/landing/hero-backdrop";
import { Link } from "@/lib/i18n/navigation";
import type { Home as HomeData } from "@/lib/inside/mock";
import { cn } from "@/lib/utils";

import { Practice } from "./practice";
import { Progress } from "./progress";
import { Segmented } from "./segmented";
import { Settings } from "./settings";
import { TalkeoBar, TalkeoFull, TalkeoPanel, useTalkeo } from "./talkeo-chat";
import { Today } from "./today";
import { CANVAS, GLASS, SMOOTH, type T } from "./ui";

type Section = "today" | "practice" | "progress" | "talkeo" | "settings";

const NAV: { key: Exclude<Section, "settings">; Icon: LucideIcon }[] = [
  { key: "today", Icon: House },
  { key: "practice", Icon: Mic },
  { key: "progress", Icon: TrendingUp },
  { key: "talkeo", Icon: MessageCircle },
];

const PANEL_W = "w-[384px]";

const desktopQuery = "(min-width: 1024px)";
const subscribeDesktop = (notify: () => void) => {
  const list = window.matchMedia(desktopQuery);
  list.addEventListener("change", notify);
  return () => list.removeEventListener("change", notify);
};

/**
 * The inside, as one screen that never scrolls as a page (Joaquin, 1/nov):
 * the bar on top, and under it one white canvas with the section, scrolling
 * inside itself only when it has to. Laid out after the Shopify admin with
 * Sidekick, which Joaquin pointed at as clean and premium: Talkeo is not a
 * button in the header but a one-line bar floating at the foot of the
 * canvas; writing in it opens a panel beside the canvas, and the panel
 * expands to Talkeo on its own (a section, for talking only to the AI).
 *
 * One conversation for the bar, the panel and the full screen, so moving
 * between them never loses a word. On a phone there is no bar or panel:
 * Talkeo is one more tab.
 *
 * Data: `MOCK_HOME`, shaped like the Core's responses; what is real and what
 * is mocked is written at the top of `lib/inside/mock.ts`.
 */
export function Home({ home }: { home: HomeData }) {
  const t = useTranslations("home");
  const talkeo = useTalkeo(home);
  const [section, setSection] = useState<Section>("today");
  const [autoOpen, setAutoOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(autoOpen);
  // Where to come back to when the full screen folds back into the panel.
  const before = useRef<Section>("today");
  const desktop = useSyncExternalStore(subscribeDesktop, () => window.matchMedia(desktopQuery).matches, () => true);

  const go = (next: Section) => {
    if (next === "talkeo") {
      if (section !== "talkeo") before.current = section;
      setPanelOpen(false);
    }
    setSection(next);
  };
  const expand = () => go("talkeo");
  const toPanel = () => {
    setSection(before.current);
    setPanelOpen(true);
  };

  const showPanel = desktop && panelOpen && section !== "talkeo";
  const showBar = desktop && !showPanel && section !== "talkeo";

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanelOpen(false);
      // ⌘J / Ctrl+J, the chat-panel toggle of the editors this audience
      // already knows. On a phone it goes to the Talkeo tab.
      if (event.key.toLowerCase() === "j" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (!desktop) go(section === "talkeo" ? before.current : "talkeo");
        else if (section === "talkeo") toPanel();
        else setPanelOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div data-sky data-slot="inside" className="relative isolate flex h-dvh flex-col overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10">
        <HeroBackdrop />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(255_255_255/0.2),rgb(255_255_255/0.45)_50%,rgb(255_255_255/0.6))] dark:bg-black/45" />
      </div>

      <TopBar t={t} home={home} section={section} onSection={go} />

      <div className="flex min-h-0 flex-1 px-2 pb-[76px] sm:px-4 lg:px-5 lg:pb-5">
        <main className={cn(CANVAS, "relative min-w-0 flex-1 overflow-hidden")}>
          {section === "talkeo" ? (
            <div key="talkeo" className="h-full px-4 pt-4 pb-4 sm:px-8 motion-safe:animate-[view-in_380ms_var(--ease-entrance)_both]">
              <TalkeoFull talkeo={talkeo} t={t} onToPanel={toPanel} />
            </div>
          ) : (
            // Only this scrolls, and only when a section is taller than the
            // canvas. The bottom fades under Talkeo's bar.
            <div
              key={section}
              className={cn(
                "scroll-quiet h-full overflow-y-auto px-4 pt-6 pb-10 sm:px-8 lg:px-10 lg:pt-9",
                showBar && "lg:pb-28",
                "[mask-image:linear-gradient(to_bottom,black_calc(100%-64px),transparent)]",
              )}
            >
              {section === "today" && <Today home={home} t={t} />}
              {section === "practice" && <Practice home={home} t={t} />}
              {section === "progress" && <Progress home={home} t={t} />}
              {section === "settings" && <Settings home={home} t={t} autoOpen={autoOpen} onAutoOpen={setAutoOpen} />}
            </div>
          )}

          {/* Talkeo's bar, floating at the foot of the canvas. It steps aside
              while the panel is open: there is already a field there. */}
          <div
            aria-hidden={!showBar}
            inert={!showBar}
            className={cn(
              "absolute inset-x-0 bottom-5 hidden justify-center px-6 lg:flex",
              "transition-[opacity,translate] duration-[360ms]",
              SMOOTH,
              showBar ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
            )}
          >
            <div className="w-full max-w-[560px]">
              <TalkeoBar
                t={t}
                onOpen={() => setPanelOpen(true)}
                onAsk={(text) => {
                  setPanelOpen(true);
                  talkeo.say(text);
                }}
              />
            </div>
          </div>
        </main>

        {/* The panel: the width opens and closes, the card inside keeps its
            own so nothing rewraps on the way, and fades as it goes. */}
        <aside
          aria-label="Talkeo"
          aria-hidden={!showPanel}
          inert={!showPanel}
          className={cn(
            "hidden shrink-0 lg:block",
            "transition-[width,margin] duration-[460ms]",
            SMOOTH,
            showPanel ? cn(PANEL_W, "ml-3") : "ml-0 w-0",
          )}
        >
          <div
            className={cn(
              CANVAS,
              "h-full overflow-hidden",
              PANEL_W,
              "transition-[opacity,translate] duration-[460ms]",
              SMOOTH,
              showPanel ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0",
            )}
          >
            <TalkeoPanel talkeo={talkeo} t={t} onClose={() => setPanelOpen(false)} onExpand={expand} />
          </div>
        </aside>
      </div>

      <BottomNav t={t} section={section} onSection={go} />
    </div>
  );
}

function TopBar({
  t,
  home,
  section,
  onSection,
}: {
  t: T;
  home: HomeData;
  section: Section;
  onSection: (s: Section) => void;
}) {
  return (
    <div className="relative z-30 shrink-0 px-3 py-2.5 sm:px-5">
      <nav className="flex h-12 items-center justify-between gap-3 lg:grid lg:grid-cols-[1fr_auto_1fr]">
        <Link
          href="/home"
          className="text-foreground font-heading flex w-fit items-center gap-2.5 text-[18px] font-semibold tracking-[-0.02em]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Talkeo"
            className="size-[28px] rounded-full shadow-[0_0_0_2px_rgb(255_255_255),0_4px_12px_-2px_rgb(30_70_160/0.35)]"
          />
          <span>Talkeo</span>
        </Link>

        <div className="hidden lg:block">
          <Segmented
            value={section === "settings" ? ("today" as Section) : section}
            onChange={onSection}
            options={NAV.map(({ key, Icon }) => ({ value: key, label: t(`nav.${key}`), Icon }))}
            className={cn(section === "settings" && "[&_[role=tab]]:text-foreground/55 [&>span]:opacity-0")}
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <div
            className={cn("font-heading flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold", GLASS)}
            aria-label={t("streak", { days: home.dose.streak_days })}
            title={t("streak", { days: home.dose.streak_days })}
          >
            <Flame className="size-4 text-[oklch(0.7_0.17_55)]" strokeWidth={2.25} />
            <span className="text-foreground tabular-nums">{home.dose.streak_days}</span>
          </div>

          <button
            type="button"
            onClick={() => onSection("settings")}
            aria-label={t("nav.settings")}
            title={t("nav.settings")}
            className={cn(
              "font-heading bg-foreground text-background grid size-9 cursor-pointer place-items-center rounded-full text-[14px] font-semibold",
              "shadow-[0_0_0_2px_rgb(255_255_255),0_6px_16px_-6px_rgb(15_30_60/0.5)] transition-[transform,box-shadow] duration-200 active:scale-95",
              section === "settings" && "shadow-[0_0_0_2px_rgb(255_255_255),0_0_0_4px_var(--brand)]",
            )}
          >
            {home.name.slice(0, 1)}
          </button>
        </div>
      </nav>
    </div>
  );
}

function BottomNav({ t, section, onSection }: { t: T; section: Section; onSection: (s: Section) => void }) {
  return (
    <nav className="fixed inset-x-2 bottom-2 z-30 sm:inset-x-4 lg:hidden">
      <Segmented
        value={section === "settings" ? ("today" as Section) : section}
        onChange={onSection}
        className={cn(
          "mx-auto w-full max-w-md justify-between [&_[role=tab]]:h-[52px] [&_[role=tab]]:flex-1 [&_[role=tab]]:flex-col [&_[role=tab]]:gap-0.5 [&_[role=tab]]:px-1 [&_[role=tab]]:text-[11px]",
          section === "settings" && "[&_[role=tab]]:text-foreground/55 [&>span]:opacity-0",
        )}
        options={NAV.map(({ key, Icon }) => ({ value: key, label: t(`nav.${key}`), Icon }))}
      />
    </nav>
  );
}
