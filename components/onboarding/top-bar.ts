/**
 * The skip in the top bar the measurement and the interview share: a light
 * glass pill over the sky, so it reads as a control and not as a stray grey
 * word next to the progress track (Joaquin, 1/nov). One class for both screens,
 * so the bar does not change between them.
 */
export const SKIP_PILL =
  // Sized to the bar it sits in: as tall as the X's icon box is wide, no
  // heavier than the track, so the three read as one line (Joaquin, 1/nov).
  "font-heading text-foreground/80 hover:text-foreground inline-flex h-7 shrink-0 items-center rounded-full px-3 text-[13px] font-medium " +
  "bg-white/50 shadow-[0_0_0_1px_rgb(255_255_255/0.6)] backdrop-blur " +
  "transition-colors duration-(--duration-control) ease-(--ease-standard) hover:bg-white/85 " +
  "outline-none focus-key:ring-ring focus-key:ring-2 " +
  "dark:bg-white/10 dark:shadow-none dark:hover:bg-white/15";
