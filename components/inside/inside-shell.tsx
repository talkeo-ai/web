"use client";

import { ChartNoAxesColumn, House, Mic, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { cn } from "@/lib/utils";

const SECTIONS = [
  { key: "home", Icon: House },
  { key: "practice", Icon: Mic },
  { key: "progress", Icon: ChartNoAxesColumn },
  { key: "profile", Icon: User },
] as const;

type Section = (typeof SECTIONS)[number]["key"];

/**
 * The inside, as one page: a fixed rail on the left and a card on the right.
 *
 * The window never scrolls; only the card does. The rail does not expand: each
 * entry is a large icon with its name under it. Switching sections is state
 * here and not a navigation, so nothing reloads.
 */
export function InsideShell() {
  const t = useTranslations("inside");
  const [section, setSection] = useState<Section>("home");

  return (
    <div
      data-slot="inside"
      className="bg-surface-sunken flex h-dvh overflow-hidden"
    >
      <nav
        aria-label={t("nav")}
        className="flex w-24 shrink-0 flex-col items-center gap-2 py-4"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Talkeo" className="mb-4 size-9" />
        {SECTIONS.map(({ key, Icon }) => {
          const active = key === section;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex w-20 cursor-pointer flex-col items-center gap-1 py-1.5 outline-none",
                "focus-key:ring-ring focus-key:ring-2 rounded-xl",
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-14 items-center justify-center rounded-2xl",
                  "transition-colors duration-(--duration-control) ease-(--ease-standard)",
                  active
                    ? "bg-surface-tertiary text-foreground"
                    : "text-text-secondary group-hover:bg-surface-secondary group-hover:text-foreground",
                )}
              >
                <Icon className="size-6" strokeWidth={active ? 2.25 : 1.75} />
              </span>
              <span
                className={cn(
                  "text-[12px] transition-colors duration-(--duration-control)",
                  active
                    ? "text-foreground font-semibold"
                    : "text-text-secondary group-hover:text-foreground",
                )}
              >
                {t(`sections.${key}`)}
              </span>
            </button>
          );
        })}
      </nav>

      <main className="flex min-w-0 flex-1 py-3 pr-3">
        <div className="bg-card flex-1 overflow-y-auto rounded-2xl border border-black/[0.06] shadow-sm dark:border-white/[0.06]">
          <div className="mx-auto w-full max-w-3xl p-8">
            <h1 className="font-heading text-foreground text-2xl font-semibold">
              {t(`sections.${section}`)}
            </h1>
          </div>
        </div>
      </main>
    </div>
  );
}
