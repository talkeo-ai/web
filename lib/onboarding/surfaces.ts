import type { InterviewCard } from "@/core/contracts";

/**
 * Which surface belongs on screen, and what it is asking for.
 *
 * **A surface is not a second question.** It is one of the two ways to answer the
 * one that was already asked — the other being to say it out loud. So a stage has
 * one question and two routes to an answer, and what would be repetitive is
 * asking again after it was answered here.
 *
 * Which one is up is decided from the stage and the state, never by the model:
 * the model writes into a card by calling a tool, and what that produces on
 * screen is this function's business. A surface that appeared because a turn
 * mentioned it would appear when the turn was worded differently.
 */

export type SurfaceKind =
  | "name"
  | "scope"
  | "goal"
  | "goals"
  | "starting_point"
  | "about_you";

/** Where a surface is in its life. */
export type SurfaceState =
  /** Empty. The primary action reads as answering, because it is. */
  | "asking"
  /** Talkeo filled it from what they said. Editable, and confirming settles it. */
  | "proposed"
  /**
   * Agreed to, and still open to change in a later stage: the first objective
   * goes on in the list of them, and the areas are rewritten whenever an
   * objective brings in a new one. It is not called confirmed until that stage
   * has closed (Joaquin, 17/oct: "al final, cuando realmente se confirma").
   */
  | "taken"
  /** Settled. A record, re-openable, with nothing to press. */
  | "settled";

export type Surface = {
  kind: SurfaceKind;
  state: SurfaceState;
  /** The card this surface edits, when it edits one. */
  card?: string;
  body: Record<string, unknown>;
  /**
   * Whether it has a confirm at all.
   *
   * Every card does now: each is edited by hand or by Talkeo, and confirmed by
   * hand or by Talkeo (Joaquin, 17/oct). ⚠ The Core still autosaves the
   * starting point and the interests and takes no confirm for them from the
   * screen; it is to follow. Kept as a flag for the surfaces with no card.
   */
  confirmable: boolean;
};

/**
 * The cards a later stage can still change, and the last stage that can.
 * The Core's: `write_scope` runs in the objectives stage, and the first
 * objective is the head of that stage's list (`cards.on_screen`).
 */
const OPEN_UNTIL: Record<string, number> = {
  scope_options: 4,
  first_goal: 4,
};

/** Whether this card's yes moves on rather than closes it. */
export function staysOpen(card: string | undefined): boolean {
  return card !== undefined && card in OPEN_UNTIL;
}

/** What an agreed card is by this stage: still open to change, or settled. */
export function agreed(card: string | undefined, stage: number): SurfaceState {
  const until = card ? OPEN_UNTIL[card] : undefined;
  return until !== undefined && stage <= until ? "taken" : "settled";
}

/**
 * What each stage puts on screen, in order, and whether its yes is asked for.
 *
 * ⚠ A LIST per stage, not one each, and that is the whole of what makes the
 * entrance ordinary. It used to be written out as a branch — "if there is no
 * name show the name one, else if there is no mode show that one" — which is a
 * different rule from the one every other stage follows, and it behaved
 * differently: a name that arrived from the CHAT made its surface disappear
 * instead of come up filled for them to confirm. There is one rule now, below.
 */
const OF_STAGE: Record<
  number,
  readonly { kind: SurfaceKind; card: string; confirmable: boolean }[] | undefined
> = {
  1: [
    { kind: "name", card: "name", confirmable: true },
  ],
  2: [{ kind: "scope", card: "scope_options", confirmable: true }],
  3: [{ kind: "goal", card: "first_goal", confirmable: true }],
  4: [{ kind: "goals", card: "goals", confirmable: true }],
  5: [{ kind: "starting_point", card: "starting_point", confirmable: true }],
  6: [{ kind: "about_you", card: "about_you", confirmable: true }],
};

/**
 * The surface for where the conversation is: **the first one this stage owns
 * that is not settled yet.**
 *
 * One rule, and it is a rule about state. Filling something from the chat does
 * not skip its surface — it brings it up `proposed`, with what Talkeo
 * understood in it, for them to confirm. That is the pattern of §3.4 for every
 * stage, and it is now the pattern for the entrance too.
 */
export function surfaceFor({
  stage,
  cards,
}: {
  stage: number;
  cards: Record<string, InterviewCard>;
}): Surface | null {
  const owned = OF_STAGE[stage] ?? [];
  let last: Surface | null = null;
  for (const spec of owned) {
    const card = cards[spec.card];
    const state = card?.state === "confirmed" ? agreed(spec.card, stage) : stateOf(card);
    last = {
      kind: spec.kind,
      card: spec.card,
      state,
      body: card?.body ?? {},
      confirmable: spec.confirmable,
    };
    if (state !== "settled" && state !== "taken") return last;
  }
  // All of them settled. The last one stays up as the record it now is, rather
  // than the screen emptying the moment somebody agrees to something.
  return last;
}

function stateOf(card: InterviewCard | undefined): SurfaceState {
  if (!card) return "asking";
  if (card.state === "confirmed") return "settled";
  // A draft is Talkeo's reading of what they said, and an edit of theirs is
  // their own correction of it. Both are something on screen to check, so both
  // read the same way.
  return "proposed";
}
