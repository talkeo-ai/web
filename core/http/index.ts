import {
  onboardingStateSchema,
  verdictSchema,
  type OnboardingAnswer,
  type OnboardingState,
  type Verdict,
} from "../contracts";
import type { CorePort } from "../port";

/**
 * The adapter that talks to the real service over HTTP.
 *
 * The contract is versioned in the URL. Every response is parsed through its
 * schema at the boundary, so a shape change fails here, loudly, instead of
 * three components deep.
 */
export function createHttpCore(baseUrl: string): CorePort {
  async function request<T>(
    path: string,
    schema: { parse: (input: unknown) => T },
    init?: RequestInit,
  ): Promise<T> {
    const response = await fetch(`${baseUrl}/v1${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
    });

    if (!response.ok) {
      throw new Error(`Core responded ${response.status} for ${path}`);
    }

    return schema.parse(await response.json());
  }

  return {
    getOnboardingState(userId: string): Promise<OnboardingState> {
      return request(`/users/${userId}/onboarding`, onboardingStateSchema);
    },

    submitOnboardingAnswer(
      userId: string,
      answer: OnboardingAnswer,
    ): Promise<OnboardingState> {
      return request(`/users/${userId}/onboarding`, onboardingStateSchema, {
        method: "POST",
        body: JSON.stringify(answer),
      });
    },

    getVerdict(userId: string): Promise<Verdict> {
      return request(`/users/${userId}/verdict`, verdictSchema);
    },
  };
}
