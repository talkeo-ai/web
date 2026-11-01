import { getTranslations } from "next-intl/server";

import { EnterOnboarding } from "@/components/onboarding/enter-onboarding";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";

import { HeroBackdrop } from "./hero-backdrop";
import { LevelCheck } from "./level-check";

/**
 * This is the largest contentful paint, so it sits outside every Suspense
 * boundary.
 *
 * Height comes from the parent, not from here: this section and the row below
 * it share one viewport, so it grows into whatever that row leaves rather than
 * claiming a screen of its own and pushing the row past the fold.
 */
export async function Hero() {
  const t = await getTranslations("hero");

  return (
    // `overflow-x-clip`, not `hidden`: a card flying off the deck must never
    // widen the page, and clip does that without making this a scroll box.
    // While the level check is on stage this layer rises over the site
    // header, because the stage lives inside it (`LevelCheck`).
    <section className="relative z-10 flex flex-1 flex-col overflow-x-clip in-data-level-stage:z-60">
      {/* The first screen's background, full bleed and under the header too.
          While the deck is on stage the stage's own background covers it. */}
      <HeroBackdrop />
      {/* 1. Header compensator — the floating header is out of the flow and
         cannot push anything down, so the space it covers is reserved here. */}
      <div className="h-28 shrink-0 lg:h-20" aria-hidden />

      {/* 2. Hero + orb — grows to fill remaining space */}
      <div className="flex min-h-0 flex-1 flex-col px-6 lg:flex-row lg:items-center lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col lg:grid lg:flex-initial lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16">
          {/* Copy — centred on the phone, left-aligned on desktop.

              On desktop it is a column of its own with a hard left edge that
              the headline, the line under it and the buttons all share: one
              axis reads as one statement, and it is how every page this was
              measured against sets its first screen (1/nov). On the phone the
              copy spans the screen above the deck, and there centring is what
              keeps it from reading as lopsided.

              On the phone the order is headline → deck → buttons: the deck is
              the demonstration, so it plays before the ask, and the ask lands
              in thumb reach at the bottom. `display: contents` is what makes
              one markup serve both layouts — the wrapper dissolves on mobile
              so its children join the flex flow as orderable siblings, and
              becomes the copy column again at `lg`, where block layout
              ignores `order`. */}
          <div className="contents lg:block lg:w-full lg:max-w-[600px]">
            {/* A container, so the headline sizes itself against the width it
                actually gets rather than against the viewport. `w-full` is
                load-bearing: containing the inline size is what stops the
                contents from deciding the width. */}
            <div className="@container order-1 mx-auto w-full max-w-lg text-center lg:mx-0 lg:max-w-none lg:text-left transition-[opacity,filter] duration-500 ease-(--ease-standard) in-data-level-stage:pointer-events-none in-data-level-stage:opacity-0 in-data-level-stage:blur-[6px]">
              {/* On the phone, two lines expressed as arithmetic: the longest
                  headline needs some multiple of its own font size to break in
                  two, and the size sits just under that ceiling
                  (`hero-headline.spec.ts`). On desktop it is a large display.

                  The face is the serif display, at its one weight: the
                  geometric sans at 600 is what every template sets, and next
                  to the background it read as the dated half of the page. */}
              <h1 className="text-foreground font-display text-[clamp(26px,9.6cqw,52px)] leading-[1.06] font-normal tracking-[-0.015em] text-balance lg:text-[clamp(52px,12.4cqw,78px)] lg:leading-[0.98] lg:tracking-[-0.025em]">
                {t("headline")}
              </h1>
              {/* Not on the phone: there the deck sits right under the headline
                  and says the same thing by being played, and the two lines
                  would push the buttons under the fold. */}
              <p className="text-foreground/70 mx-auto mt-3 hidden max-w-[34ch] text-[15px] leading-[1.5] text-balance sm:block lg:mx-0 lg:mt-6 lg:max-w-[30em] lg:text-[19px]">
                {t("subtitle")}
              </p>
            </div>

            {/* On the phone both actions share one width: stacked controls of
                different widths read as a list of links. On desktop they sit
                side by side under the copy, sized to their labels, on the same
                left edge. */}
            <div className="order-3 mx-auto mt-8 flex w-full max-w-[371px] flex-col gap-[13.5px] pb-8 lg:mx-0 lg:mt-10 lg:max-w-none lg:flex-row lg:gap-3 lg:pb-0 transition-[opacity,filter] duration-500 ease-(--ease-standard) in-data-level-stage:pointer-events-none in-data-level-stage:opacity-0 in-data-level-stage:blur-[6px]">
              {/* Flat, and fully round. The lip under a button is the
                  playful-app idiom (Duolingo is the one that still runs it);
                  next to a display headline it is what dated the page. */}
              <Button size="lg" variant="primary" className="rounded-full text-[17px]" asChild>
                <EnterOnboarding>{t("cta")}</EnterOnboarding>
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="bg-card rounded-full border-transparent text-[17px] shadow-[0_0_0_1px_rgb(28_25_23/0.1),0_1px_2px_rgb(28_25_23/0.06)]"
                asChild
              >
                <Link href="/login" prefetch={false}>
                  {t("signIn")}
                </Link>
              </Button>
            </div>
          </div>

          {/* Something to play before anything else — headline, then this,
              then the ask on the phone, as the orb was; right column on
              desktop. It replaced the orb (Joaquin, 1/nov): only Duolingo
              among the four top-earning language apps lets you do something
              real before asking for anything, and moving its lesson ahead of
              sign-up gave it +20% daily active users. What is played is a
              rough level from swiped words, which is the promise in the
              headline kept on the spot. */}
          <div className="order-2 flex min-h-0 flex-1 items-center justify-center py-6 lg:order-none lg:flex-initial lg:py-0">
            <LevelCheck className="mx-auto w-full max-w-[420px] lg:mr-0 lg:ml-auto" />
          </div>
        </div>
      </div>
    </section>
  );
}
