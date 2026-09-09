import type { InterviewMessage } from "@/core/channel";
import type { InterviewCard, Mark, WordTiming } from "@/core/contracts";

/**
 * The conversation, folded out of the stream.
 *
 * A pure reducer and no React, because everything this decides is decidable
 * without a screen: what has been said, what is being said now, what the person
 * has said back, which cards are up and where the interview is. The screens read
 * it and draw; they do not work anything out.
 *
 * The one rule that shapes all of it: **the stream is the progressive disclosure
 * of one turn, and the last message is that turn.** So `turn_done` is always what
 * settles a turn — never the fragments, which may be amended, and which some
 * turns never send at all.
 */

export type Said = {
  id: string;
  from: "talkeo" | "you";
  text: string;
  /** Set on Talkeo's turns: what fires as the words are reached. */
  marks?: Mark[];
  timings?: WordTiming[];
};

/** The turn being said right now, as far as it has been said. */
export type LiveTurn = {
  id: string;
  stage: number;
  text: string;
  timings: WordTiming[];
};

export type Conversation = {
  /** Everything settled, oldest first. */
  thread: Said[];
  /** Null between turns. */
  turn: LiveTurn | null;
  /** What they are saying out loud: the part that will not change, and the guess. */
  transcript: { settled: string; guess: string };
  /** Latest state per card, by card name. */
  cards: Record<string, InterviewCard>;
  stage: number;
  stagesTotal: number;
  /** "speak" | "text", or empty until the entrance settles it. */
  mode: string;
  /**
   * Their name, as the service has it.
   *
   * From the flow rather than from what was typed: the service is what settles
   * how it is written, so a screen that kept its own copy would show `martin`
   * next to a card that says `Martin`.
   */
  name: string;
  /**
   * A turn is in flight.
   *
   * It is what closes the send gate: typing is never blocked, but there is
   * nothing to send a message TO until the turn being written is finished.
   */
  answering: boolean;
  listening: boolean;
  closed: boolean;
  /** Set when the service reported one. Nothing clears it but a new turn. */
  failed: string;
};

export const noConversation: Conversation = {
  thread: [],
  turn: null,
  transcript: { settled: "", guess: "" },
  cards: {},
  stage: 0,
  stagesTotal: 0,
  mode: "",
  name: "",
  answering: false,
  listening: false,
  closed: false,
  failed: "",
};

export type ConversationAction =
  | { kind: "message"; message: InterviewMessage }
  /** They typed something and it went out. Shown here rather than waited for. */
  | { kind: "said"; text: string }
  /** The microphone opened or closed. */
  | { kind: "listening"; on: boolean }
  /** Everything the service already knows, on a screen that just opened. */
  | {
      kind: "restored";
      thread: Said[];
      cards: InterviewCard[];
      stage: number;
      stagesTotal: number;
      closed: boolean;
      name: string;
    }
  /**
   * The name they just typed, before the service has echoed it back.
   *
   * The next screen greets them by it, and waiting a whole round trip to know
   * what to call somebody who just told you is the kind of pause that reads as
   * the product not listening.
   */
  | { kind: "named"; name: string };

/** What they have said out loud so far, settled and guessed together. */
export function heardSoFar(transcript: Conversation["transcript"]): string {
  return `${transcript.settled}${transcript.guess}`.replace(/\s+/g, " ").trim();
}

export function advance(
  state: Conversation,
  action: ConversationAction,
): Conversation {
  if (action.kind === "said") {
    return {
      ...state,
      thread: [
        ...state.thread,
        { id: `you-${state.thread.length}`, from: "you", text: action.text },
      ],
      transcript: { settled: "", guess: "" },
    };
  }

  if (action.kind === "listening") {
    return {
      ...state,
      listening: action.on,
      transcript: action.on ? { settled: "", guess: "" } : state.transcript,
    };
  }

  if (action.kind === "restored") {
    // ⚠ It arrives late — the cache is read asynchronously — and by then the
    // socket may already have said something. What is on screen is then ahead of
    // what was remembered, and applying this would wipe it. The cache is what a
    // screen STARTS from; once the conversation has spoken it is behind.
    if (state.thread.length > 0 || state.turn) return state;
    return {
      ...state,
      thread: action.thread,
      cards: Object.fromEntries(action.cards.map((card) => [card.card, card])),
      stage: action.stage,
      stagesTotal: action.stagesTotal,
      closed: action.closed,
      name: action.name,
    };
  }

  if (action.kind === "named") {
    return { ...state, name: action.name };
  }

  return fold(state, action.message);
}

