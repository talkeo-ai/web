"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import { openInterview, type InterviewChannel } from "@/core/channel";
import type { CardEdit } from "@/core/contracts";
import {
  CAPTURE_MIME,
  CAPTURE_RATE,
  openMicrophone,
  type Microphone,
} from "@/lib/audio/microphone";
import { claimVoiceOnFirstGesture, voice } from "@/lib/audio/voice";

import type { OpenedInterview } from "@/app/[locale]/(app)/onboarding/actions";

import type { Said } from "./conversation";
import { flush } from "./outbox";
import { nothingYet, step } from "./machine";
import { SURFACE_AFTER_MS } from "./motion";
import { forget, joinFrames, recall, remember } from "./persistence";
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

/**
 * The open channels, so a remount reuses one instead of opening a second.
 *
 * ⚠ React mounts an effect, tears it down and mounts it again in development.
 * A channel opened per mount means two sockets on the same session, and **both
 * ask for a turn** — so the greeting was produced for the first and the second
 * got the line after it, and the first thing anybody sees never appeared.
 * Closing is deferred by a tick for the same reason: the teardown and the second
 * mount happen in the same breath.
 */
const channels = new Map<string, { channel: InterviewChannel; users: number }>();

function shareInterview(sessionId: string): InterviewChannel {
  const open = channels.get(sessionId);
  if (open) {
    open.users += 1;
    return open.channel;
  }
  const channel = openInterview(sessionId);
  channels.set(sessionId, { channel, users: 1 });
  return channel;
}

/** The one turn the service hands back on a resume, as a thread of one. */
function lastSaid(opened: OpenedInterview): Said[] {
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

function releaseInterview(sessionId: string): void {
  const open = channels.get(sessionId);
  if (!open) return;
  open.users -= 1;
  setTimeout(() => {
    const still = channels.get(sessionId);
    if (!still || still.users > 0) return;
    channels.delete(sessionId);
    still.channel.close();
  }, 0);
}
export function useInterview(opened: OpenedInterview) {
  const [state, dispatch] = useReducer(step, nothingYet);
  const [inCall, setInCall] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [micTrouble, setMicTrouble] = useState("");

  const player = useMemo(() => voice(), []);
  const channel = useRef<InterviewChannel | null>(null);
  const microphone = useRef<Microphone | null>(null);
  // Whether this session has already been asked for a turn. It survives the
  // remount, which is the whole point.
  const asked = useRef(false);
  // The turn's frames as they arrive, so the last one can be put back after a
  // reload rather than paid for a second time.
  const frames = useRef<{ turn: string; rate: number; of: ArrayBuffer[] }>({
    turn: "",
    rate: 0,
    of: [],
  });

  const { conversation, surface, surfaceReady, outbox } = state;
  const { sessionId } = opened;

  // --- picking it back up --------------------------------------------------

  useEffect(() => {
    let live = true;
    void (async () => {
      const kept = await recall(sessionId);
      if (!live) return;
      dispatch({
        kind: "restored",
        // The service's side is authoritative and arrives with the session; the
        // thread is the browser's own copy, because the transcript never leaves
        // the service. With no copy — another browser, cleared storage — the
        // last turn is still known, and one turn is a better place to come back
        // to than a blank screen.
        thread: kept?.thread ?? lastSaid(opened),
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
    const open = shareInterview(sessionId);
    const first = !opened.lastTurn && !asked.current;
    asked.current = true;
    channel.current = open;
    let live = true;

    void (async () => {
      for await (const message of open.messages()) {
        if (!live) return;
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
          continue;
        }
        if (message.kind === "audio") {
          if (message.turn_id === frames.current.turn) {
            frames.current.of.push(message.data.slice(0));
          }
          player.push(message.turn_id, message.data);
          continue;
        }
        if (message.kind === "turn_done") {
          player.ends(message.result.turn.turn_id);
        }
        dispatch({ kind: "message", message });
      }
    })();

    // Nothing arrives until something is asked for: the service answers, it
    // never opens. This is also how the interview starts — and it is asked ONCE
    // per session, because asking twice walks the conversation forward twice.
    if (first) open.resume();

    return () => {
      live = false;
      releaseInterview(sessionId);
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
    const kept = frames.current;
    void remember({
      sessionId,
      thread: conversation.thread,
      lastTurn: said
        ? {
            text: said.text,
            audio: kept.turn === said.id ? joinFrames(kept.of) : null,
            sampleRate: kept.rate,
          }
        : null,
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

  // --- the beat before a surface appears -----------------------------------

  useEffect(() => {
    if (conversation.turn || surfaceReady || !surface) return;
    const waiting = setTimeout(
      () => dispatch({ kind: "surface ready" }),
      SURFACE_AFTER_MS,
    );
    return () => clearTimeout(waiting);
  }, [conversation.turn, surfaceReady, surface]);

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
