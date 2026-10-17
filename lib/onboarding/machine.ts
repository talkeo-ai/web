import type { CardEdit } from "@/core/contracts";

import {
  advance,
  cardsWithEntrance,
  noConversation,
  type Conversation,
  type ConversationAction,
} from "./conversation";
import {
  flush,
  nothingPending,
  queueEdit,
  type Outbox,
} from "./outbox";
import { surfaceFor, type Surface } from "./surfaces";

/**
 * The whole screen, as one reduction.
 *
 * The conversation and the outbox are separate machines with separate rules,
 * and they are folded together here with the surface they imply: a card
 * changing is a fact about the conversation AND a change to what is on screen.
 * Kept apart, that link has to live in an effect that watches one and sets the
 * other — which is a render behind, and is where this kind of screen rots.
 *
 * So the rule is: **a message goes in, and everything it implies comes out.**
 * Nothing above this works anything out for itself.
 */

export type Onboarding = {
  conversation: Conversation;
  outbox: Outbox;
  /** The surface for where the conversation is. Derived, never stored twice. */
  surface: Surface | null;
  /**
   * Whether the beat after the turn has passed.
   *
   * Talkeo says what the surface is for, and putting it up on the same frame as
   * the last word makes the two arrive as one event instead of a sentence and
   * then the thing it was about.
   */
  surfaceReady: boolean;
  /**
   * Every surface that has been up, where it first came up in the thread.
   *
   * A card is part of the conversation, not a panel over its foot: once shown
   * it stays under the message that asked for it, the way a message does,
   * whatever is said after. The one for where the conversation is keeps
   * following its card; the rest keep the last state they were in.
   */
  anchored: AnchoredSurface[];
  /**
   * The surface that was up when Talkeo's last message landed: the one that
   * message asks for. Only that one is owed a place if they answer in the
   * chat before it came up — a surface that took over since belongs to the
   * next message, not this one.
   */
  askedWith: string;
};

export type AnchoredSurface = {
  /** One per surface: its kind and its card. */
  key: string;
  /** The thread entry it sits under. Empty when it came up before any. */
  after: string;
  surface: Surface;
};

export const nothingYet: Onboarding = {
  conversation: noConversation,
  outbox: nothingPending,
  surface: null,
  surfaceReady: false,
  anchored: [],
  askedWith: "",
};

export function surfaceKey(surface: Surface): string {
  return `${surface.kind}:${surface.card ?? ""}`;
}

export type OnboardingAction =
  | ConversationAction
  /** They changed a line on a card. It waits for their next turn. */
  | { kind: "edited"; edit: CardEdit }
  /** Their turn went out; whatever was queued went with it. */
  | { kind: "sent" }
  /** The beat after a turn has passed. */
  | { kind: "surface ready" };

export function step(
  state: Onboarding,
  action: OnboardingAction,
): Onboarding {
  return settleConfirmed(reduce(state, action));
}

/**
 * A card that is confirmed reads as such where it sits, at once: the press is
 * the answer. Waiting for the next card to come up put "Confirmado" a whole
 * message behind the click (Joaquin, 17/oct).
 */
function settleConfirmed(state: Onboarding): Onboarding {
  const cards = cardsWithEntrance(state.conversation);
  let changed = false;
  const anchored = state.anchored.map((entry) => {
    const card = entry.surface.card ? cards[entry.surface.card] : undefined;
    if (entry.surface.state === "settled" || card?.state !== "confirmed") {
      return entry;
    }
    changed = true;
    return {
      ...entry,
      surface: {
        ...entry.surface,
        state: "settled" as const,
        body: { ...entry.surface.body, ...card.body },
      },
    };
  });
  return changed ? { ...state, anchored } : state;
}

