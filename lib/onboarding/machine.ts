import type { CardEdit } from "@/core/contracts";

import {
  advance,
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
import { surfaceFor, wantsAttention, type Surface } from "./surfaces";
import {
  nextView,
  startsInFocus,
  type ViewEvent,
  type ViewState,
} from "./view-machine";

/**
 * The whole screen, as one reduction.
 *
 * The conversation, the view and the outbox are separate machines with separate
 * rules, and they are folded together here because they are not independent: a
 * card changing is a fact about the conversation AND a reason for the view to
 * move. Kept apart, that link has to live in an effect that watches one and sets
 * the other — which is a render behind, and is where this kind of screen rots.
 *
 * So the rule is: **a message goes in, and everything it implies comes out.**
 * Nothing above this works anything out for itself.
 */

export type Onboarding = {
  conversation: Conversation;
  view: ViewState;
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
};

export const nothingYet: Onboarding = {
  conversation: noConversation,
  view: startsInFocus,
  outbox: nothingPending,
  surface: null,
  surfaceReady: false,
};

export type OnboardingAction =
  | ConversationAction
  | { kind: "view"; event: ViewEvent }
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
  if (action.kind === "view") {
    return { ...state, view: nextView(state.view, action.event) };
  }
  if (action.kind === "edited") {
    return { ...state, outbox: queueEdit(state.outbox, action.edit) };
  }
  if (action.kind === "sent") {
    return { ...state, outbox: flush(state.outbox).rest };
  }
  if (action.kind === "surface ready") {
    return { ...state, surfaceReady: true };
  }

  const conversation = advance(state.conversation, action);
  const surface = surfaceOf(conversation);

  let view = state.view;
  // The mode settles where somebody starts, once.
  if (conversation.mode !== state.conversation.mode) {
    view = nextView(view, { kind: "answers by", mode: conversation.mode });
  }
  // A surface that changed and still has something left to do is Talkeo asking
  // for them. A surface that merely stayed the same is not.
  if (movedOn(state.surface, surface) && wantsAttention(surface)) {
    view = nextView(view, { kind: "surface wants them" });
  }

  return {
    ...state,
    conversation,
    view,
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
  };
}

/** What is on screen for where the conversation is. */
function surfaceOf(conversation: Conversation): Surface | null {
  return surfaceFor({
    stage: conversation.stage,
    cards: conversation.cards,
    named: Boolean(conversation.name),
    mode: conversation.mode,
  });
}

/** Whether the surface is a different one, or the same one in a new state. */
function movedOn(before: Surface | null, after: Surface | null): boolean {
  if (!after) return false;
  if (!before) return true;
  return before.kind !== after.kind || before.state !== after.state;
}

function startedTalking(action: OnboardingAction): boolean {
  return action.kind === "message" && action.message.kind === "turn_started";
}
