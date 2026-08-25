import type { Locale } from "./routing";

/**
 * Every language written in itself, never translated into the one being read.
 *
 * Someone stuck in a language they cannot read is exactly the person who needs
 * to find this list, and "Portugués" is no help to them — "Português" is the
 * word they will recognise.
 *
 * Keyed by `Locale` rather than by `string` so that adding a language to the
 * routing config without adding it here is a compile error. Typed loosely, the
 * omission types clean and throws at render on a prerendered page.
 */
export const LOCALE_LABELS: Record<Locale, { flag: string; native: string }> = {
  en: { flag: "🇬🇧", native: "English" },
  es: { flag: "🇪🇸", native: "Español" },
  pt: { flag: "🇧🇷", native: "Português" },
};
