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
  const before =
    action.kind === "said"
      ? { ...state, anchored: anchor({ ...state, surfaceReady: true }).anchored }
      : state;

  const conversation = advance(before.conversation, action);
  const surface = surfaceOf(conversation);

  return anchor({
    ...before,
    conversation,
    surface,
    // A new turn takes the surface off until the beat after that turn has been
    // said, and it does so whether or not there is one up: a card can land
    // mid-turn and bring a surface with it, and that one waits like any other
    // rather than inheriting an open gate from before the turn.
    //
    // With nothing to put up it stays open, so nothing is ever holding a beat
    // for a surface that is not coming.
    surfaceReady: startedTalking(action)
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
  return { ...state, anchored: [...state.anchored, { key, after, surface }] };
}

/** What is on screen for where the conversation is. */
function surfaceOf(conversation: Conversation): Surface | null {
  return surfaceFor({
    stage: conversation.stage,
    cards: cardsWithEntrance(conversation),
  });
}

function startedTalking(action: OnboardingAction): boolean {
  return action.kind === "message" && action.message.kind === "turn_started";
}
