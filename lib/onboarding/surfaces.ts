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
  | "mode"
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
   * Two of the stages autosave — there is nothing for the person to validate, so
   * offering a yes would be asking for one nobody needs. They are edited and
   * that is all.
   */
  confirmable: boolean;
};

/** Which card each stage is filling, and whether its yes is asked for. */
const OF_STAGE: Record<
  number,
  { kind: SurfaceKind; card: string; confirmable: boolean } | undefined
> = {
  2: { kind: "scope", card: "scope_options", confirmable: true },
  3: { kind: "goal", card: "first_goal", confirmable: true },
  4: { kind: "goals", card: "goals", confirmable: true },
  5: { kind: "starting_point", card: "starting_point", confirmable: false },
  6: { kind: "about_you", card: "about_you", confirmable: false },
};

/**
 * The surface for where the conversation is.
 *
 * The entrance is the exception and it is two surfaces rather than one: it asks
 * their name and then how they want to answer, and both are answered before the
 * model is ever called. `named` is what tells them apart, because the name is
 * what the first one produces.
 */
export function surfaceFor({
  stage,
  cards,
  named,
  mode,
}: {
  stage: number;
  cards: Record<string, InterviewCard>;
  named: boolean;
  mode: string;
}): Surface | null {
  if (stage <= 1) {
    if (!named) {
      return { kind: "name", state: "asking", body: {}, confirmable: true };
    }
    if (!mode) {
      return { kind: "mode", state: "asking", body: {}, confirmable: true };
    }
    return null;
  }

  const of = OF_STAGE[stage];
  if (!of) return null;
  const card = cards[of.card];
  return {
    kind: of.kind,
    card: of.card,
    state: stateOf(card),
    body: card?.body ?? {},
    confirmable: of.confirmable,
  };
}

function stateOf(card: InterviewCard | undefined): SurfaceState {
  if (!card) return "asking";
  if (card.state === "confirmed") return "settled";
  // A draft is Talkeo's reading of what they said, and an edit of theirs is
  // their own correction of it. Both are something on screen to check, so both
  // read the same way.
  return "proposed";
}

/**
 * Whether a surface change is worth pulling somebody out of the chat for.
 *
 * A settled card is a record: it is finished, nobody has to do anything with it,
 * and putting it in front of a person mid-conversation would be interrupting
 * them to show them something they already agreed to.
 */
export function wantsAttention(surface: Surface | null): boolean {
  return surface !== null && surface.state !== "settled";
}