function fold(state: Conversation, message: InterviewMessage): Conversation {
  switch (message.kind) {
    case "turn_started":
      return {
        ...state,
        // Whatever they said out loud becomes their bubble now: the turn that
        // is starting is the answer to it, so the two cannot be in flight at
        // once.
        ...commitSpoken(state),
        turn: {
          id: message.turn_id,
          stage: message.stage,
          text: "",
          timings: [],
        },
        stage: message.stage || state.stage,
        stagesTotal: message.stages_total || state.stagesTotal,
        mode: message.mode || state.mode,
        answering: true,
        failed: "",
      };

    case "text":
      if (state.turn?.id !== message.turn_id) return state;
      return {
        ...state,
        turn: { ...state.turn, text: state.turn.text + message.delta },
      };

    case "text_amended":
      // The whole text, never a diff — including the empty one, which means the
      // turn broke off and is being said again.
      if (state.turn?.id !== message.turn_id) return state;
      return { ...state, turn: { ...state.turn, text: message.text } };

    case "word_timings":
      if (state.turn?.id !== message.turn_id) return state;
      return {
        ...state,
        turn: {
          ...state.turn,
          timings: [...state.turn.timings, ...message.timings],
        },
      };

    case "event":
      return applyEvent(state, message.event);

    case "transcript":
      return {
        ...state,
        transcript: message.is_final
          ? {
              settled: `${state.transcript.settled}${message.delta}`,
              guess: "",
            }
          : { ...state.transcript, guess: message.delta },
      };

    case "nothing_heard":
      // Whose turn it is does not change: they were listened to and said
      // nothing, so the screen has to offer to listen again rather than wait
      // for a turn that is never generated.
      return {
        ...state,
        listening: false,
        answering: false,
        transcript: { settled: "", guess: "" },
        failed: message.reason,
      };

    case "turn_done": {
      const { turn, flow } = message.result;
      return {
        ...state,
        name: flow.display_name ?? state.name,
        thread: [
          ...state.thread,
          {
            id: turn.turn_id,
            from: "talkeo",
            // The result and not what was streamed. A guard may have cut the
            // fragments, and the entrance never sent any.
            text: turn.text,
            marks: turn.marks,
            timings: turn.word_timings,
          },
        ],
        turn: null,
        answering: false,
        closed: turn.closing,
      };
    }

    case "stream_error":
      return { ...state, answering: false, failed: message.error.message };

    // Audio is the player's, and a turn's worth of it has no business in a
    // render.
    case "audio":
    case "audio_format":
      return state;
  }
}

/** Their spoken words become their bubble, if there are any. */
function commitSpoken(state: Conversation): Partial<Conversation> {
  const said = heardSoFar(state.transcript);
  if (!said) return { transcript: { settled: "", guess: "" } };
  return {
    thread: [
      ...state.thread,
      { id: `you-${state.thread.length}`, from: "you", text: said },
    ],
    transcript: { settled: "", guess: "" },
  };
}

function applyEvent(
  state: Conversation,
  event: { kind: string; payload: Record<string, unknown> },
): Conversation {
  if (event.kind === "stage_entered") {
    const stage = event.payload.stage;
    return typeof stage === "number" ? { ...state, stage } : state;
  }
  if (event.kind !== "card_updated") return state;
  const { card, state: cardState, body } = event.payload;
  if (typeof card !== "string") return state;
  return {
    ...state,
    cards: {
      ...state.cards,
      [card]: {
        card,
        state: typeof cardState === "string" ? cardState : "draft",
        // Merged, not replaced: a card fills up over several turns and an event
        // carrying one changed line would otherwise blank the rest of it.
        body: {
          ...(state.cards[card]?.body ?? {}),
          ...((body ?? {}) as Record<string, unknown>),
        },
      },
    },
  };
}
