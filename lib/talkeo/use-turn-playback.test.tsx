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

/** Enough of an element to drive a clock and record what was asked of it. */
function fakeVoice() {
  const listeners = new Map<string, () => void>();
  return {
    src: "",
    preload: "",
    paused: true,
    currentTime: 0,
    duration: Number.NaN,
    plays: 0,
    pauses: 0,
    addEventListener(type: string, fn: () => void) {
      listeners.set(type, fn);
    },
    removeEventListener(type: string) {
      listeners.delete(type);
    },
    emit(type: string) {
      listeners.get(type)?.();
    },
    play() {
      this.paused = false;
      this.plays += 1;
      return Promise.resolve();
    },
    pause() {
      this.paused = true;
      this.pauses += 1;
    },
  };
}

describe("speaking through the shared element", () => {
  it("puts the turn's own file on it and plays", () => {
    const voice = fakeVoice();
    const turn = turnOf({ audio: { kind: "audio", url: "/mock-audio/x.mp3" } });

    renderHook(() =>
      useTurnPlayback(turn, { voice: voice as unknown as HTMLAudioElement }),
    );

    expect(voice.src).toBe("/mock-audio/x.mp3");
    expect(voice.plays).toBe(1);
  });

  it("takes the clock off the file, not off the frames", () => {
    const onMark = vi.fn();
    const voice = fakeVoice();
    const turn = turnOf({
      marks: [POINT_AT_VOICE],
      audio: { kind: "audio", url: "/mock-audio/x.mp3" },
    });

    renderHook(() =>
      useTurnPlayback(turn, {
        onMark,
        voice: voice as unknown as HTMLAudioElement,
      }),
    );

    // The frame clock has not moved at all; the file has.
    voice.currentTime = 5.3;
    tick();

    expect(onMark).toHaveBeenCalledTimes(1);
    expect(onMark).toHaveBeenCalledWith(POINT_AT_VOICE);
  });

  it("stretches a turn with no timings to the file's measured length", () => {
    const voice = fakeVoice();
    const { result } = renderHook(() =>
      useTurnPlayback(
        turnOf({
          word_timings: [],
          audio: { kind: "audio", url: "/mock-audio/x.mp3" },
        }),
        { voice: voice as unknown as HTMLAudioElement },
      ),
    );

    voice.duration = 30;
    voice.emit("loadedmetadata");

    // On cadence alone this turn runs about eight seconds, so without the
    // file's own length it would have been over long ago.
    voice.currentTime = 20;
    tick();
    expect(result.current.done).toBe(false);

    voice.currentTime = 30;
    tick();
    expect(result.current.done).toBe(true);
  });

  it("does not let a silent turn inherit the last one's playhead", () => {
    const voice = fakeVoice();
    voice.paused = false;
    voice.currentTime = 9;

    renderHook(() =>
      useTurnPlayback(turnOf({ audio: null }), {
        voice: voice as unknown as HTMLAudioElement,
      }),
    );

    expect(voice.pauses).toBeGreaterThan(0);
    expect(voice.src).toBe("");
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
