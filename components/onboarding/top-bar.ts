/**
 * The skip in the top bar the measurement and the interview share: a light
 * glass pill over the sky, so it reads as a control and not as a stray grey
 * word next to the progress track (Joaquin, 1/nov). One class for both screens,
 * so the bar does not change between them.
 */
export const SKIP_PILL =
  "font-heading text-foreground inline-flex h-9 shrink-0 items-center rounded-full px-4 text-[14px] font-semibold " +
  "bg-white/60 shadow-[0_0_0_1px_rgb(255_255_255/0.7),0_4px_12px_-6px_rgb(40_90_170/0.35)] backdrop-blur " +
  "transition-colors duration-(--duration-control) ease-(--ease-standard) hover:bg-white/85 " +
  "outline-none focus-key:ring-ring focus-key:ring-2 " +
  "dark:bg-white/10 dark:shadow-none dark:hover:bg-white/15";
