/**
 * Motion that JavaScript drives has to check this itself.
 *
 * The global rule in `app/globals.css` collapses CSS durations, which is all
 * it can reach: it has no effect on a `setTimeout`, and by the CSSOM-View spec
 * an explicit `behavior: "smooth"` on a scroll call overrides the computed
 * `scroll-behavior` — so a page-wide `scroll-behavior: auto !important` does
 * not stop a smooth scroll that was asked for in code.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** The scroll behaviour to pass to `scrollTo` / `scrollBy`. */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}
