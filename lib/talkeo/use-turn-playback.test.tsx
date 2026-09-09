import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Mark, TalkeoTurn, WordTiming } from "@/core/contracts";
import { useTurnPlayback } from "@/lib/talkeo/use-turn-playback";

const OPENING =
  "Hola, soy Talkeo. Te voy a armar un ejercicio a tu medida, pero primero quiero conocerte un poco. ¿Preferís hablar o escribir?";

const OPENING_TIMINGS: WordTiming[] = [
  { word_index: 0, start_ms: 0, end_ms: 320 },
  { word_index: 1, start_ms: 320, end_ms: 520 },
  { word_index: 2, start_ms: 520, end_ms: 900 },
  { word_index: 19, start_ms: 5200, end_ms: 5600 },
  { word_index: 21, start_ms: 5900, end_ms: 6300 },
];

const POINT_AT_VOICE: Mark = {
  word_index: 19,
  action: "point",
  target: "control:voice",
};
const POINT_AT_TEXT: Mark = {
  word_index: 21,
  action: "point",
  target: "control:text",
};

function turnOf(overrides: Partial<TalkeoTurn> = {}): TalkeoTurn {
  return {
    turn_id: "tt_test",
    text: OPENING,
    marks: [],
    word_timings: OPENING_TIMINGS,
    audio: null,
    events: [],
    closing: false,
    ...overrides,
  };
}

