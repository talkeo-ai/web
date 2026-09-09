import { OnboardingEntry } from "@/components/onboarding/onboarding-entry";

/**
 * The conversation that opens the product.
 *
 * One route and not one per stage. A stage is not a place you can navigate back
 * to — the service decides which one you are in, and the conversation is
 * continuous — and a hard navigation between them would take the audio context
 * with it, which is the thing that lets Talkeo speak at all.
 *
 * Nothing request-dependent is read here, so the shell prerenders and the
 * conversation opens underneath it.
 */
export default function OnboardingPage() {
  return <OnboardingEntry />;
}
