import { afterEach, describe, expect, it, vi } from "vitest";

import {
  GATHER_CAP_MS,
  openCall,
  RECOVER_MS,
  STUN_URL,
  worthAskingAgain,
  type MicRefusal,
  type RoomCall,
} from "./room-call";

/**
 * What the microphone says when it does not open.
 *
 * ⚠ There was no test file here at all, and the code it covers handed the screen
 * `error.message` — whatever English sentence the browser happened to carry — for
 * every cause it did not recognise. The screen threw it away and said one thing
 * for all of them, including telling somebody to press again when their browser
 * had decided never to ask them again.
 *
 * So the assertion in every case below is the same: the REASON, because that is
 * what decides what the person is offered.
 */

function failing(name: string) {
  return vi.fn().mockRejectedValue(
    Object.assign(new Error(name), { name }),
  );
}

/** The browser's own answer about the permission, or its absence. */
function permissions(state: PermissionState | "absent") {
  if (state === "absent") {
    Object.assign(navigator, { permissions: undefined });
    return;
  }
  Object.assign(navigator, {
    permissions: { query: vi.fn().mockResolvedValue({ state }) },
  });
}

function media(getUserMedia: unknown) {
  Object.assign(navigator, { mediaDevices: { getUserMedia } });
}

async function refusalOf(): Promise<MicRefusal | "opened"> {
  const result = await openCall();
  return result.ok ? "opened" : result.refusal;
}

afterEach(() => {
  Object.assign(navigator, { mediaDevices: undefined, permissions: undefined });
  vi.restoreAllMocks();
});

describe("why the microphone did not open", () => {
  it("is a refusal they can retry when they said no once", async () => {
    media(failing("NotAllowedError"));
    permissions("prompt");

    expect(await refusalOf()).toBe("denied");
    expect(worthAskingAgain("denied")).toBe(true);
  });

  it("is a block they cannot retry when the browser has already decided", async () => {
    // Same DOMException, opposite advice. Chrome refuses instantly and never
    // raises a prompt again, so "press again" is a sentence that wastes their
    // time — which is what they used to get.
    media(failing("NotAllowedError"));
    permissions("denied");

    expect(await refusalOf()).toBe("blocked");
    expect(worthAskingAgain("blocked")).toBe(false);
  });

  it("falls on the retryable side when the browser will not say", async () => {
    // Firefox and Safari do not answer for the microphone. Not knowing must not
    // become "your browser is blocking you", which sends somebody into settings
    // for a prompt they merely dismissed.
    media(failing("NotAllowedError"));
    permissions("absent");

    expect(await refusalOf()).toBe("denied");
  });

  it("tells a missing device from a refused one", async () => {
    media(failing("NotFoundError"));
    expect(await refusalOf()).toBe("missing");
    expect(worthAskingAgain("missing")).toBe(false);
  });

  it("tells a device somebody else is holding", async () => {
    // Common on Windows when another app has the microphone. Pressing again is
    // worth it, because closing the other app is a thing they can do.
    media(failing("NotReadableError"));
    expect(await refusalOf()).toBe("busy");
    expect(worthAskingAgain("busy")).toBe(true);
  });

  it("says so when the API is not even there", async () => {
    // http, not https. `navigator.mediaDevices` is undefined and the old code
    // reported "no microphone on this device", which is a different problem
    // with a different fix.
    Object.assign(navigator, { mediaDevices: undefined });
    expect(await refusalOf()).toBe("insecure");
    expect(worthAskingAgain("insecure")).toBe(false);
  });

  it("does not blame them for something of ours", async () => {
    media(failing("SomethingNobodyHasHeardOf"));
    expect(await refusalOf()).toBe("unknown");
  });
});


// --- the line itself -------------------------------------------------------

/** The parts of a peer connection the call touches, with the events by hand. */
class FakePeer {
  static last: FakePeer;
  static startsAs: RTCIceGatheringState = "complete";
  iceGatheringState: RTCIceGatheringState = FakePeer.startsAs;
  connectionState: RTCPeerConnectionState = "new";
  localDescription: { type: string; sdp: string } | null = null;
  remote: { type: string; sdp: string } | null = null;
  added: unknown[] = [];
  closed = false;
  private listeners = new Map<string, Set<() => void>>();
  private trackListeners: ((event: unknown) => void)[] = [];

  constructor(readonly config?: RTCConfiguration) {
    FakePeer.last = this;
  }
  addTrack(track: unknown) {
    this.added.push(track);
  }
  addEventListener(name: string, handler: (event: never) => void) {
    if (name === "track") {
      this.trackListeners.push(handler as (event: unknown) => void);
      return;
    }
    const set = this.listeners.get(name) ?? new Set();
    set.add(handler as () => void);
    this.listeners.set(name, set);
  }
  removeEventListener(name: string, handler: () => void) {
    this.listeners.get(name)?.delete(handler);
  }
  async createOffer() {
    return { type: "offer", sdp: "v=0 offer" };
  }
  async setLocalDescription(description: { type: string; sdp: string }) {
    this.localDescription = description;
  }
  async setRemoteDescription(description: { type: string; sdp: string }) {
    this.remote = description;
  }
  close() {
    this.closed = true;
  }
  /** Test-side: the browser changing its mind about the connection. */
  becomes(state: RTCPeerConnectionState) {
    this.connectionState = state;
    this.listeners.get("connectionstatechange")?.forEach((fn) => fn());
  }
  gathering(state: RTCIceGatheringState) {
    this.iceGatheringState = state;
    this.listeners.get("icegatheringstatechange")?.forEach((fn) => fn());
  }
  hears(stream: unknown) {
    this.trackListeners.forEach((fn) => fn({ streams: [stream], track: {} }));
  }
}

