"use client";

import { Flame, House, MessageCircle, Mic, TrendingUp, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Link } from "@/lib/i18n/navigation";
import type { Home as HomeData } from "@/lib/inside/mock";
import { cn } from "@/lib/utils";

import { Practice } from "./practice";
import { Progress } from "./progress";
import { Segmented } from "./segmented";
import { Settings } from "./settings";
import { TalkeoBubble, TalkeoView, TalkeoWindow, useTalkeo } from "./talkeo";
import { Today } from "./today";
import { GROUND, type T } from "./ui";

export type Section = "today" | "practice" | "progress" | "talkeo" | "settings";

const NAV: { key: Exclude<Section, "settings">; Icon: LucideIcon }[] = [
  { key: "today", Icon: House },
  { key: "practice", Icon: Mic },
  { key: "progress", Icon: TrendingUp },
  { key: "talkeo", Icon: MessageCircle },
];

/**
 * The inside, after the apps people pay for (Appllama, 1/nov): a quiet
 * ground, a header that stays put, and the page scrolling like a page, with
 * no box scrolling inside another (Joaquin, 1/nov: "scrolls incómodos, el
 * contenedor del contenido con scroll"). Sections switch as state, so
 * nothing reloads and Talkeo keeps its conversation.
 *
 * Talkeo lives in two places that share one thread: a face in the corner of
 * every section that opens a small window (Speak keeps its tutor the same
 * way), and its own section, for talking only to the AI. On a phone the
 * sections move to a bar under the thumb and the window opens full height.
 *
 * Data: `MOCK_HOME`, shaped like the Core's responses; what is real and what
 * is mocked is written at the top of `lib/inside/mock.ts`.
 */
export function Home({ home }: { home: HomeData }) {
  const t = useTranslations("home");
  const talkeo = useTalkeo(home);
  const [section, setSection] = useState<Section>("today");
  const [chatOpen, setChatOpen] = useState(false);

  const go = (next: Section) => {
    if (next === section) return;
    if (next === "talkeo") setChatOpen(false);
    setSection(next);
    window.scrollTo({ top: 0 });
  };

  /** Ask from anywhere on the page: the window opens with the question asked. */
  const ask = (text: string) => {
    setChatOpen(true);
    talkeo.say(text);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setChatOpen(false);
      // ⌘J / Ctrl+J, the chat toggle of the tools this audience already knows.
      if (event.key.toLowerCase() === "j" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (section !== "talkeo") setChatOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [section]);

  return (
    <div data-slot="inside" className={cn("relative isolate min-h-dvh", GROUND)}>
      <TopBar t={t} home={home} section={section} onSection={go} />

      <main className="mx-auto w-full max-w-[1120px] px-4 pt-6 pb-36 sm:px-6 lg:px-8 lg:pt-10 lg:pb-24">
        <div key={section} className="motion-safe:animate-[view-in_420ms_var(--ease-entrance)_both]">
          {section === "today" && <Today home={home} t={t} onAsk={ask} onSection={go} />}
          {section === "practice" && <Practice home={home} t={t} />}
          {section === "progress" && <Progress home={home} t={t} />}
          {section === "talkeo" && <TalkeoView talkeo={talkeo} t={t} />}
          {section === "settings" && <Settings home={home} t={t} />}
        </div>
      </main>

      {/* Talkeo's corner: the face, and the window it opens. Not in the
          Talkeo section, which is already the whole conversation. */}
      {section !== "talkeo" && (
        <>
          <div
            className={cn(
              "fixed z-40",
              "inset-x-2 top-2 bottom-2 sm:inset-auto sm:right-6 sm:bottom-24 sm:h-[min(620px,calc(100dvh-140px))] sm:w-[400px]",
              !chatOpen && "pointer-events-none",
            )}
          >
            <div className="flex h-full flex-col [&>section]:h-full">
              <TalkeoWindow
                talkeo={talkeo}
                t={t}
                open={chatOpen}
                onClose={() => setChatOpen(false)}
                onExpand={() => go("talkeo")}
              />
            </div>
          </div>
          <div
            className={cn(
              "fixed right-4 bottom-[88px] z-50 sm:right-6 sm:bottom-6",
              "transition-opacity duration-300",
              chatOpen && "max-sm:pointer-events-none max-sm:opacity-0",
            )}
          >
            <TalkeoBubble open={chatOpen} onClick={() => setChatOpen((o) => !o)} t={t} />
          </div>
        </>
      )}

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
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 transition-[background-color,box-shadow,backdrop-filter] duration-300",
        scrolled ? "bg-[#F3F4F7]/80 shadow-[0_1px_0_rgb(16_24_40/0.06)] backdrop-blur-xl dark:bg-black/60" : "bg-transparent",
      )}
    >
      <nav className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between gap-3 px-4 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-8">
        <Link
          href="/home"
          className="text-foreground font-heading flex w-fit items-center gap-2.5 text-[19px] font-semibold tracking-[-0.02em]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Talkeo" className="size-8 rounded-full shadow-[0_0_0_1px_rgb(16_24_40/0.08)]" />
          Talkeo
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
            className="bg-card font-heading flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold shadow-[0_0_0_1px_rgb(16_24_40/0.06)]"
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
              "font-heading grid size-9 cursor-pointer place-items-center rounded-full bg-[oklch(0.9_0.04_250)] text-[14px] font-semibold text-[oklch(0.35_0.12_256)]",
              "transition-[transform,box-shadow] duration-200 active:scale-95",
              section === "settings" && "shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--foreground)]",
            )}
          >
            {home.name.slice(0, 1)}
          </button>
        </div>
      </nav>
    </header>
  );
}

function BottomNav({ t, section, onSection }: { t: T; section: Section; onSection: (s: Section) => void }) {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-30 lg:hidden">
      <div
        role="tablist"
        className="bg-card/90 mx-auto flex max-w-md items-center justify-between rounded-full p-1.5 shadow-[0_0_0_1px_rgb(16_24_40/0.06),0_12px_32px_-12px_rgb(16_24_40/0.3)] backdrop-blur-xl"
      >
        {NAV.map(({ key, Icon }) => {
          const on = key === section;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onSection(key)}
              className={cn(
                "flex h-[52px] flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-semibold transition-colors duration-200",
                on ? "text-foreground bg-black/[0.06] dark:bg-white/10" : "text-text-tertiary",
              )}
            >
              <Icon className="size-5" strokeWidth={on ? 2.25 : 1.9} />
              {t(`nav.${key}`)}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
