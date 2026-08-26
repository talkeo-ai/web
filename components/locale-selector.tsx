"use client";

import { ChevronDownIcon } from "lucide-react";
import { hasLocale, useLocale, useTranslations } from "next-intl";

import {
  DropdownMenu,
  DropdownMenuArrow,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LocaleFlag } from "@/components/locale-flag";
import { LOCALE_LABELS } from "@/lib/i18n/locales";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { routing } from "@/lib/i18n/routing";

/**
 * Switching locale is a navigation, not a mutation: each item is a real link to
 * the same pathname under another prefix. `next-intl` writes its cookie on the
 * way through, so the choice survives the next visit without any state here.
 */
export function LocaleSelector() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("nav");
  // `useLocale` is typed as a plain string, so it is narrowed before indexing
  // rather than assumed to be one of ours.
  const currentLocale = hasLocale(routing.locales, locale)
    ? locale
    : routing.defaultLocale;
  const current = LOCALE_LABELS[currentLocale];

  return (
    <DropdownMenu>
      {/* Label and value in one line, so the control says what it does before
          it is opened — an unlabelled flag asks you to guess. */}
      {/* Explicit name: the visible label collapses to just a flag on small
          screens, so the accessible name cannot be left to the contents. */}
      <DropdownMenuTrigger
        aria-label={t("language")}
        className="group text-text-secondary hover:text-foreground gap-1.5 text-[13px] font-semibold tracking-wider uppercase"
      >
        <span className="hidden sm:inline">{t("language")}:</span>
        {/* Sized explicitly rather than off the label: the trigger's type is
            13px, and a flag set to match reads as a smudge. */}
        <LocaleFlag locale={currentLocale} className="size-4 sm:hidden" />
        <span className="hidden sm:inline">{current.native}</span>
        <ChevronDownIcon
          className="size-4 transition-transform duration-(--duration-control) ease-(--ease-standard) group-data-[state=open]:rotate-180"
          aria-hidden
        />
      </DropdownMenuTrigger>

      {/* Heavier border and rounder corners than the default menu: this panel
          floats over the hero with nothing behind it to define its edge. */}
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-[220px] rounded-2xl border-2 p-2"
      >
        <DropdownMenuArrow />
        {routing.locales.map((code) => {
          const entry = LOCALE_LABELS[code];
          return (
            <DropdownMenuCheckboxItem
              key={code}
              checked={code === locale}
              asChild
            >
              <Link href={pathname} locale={code}>
                <span className="flex items-center gap-3">
                  <LocaleFlag locale={code} className="size-5 shrink-0" />
                  <span className="text-[15px]">{entry.native}</span>
                </span>
              </Link>
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
