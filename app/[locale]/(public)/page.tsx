import { Hero } from "@/components/landing/hero";
import { SurfacesBar } from "@/components/landing/surfaces-bar";

/**
 * The landing page reads nothing that depends on the request, so it prerenders
 * whole — `next build` reports it as static. Keep it that way: anything
 * visitor-specific belongs behind a `<Suspense>` boundary, and the hero must
 * stay outside of one.
 */
export default function LandingPage() {
  return (
    <main>
      {/* The first screen is the hero and the row together, not the hero
          alone: the row is what tells you the page continues, so it has to be
          visible without scrolling for it to do that job.

          `min-h-dvh` and not `h-screen`, because on mobile `100vh` counts the
          browser's address bar and the row would sit just under the fold.
          `min-h-` rather than `h-`, so a short viewport scrolls instead of
          crushing the hero. */}
      <div className="flex min-h-dvh flex-col">
        <Hero />
        <SurfacesBar />
      </div>
    </main>
  );
}
