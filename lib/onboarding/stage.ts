import type { TalkeoTurn } from "@/core/contracts";

/**
 * Where the interview is, and the one place it is read.
 *
 * The step does not say. `flow.step` is `talkeo_interview` from the first
 * question to the last, because a step is where the run is and the interview is
 * one step however many stages it takes. What moves is carried by the turn, as
 * an event the assistant registered while speaking.
 *
 * Until that event exists the honest answer is "no idea", and the honest thing
 * to draw for it is a bar that fills with the turns that have been taken. Both
 * are here so that when the event lands there is a single line to change.
 */

/** How many stages the interview takes. */
export const INTERVIEW_STAGES = 7;

/**
 * The stage the turn says it entered, or null if it says nothing.
 *
 * The last one wins: a turn that crosses two stages has arrived at the second.
 */
export function stageOf(turn: TalkeoTurn | null): number | null {
  if (!turn) return null;

  for (let index = turn.events.length - 1; index >= 0; index -= 1) {
    const event = turn.events[index]!;
    if (event.kind !== "stage_entered") continue;

    const stage = event.payload.stage;
    if (typeof stage === "number" && stage >= 1) return stage;
  }

  return null;
}
