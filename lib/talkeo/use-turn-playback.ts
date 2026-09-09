"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import type { Mark, TalkeoTurn } from "@/core/contracts";
import { prefersReducedMotion, subscribeReducedMotion } from "@/lib/motion";
import { splitLines, splitWords, type TurnLine } from "@/lib/talkeo/lines";
import { stripVoiceTags } from "@/lib/talkeo/voice-tags";
import { buildTimeline } from "@/lib/talkeo/timeline";

/**
 * Plays one turn: reveals its lines and fires its marks as the voice reaches
 * the words they sit on.
 *
 * Where the clock comes from depends on what is speaking, and all of these
 * happen for real:
 *
 * - a voice and timings — the voice drives and the timings place the words,
 *   which is the shape when the service is speaking;
 * - a voice without timings — the voice still drives, at the measured cadence;
 * - timings without a voice — a frame loop stands in for it, which is a muted
 *   conversation and the fixture;
 * - neither — the cadence carries it on its own.
 *
 * The voice is also allowed to be absent or to stall. Every one of those cases
 * falls back to the loop rather than leaving the turn frozen on its first line:
 * a person reading a screen that stopped has no idea whether it broke.
 */

export type TurnPlayback = {
  lines: TurnLine[];
  /** How many sentences have been reached. Never goes backwards in a turn. */
  revealedLines: number;
  /** How many words the voice has reached. The unit a renderer that cares
   *  about visual lines needs, since a sentence is not one. */
  revealedWords: number;
  /**
   * Whether the whole turn is on screen.
   *
   * Not the same as `done`, and the difference is seconds: the text runs ahead
   * of the voice, so it finishes being written long before the voice finishes
   * saying it. This is what a composer should wait for — waiting for `done`
   * leaves the reply readable and the send button dead.
   */
  written: boolean;
  done: boolean;
};

export type TurnPlaybackOptions = {
  onMark?: (mark: Mark) => void;
  /**
   * Whatever is speaking the turn, asked only for where it has got to.
   *
   * A playhead rather than a media element: the service streams raw audio frames
   * and there is no file to load, so what speaks is an audio graph. All this
   * needs from it is a clock — and it has to be the clock of what has been
   * HEARD, not of what was sent, or the words run ahead of the voice whenever a
   * frame is late.
   *
   * Nothing here starts or stops it. Passed nothing, the turn plays on its own
   * synthetic clock, which is what a muted conversation and a test both get.
   */
  playhead?: Playhead | null;
};

/** Where the voice has got to. Implemented by `lib/audio/playback.ts`. */
export type Playhead = { currentTimeMs(): number | null };

/** How much faster the text arrives than the voice saying it. */
const TEXT_SPEED = 3.2;

type Progress = {
  turnId: string | null;
  lines: number;
  words: number;
  done: boolean;
};

const NOT_STARTED: Progress = {
  turnId: null,
  lines: 0,
  words: 0,
  done: false,
};

