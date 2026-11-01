import type { useTranslations } from "next-intl";

export type T = ReturnType<typeof useTranslations<"home">>;

/**
 * The inside's vocabulary, after the apps people pay for (Appllama, 1/nov:
 * Bevel, Ladder, Calm, Speak, Praktika): a quiet grey ground, white cards
 * that barely lift off it, one image where the eye should go first, and
 * colour kept for what you act on.
 */

/** The ground every section stands on. */
export const GROUND = "bg-[#F3F4F7] dark:bg-background";

/** A white card, lifted by a hairline and a soft shadow, never a border. */
export const CARD =
  "bg-card rounded-[24px] shadow-[0_0_0_1px_rgb(16_24_40/0.04),0_1px_2px_rgb(16_24_40/0.04),0_8px_24px_-12px_rgb(16_24_40/0.08)] dark:shadow-[0_0_0_1px_rgb(255_255_255/0.06)]";

/** The main action: dark, round, unmistakable. */
export const PRIMARY =
  "font-heading inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-foreground px-5 text-[15px] font-semibold text-background transition-[transform,opacity] duration-200 hover:opacity-90 active:scale-[0.97]";

/** A quiet action beside it. */
export const QUIET =
  "font-heading inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-black/[0.05] px-3.5 text-[13px] font-semibold text-foreground transition-colors duration-200 hover:bg-black/[0.08] dark:bg-white/10 dark:hover:bg-white/15";

export const PAGE_TITLE = "font-heading text-foreground text-[30px] leading-[1.1] font-semibold tracking-[-0.03em] sm:text-[34px]";
export const CARD_TITLE = "font-heading text-foreground text-[17px] font-semibold tracking-[-0.015em]";
export const LABEL = "text-text-secondary text-[13px] font-medium";

/** Each block arrives a beat after the one above it, rising a little. */
export const ARRIVE = "motion-safe:animate-[home-in_620ms_var(--ease-entrance)_both]";
export function arrive(order: number): React.CSSProperties {
  return { animationDelay: `${40 + order * 60}ms` };
}

export const BANDS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
