/**
 * Motion that JavaScript drives has to check this itself.
 *
 * The global rule in `app/globals.css` collapses CSS durations, which is all
 * it can reach: it has no effect on a `setTimeout`, and by the CSSOM-View spec
 * an explicit `behavior: "smooth"` on a scroll call overrides the computed
 * `scroll-behavior` — so a page-wide `scroll-behavior: auto !important` does
 * not stop a smooth scroll that was asked for in code.
 */
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(REDUCED_MOTION).matches
  );
}

/**
 * The subscribe half of `useSyncExternalStore`, for components that have to
 * render differently rather than merely animate differently. Reading the query
 * in an effect and storing it would be a second render on every mount; this is
 * the shape React provides for exactly that.
 */
export function subscribeReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** The scroll behaviour to pass to `scrollTo` / `scrollBy`. */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}