function microphone() {
  const track = { enabled: true, stop: vi.fn() };
  const stream = {
    getAudioTracks: () => [track],
    getTracks: () => [track],
  };
  media(vi.fn().mockResolvedValue(stream));
  return track;
}

function answering(status: number, body: unknown = { type: "answer", sdp: "v=0 answer" }) {
  const fetcher = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

async function opened(): Promise<RoomCall> {
  const result = await openCall();
  if (!result.ok) throw new Error(`did not open: ${result.refusal}`);
  return result.call;
}

const ROOM = { roomUrl: "https://room.test/rooms/abc/", token: "tok" };

function withPeer() {
  FakePeer.startsAs = "complete";
  vi.stubGlobal("RTCPeerConnection", FakePeer);
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
}

describe("joining the room", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("posts the offer with the token and applies the answer", async () => {
    microphone();
    withPeer();
    const fetcher = answering(200);

    const call = await opened();
    const joined = await call.join(ROOM);

    expect(joined).toEqual({ ok: true });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe("https://room.test/rooms/abc/offer");
    expect(JSON.parse(init.body)).toEqual({
      sdp: "v=0 offer",
      type: "offer",
      token: "tok",
    });
    expect(FakePeer.last.remote).toEqual({ type: "answer", sdp: "v=0 answer" });
  });

  it("asks a STUN server for its public address, so a host with no inbound UDP can reach it", async () => {
    microphone();
    withPeer();
    answering(200);

    await (await opened()).join(ROOM);

    expect(FakePeer.last.config?.iceServers).toEqual([{ urls: STUN_URL }]);
  });

  it("sends the microphone on the line", async () => {
    const track = microphone();
    withPeer();
    answering(200);

    await (await opened()).join(ROOM);

    expect(FakePeer.last.added).toEqual([track]);
  });

  it("mute silences the track without closing the line", async () => {
    const track = microphone();
    withPeer();
    answering(200);
    const call = await opened();
    await call.join(ROOM);

    call.mute(true);
    expect(track.enabled).toBe(false);
    expect(FakePeer.last.closed).toBe(false);
    call.mute(false);
    expect(track.enabled).toBe(true);
  });

  it.each([
    [401, "expired"],
    [409, "busy"],
    [413, "unavailable"],
    [500, "unavailable"],
  ])("reads a %s from the room as %s, and lets go of the microphone", async (status, failure) => {
    const track = microphone();
    withPeer();
    answering(status, { detail: "no" });

    const joined = await (await opened()).join(ROOM);

    expect(joined).toEqual({ ok: false, failure });
    // A failed join is not a call to hang up: the recording light must go off.
    expect(track.stop).toHaveBeenCalled();
    expect(FakePeer.last.closed).toBe(true);
  });

  it("says unavailable when the room cannot be reached at all", async () => {
    microphone();
    withPeer();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    expect(await (await opened()).join(ROOM)).toEqual({
      ok: false,
      failure: "unavailable",
    });
  });

  it("waits for the network paths, but only up to the cap", async () => {
    vi.useFakeTimers();
    microphone();
    withPeer();
    FakePeer.startsAs = "gathering";
    const fetcher = answering(200);
    const joining = (await opened()).join(ROOM);

    await vi.advanceTimersByTimeAsync(GATHER_CAP_MS - 100);
    expect(fetcher).not.toHaveBeenCalled();
    // Gathering never says it is done on this machine: what is gathered goes.
    await vi.advanceTimersByTimeAsync(200);
    expect(await joining).toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("sends as soon as gathering finishes, without waiting out the cap", async () => {
    vi.useFakeTimers();
    microphone();
    withPeer();
    FakePeer.startsAs = "gathering";
    const fetcher = answering(200);
    const joining = (await opened()).join(ROOM);

    await vi.advanceTimersByTimeAsync(50);
    FakePeer.last.gathering("complete");
    await vi.advanceTimersByTimeAsync(0);

    expect(await joining).toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("closing stops the tracks and closes the connection", async () => {
    const track = microphone();
    withPeer();
    answering(200);
    const call = await opened();
    await call.join(ROOM);

    call.close();

    expect(track.stop).toHaveBeenCalled();
    expect(FakePeer.last.closed).toBe(true);
  });
});

describe("losing the line", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("tells the screen when the connection fails", async () => {
    const track = microphone();
    withPeer();
    answering(200);
    const call = await opened();
    const lost = vi.fn();
    call.onLost(lost);
    await call.join(ROOM);

    FakePeer.last.becomes("failed");

    expect(lost).toHaveBeenCalledTimes(1);
    expect(track.stop).toHaveBeenCalled();
  });

  it("gives a dropped connection time to come back before calling it lost", async () => {
    vi.useFakeTimers();
    microphone();
    withPeer();
    answering(200);
    const call = await opened();
    const lost = vi.fn();
    call.onLost(lost);
    await call.join(ROOM);

    FakePeer.last.becomes("disconnected");
    await vi.advanceTimersByTimeAsync(RECOVER_MS - 100);
    FakePeer.last.becomes("connected");
    await vi.advanceTimersByTimeAsync(RECOVER_MS * 2);
    expect(lost).not.toHaveBeenCalled();

    FakePeer.last.becomes("disconnected");
    await vi.advanceTimersByTimeAsync(RECOVER_MS + 100);
    expect(lost).toHaveBeenCalledTimes(1);
  });

  it("does not report a hang-up as a lost line", async () => {
    microphone();
    withPeer();
    answering(200);
    const call = await opened();
    const lost = vi.fn();
    call.onLost(lost);
    await call.join(ROOM);

    call.close();
    FakePeer.last.becomes("failed");

    expect(lost).not.toHaveBeenCalled();
  });
});
