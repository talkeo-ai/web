import type { OnboardingScreen } from "@/lib/onboarding/screens";
import type { EntryAnswers } from "@/lib/session/entry-answers";

/**
 * Longer than this is not a name, and the field stops before it gets there.
 *
 * It lives here rather than beside the action that trims to it: a `use server`
 * module can export nothing but async functions, and the field enforcing the
 * same number is what keeps the limit from being a surprise on submit.
 */
export const NAME_MAX = 40;

/**
 * Which of the interview's three screens someone belongs on.
 *
 * The service owns the step; this decides only where inside it. It is a
 * function of what has been answered rather than of where they navigated, so
 * a typed URL, a stale link and the back button all land in the same place —
 * and skipping ahead is not something the address bar can do.
 */
export function entryScreenFor(answers: EntryAnswers): OnboardingScreen {
  if (!answers.name) return "name";
  if (!answers.mode) return "mode";
  return "chat";
}
