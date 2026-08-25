import { z } from "zod";

/**
 * The shape of the onboarding, not its content.
 *
 * The sequence is decided server-side and can branch, so the client never owns
 * it: it renders the step it is handed and posts an answer back.
 *
 * `kind` is deliberately an open string, so the catalog of steps can grow
 * without this contract changing.
 */
export const onboardingStepSchema = z.object({
  /** Stable id. It is also the URL segment, so a session can be resumed. */
  id: z.string(),
  /** Which renderer to use. The catalog of kinds is defined by the Core. */
  kind: z.string(),
  /** Everything the renderer needs. Validated by the renderer, not here. */
  payload: z.unknown(),
  /** Progress so far, for the bar. Null while the total is not knowable. */
  progress: z
    .object({ completed: z.number().int(), total: z.number().int() })
    .nullable(),
  /** Whether the user can step back from here. */
  canGoBack: z.boolean(),
});

export const onboardingStateSchema = z.object({
  userId: z.string(),
  /** The step to render, or null when the onboarding is finished. */
  step: onboardingStepSchema.nullable(),
});

export const onboardingAnswerSchema = z.object({
  stepId: z.string(),
  /** Shape depends on the step kind. The Core validates it. */
  value: z.unknown(),
});

export type OnboardingStep = z.infer<typeof onboardingStepSchema>;
export type OnboardingState = z.infer<typeof onboardingStateSchema>;
export type OnboardingAnswer = z.infer<typeof onboardingAnswerSchema>;
