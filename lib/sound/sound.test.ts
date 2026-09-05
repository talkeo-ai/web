import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The elements are cached for the life of the module, which is the behaviour
 * worth having and the reason every test here loads it fresh.
 */

class FakeAudio {
  static created: FakeAudio[] = [];

  preload = "";
  currentTime = 0;
  plays = 0;
  loads = 0;
  reject = false;

  constructor(readonly src: string) {
    FakeAudio.created.push(this);
  }

  play() {
    this.plays += 1;
    return this.reject ? Promise.reject(new Error("blocked")) : Promise.resolve();
  }

  load() {
    this.loads += 1;
  }
}

async function loadSound() {
  vi.resetModules();
  return import("@/lib/sound");
}

beforeEach(() => {
  FakeAudio.created = [];
  vi.stubGlobal("Audio", FakeAudio);
});

afterEach(() => vi.unstubAllGlobals());

describe("the interface's sounds", () => {
  it("builds one element per sound and keeps it", async () => {
    const { playSound } = await loadSound();

    playSound("select");
    playSound("select");
    playSound("select");

    expect(FakeAudio.created).toHaveLength(1);
    expect(FakeAudio.created[0]!.plays).toBe(3);
  });

  it("gives each sound its own file", async () => {
    const { playSound } = await loadSound();

    playSound("select");
    playSound("deselect");

    expect(FakeAudio.created.map((audio) => audio.src)).toEqual([
      "/sounds/select.wav",
      "/sounds/deselect.wav",
    ]);
  });

  it("rewinds, so a second press during the first is heard", async () => {
    const { playSound } = await loadSound();

    playSound("select");
    const element = FakeAudio.created[0]!;
    element.currentTime = 0.012;

    playSound("select");
    expect(element.currentTime).toBe(0);
  });

  it("swallows a refused play rather than breaking the press", async () => {
    const { playSound } = await loadSound();

    playSound("select");
    FakeAudio.created[0]!.reject = true;

    expect(() => playSound("select")).not.toThrow();
  });

  it("survives an environment with no audio at all", async () => {
    vi.stubGlobal("Audio", undefined);
    const { playSound, preloadSounds } = await loadSound();

    expect(() => playSound("select")).not.toThrow();
    expect(() => preloadSounds()).not.toThrow();
  });

  it("fetches every sound up front, so the first press is not silent", async () => {
    const { preloadSounds } = await loadSound();

    preloadSounds();

    expect(FakeAudio.created).toHaveLength(2);
    expect(FakeAudio.created.every((audio) => audio.loads === 1)).toBe(true);
  });
});
