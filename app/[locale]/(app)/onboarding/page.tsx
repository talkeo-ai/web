/**
 * A blank canvas for the next onboarding mockup (#120, round 2).
 *
 * The conversation that used to open here is switched off, not removed: it
 * still lives in `components/onboarding/` behind `<OnboardingEntry />`, and
 * rendering that here brings it back.
 */
export default function OnboardingPage() {
  return <main data-slot="onboarding-blank" className="min-h-dvh" />;
}
