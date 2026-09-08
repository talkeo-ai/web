"use client";

import { useEffect, useRef, useState } from "react";

import { useFireMark, useResetMarks } from "@/components/talkeo/mark-target";
import type { Step, TalkeoTurn } from "@/core/contracts";
import { useRouter } from "@/lib/i18n/navigation";
import { MIN_ANSWER_MS } from "@/lib/onboarding/motion";
import { useTurnPlayback } from "@/lib/talkeo/use-turn-playback";
import { unlockVoice, voiceElement } from "@/lib/talkeo/voice";

export type FetchTurn = () => Promise<{
  turn: TalkeoTurn;
  step: Step;
} | null>;

/** One line of the transcript, from either side. */
export type Said = {
  /**
   * The list's own identity for the row, never the turn's.
   *
   * The service repeats turns — after the interview the fixture answers with
   * the same `turn_id` every time it is spoken to — so keying off it puts two
   * children under one key and React drops one of them.
   */
  id: string;
  from: "talkeo" | "you";
  text: string;
};

export type Conversation = ReturnType<typeof useConversation>;

/**
 * Everything the conversation *is*, with nothing about how it looks.
 *
 * The screen used to hold this alongside the transcript, the scroll and two
 * composers, which made every one of those hard to read and impossible to test
 * on its own. Nothing here touches the DOM.
 *
 * Which turn comes next is the service's answer; this never scripts it.
 */
export function useConversation({
  current,
  next,
  onStep,
  onSend,
}: {
  /** The turn already on screen — what a reload comes back to. */
  current: FetchTurn;
  /** The assistant's next one. Asking for it spends a turn. */
  next: FetchTurn;
  /** Where the service says the run is, every time it says it. */
  onStep?: (step: Step) => void;
  /**
   * Called when a message goes out, for whoever wants the view taken back to
   * the foot. Passed in rather than reached for: the scroll lives in another
   * hook and neither has any business knowing how the other works.
   */
  onSend?: () => void;
}) {
  const router = useRouter();

  const [said, setSaid] = useState<Said[]>([]);
  const [turn, setTurn] = useState<TalkeoTurn | null>(null);
  const [pending, setPending] = useState(false);
  // Monotonic, so a message keeps its identity for the life of the list.
  // Keying off the length collides the moment two entries land at once.
  const saidCount = useRef(0);

  const fireMark = useFireMark();
  const resetMarks = useResetMarks();
  // One element for the whole run, so the press that opened it is what lets
  // every turn after be heard.
  const [voice] = useState(voiceElement);
  const playback = useTurnPlayback(turn, { onMark: fireMark, voice });

  // Read through a ref so a caller that rebuilds the callback every render
  // does not have to memoise it.
  const onSendRef = useRef(onSend);
  useEffect(() => {
    onSendRef.current = onSend;
  }, [onSend]);

  // Not a transition. React is free to throw a transition's render away and
  // redo it, and every inline `animation` in the list restarts when it does —
  // which is the whole transcript flickering on send.
  const load = async (fetch: FetchTurn, youSaid?: string) => {
    unlockVoice();
    setPending(true);
    resetMarks();

    // What was on screen joins the transcript, and stops being the live turn:
    // otherwise it is on the page twice while the next one is fetched.
    setSaid((previous) => [
      ...previous,
      ...(turn
        ? [
            {
              id: `talkeo-${(saidCount.current += 1)}`,
              from: "talkeo" as const,
              text: turn.text,
            },
          ]
        : []),
      ...(youSaid
        ? [
            {
              id: `you-${(saidCount.current += 1)}`,
              from: "you" as const,
              text: youSaid,
            },
          ]
        : []),
    ]);
    setTurn(null);

    const [result] = await Promise.all([fetch(), wait(MIN_ANSWER_MS)]);
    setPending(false);

    if (!result) {
      router.refresh();
      return;
    }
    setTurn(result.turn);
    onStep?.(result.step);
  };

  const send = (text: string) => {
    // Sending is the one thing that takes the view back, wherever they were
    // reading: you asked for the answer, so you get to see it arrive.
    onSendRef.current?.();

    // The run having moved on is not the end of the conversation any more:
    // the work opens beside it and this stays where it is.
    void load(next, text);
  };

  // Coming back resumes the turn that was on screen; it does not spend another
  // one. The ref is what keeps development's double mount to one call.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    setPending(true);
    void current().then((result) => {
      setPending(false);
      if (!result) {
        router.refresh();
        return;
      }
      setTurn(result.turn);
      onStep?.(result.step);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    said,
    turn,
    pending,
    send,
    ...playback,
  };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
