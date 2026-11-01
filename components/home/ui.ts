import type { useTranslations } from "next-intl";

export type T = ReturnType<typeof useTranslations<"home">>;

/**
 * The cards: the word deck's white card and long blue shadow, the one
 * vocabulary the landing, the measurement and the interview already share.
 * `--sky-card-shadow` lives with the other sky styles in `globals.css`.
 */
export const CARD = "bg-card rounded-[24px] shadow-[var(--sky-card-shadow)]";

/** The glass every floating control on the sky is made of. */
export const GLASS =
  "bg-white/55 shadow-[0_0_0_1px_rgb(255_255_255/0.65),0_8px_24px_-12px_rgb(40_90_170/0.35)] backdrop-blur-xl dark:bg-white/10 dark:shadow-none";

/** The brand blue running into the sky's own blue, for what leads. */
export const LEAD_FILL =
  "bg-[linear-gradient(135deg,oklch(0.5_0.18_256)_0%,oklch(0.56_0.17_250)_45%,oklch(0.7_0.12_230)_100%)]";

export const BRAND_FILL = "bg-[linear-gradient(135deg,var(--brand),oklch(0.7_0.12_230))]";

/** Each block arrives a beat after the one above it, rising a little. */
export const ARRIVE = "motion-safe:animate-[home-in_620ms_var(--ease-entrance)_both]";
export function arrive(order: number): React.CSSProperties {
  return { animationDelay: `${40 + order * 60}ms` };
}

/** The ease-in-out sine the inside already moved on (27/oct): no lurch, no brake. */
export const SMOOTH = "ease-[cubic-bezier(0.37,0,0.63,1)]";

export const BANDS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