export function useTurnPlayback(
  turn: TalkeoTurn | null,
  { onMark, playhead }: TurnPlaybackOptions = {},
): TurnPlayback {
  // Stripped once, and everything downstream counts against the result. The
  // delivery marks are extra tokens: leave one in and every index after it
  // lands a word late, which puts the marks and the reveal out of step with
  // what is being said.
  const raw = turn?.text ?? "";
  const text = useMemo(() => stripVoiceTags(raw).text, [raw]);
  const lines = useMemo(() => splitLines(text), [text]);
  const turnId = turn?.turn_id ?? null;

  // Whether the visitor wants motion changes what this renders, not just how
  // fast, so it is read as a store rather than stored from an effect.
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    prefersReducedMotion,
    () => false,
  );

  const [progress, setProgress] = useState<Progress>(NOT_STARTED);

  // A new turn starts from nothing. Adjusted during render rather than in an
  // effect: an effect would paint the previous turn's tail for a frame first,
  // and this is the shape React documents for state derived from a prop.
  if (progress.turnId !== turnId) {
    setProgress({ turnId, lines: 0, words: 0, done: false });
  }

  // Read through a ref so a caller that rebuilds the callback every render
  // does not restart the turn.
  const onMarkRef = useRef(onMark);
  useEffect(() => {
    onMarkRef.current = onMark;
  }, [onMark]);

  // When this turn's clock started, kept across the loop being rebuilt.
  //
  // ⚠ A turn's text GROWS while it is being said — the service streams it in
  // fragments — so the loop has to be rebuilt over the longer text each time,
  // and a start time that lived inside it would go back to zero on every
  // fragment. The turn would then never get past its first line, at any speed.
  const clockStart = useRef<{ turn: string | null; at: number } | null>(null);

  // The frame loop that walks the turn. It drives nothing outside itself: what
  // is speaking is only ever ASKED where it has got to, which is why this no
  // longer has to reach into a DOM node to do its job.
  useEffect(() => {
    if (!turn || lines.length === 0) return;

    // A different turn starts its own clock. Here rather than during render,
    // where a ref may not be read.
    if (clockStart.current?.turn !== turnId) clockStart.current = null;

    // Played in the order the voice meets them, not the order they arrived in.
    const marks = [...turn.marks].sort((a, b) => a.word_index - b.word_index);

    if (reduced) {
      // The reveal is what gets suppressed, never the marks: they are what the
      // turn points at, and dropping them loses meaning rather than movement.
      for (const mark of marks) onMarkRef.current?.(mark);
      return;
    }

    const words = splitWords(text);
    const timeline = buildTimeline(words, turn.word_timings);
    let nextMark = 0;
    let nextLine = 0;
    let nextWord = 0;
    let frame = 0;
    let cancelled = false;

    const elapsedMs = () => {
      // The voice's own clock while there is one. It counts what has been
      // heard, so a late frame slows the words down with it rather than letting
      // them run on ahead.
      const heard = playhead?.currentTimeMs() ?? null;
      if (heard !== null && heard > 0) return heard;
      clockStart.current ??= { turn: turnId, at: performance.now() };
      return performance.now() - clockStart.current.at;
    };

    const step = () => {
      if (cancelled) return;
      const elapsed = elapsedMs();

      while (nextLine < lines.length) {
        if (timeline.startOf(lines[nextLine]!.firstWordIndex) > elapsed) break;
        nextLine += 1;
      }

      // The text runs ahead of the clock. Reading is faster than speech and a
      // model writes faster than either, so tying the words to the voice makes
      // a turn feel like it is being dictated to you.
      //
      // Marks and lines stay on the clock: they are what the voice points at,
      // and pointing early at something not yet said is worse than late.
      const written = elapsed * TEXT_SPEED;
      while (nextWord < words.length) {
        if (timeline.startOf(nextWord) > written) break;
        nextWord += 1;
      }

      while (nextMark < marks.length) {
        const mark = marks[nextMark]!;
        if (timeline.startOf(mark.word_index) > elapsed) break;
        onMarkRef.current?.(mark);
        nextMark += 1;
      }

      const finished = elapsed >= timeline.durationMs;
      if (finished) {
        // A mark on the very last word has to land even if the clock arrives
        // there in one step, so the tail is flushed rather than left behind.
        while (nextMark < marks.length) onMarkRef.current?.(marks[nextMark++]!);
        nextLine = lines.length;
        nextWord = words.length;
      }

      setProgress({ turnId, lines: nextLine, words: nextWord, done: finished });
      if (!finished) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
    // `text` is in here because a turn's text GROWS: the service streams it in
    // fragments, and the loop has to be rebuilt over the longer one to reveal
    // any of it. Progress survives that — the words are held in state and the
    // clock in a ref, both keyed to the turn rather than to the loop.
    //
    // The lines and the marks are derived from the text, and the words from the
    // lines, so listing them would restart it twice for one change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnId, text, reduced, playhead]);

  const empty = !turn || lines.length === 0;
  const settled = empty || reduced;
  const wordCount = lines.reduce((total, line) => total + line.words.length, 0);

  const revealedWords = settled ? wordCount : progress.words;

  return {
    lines,
    revealedLines: settled ? lines.length : progress.lines,
    revealedWords,
    written: settled || revealedWords >= wordCount,
    done: settled ? true : progress.done,
  };
}