function reduce(state: Onboarding, action: OnboardingAction): Onboarding {
  if (action.kind === "edited") {
    return { ...state, outbox: queueEdit(state.outbox, action.edit) };
  }
  if (action.kind === "sent") {
    return { ...state, outbox: flush(state.outbox).rest };
  }
  if (action.kind === "surface ready") {
    return anchor({ ...state, surfaceReady: true });
  }

  // Answering in the chat before the surface came up does not lose it: it
  // takes its place now, under the message that asked for it and before their
  // answer lands (Joaquin, 17/oct: "si o si").
  const owed =
    action.kind === "said" &&
    state.surface !== null &&
    surfaceKey(state.surface) === state.askedWith;
  const before = owed
    ? { ...state, anchored: anchor({ ...state, surfaceReady: true }).anchored }
    : state;

  const conversation = advance(before.conversation, action);
  const surface = surfaceOf(conversation);
  const landed =
    action.kind === "restored" ||
    (action.kind === "message" && action.message.kind === "turn_done");

  return anchor({
    ...before,
    conversation,
    surface,
    askedWith: landed && surface ? surfaceKey(surface) : before.askedWith,
    // A new turn takes the surface off until the beat after that turn has been
    // said, and it does so whether or not there is one up: a card can land
    // mid-turn and bring a surface with it, and that one waits like any other
    // rather than inheriting an open gate from before the turn.
    //
    // With nothing to put up it stays open, so nothing is ever holding a beat
    // for a surface that is not coming.
    //
    // A different surface taking over also shuts it. Answering the name on its
    // card settles it there and then, which hands the stage to the mode card
    // with the gate still open from the name — so the mode card came up at
    // once, under the first message, before Talkeo had even asked the
    // question it answers (Joaquin, 17/oct).
    surfaceReady:
      startedTalking(action) || isNewSurface(state.surface, surface)
        ? false
        : state.surfaceReady || surface === null,
  });
}

/**
 * Keeps the surface for where the conversation is in the thread.
 *
 * It takes its place the first time it is allowed up — the beat after the
 * turn that asked for it — under whatever was said last. From then on it only
 * follows its card: a new turn starting does not take it away, and neither
 * does the conversation moving on to the next one.
 */
function anchor(state: Onboarding): Onboarding {
  const { surface } = state;
  if (!surface) return state;
  const key = surfaceKey(surface);
  const at = state.anchored.findIndex((entry) => entry.key === key);

  if (at >= 0) {
    if (state.anchored[at]!.surface === surface) return state;
    const anchored = [...state.anchored];
    anchored[at] = { ...anchored[at]!, surface };
    return { ...state, anchored };
  }

  if (!state.surfaceReady) return state;
  const after = state.conversation.thread.at(-1)?.id ?? "";
  return {
    ...state,
    anchored: [
      ...settled(state.anchored, cardsWithEntrance(state.conversation)),
      { key, after, surface },
    ],
  };
}

/**
 * The cards the conversation has moved past, as records.
 *
 * Moving on is the answer: once the next card comes up, the one before it was
 * accepted, whether they pressed its confirm or answered in the chat. Left as
 * they were, a name given in the chat kept its empty field and its confirm
 * under a conversation that had already used it (Joaquin, 17/oct). Each takes
 * what was last understood for its card, since a card that was not the current
 * one stopped following it.
 */
function settled(
  anchored: AnchoredSurface[],
  cards: Record<string, { body: Record<string, unknown> }>,
): AnchoredSurface[] {
  return anchored.map((entry) => {
    if (entry.surface.state === "settled") return entry;
    const card = entry.surface.card ? cards[entry.surface.card] : undefined;
    return {
      ...entry,
      surface: {
        ...entry.surface,
        state: "settled",
        body: card?.body ?? entry.surface.body,
      },
    };
  });
}

/** What is on screen for where the conversation is. */
function surfaceOf(conversation: Conversation): Surface | null {
  return surfaceFor({
    stage: conversation.stage,
    cards: cardsWithEntrance(conversation),
  });
}

function isNewSurface(was: Surface | null, now: Surface | null): boolean {
  return now !== null && was !== null && surfaceKey(was) !== surfaceKey(now);
}

function startedTalking(action: OnboardingAction): boolean {
  return action.kind === "message" && action.message.kind === "turn_started";
}
