import { ShellMock } from "@/components/shell/shell-mock";

/**
 * The shell mockup (#120, round 2), reached from the landing's "start" without
 * a page load.
 *
 * The conversation that used to open here is switched off, not removed: it
 * still lives in `components/onboarding/` behind `<OnboardingEntry />`, and
 * rendering that here brings it back.
 */
export default function OnboardingPage() {
  return <ShellMock />;
}
