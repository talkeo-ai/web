/**
 * A hand-drawn stroke under a few words of the headline, drawn once as the
 * page lands. It marks the outcome the page promises ("con confianza"), so the
 * eye reads that part first (Joaquin, 1/nov).
 *
 * One stroke in the brand blue fading to a lighter blue, not a marker block:
 * a block would weigh as much as the headline itself. It never wraps (the
 * words keep together), so the stroke always sits under one line.
 */
export function StrokeHighlight({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      {children}
      <svg
        aria-hidden
        viewBox="0 0 300 20"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-[-2%] -bottom-[0.14em] h-[0.26em] w-[104%] overflow-visible"
      >
        <defs>
          <linearGradient id="stroke-highlight" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="var(--brand)" />
            <stop offset="1" stopColor="oklch(0.72 0.13 235)" />
          </linearGradient>
        </defs>
        <path
          d="M4 13 C 70 5, 150 4, 296 9"
          fill="none"
          stroke="url(#stroke-highlight)"
          strokeWidth="5"
          strokeLinecap="round"
          pathLength={1}
          className="[stroke-dasharray:1] [stroke-dashoffset:1] motion-safe:animate-[stroke-draw_900ms_var(--ease-entrance)_450ms_forwards] motion-reduce:[stroke-dashoffset:0]"
        />
      </svg>
    </span>
  );
}
