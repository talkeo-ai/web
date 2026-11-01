"use client";

import { Flame, House, Mic, Settings as SettingsIcon, TrendingUp, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";

import { HeroBackdrop } from "@/components/landing/hero-backdrop";
import { Link } from "@/lib/i18n/navigation";
import type { Home as HomeData } from "@/lib/inside/mock";
import { cn } from "@/lib/utils";

import { Practice } from "./practice";
import { Progress } from "./progress";
import { Segmented } from "./segmented";
import { Settings } from "./settings";
import { TalkeoChat } from "./talkeo-chat";
import { Today } from "./today";
import { BRAND_FILL, GLASS, SMOOTH, type T } from "./ui";

type Section = "today" | "practice" | "progress" | "settings";

const NAV: { key: Section; Icon: LucideIcon }[] = [
  { key: "today", Icon: House },
  { key: "practice", Icon: Mic },
  { key: "progress", Icon: TrendingUp },
  { key: "settings", Icon: SettingsIcon },
];

const CHAT_W = "w-[380px]";

const desktopQuery = "(min-width: 1024px)";
const subscribeDesktop = (notify: () => void) => {
  const list = window.matchMedia(desktopQuery);
  list.addEventListener("change", notify);
  return () => list.removeEventListener("change", notify);
};

/**
 * The inside, as one screen that never scrolls as a page (Joaquin, 1/nov: a
 * single page app, everything at hand, nothing to scroll past): the bar on
 * top, the section in the middle, scrolling inside itself only when it has
 * to, and Talkeo beside it, open or put away. Switching sections is state, not
 * a navigation, so nothing reloads and the chat keeps its conversation.
 *
 * It stands on the landing's sky with the same white cards, so arriving from
 * the interview is one more step in the same place. On a phone the sections
 * move to a bar under the thumb and Talkeo opens as a sheet over the page.
 *
 * Data: `MOCK_HOME`, shaped like the Core's responses; what is real and what
 * is mocked is written at the top of `lib/inside/mock.ts`.
 */
export function Home({ home }: { home: HomeData }) {
  const t = useTranslations("home");
  const [section, setSection] = useState<Section>("today");
  const [autoOpen, setAutoOpen] = useState(true);
  const [deskOpen, setDeskOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const desktop = useSyncExternalStore(subscribeDesktop, () => window.matchMedia(desktopQuery).matches, () => true);
  const chatOpen = desktop ? deskOpen : sheetOpen;

  const toggleChat = () => (desktop ? setDeskOpen((o) => !o) : setSheetOpen((o) => !o));
  const closeChat = () => (desktop ? setDeskOpen(false) : setSheetOpen(false));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
      // ⌘J / Ctrl+J, the chat-panel toggle of the editors this audience
      // already knows.
      if (event.key.toLowerCase() === "j" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleChat();
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

      <TopBar
        t={t}
        home={home}
        section={section}
        onSection={setSection}
        chatOpen={chatOpen}
        onChat={toggleChat}
      />

      <div className="flex min-h-0 flex-1 px-3 pb-3 sm:px-5 sm:pb-5">
        <main className="relative min-w-0 flex-1">
          {/* Only this scrolls, and only when a section is taller than the
              window. Its edges fade so content slides under the bar instead of
              being cut by it. */}
          <div
            key={section}
            className={cn(
              "scroll-quiet h-full overflow-y-auto px-1 pt-3 pb-28 sm:px-3 lg:pt-6 lg:pb-6",
              "[mask-image:linear-gradient(to_bottom,transparent,black_20px,black_calc(100%-20px),transparent)]",
            )}
          >
            {section === "today" && <Today home={home} t={t} />}
            {section === "practice" && <Practice home={home} t={t} />}
            {section === "progress" && <Progress home={home} t={t} />}
            {section === "settings" && (
              <Settings home={home} t={t} autoOpen={autoOpen} onAutoOpen={setAutoOpen} />
            )}
          </div>
        </main>

        {/* Docked: the width opens and closes, the panel inside keeps its own
            so nothing rewraps on the way, and fades as it goes. */}
        <aside
          aria-label="Talkeo"
          aria-hidden={!deskOpen}
          inert={!deskOpen}
          className={cn(
            "hidden shrink-0 overflow-hidden lg:block",
            "transition-[width,margin] duration-[460ms]",
            SMOOTH,
            deskOpen ? cn(CHAT_W, "ml-4") : "ml-0 w-0",
          )}
        >
          <div
            className={cn(
              "h-full rounded-[28px]",
              CHAT_W,
              "bg-white/62 shadow-[0_0_0_1px_rgb(255_255_255/0.7),0_24px_60px_-28px_rgb(40_90_170/0.45)] backdrop-blur-2xl dark:bg-black/30",
              "transition-[opacity,translate] duration-[460ms]",
              SMOOTH,
              deskOpen ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0",
            )}
          >
            <TalkeoChat home={home} t={t} onClose={() => setDeskOpen(false)} />
          </div>
        </aside>
      </div>

      {/* The phone: Talkeo as a sheet over the page. */}
      <div
        aria-hidden
        onClick={closeChat}
        className={cn(
          "fixed inset-0 z-40 bg-[rgb(20_40_80/0.18)] backdrop-blur-[2px] transition-opacity duration-300 lg:hidden",
          sheetOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        aria-label="Talkeo"
        aria-hidden={!sheetOpen}
        inert={!sheetOpen}
        className={cn(
          "fixed inset-x-2 top-16 bottom-2 z-50 rounded-[28px] lg:hidden",
          "bg-white/85 shadow-[0_0_0_1px_rgb(255_255_255/0.8),0_-20px_60px_-20px_rgb(20_40_80/0.4)] backdrop-blur-2xl",
          "transition-[translate,opacity] duration-[460ms] ease-(--ease-entrance)",
          sheetOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[105%] opacity-0",
        )}
      >
        <TalkeoChat home={home} t={t} onClose={() => setSheetOpen(false)} />
      </aside>

      <BottomNav t={t} section={section} onSection={setSection} />
    </div>
  );
}

function TopBar({
  t,
  home,
  section,
  onSection,
  chatOpen,
  onChat,
}: {
  t: T;
  home: HomeData;
  section: Section;
  onSection: (s: Section) => void;
  chatOpen: boolean;
  onChat: () => void;
}) {
  return (
    <div className="relative z-30 shrink-0 px-3 pt-3 sm:px-5">
      <nav className="flex h-14 items-center justify-between gap-3 lg:grid lg:grid-cols-[1fr_auto_1fr]">
        <Link
          href="/home"
          className="text-foreground font-heading flex w-fit items-center gap-2.5 text-[19px] font-semibold tracking-[-0.02em]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Talkeo"
            className="size-[30px] rounded-full shadow-[0_0_0_2px_rgb(255_255_255),0_4px_12px_-2px_rgb(30_70_160/0.35)]"
          />
          <span className="hidden sm:inline">Talkeo</span>
        </Link>

        <div className="hidden lg:block">
          <Segmented
            value={section === "settings" ? ("today" as Section) : section}
            onChange={onSection}
            options={NAV.slice(0, 3).map(({ key, Icon }) => ({ value: key, label: t(`nav.${key}`), Icon }))}
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
            onClick={onChat}
            aria-pressed={chatOpen}
            aria-label={chatOpen ? t("talkeo.close") : t("talkeo.open")}
            title={`${chatOpen ? t("talkeo.close") : t("talkeo.open")} (⌘J)`}
            className={cn(
              "font-heading flex h-9 cursor-pointer items-center gap-2 rounded-full pr-3.5 pl-1 text-[14px] font-semibold",
              "transition-[background-color,color,box-shadow] duration-300 ease-(--ease-standard)",
              chatOpen ? cn(BRAND_FILL, "text-white shadow-[0_8px_18px_-8px_rgb(40_90_170/0.7)]") : cn(GLASS, "text-foreground"),
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="size-7 rounded-full shadow-[0_0_0_1.5px_rgb(255_255_255)]" />
            Talkeo
          </button>

          <button
            type="button"
            onClick={() => onSection("settings")}
            aria-label={t("nav.settings")}
            title={t("nav.settings")}
            className={cn(
              "font-heading hidden size-9 cursor-pointer place-items-center rounded-full text-[14px] font-semibold text-white sm:grid",
              BRAND_FILL,
              "shadow-[0_0_0_2px_rgb(255_255_255),0_6px_16px_-6px_rgb(40_90_170/0.55)] transition-transform duration-200 active:scale-95",
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
    <nav className="fixed inset-x-3 bottom-3 z-30 lg:hidden">
      <Segmented
        value={section}
        onChange={onSection}
        className="mx-auto w-full max-w-md justify-between [&_[role=tab]]:h-12 [&_[role=tab]]:flex-1 [&_[role=tab]]:flex-col [&_[role=tab]]:gap-0.5 [&_[role=tab]]:px-1 [&_[role=tab]]:text-[11px]"
        options={NAV.map(({ key, Icon }) => ({ value: key, label: t(`nav.${key}`), Icon }))}
      />
    </nav>
  );
}
