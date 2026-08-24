import type {
  OnboardingAnswer,
  OnboardingState,
  Verdict,
} from "./contracts";

/**
 * The only door to the Core.
 *
 * Nothing above this line knows whether the Core is a running service or a
 * fixture. Today a mock answers; when stage E9 exposes `/v1`, the HTTP adapter
 * takes over and not a single component changes.
 *
 * Two rules inherited from the surface contract (D23) and enforced by shape:
 * a surface emits evidence and never writes state, and it reads estimates
 * through tools and never the database. There is no method here that writes a
 * level, and there never will be.
 */
export interface CorePort {
  /** The step to render for this user, or null when onboarding is done. */
  getOnboardingState(userId: string): Promise<OnboardingState>;

  /** Submits an answer and returns whatever the Core decides comes next. */
  submitOnboardingAnswer(
    userId: string,
    answer: OnboardingAnswer,
  ): Promise<OnboardingState>;

  /** Floor, ceiling and grey per area. Read-only by definition. */
  getVerdict(userId: string): Promise<Verdict>;
}
