import type { Step } from "@/core/contracts";
import type { EntryAnswers } from "@/lib/session/entry-answers";

/**
 * The steps that happen *beside* the conversation rather than instead of it.
 *
 * These are the ones the assistant can still be spoken to in, so leaving the
 * chat to do them would mean leaving Talkeo mid-sentence. The screen stays
 * `chat` and the work opens in the panel next to it.
 *
 * The rest — the verdict, the email, home — are somewhere the run arrives at,
 * and those are pages.
 */
const BESIDE_THE_CHAT: readonly Step[] = [
  "items",
  "verification",
  "plan",
  "lesson",
  "roleplay",
];

export function worksBesideChat(step: Step): boolean {
  return BESIDE_THE_CHAT.includes(step);
}

/** Whether `chat` is a legitimate place to be for a run on this step. */
export function chatHolds(step: Step): boolean {
  return step === "talkeo_interview" || worksBesideChat(step);
}

/**
 * Longer than this is not a name, and the field stops before it gets there.
 *
 * It lives here rather than beside the action that trims to it: a `use server`
 * module can export nothing but async functions, and the field enforcing the
 * same number is what keeps the limit from being a surprise on submit.
 */
export const NAME_MAX = 40;

/**
 * What the entrance still has to ask.
 *
 * It is no longer a question of which screen: the assistant asks both, in the
 * conversation, and the panel beside it holds the control for whichever one is
 * open. What this decides is which control that is.
 */
export function entryAsks(answers: EntryAnswers): "name" | "mode" | null {
  if (!answers.name) return "name";
  if (!answers.mode) return "mode";
  return null;
}
