import { describe, expect, it } from "vitest";

import type { WordTiming } from "@/core/contracts";
import { lineOfWord, splitLines, splitWords } from "@/lib/talkeo/lines";
import { buildTimeline } from "@/lib/talkeo/timeline";

/**
 * The turn the recorded fixtures open with, and the one worth pinning: it is
 * the only one anchored all the way to its last word, and both of its marks
 * sit in the final sentence.
 */
const OPENING =
  "Hola, soy Talkeo. Te voy a armar un ejercicio a tu medida, pero primero quiero conocerte un poco. ¿Preferís hablar o escribir?";

const OPENING_TIMINGS: WordTiming[] = [
  { word_index: 0, start_ms: 0, end_ms: 320 },
  { word_index: 1, start_ms: 320, end_ms: 520 },
  { word_index: 2, start_ms: 520, end_ms: 900 },
  { word_index: 19, start_ms: 5200, end_ms: 5600 },
  { word_index: 21, start_ms: 5900, end_ms: 6300 },
];

describe("splitting a turn", () => {
  it("numbers words the way the service does", () => {
    const words = splitWords(OPENING);

    expect(words).toHaveLength(22);
    // The two the opening marks point at: one per way of answering.
    expect(words[19]).toBe("hablar");
    expect(words[21]).toBe("escribir?");
  });

  it("cuts a line at every sentence, and nowhere else", () => {
    const lines = splitLines(OPENING);

    expect(lines.map((line) => line.firstWordIndex)).toEqual([0, 3, 18]);
    expect(lines[0]!.words.join(" ")).toBe("Hola, soy Talkeo.");
  });

  it("closes the last line even when the text does not", () => {
    const lines = splitLines("sin punto final");

    expect(lines).toHaveLength(1);
    expect(lines[0]!.words).toHaveLength(3);
  });

  it("keeps a closing bracket with the sentence it ends", () => {
    const lines = splitLines("Uno (dos.) Tres.");

    expect(lines.map((line) => line.firstWordIndex)).toEqual([0, 2]);
  });

  it("puts every mark of the opening turn in the sentence that asks", () => {
    const lines = splitLines(OPENING);

    expect(lineOfWord(lines, 19)).toBe(2);
    expect(lineOfWord(lines, 21)).toBe(2);
  });

  it("has no lines at all for an empty turn", () => {
    expect(splitLines("   ")).toEqual([]);
    expect(splitWords("")).toEqual([]);
  });
});

describe("the timeline", () => {
  const words = splitWords(OPENING);

  it("lands on the anchors it was given", () => {
    const timeline = buildTimeline(words, OPENING_TIMINGS);

    expect(timeline.startOf(0)).toBe(0);
    expect(timeline.startOf(1)).toBe(320);
    expect(timeline.startOf(2)).toBe(520);
    expect(timeline.startOf(19)).toBe(5200);
    expect(timeline.startOf(21)).toBe(5900);
    expect(timeline.durationMs).toBe(6300);
  });

  it("reads a word's end as the next word's start", () => {
    const timeline = buildTimeline(words, OPENING_TIMINGS);

    // Word 2 ends at 900 and word 3 carries no anchor of its own.
    expect(timeline.startOf(3)).toBe(900);
  });

  it("fills the sixteen unanchored words in between, in order", () => {
    const timeline = buildTimeline(words, OPENING_TIMINGS);
    const between = Array.from({ length: 17 }, (_, i) => timeline.startOf(i + 3));

    expect(between[0]).toBe(900);
    expect(between.at(-1)).toBeLessThanOrEqual(5200);
    for (let i = 1; i < between.length; i += 1) {
      expect(between[i]!).toBeGreaterThan(between[i - 1]!);
    }
  });

  it("gives a longer word more of the gap than a short one", () => {
    const timeline = buildTimeline(
      ["a", "bbbbbbbbbb", "c"],
      [
        { word_index: 0, start_ms: 0, end_ms: 0 },
        { word_index: 2, start_ms: 1000, end_ms: 1100 },
      ],
    );

    // The long word takes most of the thousand milliseconds between them.
    expect(timeline.startOf(1)).toBeLessThan(200);
  });

  it("never walks backwards, even if two anchors disagree", () => {
    const timeline = buildTimeline(
      ["uno", "dos", "tres"],
      [
        { word_index: 0, start_ms: 0, end_ms: 100 },
        { word_index: 2, start_ms: 50, end_ms: 60 },
      ],
    );

    expect(timeline.startOf(1)).toBeGreaterThanOrEqual(timeline.startOf(0));
    expect(timeline.startOf(2)).toBeGreaterThanOrEqual(timeline.startOf(1));
  });

  it("carries a turn with no timings at all on cadence", () => {
    const timeline = buildTimeline(words, []);

    expect(timeline.startOf(0)).toBe(0);
    expect(timeline.durationMs).toBeGreaterThan(0);
    for (let i = 1; i < words.length; i += 1) {
      expect(timeline.startOf(i)).toBeGreaterThan(timeline.startOf(i - 1));
    }
  });

  it("stretches that cadence to the file's own length when it knows it", () => {
    const timeline = buildTimeline(words, [], 10_000);

    expect(timeline.durationMs).toBe(10_000);
    expect(timeline.startOf(words.length - 1)).toBeLessThan(10_000);
    expect(timeline.startOf(words.length - 1)).toBeGreaterThan(5_000);
  });

  it("extrapolates past the last anchor at the pace it was going", () => {
    // A quarter of the words anchored, which is the shape of most of the
    // recorded turns.
    const timeline = buildTimeline(words, OPENING_TIMINGS.slice(0, 3));

    expect(timeline.startOf(21)).toBeGreaterThan(900);
    expect(timeline.durationMs).toBeGreaterThan(timeline.startOf(21));
  });

  it("ignores an anchor for a word the text does not have", () => {
    // One recorded turn stamps word 36 of a thirty-six word text. It is out of
    // range, and the turn still has to play.
    const timeline = buildTimeline(
      ["uno", "dos"],
      [
        { word_index: 0, start_ms: 0, end_ms: 400 },
        { word_index: 2, start_ms: 9_000, end_ms: 9_500 },
      ],
    );

    expect(timeline.durationMs).toBeLessThan(9_000);
    expect(Number.isFinite(timeline.startOf(1))).toBe(true);
  });

  it("answers for an index past the end rather than returning nothing", () => {
    const timeline = buildTimeline(words, OPENING_TIMINGS);

    expect(timeline.startOf(999)).toBe(timeline.durationMs);
    expect(timeline.startOf(-1)).toBe(0);
  });

  it("has nothing to say about a turn with no words", () => {
    const timeline = buildTimeline([], []);

    expect(timeline.durationMs).toBe(0);
    expect(timeline.startOf(0)).toBe(0);
  });
});
