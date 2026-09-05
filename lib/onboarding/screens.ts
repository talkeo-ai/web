import type { Step } from "@/core/contracts";

/**
 * Two levels of navigation, and only one of them is ours.
 *
 * The service owns the **step**: it decides where a run is and every write it
 * answers says so. This app owns the **screens inside a step**, because some
 * steps are more than one thing to look at — the opening step asks three
 * questions and the catalog hands it over as one.
 *
 * The screen is a URL segment rather than client state, which is what makes the
 * browser's back button work and lets a half-finished run be picked up later.
 *
 * A screen is only ever reached if its step is the one the service reports. The
 * table below is the whole mapping; nothing else derives it.
 */
export const ONBOARDING_SCREENS = {
  "self-assessment": { step: "survey", order: 0 },
  areas: { step: "survey", order: 1 },
  "meet-kai": { step: "survey", order: 2 },
  interview: { step: "kai_interview", order: 0 },
  exercises: { step: "items", order: 0 },
  briefing: { step: "kai_briefing", order: 0 },
  roleplay: { step: "roleplay", order: 0 },
  result: { step: "verdict", order: 0 },
  email: { step: "email", order: 0 },
  "day-two": { step: "day2", order: 0 },
} as const satisfies Record<string, { step: Step; order: number }>;

export type OnboardingScreen = keyof typeof ONBOARDING_SCREENS;

export const ONBOARDING_SCREEN_NAMES = Object.keys(
  ONBOARDING_SCREENS,
) as OnboardingScreen[];

export function isOnboardingScreen(value: string): value is OnboardingScreen {
  return Object.hasOwn(ONBOARDING_SCREENS, value);
}

export function stepOf(screen: OnboardingScreen): Step {
  return ONBOARDING_SCREENS[screen].step;
}

/** The screens of one step, in the order they are shown. */
export function screensOf(step: Step): OnboardingScreen[] {
  return ONBOARDING_SCREEN_NAMES.filter(
    (screen) => stepOf(screen) === step,
  ).sort((a, b) => ONBOARDING_SCREENS[a].order - ONBOARDING_SCREENS[b].order);
}

/** Where a step starts. This is what a redirect aims at. */
export function firstScreenOf(step: Step): OnboardingScreen {
  const [first] = screensOf(step);
  return first;
}

export function nextScreenWithinStep(
  screen: OnboardingScreen,
): OnboardingScreen | null {
  const siblings = screensOf(stepOf(screen));
  return siblings[ONBOARDING_SCREENS[screen].order + 1] ?? null;
}

export function previousScreenWithinStep(
  screen: OnboardingScreen,
): OnboardingScreen | null {
  const siblings = screensOf(stepOf(screen));
  const order = ONBOARDING_SCREENS[screen].order;
  return order === 0 ? null : (siblings[order - 1] ?? null);
}

/**
 * Where a screen sits among its siblings, or null when there is no such thing.
 *
 * A step with one screen has no position to report, and neither does one whose
 * length the service decides as it goes. Both come back null here, which is
 * what keeps a progress bar from being drawn over a total nobody knows.
 */
export function positionOf(
  screen: OnboardingScreen,
): { position: number; total: number } | null {
  const total = screensOf(stepOf(screen)).length;
  if (total < 2) return null;

  return { position: ONBOARDING_SCREENS[screen].order + 1, total };
}

export function onboardingHref(screen: OnboardingScreen): string {
  return `/onboarding/${screen}`;
}
