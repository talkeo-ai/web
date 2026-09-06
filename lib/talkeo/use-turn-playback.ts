"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import type { Mark, TalkeoTurn } from "@/core/contracts";
import { prefersReducedMotion, subscribeReducedMotion } from "@/lib/motion";
import { splitLines, splitWords, type TurnLine } from "@/lib/talkeo/lines";
import { buildTimeline } from "@/lib/talkeo/timeline";

/**
 * Plays one turn: reveals its lines and fires its marks as the voice reaches
 * the words they sit on.
 *
 * Where the clock comes from depends on what the turn carries, and all four
 * combinations happen for real:
 *
 * - audio and timings — the file drives, which is the shape once a voice ships;
 * - audio without timings — the file still drives, and the cadence is scaled to
 *   its measured length;
 * - timings without audio — a frame loop stands in for the voice;
 * - neither — the cadence carries it, which is every turn today.
 *
 * The file is also allowed to fail. A URL can 404, and playback can be refused
 * outright where no press has claimed it; both fall back to the loop rather
 * than leaving the turn frozen on its first line.
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
   * The element to speak through — `voiceElement()` in a screen, nothing in a
   * test. Passed rather than mounted: the same element carries every turn, so
   * that one press can unlock all of them.
   */
  voice?: HTMLAudioElement | null;
};

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
  { onMark, voice }: TurnPlaybackOptions = {},
): TurnPlayback {
  const text = turn?.text ?? "";
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

  // This effect drives the element it was handed — sets its source, starts it,
  // stops it. A media element is an external system and that is what an effect
  // is for; the rule is about values React owns, which a DOM node is not.
  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => {
    if (!turn || lines.length === 0) return;

    // Played in the order the voice meets them, not the order they arrived in.
    const marks = [...turn.marks].sort((a, b) => a.word_index - b.word_index);

    if (reduced) {
      // The reveal is what gets suppressed, never the marks: they are what the
      // turn points at, and dropping them loses meaning rather than movement.
      for (const mark of marks) onMarkRef.current?.(mark);
      return;
    }

    const words = splitWords(turn.text);
    const url = turn.audio?.url;
    const audio = url ? voice : null;
    let timeline = buildTimeline(words, turn.word_timings);
    let nextMark = 0;
    let nextLine = 0;
    let nextWord = 0;
    let frame = 0;
    let syntheticStart: number | null = null;
    let cancelled = false;

    const elapsedMs = () => {
      if (audio && !audio.paused && audio.currentTime > 0) {
        return audio.currentTime * 1000;
      }
      syntheticStart ??= performance.now();
      return performance.now() - syntheticStart;
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

    const onMetadata = () => {
      if (!audio || !Number.isFinite(audio.duration)) return;
      timeline = buildTimeline(words, turn.word_timings, audio.duration * 1000);
    };

    if (audio && url) {
      audio.addEventListener("loadedmetadata", onMetadata);
      audio.src = url;
      try {
        void audio.play()?.catch(() => {});
      } catch {
        // Nothing to hear; the loop still runs.
      }
    } else {
      // A turn with no audio must not inherit the previous one's playhead.
      voice?.pause();
    }

    frame = requestAnimationFrame(step);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      audio?.removeEventListener("loadedmetadata", onMetadata);
      audio?.pause();
    };
    // The turn's identity, the motion preference and the element are the whole
    // input; the lines and words are derived from the first.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnId, reduced, voice]);

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