// jsdom has no media queries, and this hook renders differently under one.
function stubMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (media: string) => ({
    media,
    matches: reduce,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

let now = 0;
let frames: FrameRequestCallback[] = [];

/** Runs the frames that are pending, at a clock the test controls. */
function tick(ms = 0) {
  now += ms;
  const pending = frames;
  frames = [];
  act(() => {
    for (const frame of pending) frame(now);
  });
}

beforeEach(() => {
  now = 0;
  frames = [];
  stubMotion(false);
  vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => {
    frames.push(frame);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.spyOn(performance, "now").mockImplementation(() => now);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("playing a turn", () => {
  it("reveals a line at a time rather than all at once", () => {
    const { result } = renderHook(() => useTurnPlayback(turnOf()));

    expect(result.current.lines).toHaveLength(3);
    expect(result.current.revealedLines).toBe(0);

    tick();
    expect(result.current.revealedLines).toBe(1);

    tick(1_000);
    expect(result.current.revealedLines).toBe(2);

    tick(10_000);
    expect(result.current.revealedLines).toBe(3);
    expect(result.current.done).toBe(true);
  });

  it("fires each mark once, in the order the voice meets them", () => {
    const onMark = vi.fn();
    // Handed over back to front, to prove the order comes from the words.
    const turn = turnOf({ marks: [POINT_AT_TEXT, POINT_AT_VOICE] });

    renderHook(() => useTurnPlayback(turn, { onMark }));

    tick();
    expect(onMark).not.toHaveBeenCalled();

    tick(5_300);
    expect(onMark).toHaveBeenCalledTimes(1);
    expect(onMark.mock.calls[0]![0]).toBe(POINT_AT_VOICE);

    tick(1_000);
    expect(onMark).toHaveBeenCalledTimes(2);
    expect(onMark.mock.calls[1]![0]).toBe(POINT_AT_TEXT);

    // Frames keep coming and nothing fires twice.
    tick(5_000);
    tick(5_000);
    expect(onMark).toHaveBeenCalledTimes(2);
  });

  it("lands a mark the service put past the last word", () => {
    const onMark = vi.fn();
    const stray: Mark = {
      word_index: 99,
      action: "flip",
      target: "card:predicted_gaps",
    };

    renderHook(() => useTurnPlayback(turnOf({ marks: [stray] }), { onMark }));

    tick();
    tick(20_000);

    expect(onMark).toHaveBeenCalledTimes(1);
    expect(onMark).toHaveBeenCalledWith(stray);
  });

  it("starts a new turn from nothing", () => {
    const { result, rerender } = renderHook(
      ({ turn }: { turn: TalkeoTurn }) => useTurnPlayback(turn),
      { initialProps: { turn: turnOf() } },
    );

    tick();
    tick(10_000);
    expect(result.current.revealedLines).toBe(3);

    rerender({ turn: turnOf({ turn_id: "tt_next", text: "Otra cosa." }) });
    expect(result.current.revealedLines).toBe(0);
    expect(result.current.done).toBe(false);
  });

  it("carries a turn that has no timings at all", () => {
    const { result } = renderHook(() =>
      useTurnPlayback(turnOf({ word_timings: [] })),
    );

    tick();
    expect(result.current.revealedLines).toBe(1);
    expect(result.current.done).toBe(false);

    tick(60_000);
    expect(result.current.revealedLines).toBe(3);
    expect(result.current.done).toBe(true);
  });

  it("says an empty turn is over rather than waiting on it", () => {
    const { result } = renderHook(() => useTurnPlayback(null));

    expect(result.current.lines).toEqual([]);
    expect(result.current.done).toBe(true);
  });
});

/** Where the voice says it has got to. Nothing else about it is this hook's. */
function fakePlayhead() {
  return {
    ms: null as number | null,
    currentTimeMs(): number | null {
      return this.ms;
    },
  };
}

describe("a turn whose text is still arriving", () => {
  it("keeps its place while the text grows under it", () => {
    // ⚠ The service streams a turn in fragments, so the text this is revealing
    // gets longer several times a second. The loop has to be rebuilt over each
    // longer version — and a clock that started inside it would go back to zero
    // every time, leaving the turn stuck on its first line for ever.
    const { result, rerender } = renderHook(
      ({ text }: { text: string }) => useTurnPlayback(turnOf({ text })),
      { initialProps: { text: "Hola, qué bueno" } },
    );

    // The clock starts on the first frame, so it takes one to be running.
    tick();
    tick(1200);
    const revealed = result.current.revealedWords;
    expect(revealed).toBeGreaterThan(1);

    rerender({ text: "Hola, qué bueno tenerte acá. Empecemos." });
    tick(0);
    expect(result.current.revealedWords).toBeGreaterThanOrEqual(revealed);

    tick(2000);
    expect(result.current.revealedWords).toBeGreaterThan(revealed);
  });

  it("starts over for a different turn", () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useTurnPlayback(turnOf({ turn_id: id })),
      { initialProps: { id: "tt_1" } },
    );

    tick();
    tick(4000);
    const reached = result.current.revealedWords;
    expect(reached).toBeGreaterThan(1);

    // Back to the beginning rather than carrying on where the last one got to.
    // The first word is at zero on any clock, so one is the floor, not none.
    rerender({ id: "tt_2" });
    tick(0);
    expect(result.current.revealedWords).toBeLessThan(reached);
  });
});

describe("following the voice", () => {
  it("takes the clock off the voice, not off the frames", () => {
    const onMark = vi.fn();
    const playhead = fakePlayhead();

    renderHook(() =>
      useTurnPlayback(turnOf({ marks: [POINT_AT_VOICE] }), {
        onMark,
        playhead,
      }),
    );

    // The frame clock has not moved at all; the voice has.
    playhead.ms = 5300;
    tick();

    expect(onMark).toHaveBeenCalledTimes(1);
    expect(onMark).toHaveBeenCalledWith(POINT_AT_VOICE);
  });

  it("does not run on ahead when the voice stalls", () => {
    // The clock counts what has been HEARD. A frame that arrives late holds the
    // words with it, which is the whole reason it is that clock and not a timer.
    const playhead = fakePlayhead();
    const { result } = renderHook(() =>
      useTurnPlayback(turnOf({}), { playhead }),
    );

    playhead.ms = 200;
    tick();
    const early = result.current.revealedWords;

    tick(4000);
    expect(result.current.revealedWords).toBe(early);
  });

  it("runs on its own clock when nothing is speaking", () => {
    // A muted conversation, and the fixture. Silence must not freeze the turn on
    // its first line: a reader has no way to tell that from a screen that broke.
    const playhead = fakePlayhead();
    const { result } = renderHook(() =>
      useTurnPlayback(turnOf({}), { playhead }),
    );

    tick(4000);
    expect(result.current.revealedWords).toBeGreaterThan(0);
  });
});

describe("with motion turned down", () => {
  beforeEach(() => stubMotion(true));

  it("shows the turn whole, without a frame", () => {
    const { result } = renderHook(() => useTurnPlayback(turnOf()));

    expect(result.current.revealedLines).toBe(3);
    expect(result.current.done).toBe(true);
    expect(frames).toHaveLength(0);
  });

  it("still fires every mark, once and in order", () => {
    const onMark = vi.fn();
    renderHook(() =>
      useTurnPlayback(turnOf({ marks: [POINT_AT_TEXT, POINT_AT_VOICE] }), { onMark }),
    );

    expect(onMark).toHaveBeenCalledTimes(2);
    expect(onMark.mock.calls[0]![0]).toBe(POINT_AT_VOICE);
    expect(onMark.mock.calls[1]![0]).toBe(POINT_AT_TEXT);
  });
});
