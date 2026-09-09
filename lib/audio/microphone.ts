"use client";

/**
 * The microphone, streamed to the service a frame at a time.
 *
 * **There is no voice detector here, on purpose.** The service already runs one
 * and already decides when a turn is over — its own contract says so: "normally
 * the transcription decides a turn is over and `listen_stop` never arrives". A
 * second detector in the browser would mean downloading a model onto the first
 * screen of the product to re-derive a decision that has already been made, and
 * two detectors disagreeing is a turn that ends in one place and not the other.
 *
 * So this opens when it is their turn, sends everything, and stops when it is
 * told to — by the service ending the turn, or by them leaving.
 *
 * ⚠ **Call it from inside a click handler.** The permission prompt has to be
 * raised while the press that asked for it is still the browser's idea of a
 * gesture. Asked from an effect a render later, WebKit refuses without ever
 * showing the prompt — and the refusal is indistinguishable from a person
 * saying no, so we would tell somebody they had declined something they were
 * never asked. The speaker side has the same rule for the same reason
 * (`voice.ts`).
 */

const WORKLET_URL = "/pcm-capture.worklet.js";

/** What the service's detector was tuned against: 32 ms of audio per frame. */
export const CAPTURE_RATE = 16000;
export const CAPTURE_MIME = "audio/pcm";
const FRAME_MS = 32;

/**
 * Why it did not open, as something the screen can act on.
 *
 * ⚠ A closed set and not a sentence. This used to hand back whatever
 * `error.message` the browser happened to carry — English, unprintable in a
 * product with three locales, and impossible to branch on. So the screen threw
 * it away and said one thing for every cause, including telling somebody to try
 * again when the browser had decided never to ask them again.
 */
export type MicRefusal =
  /** They said no, or dismissed the prompt. Asking again is worth doing. */
  | "denied"
  /** The browser has it blocked for this site and will NOT prompt again. */
  | "blocked"
  /** There is no microphone. Asking again changes nothing. */
  | "missing"
  /** Something else on the machine is holding it. */
  | "busy"
  /** No secure context, so the API is not even there. */
  | "insecure"
  /** Ours, not theirs: the capture worklet did not load. */
  | "broken"
  | "unknown";

/** Whether pressing the button again could plausibly do anything. */
export function worthAskingAgain(refusal: MicRefusal): boolean {
  return refusal === "denied" || refusal === "busy" || refusal === "unknown";
}

export type Microphone = {
  /**
   * The rate the frames are actually at.
   *
   * Not always `CAPTURE_RATE`: a browser that will not build a context at
   * 16 kHz gives whatever it gives, and `listen_start` carries the rate, so the
   * honest thing is to say which one rather than to fail.
   */
  sampleRate: number;
  /** Frames, until `close`. */
  onFrame(handler: (frame: ArrayBuffer) => void): void;
  /** Uploads silence instead of the room. The turn stays open. */
  mute(on: boolean): void;
  close(): void;
};

export type MicrophoneResult =
  | { ok: true; microphone: Microphone }
  | { ok: false; refusal: MicRefusal };

export async function openMicrophone(): Promise<MicrophoneResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { ok: false, refusal: "insecure" };
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (error) {
    return { ok: false, refusal: await refusalFor(error) };
  }

  const drop = () => stream.getTracks().forEach((track) => track.stop());

  // 16 kHz if the browser will, and whatever it gives if it will not. It used
  // to be a failure — "this browser will not capture at 16 kHz" — for a rate
  // the contract has always carried as a field.
  let context: AudioContext;
  try {
    context = new AudioContext({ sampleRate: CAPTURE_RATE });
  } catch {
    try {
      context = new AudioContext();
    } catch {
      drop();
      return { ok: false, refusal: "broken" };
    }
  }

  // ⚠ A capture context can start suspended, and a suspended one produces no
  // frames at all: they speak, nothing is sent, and nothing anywhere says so.
  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      // Left to the caller: there is a stream and a graph, and a context that
      // may resume on the next gesture. Failing here would throw away a
      // permission they already granted.
    }
  }

  try {
    await context.audioWorklet.addModule(WORKLET_URL);
  } catch {
    drop();
    await context.close();
    // Ours. Nothing they do to their browser fixes a file we did not serve, so
    // it must not be reported as a permission problem — which is what it was.
    return { ok: false, refusal: "broken" };
  }

  const source = context.createMediaStreamSource(stream);
  const worklet = new AudioWorkletNode(context, "pcm-capture", {
    numberOfOutputs: 0,
    // Kept at 32 ms whatever the rate turned out to be, because that is what
    // the far end's detector was tuned on — not the sample count.
    processorOptions: {
      frameSamples: Math.round((context.sampleRate * FRAME_MS) / 1000),
    },
  });
  source.connect(worklet);

  let onFrame: (frame: ArrayBuffer) => void = () => {};
  worklet.port.onmessage = (event: MessageEvent<unknown>) => {
    const message = event.data as { kind: string; frame: Int16Array };
    if (message.kind === "frame") onFrame(message.frame.buffer as ArrayBuffer);
  };

  return {
    ok: true,
    microphone: {
      sampleRate: context.sampleRate,
      onFrame: (handler) => {
        onFrame = handler;
      },
      mute: (on) => worklet.port.postMessage({ kind: "mute", on }),
      close: () => {
        worklet.port.onmessage = null;
        source.disconnect();
        worklet.disconnect();
        drop();
        void context.close();
      },
    },
  };
}

async function refusalFor(error: unknown): Promise<MicRefusal> {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError") {
    return (await alreadyDenied()) ? "blocked" : "denied";
  }
  if (name === "SecurityError") return "insecure";
  // Over-constrained means nothing here answers what we asked for, and what we
  // ask for is barely anything — so in practice it is the same as no device.
  if (name === "NotFoundError" || name === "OverconstrainedError") return "missing";
  if (name === "NotReadableError" || name === "AbortError") return "busy";
  return "unknown";
}

/**
 * Whether the browser has already decided, so a second press would do nothing.
 *
 * ⚠ Only ever used to turn `denied` into `blocked`, never the other way. Firefox
 * and Safari do not answer for the microphone at all, and not knowing has to
 * fall on the recoverable side: telling somebody their browser is blocking them
 * when they simply dismissed a prompt sends them into settings for nothing.
 */
async function alreadyDenied(): Promise<boolean> {
  try {
    const status = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    return status.state === "denied";
  } catch {
    return false;
  }
}
