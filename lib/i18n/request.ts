import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";

import { routing } from "./routing";

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

  return {
    locale: candidate,
    messages: (await import(`../../messages/${candidate}.json`)).default,
  };
});
