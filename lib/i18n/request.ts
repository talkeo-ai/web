import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";

import { routing } from "./routing";

type Messages = Record<string, unknown>;

/**
 * Merges a locale's messages over the default ones, so a key that has not been
 * translated yet falls back to English instead of throwing. That is what makes
 * adding a language cheap: ship the keys you have, fill the rest later.
 */
function withFallback(base: Messages, override: Messages): Messages {
  const merged: Messages = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const existing = merged[key];
    merged[key] =
      isPlainObject(existing) && isPlainObject(value)
        ? withFallback(existing, value)
        : value;
  }

  return merged;
}

function isPlainObject(value: unknown): value is Messages {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The locale is read from the `[locale]` root segment through
 * `next/root-params`, never from request headers.
 *
 * This is what makes i18n compatible with Cache Components: reading headers is
 * illegal inside cached scopes, while a root param getter is tracked by the
 * runtime and becomes part of the cache key. `setRequestLocale` is deprecated
 * and is not used anywhere in this project.
 *
 * `next/root-params` is unavailable in Route Handlers and Server Actions. Pass
 * the locale explicitly in those two places.
 */
export default getRequestConfig(async () => {
  const candidate = await localeParam();

  if (!hasLocale(routing.locales, candidate)) {
    notFound();
  }

  const base = (await import(`../../messages/${routing.defaultLocale}.json`))
    .default as Messages;

  const messages =
    candidate === routing.defaultLocale
      ? base
      : withFallback(
          base,
          (await import(`../../messages/${candidate}.json`)).default as Messages,
        );

  return { locale: candidate, messages };
});
