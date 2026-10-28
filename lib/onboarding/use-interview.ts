"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import type { InterviewChannel } from "@/core/channel";
import type { CardEdit, Mark, TalkeoTurn } from "@/core/contracts";
import { openCall, type RoomCall } from "@/lib/audio/room-call";
import { claimVoiceOnFirstGesture, voice } from "@/lib/audio/voice";
import { useTurnPlayback } from "@/lib/talkeo/use-turn-playback";

import {
  startCall as askForRoom,
  type OpenedInterview,
} from "@/app/[locale]/(app)/onboarding/actions";
import type { CallNotice } from "@/components/onboarding/mic-notice";

import type { Said } from "./conversation";
import { answerName, flush } from "./outbox";
import { nothingYet, step } from "./machine";
import { SURFACE_AFTER_MS } from "./motion";
import {
  forget,
  joinFrames,
  recall,
  remember,
  type RememberedTurn,
} from "./persistence";
import { readInterview } from "./shared-channel";

/**
 * The onboarding, wired.
 *
 * The only stateful piece of this screen, and deliberately the only one: what
 * the conversation means, which surface is up and what is queued are all decided by
 * pure functions in `machine.ts`. Everything here is a connection to something
 * outside React — a socket, a call, an audio graph, a timer — which is
 * what an effect is actually for.
 */

/** The one turn the service hands back on a resume, as a thread of one. */
function threadOf(opened: OpenedInterview): Said[] {
  const said = opened.lastTurn;
  if (!said) return [];
  return [
    {
      id: said.turn_id,
      from: "talkeo",
      text: said.text,
      marks: said.marks,
      timings: said.word_timings,
    },
  ];
}

/**
 * The last thing Talkeo said, in the shape playback reads.
 *
 * It is what a reload replays: §9 asks for the last turn to
 * come back "as if it had just been produced", and coming back as the turn being
 * said is exactly that.
 */
function lastTold(thread: Said[]): TalkeoTurn | null {
  const said = [...thread].reverse().find((entry) => entry.from === "talkeo");
  if (!said) return null;
  return {
    turn_id: said.id,
    text: said.text,
    marks: (said.marks ?? []) as Mark[],
    word_timings: said.timings ?? [],
    audio: null,
    events: [],
    closing: false,
  };
}

