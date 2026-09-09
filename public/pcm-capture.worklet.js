/**
 * Hands the microphone up a frame at a time, as 16-bit PCM.
 *
 * A worklet and not a `ScriptProcessorNode`: the deprecated one runs on the main
 * thread, so every layout the page does lands in the middle of somebody's
 * sentence as a dropped block.
 *
 * The frame length is the service's, not this file's: it is passed in, because
 * what is on the other end of it was tuned against a frame of a particular
 * length and half of one is a different input.
 *
 * ⚠ Not a module, and no imports: `addModule` evaluates this in the audio
 * worklet global scope.
 */

/** 32 ms at 16 kHz, matching what the service's detector was tuned on. */
const DEFAULT_FRAME = 512;

class PcmCapture extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.size = options?.processorOptions?.frameSamples ?? DEFAULT_FRAME;
    this.pending = new Int16Array(this.size);
    this.at = 0;
    this.muted = false;
    this.port.onmessage = (event) => {
      if (event.data?.kind === "mute") this.muted = Boolean(event.data.on);
    };
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    // No input yet is not silence to send: the graph is still connecting, and a
    // frame of zeros here would be indistinguishable from a held breath.
    if (!channel) return true;

    for (let i = 0; i < channel.length; i += 1) {
      // Muted uploads silence rather than nothing. Sending nothing would let the
      // far end's hangover decide the turn was over, so the turn would end every
      // time somebody muted to think.
      const sample = this.muted ? 0 : Math.max(-1, Math.min(1, channel[i]));
      this.pending[this.at] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      this.at += 1;
      if (this.at < this.size) continue;
      const frame = this.pending;
      this.pending = new Int16Array(this.size);
      this.at = 0;
      this.port.postMessage({ kind: "frame", frame }, [frame.buffer]);
    }

    return true;
  }
}

registerProcessor("pcm-capture", PcmCapture);
