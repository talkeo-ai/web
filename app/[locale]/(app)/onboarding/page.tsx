import { HeroBackdrop } from "@/components/landing/hero-backdrop";
import { OnboardingEntry } from "@/components/onboarding/onboarding-entry";

/**
 * The conversation that opens the product.
 *
 * One route and not one per stage. A stage is not a place you can navigate back
 * to — the service decides which one you are in, and the conversation is
 * continuous — and a hard navigation between them would take the audio context
 * with it, which is the thing that lets Talkeo speak at all.
 *
 * It stands on the landing's sky, already eased forward and under the same
 * light veil the measurement used, so finishing the deck reads as the next step
 * in one place rather than a new page (Joaquin, 1/nov). `data-sky` is what the
 * scoped styles in `globals.css` read to lift the chat off the sky.
 *
 * Nothing request-dependent is read here, so the shell prerenders and the
 * conversation opens underneath it.
 */
export default function OnboardingPage() {
  return (
    <main data-sky className="relative isolate flex min-h-dvh flex-1 flex-col">
      <HeroBackdrop />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-[5] bg-white/25 dark:bg-black/40" />
      <OnboardingEntry />
    </main>
  );
}
