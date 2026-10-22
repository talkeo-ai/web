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

/** The card fields the service keeps as lists, and takes back a line each. */
const LIST_FIELDS = new Set(["work_on", "path", "does", "follows", "context"]);

/** An edit's value the way the service stores it (`cards._lines`). */
function asField(field: string, value: string): unknown {
  if (!LIST_FIELDS.has(field)) return value;
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * An edit of the objectives list, into the list. A plain field is the first
 * objective, `goals.<index>.<field>` any other — the form the screen sends.
 */
function foldGoal(body: Record<string, unknown>, edit: CardEdit) {
  const goals = Array.isArray(body.goals)
    ? (body.goals as Record<string, unknown>[])
    : [];
  const named = /^goals\.(\d+)\.(\w+)$/.exec(edit.field);
  const index = named ? Number(named[1]) : 0;
  const field = named ? named[2]! : edit.field;
  if (!field) return;
  goals[index] = { ...goals[index], [field]: asField(field, edit.value) };
  body.goals = goals;
}

/**
 * Where each session's recording had got to, kept past the channel.
 *
 * The service remembers a session and a channel is only a way in; this used to
 * forget it with the channel. Next keeps a page it navigated away from and
 * opens a new channel when it is shown, and the recording started over from the
 * greeting under a conversation that had already had it.
 */
type Progress = {
  next: number;
  mode: string;
  named: string | null;
  bodies: Record<string, Record<string, unknown>>;
  goalsShown: boolean;
  nameTaken: boolean;
};
const progress = new Map<string, Progress>();

export function openMockInterview(sessionId = ""): InterviewChannel {
  const was = progress.get(sessionId);
  const queue = new MessageQueue<InterviewMessage>();
  let next = was?.next ?? 0;
  let running = false;
  let listening = false;
  // Empty until they pick, exactly as the service reports it: the entrance is
  // what asks, so a channel that answered "text" before anybody had chosen would
  // have a screen setting itself up for a typist while the question was still on
  // it.
  let mode = was?.mode ?? "";
  let named: string | null = was?.named ?? null;
  // Every edit since the last turn, not only the last one: a card with two
  // lines changed sends two, and keeping one dropped the other.
  let pendingEdits: CardEdit[] = [];
  // What each card says by now, their edits folded in, so a later card that is
  // built from an earlier one — the objectives list from the first objective —
  // carries what they wrote, the way the service's does (`cards.on_screen`).
  const bodies: Record<string, Record<string, unknown>> = was?.bodies ?? {};
  let goalsShown = was?.goalsShown ?? false;
  let nameTaken = was?.nameTaken ?? false;
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
    const edits = pendingEdits;
    pendingEdits = [];
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

      // Their edit comes back as the card it produced, the way the service
      // answers one: applied, not merely acknowledged. Right as the turn
      // starts and before a word of it, as the service sends it: a yes on the
      // card is settled before any generation (`stage_service`).
      edits.forEach((edit, index) => {
        const body = (bodies[edit.card] ??= {});
        if (edit.card === "goals") foldGoal(body, edit);
        else if (edit.field) body[edit.field] = asField(edit.field, edit.value);
        queue.push({
          kind: "event",
          turn_id: turn.turn_id,
          event: {
            event_id: `ev_${turn.turn_id}_ed${index}`,
            kind: "card_updated",
            origin: "inferred",
            payload: {
              card: edit.card,
              state: edit.confirms ? "confirmed" : "edited_by_person",
              body: { ...body },
              by: "person",
            },
          },
        });
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

      for (const event of turn.events) {
        queue.push({ kind: "event", turn_id: turn.turn_id, event });
      }
      // The recording asks for the mode right after the name, so the name was
      // taken. The service says so with `confirm_card("entrance")`; the
      // recording has no event for it, and the name card waited forever.
      if (stage === 1 && named && !nameTaken) {
        nameTaken = true;
        queue.push({
          kind: "event",
          turn_id: turn.turn_id,
          event: {
            event_id: `ev_${turn.turn_id}_entrance`,
            kind: "card_updated",
            origin: "inferred",
            payload: {
              card: "entrance",
              state: "confirmed",
              body: { name: named },
              by: "talkeo",
            },
          },
        });
      }
      // The objectives list opens with the first objective in it, as the
      // service's does. The recording has no card for it, so it showed empty.
      if (stage >= 4 && !goalsShown) {
        goalsShown = true;
        const first = bodies.first_goal;
        bodies.goals = { goals: first ? [{ ...first }] : [] };
        queue.push({
          kind: "event",
          turn_id: turn.turn_id,
          event: {
            event_id: `ev_${turn.turn_id}_goals`,
            kind: "card_updated",
            origin: "inferred",
            payload: {
              card: "goals",
              state: "draft",
              body: { goals: first ? [{ ...first }] : [] },
              by: "talkeo",
            },
          },
        });
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
      pendingEdits.push(edit);
    },
    choseMode: (chosen) => {
      mode = chosen;
    },
    setVoice: () => {
      // Nothing to silence: this channel never speaks.
    },
    // No pretend speech: the recording cannot hear, so an open microphone
    // hears nothing until the screen gives up (Joaquin, 22/oct). It used to
    // answer with a scripted line, which read as the product making up what
    // they said.
    listenStart: () => {
      listening = true;
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
      progress.set(sessionId, { next, mode, named, bodies, goalsShown, nameTaken });
      closed = true;
      queue.finish();
    },
  };
}
