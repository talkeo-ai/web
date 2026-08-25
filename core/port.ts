import type {
  OnboardingAnswer,
  OnboardingState,
  Verdict,
} from "./contracts";

/**
 * The only door to the measurement service.
 *
 * Nothing above this line knows whether that service is running or whether a
 * fixture is answering. Swapping one for the other changes configuration, not
 * components.
 *
 * The interface is read-mostly by design: it can ask for state and submit an
 * answer, and there is no method that writes a level directly.
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
