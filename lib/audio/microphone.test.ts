import { afterEach, describe, expect, it, vi } from "vitest";

import {
  openMicrophone,
  worthAskingAgain,
  type MicRefusal,
} from "./microphone";

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
  const result = await openMicrophone();
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
