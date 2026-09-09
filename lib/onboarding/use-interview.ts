"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import type { InterviewChannel } from "@/core/channel";
import type { CardEdit, Mark, TalkeoTurn } from "@/core/contracts";
import {
  CAPTURE_MIME,
  CAPTURE_RATE,
  openMicrophone,
  type Microphone,
} from "@/lib/audio/microphone";
import { claimVoiceOnFirstGesture, voice } from "@/lib/audio/voice";
import { useTurnPlayback } from "@/lib/talkeo/use-turn-playback";

import type { OpenedInterview } from "@/app/[locale]/(app)/onboarding/actions";

import type { Said } from "./conversation";
import { flush } from "./outbox";
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
import type { View } from "./view-machine";

/**
 * The onboarding, wired.
 *
 * The only stateful piece of this screen, and deliberately the only one: what
 * the conversation means, which view is up and what is queued are all decided by
 * pure functions in `machine.ts`. Everything here is a connection to something
 * outside React — a socket, a microphone, an audio graph, a timer — which is
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
 * Focus shows one turn, so between turns it shows the one before — otherwise the
 * screen empties every time somebody answers, which reads as the conversation
 * having ended. It is also what a reload replays: §9 asks for the last turn to
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
  const [micMuted, setMicMuted] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [micTrouble, setMicTrouble] = useState("");

  const player = useMemo(() => voice(), []);
  const channel = useRef<InterviewChannel | null>(null);
  const microphone = useRef<Microphone | null>(null);
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
        // Audio never reaches the reducer: a turn's worth of it is hundreds of
        // kilobytes and it has nothing to do with what is on screen.
        if (message.kind === "audio_format") {
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
    if (mine && !opened.lastTurn) open.resume();

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

  // --- the microphone ------------------------------------------------------

  useEffect(() => {
    if (!inCall) return;
    let live = true;

    void (async () => {
      const opened = await openMicrophone();
      if (!live) return;
      if (!opened.ok) {
        setMicTrouble(opened.why);
        setInCall(false);
        return;
      }
      setMicTrouble("");
      microphone.current = opened.microphone;
      opened.microphone.onFrame((frame) => channel.current?.sendAudio(frame));
    })();

    return () => {
      live = false;
      microphone.current?.close();
      microphone.current = null;
    };
  }, [inCall]);

  useEffect(() => {
    microphone.current?.mute(micMuted);
  }, [micMuted]);

  /**
   * Listening opens when it is their turn and closes when it is not.
   *
   * There is no detector here: the service runs one and decides when the turn is
   * over, and the turn starting is how this finds out. `nothing_heard` puts it
   * back to not-listening, so this opens it again — which is the whole reason
   * that message exists.
   */
  const theirTurn = !conversation.answering && !conversation.closed;
  useEffect(() => {
    if (!inCall || !theirTurn || conversation.listening) return;
    channel.current?.listenStart({
      mime: CAPTURE_MIME,
      sampleRate: CAPTURE_RATE,
    });
    dispatch({ kind: "listening", on: true });
  }, [inCall, theirTurn, conversation.listening]);

  useEffect(() => {
    if (!conversation.answering || !conversation.listening) return;
    dispatch({ kind: "listening", on: false });
  }, [conversation.answering, conversation.listening]);

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

  /**
   * The surface appears once the turn it belongs to has been SAID.
   *
   * ⚠ The three conditions are three different things and it needs all of them.
   * `told` is that Talkeo has spoken at all — the surface is one of the ways to
   * answer its question, never a question of its own, so it cannot precede one.
   * `conversation.turn` is that the stream is over. `playback.done` is that the
   * VOICE is, which is the one that was missing: gated on the stream alone, the
   * surface went up 400 ms after the words arrived and sat there for the eight
   * seconds it took to say them.
   */
  useEffect(() => {
    if (!told || conversation.turn || !playback.done) return;
    if (surfaceReady || !surface) return;
    const waiting = setTimeout(
      () => dispatch({ kind: "surface ready" }),
      SURFACE_AFTER_MS,
    );
    return () => clearTimeout(waiting);
  }, [told, conversation.turn, playback.done, surfaceReady, surface]);

  // --- what the screens do -------------------------------------------------

  /** Their turn goes out, with anything they changed on a card in front of it. */
  const send = useCallback(
    (what: { text?: string; mode?: "speak" | "text"; edits: CardEdit[] }) => {
      const open = channel.current;
      if (!open) return;
      // The edits first and always: the model has to see what they changed
      // before it reads what they said about it.
      for (const edit of what.edits) open.cardEdited(edit);
      if (what.mode) open.choseMode(what.mode);
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
        send({ text: answer.value, edits: [] });
        return;
      }
      if (surface?.kind === "mode") {
        const mode = answer.value === "speak" ? "speak" : "text";
        if (mode === "speak") setInCall(true);
        send({ mode, edits: [] });
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
      dispatch({ kind: "view", event: { kind: "confirmed the surface" } });
      send({ edits: [...flush(outbox).edits, edit] });
    },
    [outbox, send, surface],
  );

  const touchSurface = useCallback(
    () => dispatch({ kind: "view", event: { kind: "touched the surface" } }),
    [],
  );

  const switchView = useCallback(
    (to: View) => dispatch({ kind: "view", event: { kind: "asked for", view: to } }),
    [],
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
    setInCall(false);
    setMicMuted(false);
    channel.current?.listenStop();
    dispatch({ kind: "listening", on: false });
  }, []);

  return {
    ...state,
    live,
    playback,
    inCall,
    micMuted,
    voiceOn,
    micTrouble,
    say,
    answerSurface,
    touchSurface,
    switchView,
    toggleVoice,
    toggleMic: () => setMicMuted((on) => !on),
    startCall: () => setInCall(true),
    hangUp,
  };
}
