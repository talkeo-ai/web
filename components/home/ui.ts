import type { useTranslations } from "next-intl";

export type T = ReturnType<typeof useTranslations<"home">>;

/*
 * The inside's vocabulary (Joaquin, 1/nov, after the Shopify admin he showed
 * as the bar: calm, exact, nothing shouting). One white canvas on the sky, and
 * inside it neutral greys, hairline borders, small precise type, black for the
 * one action that matters and the brand blue only where something is current.
 */

/** The white canvas the sections sit on, lifted off the sky. */
export const CANVAS =
  "bg-card rounded-[22px] shadow-[0_0_0_1px_rgb(15_30_60/0.06),0_1px_2px_rgb(15_30_60/0.05),0_40px_90px_-40px_rgb(30_60_130/0.5)]";

/** A card inside the canvas: a hairline and almost no shadow. */
export const CARD = "bg-card rounded-2xl border border-black/[0.08] shadow-[0_1px_2px_rgb(15_30_60/0.04)] dark:border-white/[0.08]";

/** The glass of the controls that sit on the sky itself. */
export const GLASS =
  "bg-white/55 shadow-[0_0_0_1px_rgb(255_255_255/0.65),0_8px_24px_-12px_rgb(40_90_170/0.35)] backdrop-blur-xl dark:bg-white/10 dark:shadow-none";

export const PRIMARY =
  "font-heading inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-foreground px-4 text-[14px] font-medium text-background shadow-[0_1px_2px_rgb(0_0_0/0.2),inset_0_1px_0_rgb(255_255_255/0.15)] transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.98]";

export const SECONDARY =
  "font-heading inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-card px-4 text-[14px] font-medium text-foreground shadow-[0_0_0_1px_rgb(15_30_60/0.12),0_1px_2px_rgb(15_30_60/0.06)] transition-colors duration-200 hover:bg-surface-secondary/60";

export const PAGE_TITLE = "font-heading text-foreground text-[26px] leading-[1.15] font-semibold tracking-[-0.025em]";
export const SECTION_TITLE = "font-heading text-foreground text-[15px] font-semibold tracking-[-0.01em]";
export const MUTED = "text-text-secondary";

/** Each block arrives a beat after the one above it, rising a little. */
export const ARRIVE = "motion-safe:animate-[home-in_560ms_var(--ease-entrance)_both]";
export function arrive(order: number): React.CSSProperties {
  return { animationDelay: `${30 + order * 50}ms` };
}

/** The ease-in-out sine the inside already moved on (27/oct): no lurch, no brake. */
export const SMOOTH = "ease-[cubic-bezier(0.37,0,0.63,1)]";

export const BANDS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
