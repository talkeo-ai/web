"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { readTheme, writeTheme } from "@/lib/theme";

/**
 * Reads and writes the class on `<html>` directly. Holding the theme in React
 * state would mean rendering a guess and correcting it after mount, which is
 * the flash the bootstrap script exists to avoid — the icons swap in CSS and
 * the label stays true in both directions.
 */
export function ThemeToggle() {
  const t = useTranslations("nav");

  return (
    <button
      type="button"
      aria-label={t("theme")}
      onClick={() => writeTheme(readTheme() === "dark" ? "light" : "dark")}
      className="text-text-secondary hover:text-foreground hover:bg-surface-secondary focus-visible:ring-ring flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors duration-(--duration-control) ease-(--ease-standard) outline-none focus-visible:ring-2"
    >
      {/* Shows the theme the press gives you, not the one you are in. */}
      <MoonIcon className="size-[18px] dark:hidden" aria-hidden />
      <SunIcon className="hidden size-[18px] dark:block" aria-hidden />
    </button>
  );
}
