import type { CardEdit } from "./contracts";
import type { TalkeoStreamOut } from "./contracts/stream";
import { openInterviewSocket } from "./http/interview-socket";
import { openMockInterview } from "./mock/interview-channel";

/**
 * The interview's open channel, and the second door to the measurement service.
 *
 * It is not a method on `CorePort` and that is deliberate. `CorePort` is a
 * catalog of calls that return results and it runs on the server; a socket is
 * neither. Pretending a stream is a promise would cost the port the one property
 * that makes it worth having — that every read is a named call with a defined
 * result.
 *
 * The same rule governs it though: **the configuration chooses the adapter.**
 * With a service URL configured the real socket answers; without one the fixture
 * channel does, speaking the identical shape. Nothing above this line knows
 * which.
 *
 * The stream is the progressive disclosure of one turn and the last message is
 * that turn, so a consumer that ignores every other kind and waits for
 * `turn_done` behaves exactly as the request/response call does.
 */

/** A binary audio frame, lifted into the same union as everything else.
 *
 * The socket carries audio as raw frames with no envelope, so the only thing
 * that says which turn they belong to is the `audio_format` that came before
 * them. Binding them here means nothing downstream has to remember that. */
export type TurnAudio = {
  kind: "audio";
  turn_id: string;
  /** Interleaved samples in the format the last `audio_format` announced. */
  data: ArrayBuffer;
};

export type InterviewMessage = TalkeoStreamOut | TurnAudio;

export interface InterviewChannel {
  /**
   * Everything the service says, in order.
   *
   * An async iterable rather than a callback so a consumer can `for await` over
   * a turn and so back-pressure is somebody's problem rather than nobody's. It
   * ends when the channel closes.
   */
  messages(): AsyncIterable<InterviewMessage>;

  /** Ask for whatever turn should be on screen. Starts, restarts and re-reads. */
  resume(): void;

  /** What they typed. */
  say(text: string): void;

  /**
   * What they changed or confirmed on a card.
   *
   * It makes no turn of its own: it waits for the next one, because pressing a
   * button and then saying something is one turn and not two.
   */
  cardEdited(edit: CardEdit): void;

  /** Speaking or writing, picked on screen rather than said out loud. */
  choseMode(mode: "speak" | "text"): void;

  /**
   * Whether the turns are spoken at all.
   *
   * It stops the synthesis and not just this end's speaker, so a muted
   * conversation is not one being paid for and thrown away.
   */
  setVoice(on: boolean): void;

  /** About to send microphone frames, in this format. */
  listenStart(format: { mime: string; sampleRate: number }): void;

  /** One frame of what the microphone heard. */
  sendAudio(frame: ArrayBuffer): void;

  /**
   * Stop listening.
   *
   * Normally unnecessary: the transcription decides a turn is over. This is the
   * screen giving up on one — they left the call, or nobody ever spoke.
   */
  listenStop(): void;

  close(): void;
}

/**
 * The channel this build talks to.
 *
 * The same rule as `core()`: with a service URL configured the socket answers,
 * without one the recording does. **No component picks** — they call this.
 */
export function openInterview(sessionId: string): InterviewChannel {
  const baseUrl = process.env.NEXT_PUBLIC_CORE_WS_URL;
  return baseUrl
    ? openInterviewSocket(baseUrl, sessionId)
    : openMockInterview();
}
