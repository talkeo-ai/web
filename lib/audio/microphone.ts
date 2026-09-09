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
 * **The context is built at 16 kHz** so the browser downsamples from whatever the
 * hardware gives (48 kHz, usually) and nothing here has to. If a browser refuses
 * the rate it says so rather than sending audio at the wrong one, which would be
 * a transcription of nothing with no error anywhere.
 */

const WORKLET_URL = "/pcm-capture.worklet.js";

/** What the service's detector was tuned against, so frames arrive as it expects. */
export const CAPTURE_RATE = 16000;
export const CAPTURE_MIME = "audio/pcm";
const FRAME_SAMPLES = 512;

export type Microphone = {
  /** Frames, until `close`. */
  onFrame(handler: (frame: ArrayBuffer) => void): void;
  /** Uploads silence instead of the room. The turn stays open. */
  mute(on: boolean): void;
  close(): void;
};

export type MicrophoneResult =
  | { ok: true; microphone: Microphone }
  /** Refused, unavailable, or a rate the browser would not give. Declared. */
  | { ok: false; why: string };

export async function openMicrophone(): Promise<MicrophoneResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { ok: false, why: "no microphone on this device" };
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
    return { ok: false, why: reasonOf(error) };
  }

  let context: AudioContext;
  try {
    context = new AudioContext({ sampleRate: CAPTURE_RATE });
  } catch {
    stream.getTracks().forEach((track) => track.stop());
    return { ok: false, why: "this browser will not capture at 16 kHz" };
  }

  try {
    await context.audioWorklet.addModule(WORKLET_URL);
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    await context.close();
    return { ok: false, why: reasonOf(error) };
  }

  const source = context.createMediaStreamSource(stream);
  const worklet = new AudioWorkletNode(context, "pcm-capture", {
    numberOfOutputs: 0,
    processorOptions: { frameSamples: FRAME_SAMPLES },
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
      onFrame: (handler) => {
        onFrame = handler;
      },
      mute: (on) => worklet.port.postMessage({ kind: "mute", on }),
      close: () => {
        worklet.port.onmessage = null;
        source.disconnect();
        worklet.disconnect();
        stream.getTracks().forEach((track) => track.stop());
        void context.close();
      },
    },
  };
}

function reasonOf(error: unknown): string {
  if (!(error instanceof Error)) return "the microphone could not be opened";
  // The one a person can act on is the refusal, and it is the common one.
  if (error.name === "NotAllowedError") return "the microphone was not allowed";
  if (error.name === "NotFoundError") return "no microphone was found";
  return error.message || error.name;
}
