import { getTranslations } from "next-intl/server";

import { EnterOnboarding } from "@/components/onboarding/enter-onboarding";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";

import { NervousActivity } from "./nervous-activity";
import { OrbWidget } from "./orb-widget";

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
    <section className="relative z-10 flex flex-1 flex-col">
      {/* 1. Header compensator — the floating header is out of the flow and
         cannot push anything down, so the space it covers is reserved here. */}
      <div className="h-28 shrink-0 lg:h-20" aria-hidden />

      {/* 2. Hero + orb — grows to fill remaining space */}
      <div className="flex min-h-0 flex-1 flex-col px-6 lg:flex-row lg:items-center lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col lg:grid lg:flex-initial lg:grid-cols-2 lg:items-center lg:gap-16">
          {/* Copy — centred at every size, inside its own column rather than
              across the page. Left-aligning it would put the headline's ragged
              edge and the buttons' fixed edge on the same axis, and the two
              never line up.

              On the phone the order is headline → orb → buttons: the orb is
              the demonstration, so it plays before the ask, and the ask lands
              in thumb reach at the bottom. `display: contents` is what makes
              one markup serve both layouts — the wrapper dissolves on mobile
              so its children join the flex flow as orderable siblings, and
              becomes the copy column again at `lg`, where block layout
              ignores `order` and the desktop stays exactly as it was. */}
          <div className="contents lg:mx-auto lg:block lg:w-full lg:max-w-lg lg:text-center">
            {/* A container, so the headline can size itself against the width
                it actually gets rather than against the viewport. The two come
                apart exactly at `lg`, where the grid opens and this column
                drops to roughly 440px while the window only gets wider — which
                is why a viewport-stepped size cannot hold a line count across
                it.

                `w-full` is load-bearing, not decoration: containing the inline
                size is exactly what stops the contents from deciding the width,
                so without a width of its own this box collapses against its
                own auto margins. */}
            <div className="@container order-1 mx-auto w-full max-w-lg text-center">
              {/* Tight leading and a hair of negative tracking: a display set
                  loose reads as a poster and set close reads as a statement,
                  and the two numbers do the same job — moving one without the
                  other leaves the block either cramped or unglued.

                  600, and the same 600 every other display on the site runs at.
                  Light text on a dark surface blooms, so the stroke gains
                  weight the reference never had and the instinct to reach for
                  700 is worth resisting; below this the face reads thin at
                  display size, which is the failure mode it was chosen against.

                  The size is two lines expressed as arithmetic: the longest
                  headline needs some multiple of its own font size in width to
                  break in two, and the size sits just under that ceiling.
                  Change the copy or the face and the multiple moves with it —
                  `hero-headline.spec.ts` is what says so, and a rendered page is
                  the only place it can be checked, because it depends on the
                  font's real metrics.

                  The ceiling carries some slack on purpose, and
                  the difference buys the break: the English copy joins "and" to
                  the word after it with a non-breaking space, so the
                  conjunction cannot be left hanging at the end of a line.
                  Starting line two with "and improve" makes that line the long
                  one, and the whole headline has to be set small enough to fit.

                  The floor is typographic, not a fitting one: below about 20px
                  this stops reading as a display face at all. It binds under
                  ~300px of container, where two lines are no longer possible at
                  any size worth setting. */}
              <h1 className="text-foreground font-heading text-[clamp(20px,6.7cqw,38px)] leading-[1.18] font-semibold tracking-[-0.02em] text-balance">
                {t("headline")}
              </h1>
            </div>

            {/* Both actions share one width rather than sizing to their own
                labels: stacked controls of different widths read as a list of
                links, and a fixed column reads as a decision with two answers.
                `mt-8` and a tight gap — the pair belongs to what precedes it
                (the orb on mobile, the headline on desktop), and to each other
                more than to it. `pb-8` keeps the pair off the row below on
                mobile; the centered desktop grid never reaches it.

                The pair reads small next to the headline it answers, so it is
                scaled — and scaled as one object. Every number here is the
                shape it already had times 1.125: the column, the gap, and the
                label, which carries the control's own height, padding and
                radius with it because `lg` states them in `em`. Nothing is
                re-proportioned, so the pair cannot end up stretched or
                flattened; it is the same drawing, larger. */}
            <div className="order-3 mx-auto mt-8 flex w-full max-w-[371px] flex-col gap-[13.5px] pb-8 lg:pb-0">
              <Button size="lg" variant="raised" className="text-[18px]" asChild>
                <EnterOnboarding>{t("cta")}</EnterOnboarding>
              </Button>
              {/* The lip is applied here rather than carried by the variant:
                  it belongs to this pair only, and its partner sitting flat
                  beside a raised button would read as broken instead of as
                  quieter. */}
              <Button
                size="lg"
                variant="secondary"
                className="text-[18px] shadow-[0_2px_0_0_var(--cta-alt-lip)] active:translate-y-[2px] active:shadow-none"
                asChild
              >
                <Link href="/login" prefetch={false}>
                  {t("signIn")}
                </Link>
              </Button>
            </div>
          </div>

          {/* Orb — centered in the space the headline and buttons leave on
              mobile, right column on desktop */}
          <div className="order-2 flex min-h-0 flex-1 items-center justify-center lg:order-none lg:flex-initial">
            <div className="relative mx-auto flex aspect-square w-full max-w-[320px] items-center justify-center sm:max-w-[380px] lg:mr-[-2%] lg:ml-auto lg:max-w-[400px]">
              <NervousActivity />

              <div className="relative z-20 h-[60%] w-[60%] sm:h-[55%] sm:w-[55%]">
                {/* A link, not a decorated div. Attaching a click listener to
                    a bare element gives a mouse-only affordance: nothing to
                    tab to, nothing to announce, and no keyboard equivalent.
                    Labelled explicitly because its contents are a canvas. */}
                <EnterOnboarding
                  label={t("cta")}
                  className="bg-surface-secondary border-border focus-visible:ring-ring focus-visible:ring-offset-background shadow-raised relative block h-full w-full overflow-hidden rounded-full border focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:outline-none"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo.png"
                    alt=""
                    className="absolute inset-[4.5%] h-[91%] w-[91%] rounded-full object-cover"
                  />
                  <div className="relative h-full w-full">
                    <OrbWidget />
                  </div>
                </EnterOnboarding>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