export function useInterview(
  opened: OpenedInterview,
  // Handed each mark as the voice reaches its word. It comes from the component
  // tree rather than being built here: what a mark DOES is a screen's business,
  // and this file has no opinion about highlighting.
  { onMark }: { onMark?: (mark: Mark) => void } = {},
) {
  const [state, dispatch] = useReducer(step, nothingYet);
  const [inCall, setInCall] = useState(false);
  // The turn whose voice is coming, by id. Only turns with one wait for it.
  const [voiced, setVoiced] = useState("");
  const [micMuted, setMicMuted] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  /** Why the call did not start or ended, or null. Cleared by a call starting. */
  const [callNotice, setCallNotice] = useState<CallNotice | null>(null);
  /** The open call's microphone meter, for the glow. State so the glow re-renders. */
  const [micMeter, setMicMeter] = useState<AnalyserNode | null>(null);
  /** The Core says a room is attached to this conversation, from anywhere. */
  const [callLive, setCallLive] = useState(false);

  const player = useMemo(() => voice(), []);
  const channel = useRef<InterviewChannel | null>(null);
  /** This browser's call. Null when there is none, or while one is starting. */
  const call = useRef<RoomCall | null>(null);
  /** A press is being answered: the prompt, or the room. A second press waits. */
  const starting = useRef(false);
  // Whether the Core has said a room is attached for the call this screen holds.
  const roomSeen = useRef(false);
  /** Whether this screen is still here, for a permission prompt that outlives it. */
  const alive = useRef(true);
  // The turn's frames as they arrive, so the last one can be put back after a
  // reload rather than paid for a second time.
  const frames = useRef<{ turn: string; rate: number; of: ArrayBuffer[] }>({
    turn: "",
    rate: 0,
    of: [],
  });
  // What was already in the cache when this mount read it.
  //
  // ⚠ Without it, coming back WIPED the audio it had just come back for. The
  // write below runs whenever the thread changes, and restoring changes it — at
  // which point no socket message has arrived, so there are no frames for the
  // turn and it stored `null` over a good recording. The first re-entry played
  // (the buffer was already in hand); the second was silent, and nothing said
  // why.
  const held = useRef<{ turn: string; was: RememberedTurn } | null>(null);
  // The session this mount has already picked back up. Restoring is text AND
  // sound, and doing either of them twice is worse than not doing them.
  const restored = useRef("");

  const { conversation, surface, surfaceReady, outbox } = state;
  const { sessionId } = opened;
  // Whether Talkeo has said anything on this page. Read by the socket effect,
  // which must not re-run when it changes, so it is a ref kept in step.
  const spoken = useRef(false);
  useEffect(() => {
    spoken.current = conversation.thread.length > 0;
  }, [conversation.thread.length]);

  // --- picking it back up --------------------------------------------------

  useEffect(() => {
    let live = true;
    void (async () => {
      const kept = await recall(sessionId);
      if (!live) return;
      // ⚠ Once per session, and the check has to be HERE rather than only in
      // the reducer. The reducer refuses to restore over a conversation that
      // has already spoken; the replay three lines below does not go through
      // it, so a second run of this effect — a new `opened`, a locale change, a
      // hot reload — put the last turn's audio on top of whatever was playing.
      // That is the greeting somebody heard twice on 9/sep.
      if (restored.current === sessionId) return;
      restored.current = sessionId;
      const thread = kept?.thread ?? threadOf(opened);
      const told = lastTold(thread);
      if (kept?.lastTurn && told) {
        held.current = { turn: told.turn_id, was: kept.lastTurn };
      }
      dispatch({
        kind: "restored",
        // The service's side is authoritative and arrives with the session; the
        // thread is the browser's own copy, because the transcript never leaves
        // the service. With no copy — another browser, cleared storage — the
        // last turn is still known, and one turn is a better place to come back
        // to than a blank screen.
        thread,
        cards: opened.cards,
        stage: opened.stage,
        stagesTotal: opened.stagesTotal,
        closed: opened.closed,
        name: opened.name,
      });
      // The last turn is put back as if it had just been said — text now, sound
      // as soon as a context is claimed.
      const last = kept?.lastTurn;
      if (!last?.audio) return;
      await player.begins(`${sessionId}-again`, { sampleRate: last.sampleRate });
      player.push(`${sessionId}-again`, last.audio);
      player.ends(`${sessionId}-again`);
    })();
    return () => {
      live = false;
    };
  }, [sessionId, opened, player]);

  // --- being allowed to make a sound ---------------------------------------

  useEffect(() => claimVoiceOnFirstGesture(), []);

  // --- the socket ----------------------------------------------------------

  useEffect(() => {
    // ⚠ A listener, not a loop. The channel's queue has one consumer, and a
    // loop per mount meant a second one that split the messages with it — and
    // took one with it on its way out. That one is `turn_started`, and without
    // it the reducer drops every `text` after it: Talkeo spoke to a blank
    // screen. `shared-channel.ts` carries the whole story.
    const { channel: open, opened: mine, release } = readInterview(
      sessionId,
      (message) => {
        // Whether a room is attached is the call's, not the conversation's.
        if (message.kind === "call_state") {
          setCallLive(message.live);
          return;
        }
        // ⚠ Nothing is played from the socket during a call: the room carries
        // the voice, and none should arrive. If a frame does (a turn that began
        // in text just as the call opened), playing it would put two voices
        // over each other.
        if (
          call.current &&
          (message.kind === "audio_format" || message.kind === "audio")
        ) {
          return;
        }
        // Audio never reaches the reducer: a turn's worth of it is hundreds of
        // kilobytes and it has nothing to do with what is on screen.
        if (message.kind === "audio_format") {
          setVoiced(message.turn_id);
          frames.current = {
            turn: message.turn_id,
            rate: message.sample_rate,
            of: [],
          };
          void player.begins(message.turn_id, {
            sampleRate: message.sample_rate,
          });
          return;
        }
        if (message.kind === "audio") {
          if (message.turn_id === frames.current.turn) {
            frames.current.of.push(message.data.slice(0));
          }
          player.push(message.turn_id, message.data);
          return;
        }
        if (message.kind === "turn_done") {
          player.ends(message.result.turn.turn_id);
        }
        dispatch({ kind: "message", message });
      },
    );
    channel.current = open;

    // Nothing arrives until something is asked for: the service answers, it
    // never opens. This is also how the interview starts — and it is asked ONCE
    // per session, because asking twice walks the conversation forward twice.
    // The channel says whether this reader is the one that opened it, which is
    // the same fact a remount used to have to remember for itself.
    //
    // ⚠ Nor on a page that has already been spoken to. Next keeps a page it
    // navigated away from mounted and hidden, with its state, and runs its
    // effects again when it is shown: this one opened a fresh channel, asked
    // it to begin, and the greeting came in a second time (Joaquin, 22/oct).
    if (mine && !opened.lastTurn && !spoken.current) open.resume();

    return () => {
      release();
      channel.current = null;
    };
  }, [sessionId, player, opened.lastTurn]);

  // --- keeping what a reload will need -------------------------------------

  useEffect(() => {
    if (conversation.thread.length === 0) return;
    if (conversation.closed) {
      // Nothing left to come back to.
      void forget(sessionId);
      return;
    }
    const said = [...conversation.thread]
      .reverse()
      .find((entry) => entry.from === "talkeo");
    if (!said) return;
    const kept = frames.current;
    const mine = kept.turn === said.id;
    // Ours if we heard it arrive, otherwise whatever the cache already had for
    // the same turn. Never `null`: writing that is throwing away a recording
    // this run simply was not there for.
    const audio = mine
      ? { audio: joinFrames(kept.of), sampleRate: kept.rate }
      : held.current?.turn === said.id
        ? held.current.was
        : null;
    void remember({
      sessionId,
      thread: conversation.thread,
      lastTurn: {
        text: said.text,
        audio: audio?.audio ?? null,
        sampleRate: audio?.sampleRate ?? 0,
      },
    });
  }, [sessionId, conversation.thread, conversation.closed]);

  // --- the call -----------------------------------------------------------

  const dropCall = useCallback(() => {
    call.current?.close();
    call.current = null;
    roomSeen.current = false;
    setMicMeter(null);
    setInCall(false);
    setMicMuted(false);
  }, []);

  /**
   * Start a call. **From a click handler and nowhere else.**
   *
   * ⚠ This used to be an effect keyed on `inCall`: the press set the state, React
   * committed, and `getUserMedia` ran a render later with the gesture long gone.
   * WebKit refuses that without ever raising the prompt, and the refusal it
   * gives is `NotAllowedError` — the same one a person says no with. So somebody
   * who was never asked was told they had declined. The microphone is therefore
   * the first thing asked for, synchronously inside the press; the token comes
   * after it, because a denied prompt should not have cost a room.
   *
   * Returns whether the line is up.
   */
  const startCall = useCallback(async () => {
    if (call.current || starting.current) return false;
    starting.current = true;
    try {
      const opened = await openCall();
      if (!opened.ok) {
        if (alive.current) setCallNotice({ from: "mic", refusal: opened.refusal });
        return false;
      }
      const line = opened.call;
      // They left while the prompt was up. Closing it here is what stops the
      // recording indicator staying on for a call nobody is in.
      if (!alive.current) {
        line.close();
        return false;
      }

      // Mock mode has no room to join and `startCall` says so. The simplest
      // honest thing is to say that calls are not available here: a local-only
      // microphone would light a glow for a conversation nobody is hearing,
      // and the typed one carries on regardless.
      // ⚠ A Server Action that cannot reach the server REJECTS rather than
      // returning a failure, and by then the microphone is open: without the
      // catch the recording light stayed on for a call that never started.
      const room = await askForRoom().catch(() => null);
      if (!room?.ok) {
        line.close();
        if (alive.current) {
          setCallNotice({ from: "room", failure: "unavailable" });
        }
        return false;
      }
      // Gone while the token was on its way: no offer, or the room would hold
      // this session for a call nobody is on.
      if (!alive.current) {
        line.close();
        return false;
      }
      const joined = await line.join(room);
      if (!joined.ok) {
        // `join` has already let go of the microphone.
        if (alive.current) {
          setCallNotice({ from: "room", failure: joined.failure });
        }
        return false;
      }
      if (!alive.current) {
        line.close();
        return false;
      }

      call.current = line;
      // If the line is lost the call UI ends and they carry on typing: the
      // socket never depended on it.
      line.onLost(() => {
        if (call.current !== line) return;
        dropCall();
        setCallNotice({ from: "room", failure: "unavailable" });
      });
      setCallNotice(null);
      setMicMeter(line.micMeter);
      setInCall(true);
      return true;
    } finally {
      starting.current = false;
    }
  }, [dropCall]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      dropCall();
    };
  }, [dropCall]);

  useEffect(() => {
    call.current?.mute(micMuted);
  }, [micMuted]);

  // The speaker key during a call: the voice is the room's there, and the
  // Core's `set_voice` only reaches its own.
  useEffect(() => {
    call.current?.silence(!voiceOn);
  }, [voiceOn, inCall]);

  // The room went away while this screen is on the call: the Core closed it,
  // the call reached its length, or the room fell over. The call ends here too
  // rather than recording into nothing until the network notices. Only once
  // the Core has said this call was live: a `false` left over from the last
  // call must not end the next one.
  useEffect(() => {
    if (callLive) {
      if (call.current || starting.current) roomSeen.current = true;
      return;
    }
    if (roomSeen.current && call.current) dropCall();
  }, [callLive, dropCall]);

  // --- the turn being said, and the beat after it --------------------------

  /** The turn in flight, in the shape playback reads. Rebuilt as it grows. */
  const live: TalkeoTurn | null = useMemo(
    () =>
      conversation.turn
        ? {
            turn_id: conversation.turn.id,
            text: conversation.turn.text,
            marks: [],
            word_timings: conversation.turn.timings,
            audio: null,
            events: [],
            closing: false,
          }
        : null,
    [conversation.turn],
  );

  const told = useMemo(() => lastTold(conversation.thread), [conversation.thread]);
  const playback = useTurnPlayback(live ?? told, { onMark, playhead: player });
  // The turn said live on this visit, and so still writing itself out after it
  // has landed: the stream runs ahead of the reveal, and the finished turn used
  // to be drawn whole the moment it landed, the rest of its words at once
  // (Joaquin, 22/oct). One restored from before is drawn whole.
  const [lastLive, setLastLive] = useState("");
  if (conversation.turn && conversation.turn.id !== lastLive) {
    setLastLive(conversation.turn.id);
  }
  const revealing =
    !conversation.turn && told && told.turn_id === lastLive && !playback.written
      ? told.turn_id
      : null;
  // Whether the last turn has been said through: written out, and its voice
  // over if it had one. With no voice the playback still runs a clock as long
  // as the voice would have been, and the invitation to speak waited out that
  // silence after the words were on screen (Joaquin, 22/oct).
  const saidThrough =
    !conversation.turn && !revealing && (voiced !== told?.turn_id || playback.done);
  // Talkeo is talking from the first word of a turn until it has been said
  // through, and the turn has a voice if its audio format was announced. The
  // glow follows the voice when there is one and stands in for it when not.
  const talking = Boolean(conversation.turn || told) && !saidThrough;
  const talkingAloud =
    voiced !== "" && voiced === (conversation.turn?.id ?? told?.turn_id);

  /**
   * The surface appears as soon as the turn it belongs to has been WRITTEN.
   *
   * `told` is that Talkeo has spoken at all — the surface is one of the ways to
   * answer its question, never a question of its own, so it cannot precede one.
   * `conversation.turn` is that the stream is over. `revealing` is that its
   * words are still being written out: the stream runs ahead of the reveal.
   *
   * ⚠ The landed turn used to be drawn whole while this waited on the reveal's
   * clock, so the card came up a second or more after the message looked
   * finished (Joaquin, 22/oct). The landed turn now keeps writing itself out,
   * and the card follows its last word.
   *
   * Written, not spoken (Joaquin, 17/oct). It used to wait for the voice, and
   * the text runs ahead of the voice — so the card sat a few seconds behind a
   * message that was already there to read.
   */
  useEffect(() => {
    if (!told || conversation.turn || revealing) return;
    if (surfaceReady || !surface) return;
    const waiting = setTimeout(
      () => dispatch({ kind: "surface ready" }),
      SURFACE_AFTER_MS,
    );
    return () => clearTimeout(waiting);
  }, [told, conversation.turn, revealing, surfaceReady, surface]);

  // --- what the screens do -------------------------------------------------

  /** Their turn goes out, with anything they changed on a card in front of it. */
  const send = useCallback(
    (what: { text?: string; edits: CardEdit[] }) => {
      const open = channel.current;
      if (!open) return;
      // The edits first and always: the model has to see what they changed
      // before it reads what they said about it.
      for (const edit of what.edits) open.cardEdited(edit);
      // Cutting the voice off when they answer, rather than talking over them.
      player.stop();
      if (what.text) {
        open.say(what.text);
        dispatch({ kind: "said", text: what.text });
      } else {
        open.resume();
      }
      dispatch({ kind: "sent" });
    },
    [player],
  );

  const say = useCallback(
    (text: string) => send({ text, edits: flush(outbox).edits }),
    [outbox, send],
  );

  /** They answered on the surface. What that means depends on which one it is. */
  const answerSurface = useCallback(
    (answer: { field: string; value: string; confirms: boolean }) => {
      if (surface?.kind === "name") {
        dispatch({ kind: "named", name: answer.value });
        dispatch({ kind: "confirmed", card: "name" });
        send(answerName(answer.value, conversation.name));
        return;
      }
      if (!surface?.card) return;

      const edit: CardEdit = {
        card: surface.card,
        field: answer.field,
        value: answer.value,
        confirms: answer.confirms,
      };
      if (!answer.confirms) {
        // An edit waits for their next turn. It is never sent on its own, so the
        // model never receives one while it is still talking.
        dispatch({ kind: "edited", edit });
        return;
      }
      // Not settled here: it is confirmed when the Core says so, which it does
      // ahead of the turn it answers with (`stage_service`).
      send({ edits: [...flush(outbox).edits, edit] });
    },
    [outbox, send, surface, conversation.name],
  );

  /** Silences the synthesis, not only this end's speaker. */
  const toggleVoice = useCallback(() => {
    setVoiceOn((on) => {
      const next = !on;
      channel.current?.setVoice(next);
      if (!next) player.stop();
      return next;
    });
  }, [player]);

  const hangUp = useCallback(() => {
    // Released here rather than by an effect's cleanup: leaving a call is them
    // asking for the device back, and a render later is long enough to notice
    // the browser still saying it is recording.
    dropCall();
  }, [dropCall]);

  return {
    ...state,
    live,
    playback,
    revealing,
    saidThrough,
    inCall,
    micMuted,
    /** What the voice glow follows: who is talking, and how to hear them. */
    glow: {
      // Talkeo's whenever it talks with its voice on, call or no call: it
      // speaks either way. Theirs only in a call with the microphone live
      // (Joaquin, 22/oct).
      shown: talking ? inCall || voiceOn : inCall && !micMuted,
      talking,
      // In a call the voice is the room's, so it is always aloud and the meter
      // that follows it is the room's. The turn's own audio format is a text
      // mode thing that never arrives during a call.
      talkingAloud: inCall || talkingAloud,
      micMeter: micMuted ? null : micMeter,
      talkeoMeter: () =>
        inCall ? (call.current?.remoteMeter() ?? null) : player.meter(),
    },
    voiceOn,
    /** Why the call did not start or ended. Null when there is nothing to say. */
    callNotice,
    /** A room is attached and it is not this browser's. */
    callElsewhere: callLive && !inCall,
    say,
    answerSurface,
    toggleVoice,
    toggleMic: () => setMicMuted((on) => !on),
    /** Opens the microphone and the room. Call it from a click handler. */
    startCall,
    hangUp,
  };
}
