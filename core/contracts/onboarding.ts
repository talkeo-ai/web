import { z } from "zod";

/**
 * The shape of the onboarding, not its content.
 *
 * The onboarding is the focus selector running in MEASURE mode: the Core
 * decides what comes next from what the user just did, and it branches — the
 * zero gate reroutes in two or three items and is refutable in both
 * directions. So the client never owns the sequence. It renders the step it is
 * handed and posts an answer back.
 *
 * Which steps exist and what they ask is a product decision that does not live
 * here. `kind` is deliberately an open string: the catalog can grow without
 * this contract changing.
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
