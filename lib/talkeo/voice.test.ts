import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  resetVoice,
  unlockVoice,
  voiceElement,
  voiceUnlocked,
} from "@/lib/talkeo/voice";

class FakeAudio {
  static created: FakeAudio[] = [];

  src = "";
  preload = "";
  currentTime = 0;
  plays = 0;
  pauses = 0;
  refuse = false;

  constructor() {
    FakeAudio.created.push(this);
  }

  play() {
    this.plays += 1;
    return this.refuse
      ? Promise.reject(new Error("gesture required"))
      : Promise.resolve();
  }

  pause() {
    this.pauses += 1;
  }
}

beforeEach(() => {
  FakeAudio.created = [];
  resetVoice();
  vi.stubGlobal("Audio", FakeAudio);
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetVoice();
});

describe("the assistant's voice", () => {
  it("is one element, whoever asks for it", () => {
    expect(voiceElement()).toBe(voiceElement());
    expect(FakeAudio.created).toHaveLength(1);
  });

  it("claims playback with a silent clip, then gets out of the way", async () => {
    unlockVoice();
    await vi.waitFor(() => expect(voiceUnlocked()).toBe(true));

    const audio = FakeAudio.created[0]!;
    expect(audio.src.startsWith("data:audio/wav;base64,")).toBe(true);
    expect(audio.plays).toBe(1);
    expect(audio.pauses).toBe(1);
    expect(audio.currentTime).toBe(0);
  });

  it("claims it once, however many presses arrive", async () => {
    unlockVoice();
    await vi.waitFor(() => expect(voiceUnlocked()).toBe(true));

    unlockVoice();
    unlockVoice();

    expect(FakeAudio.created[0]!.plays).toBe(1);
  });

  it("stays unclaimed when refused, so the next press tries again", async () => {
    const audio = voiceElement() as unknown as FakeAudio;
    audio.refuse = true;

    unlockVoice();
    await vi.waitFor(() => expect(audio.plays).toBe(1));
    expect(voiceUnlocked()).toBe(false);

    audio.refuse = false;
    unlockVoice();
    await vi.waitFor(() => expect(voiceUnlocked()).toBe(true));
  });

  it("has nothing to claim where there is no audio at all", () => {
    vi.stubGlobal("Audio", undefined);
    resetVoice();

    expect(voiceElement()).toBeNull();
    expect(() => unlockVoice()).not.toThrow();
    expect(voiceUnlocked()).toBe(false);
  });
});
