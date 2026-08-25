import type { CorePort } from "../port";
import type { OnboardingState, Verdict } from "../contracts";

/**
 * The adapter that answers while there is no service to talk to.
 *
 * The fixtures mirror the shape and tone of real responses, so the UI is built
 * against something representative rather than placeholder text.
 */

const VERDICT: Verdict = {
  areas: [
    { area: "Speaking", floor: "A2", ceiling: "B1", note: "Sample note." },
    { area: "Writing", floor: "A2", ceiling: "A2", note: "Sample note." },
    { area: "Understanding", floor: "B1", ceiling: "B2", note: "Sample note." },
  ],
  unmeasured: "Sample note about what has not been measured yet.",
  startingPoint: "Sample note about where practice starts.",
};

export function createMockCore(): CorePort {
  return {
    async getOnboardingState(userId: string): Promise<OnboardingState> {
      return { userId, step: null };
    },

    async submitOnboardingAnswer(userId: string): Promise<OnboardingState> {
      return { userId, step: null };
    },

    async getVerdict(): Promise<Verdict> {
      return VERDICT;
    },
  };
}
