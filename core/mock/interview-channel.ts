"use client";

import { stripVoiceTags } from "@/lib/talkeo/voice-tags";

import type { InterviewChannel, InterviewMessage } from "../channel";
import type { CardEdit, TalkeoTurn } from "../contracts";
import { MessageQueue } from "../message-queue";

import { INTERVIEW_STAGES, TALKEO_INTERVIEW_TURNS } from "./fixtures";

/**
 * The interview from the recording, over the same channel shape as the service.
 *
 * The point of keeping it is that the port has two adapters and the
 * configuration picks one — but it only earns that if it behaves like the thing
 * it stands in for. Three things it reproduces on purpose, because each one is a
 * way a screen written against a friendlier fixture breaks against the service:
 *
 * - **Every turn streams its text, the entrance included.** Stage 1 is fixed
 *   copy that never reaches a model, and it used to arrive as `turn_started`
 *   then `turn_done` with nothing in between — so the screen was blank for the
 *   whole greeting and the words landed once it had finished being said. The
 *   service hands that copy over the same way it hands over a model's, and a
 *   copy turn and a model turn are now one shape rather than two.
 * - **Answering takes time.** The service is about a second to its first word,
 *   so this is too. A fixture that answers instantly is what makes a screen grow
 *   an artificial floor to stop the reply landing on top of the question.
 * - **The person's turn ends on its own.** Listening does not wait to be told to
 *   stop; the transcription decides, and `listen_stop` is the screen giving up.
 *
 * **It has no voice, and says so by never announcing an audio format.** The
 * voice is a provider, and silence pretending to be speech would only buy a
 * slower test. Playback falls back to its own clock, which is what that clock is
 * for.
 */

/** About what the service takes to its first word, measured 8/sep: ~1 s. */
const FIRST_FRAGMENT_MS = 900;
/** Fast enough to read as streaming, slow enough to see it stream. */
const FRAGMENT_MS = 25;
/** How long a spoken answer takes to come back as text. */
const TRANSCRIPT_MS = 240;

/**
 * What the person says out loud, per turn, when the microphone is the input.
 *
 * It is here rather than in `script.ts` because it is the other half of this
 * recording: these are the answers the recorded turns are answers to.
 */
/**
 * A name the way the service stores it: every word's first letter raised, and
 * nothing lowered.
 *
 * Mirrored here rather than left to the screen because it is the SERVICE's rule,
 * and a recording that handed back `martin` where the service hands back
 * `Martin` would have a screen tested against a spelling it will never see.
 */
function writtenName(raw: string): string {
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");
}

const SAID_ALOUD = [
  "Ana",
  "hablando",
  "quiero entender cuando hablan rápido en las reuniones",
  "sí, está bien",
  "seguir las reuniones con el cliente de punta a punta",
  "no, con eso está",
  "estudié en el colegio y después una app",
  "diseño de producto, y sigo The Futur",
  "dale",
];

export function openMockInterview(): InterviewChannel {
  const queue = new MessageQueue<InterviewMessage>();
  let next = 0;
  let running = false;
  let listening = false;
  // Empty until they pick, exactly as the service reports it: the entrance is
  // what asks, so a channel that answered "text" before anybody had chosen would
  // have a screen setting itself up for a typist while the question was still on
  // it.
  let mode = "";
  let named: string | null = null;
  let pendingEdit: CardEdit | null = null;
  let closed = false;

  const wait = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

  const stageOf = (turn: TalkeoTurn): number => {
    for (const event of turn.events) {
      if (event.kind !== "stage_entered") continue;
      const at = event.payload.stage;
      if (typeof at === "number") return at;
    }
    return 1;
  };

  const runTurn = async () => {
    if (running || closed) return;
    running = true;
    // Taken now rather than at the call site: it belongs to the turn that is
    // about to run, and it must not be carried into the one after it.
    const edit = pendingEdit;
    pendingEdit = null;
    try {
      const at = Math.min(next, TALKEO_INTERVIEW_TURNS.length - 1);
      const recorded = TALKEO_INTERVIEW_TURNS[at]!;
      next = Math.min(next + 1, TALKEO_INTERVIEW_TURNS.length);
      // What the screen renders is the text without the delivery marks, which is
      // what the service sends: the tags shape how a turn SOUNDS and never reach
      // a reader.
      const visible = stripVoiceTags(recorded.text).text;
      const turn: TalkeoTurn = { ...recorded, text: visible };
      const stage = stageOf(turn);

      queue.push({
        kind: "turn_started",
        turn_id: turn.turn_id,
        stage,
        stage_name: `stage_${stage}`,
        mode,
        stages_total: INTERVIEW_STAGES,
      });

      await wait(FIRST_FRAGMENT_MS);
      if (closed) return;

      for (const word of visible.split(/(?<=\s)/)) {
        if (closed) return;
        queue.push({ kind: "text", turn_id: turn.turn_id, delta: word });
        await wait(FRAGMENT_MS);
      }
      if (turn.word_timings.length) {
        queue.push({
          kind: "word_timings",
          turn_id: turn.turn_id,
          timings: turn.word_timings,
        });
      }

      // Their edit comes back as the card it produced, the way the service
      // answers one: applied, not merely acknowledged. Ahead of the turn's own
      // events, because it happened before the turn did.
      if (edit) {
        queue.push({
          kind: "event",
          turn_id: turn.turn_id,
          event: {
            event_id: `ev_${turn.turn_id}_ed`,
            kind: "card_updated",
            origin: "inferred",
            payload: {
              card: edit.card,
              state: edit.confirms ? "confirmed" : "edited_by_person",
              body: edit.field ? { [edit.field]: edit.value } : {},
              by: "person",
            },
          },
        });
      }
      for (const event of turn.events) {
        queue.push({ kind: "event", turn_id: turn.turn_id, event });
      }
      queue.push({
        kind: "turn_done",
        result: {
          schema_version: 1,
          turn,
          flow: {
            step: turn.closing ? "items" : "talkeo_interview",
            mode: "standard",
            mic_granted: mode === "speak",
            display_name: named,
          },
        },
      });
    } finally {
      running = false;
    }
  };

  /** Mock rule: what they said comes back a word at a time, then settles. */
  const transcribe = async () => {
    const said = SAID_ALOUD[Math.min(next, SAID_ALOUD.length - 1)]!;
    for (const word of said.split(" ")) {
      if (!listening || closed) return;
      queue.push({ kind: "transcript", delta: `${word} `, is_final: false });
      await wait(TRANSCRIPT_MS);
    }
    if (!listening || closed) return;
    queue.push({ kind: "transcript", delta: said, is_final: true });
    listening = false;
    void runTurn();
  };

  return {
    messages: () => queue.iterate(),
    resume: () => void runTurn(),
    // Mock rule: the recording answers whatever is said to it, with one
    // exception — the first thing anybody says is their name, and a screen that
    // never learned it would be tested against a conversation that never uses
    // it. It comes back written the way the service writes it.
    say: (text) => {
      named ??= writtenName(text);
      void runTurn();
    },
    cardEdited: (edit) => {
      pendingEdit = edit;
    },
    choseMode: (chosen) => {
      mode = chosen;
    },
    setVoice: () => {
      // Nothing to silence: this channel never speaks.
    },
    listenStart: () => {
      listening = true;
      void transcribe();
    },
    sendAudio: () => {
      // The recording is what the person said; the frames are not read.
    },
    listenStop: () => {
      if (!listening) return;
      listening = false;
      queue.push({ kind: "nothing_heard", reason: "" });
    },
    close: () => {
      closed = true;
      queue.finish();
    },
  };
}
