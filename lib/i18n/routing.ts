import { defineRouting } from "next-intl/routing";

/**
 * Three locales, English by default.
 *
 * `as-needed` keeps the default unprefixed (`/`) and prefixes the rest
 * (`/es`, `/pt`). Every one of them still routes through the `[locale]` root
 * segment, which is what lets each prerender as its own static page.
 *
 * Detection is on by default and needs no code: next-intl reads the
 * `accept-language` header, remembers the choice in a cookie, and emits the
 * `Link` header pointing search engines at the alternate versions.
 */
export const routing = defineRouting({
  locales: ["en", "es", "pt"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

/** Shown in the language selector, each in its own language. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
};
