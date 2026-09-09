"use client";

import { useLocale } from "next-intl";
import { useLayoutEffect } from "react";

import { applyTheme } from "@/lib/theme";

/**
 * Puts the theme back after a navigation the bootstrap script cannot reach.
 *
 * ⚠ The script that writes the `dark` class is the first child of `<body>` and
 * runs when the PARSER gets to it. Switching site language is a real link
 * between two locale segments: React re-renders the root layout on the client,
 * no document is parsed, and the class list ends up as the server wrote it —
 * light. Reloading was the only way back. React says it out loud in
 * development: "scripts inside React components are never executed when
 * rendering on the client".
 *
 * `useLayoutEffect` runs after the commit and before the browser paints, so
 * there is no flash. The script stays: it is still the only thing early enough
 * for the FIRST paint, and this is the same decision applied to a paint it
 * cannot reach.
 *
 * ⚠ Keyed on the locale, not the pathname. next-intl's `usePathname` returns the
 * route WITHOUT the language prefix, so on a language change it does not change
 * at all — which would leave this looking correct and doing nothing.
 */
export function ThemeKeeper() {
  const locale = useLocale();
  useLayoutEffect(() => applyTheme(), [locale]);
  return null;
}
