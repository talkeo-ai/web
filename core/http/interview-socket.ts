"use client";

import type { InterviewChannel, InterviewMessage } from "../channel";
import type { CardEdit } from "../contracts";
import { MessageQueue } from "../message-queue";
import {
  talkeoStreamOutSchema,
  type TalkeoStreamIn,
} from "../contracts/stream";

/**
 * The interview over a real WebSocket.
 *
 * Three things about this channel that a JSON client would get wrong, and that
 * are handled here so nothing above has to know them:
 *
 * - **Audio arrives as binary frames with no envelope.** Which turn they belong
 *   to is only said by the `audio_format` that preceded them, so that is tracked
 *   here and the frames come out already bound to a turn.
 * - **The service says nothing on connect.** It answers; it never opens. The
 *   first move is ours, and it is `resume` — which is also how the interview
 *   starts, restarts and gets re-read.
 * - **Sends before the socket is open are not errors**, they are early. They
 *   queue and go out in order, so a caller never has to wait for a connection it
 *   did not open.
 */
export function openInterviewSocket(
  baseUrl: string,
  sessionId: string,
): InterviewChannel {
  const queue = new MessageQueue<InterviewMessage>();
  const pending: (string | ArrayBuffer)[] = [];
  // The turn the binary frames belong to, from the last format announcement.
  let speaking = "";
  let closed = false;

  const socket = new WebSocket(
    `${baseUrl.replace(/\/$/, "")}/v1/interview/${encodeURIComponent(sessionId)}/stream`,
  );
  socket.binaryType = "arraybuffer";

  socket.addEventListener("open", () => {
    for (const frame of pending.splice(0)) socket.send(frame);
  });

  socket.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (event.data instanceof ArrayBuffer) {
      queue.push({ kind: "audio", turn_id: speaking, data: event.data });
      return;
    }
    if (typeof event.data !== "string") return;
    const parsed = talkeoStreamOutSchema.safeParse(JSON.parse(event.data));
    // A message this build does not understand is dropped rather than thrown:
    // the service is versioned additively, so an unknown kind means it is ahead
    // of us, and taking the conversation down over it would be the worse
    // failure. What it cannot do is reach a screen half-parsed.
    if (!parsed.success) return;
    if (parsed.data.kind === "audio_format") speaking = parsed.data.turn_id;
    queue.push(parsed.data);
  });

  const stop = () => {
    closed = true;
    queue.finish();
  };
  socket.addEventListener("close", stop);
  socket.addEventListener("error", stop);

  const send = (message: TalkeoStreamIn) => {
    if (closed) return;
    const frame = JSON.stringify(message);
    if (socket.readyState === WebSocket.OPEN) socket.send(frame);
    else pending.push(frame);
  };

  return {
    messages: () => queue.iterate(),
    resume: () => send({ kind: "resume" }),
    say: (text) => send({ kind: "say", text }),
    cardEdited: (edit: CardEdit) => send({ kind: "card_edited", edit }),
    choseMode: (mode) => send({ kind: "chose_mode", mode }),
    setVoice: (on) => send({ kind: "set_voice", on }),
    listenStart: ({ mime, sampleRate }) =>
      send({ kind: "listen_start", mime, sample_rate: sampleRate }),
    sendAudio: (frame) => {
      if (closed) return;
      if (socket.readyState === WebSocket.OPEN) socket.send(frame);
      // Dropped rather than queued: a microphone frame that arrives late is
      // noise in the middle of a sentence, and the ones before the socket opens
      // are silence anyway.
    },
    listenStop: () => send({ kind: "listen_stop" }),
    close: () => {
      stop();
      socket.close();
    },
  };
}
