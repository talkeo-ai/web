import { defineRouting } from "next-intl/routing";

/**
 * One locale is loaded today. The infrastructure is in place from day one so
 * that no copy is ever hardcoded in a component: adding a language is adding a
 * file under `messages/`, not touching every component.
 *
 * `as-needed` keeps the default locale unprefixed (`/` rather than `/es`)
 * while still routing every request through the `[locale]` root segment.
 */
export const routing = defineRouting({
  locales: ["es"],
  defaultLocale: "es",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
