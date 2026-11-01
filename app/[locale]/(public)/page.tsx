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
      {/* The first screen is the hero alone: a headline, one thing to do and
          the deck. The row of practice types used to share it, to say the
          page continues, but it was a second message competing with the
          first, and the deck is now what invites you in (1/nov).

          `min-h-dvh` and not `h-screen`, because on mobile `100vh` counts the
          browser's address bar. `min-h-` rather than `h-`, so a short
          viewport scrolls instead of crushing the hero. */}
      <div className="flex min-h-dvh flex-col">
        <Hero />
      </div>
      <SurfacesBar />
    </main>
  );
}
