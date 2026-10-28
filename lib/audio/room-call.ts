"use client";

/**
 * A call, through the voice room.
 *
 * **The interview's socket does not carry the call any more.** The microphone
 * goes to a separate room over WebRTC and Talkeo's voice comes back from it; the
 * socket stays open beside it for the text, the cards, the transcript and the
 * turn boundaries, exactly as it does outside a call. So this file knows nothing
 * about turns: it opens the microphone, makes an offer, plays what comes back,
 * and says when the line is lost.
 *
 * **No voice detector here, on purpose.** The room decides when somebody has
 * stopped talking, the same way the service used to decide it on the socket. A
 * second detector in the browser would be a model downloaded onto the first
 * screen of the product to re-derive a decision that has already been made.
 *
 * ⚠ **Open the microphone from inside a click handler.** The permission prompt
 * has to be raised while the press that asked for it is still the browser's idea
 * of a gesture. Asked from an effect a render later, WebKit refuses without ever
 * showing the prompt — and the refusal is indistinguishable from a person saying
 * no, so we would tell somebody they had declined something they were never
 * asked. That is why this is two steps and not one: `openCall` is the part that
 * must happen in the click, before the first `await` that is not the prompt
 * itself, and `join` is the part that can wait for the server to hand out a
 * token. The speaker side has the same rule for the same reason (`voice.ts`).
 */

/**
 * Why the microphone did not open, as something the screen can act on.
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
  /** Ours, not theirs. */
  | "broken"
  | "unknown";

/** Whether pressing the button again could plausibly do anything. */
export function worthAskingAgain(refusal: MicRefusal): boolean {
  return refusal === "denied" || refusal === "busy" || refusal === "unknown";
}

/**
 * Why the room did not let them in, or let go of them.
 *
 * A closed set for the same reason as `MicRefusal`: the screen has one thing to
 * say per cause, and an HTTP status is not something to print.
 */
export type CallFailure =
  /** The token ran out before it was used. Asking for a new one fixes it. */
  | "expired"
  /** The room already has somebody in it for this conversation. */
  | "busy"
  /** Anything else: the room is down, unreachable, or refused the offer. */
  | "unavailable";

/** Where the browser asks for its own public address. */
export const STUN_URL = "stun:stun.l.google.com:19302";

/** How long to wait for the browser to finish finding its network paths. */
export const GATHER_CAP_MS = 2000;
/**
 * How long a dropped connection gets to come back before it counts as lost.
 *
 * `disconnected` is not `failed`: a phone that changes network, or a laptop that
 * wakes up, passes through it and recovers by itself. Ending the call on the
 * first sight of it would hang up on people who were about to be fine.
 */
export const RECOVER_MS = 4000;

export type RoomCall = {
  /** Theirs, for the glow to follow. Not silenced by `mute`. */
  micMeter: AnalyserNode | null;
  /** Talkeo's voice in the room, or null before it is connected. */
  remoteMeter(): AnalyserNode | null;
  /**
   * Send the offer and apply the answer.
   *
   * Resolves once the room has answered, which is when the line is set up and
   * not when anybody has said anything. On failure everything is released: a
   * failed join is not a call to hang up.
   */
  join(room: { roomUrl: string; token: string }): Promise<JoinResult>;
  /** Sends silence instead of the room. The line stays open. */
  mute(on: boolean): void;
  /**
   * Talkeo's voice in the call, off or on. The speaker key's: during a call the
   * voice is the room's, and the Core's `set_voice` does not reach it.
   */
  silence(on: boolean): void;
  /** Called once if the line is lost after `join`. Never after `close`. */
  onLost(handler: () => void): void;
  close(): void;
};

export type JoinResult = { ok: true } | { ok: false; failure: CallFailure };

export type OpenCallResult =
  | { ok: true; call: RoomCall }
  | { ok: false; refusal: MicRefusal };

export async function openCall(): Promise<OpenCallResult> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    return { ok: false, refusal: "insecure" };
  }

  // Built before the prompt and not after it: a context created while the press
  // is still a gesture starts running, and one created after the permission
  // await can start suspended and stay that way. The meters read nothing from a
  // suspended one, so the glow would sit still through a conversation.
  const context = newContext();

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
    void context?.close();
    return { ok: false, refusal: await refusalFor(error) };
  }

  return { ok: true, call: buildCall(stream, context) };
}

function newContext(): AudioContext | null {
  try {
    const context = new AudioContext();
    if (context.state === "suspended") void context.resume().catch(() => {});
    return context;
  } catch {
    // No meters is a glow that does not move, which is worse than it should be
    // and far better than a call that does not open.
    return null;
  }
}

function meterOf(
  context: AudioContext | null,
  stream: MediaStream,
): AnalyserNode | null {
  if (!context) return null;
  try {
    const meter = context.createAnalyser();
    context.createMediaStreamSource(stream).connect(meter);
    return meter;
  } catch {
    return null;
  }
}

function buildCall(stream: MediaStream, context: AudioContext | null): RoomCall {
  const [micTrack] = stream.getAudioTracks();
  const micMeter = meterOf(context, stream);

  let peer: RTCPeerConnection | null = null;
  let remote: AnalyserNode | null = null;
  let player: HTMLAudioElement | null = null;
  // Kept apart from the element: the key can be pressed before the voice arrives.
  let silenced = false;
  let lost: () => void = () => {};
  let recovering: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const release = () => {
    closed = true;
    clearTimeout(recovering);
    stream.getTracks().forEach((track) => track.stop());
    if (player) {
      player.pause();
      player.srcObject = null;
      player = null;
    }
    peer?.close();
    peer = null;
    remote = null;
    void context?.close().catch(() => {});
  };

  const lose = () => {
    if (closed) return;
    release();
    lost();
  };

  return {
    micMeter,
    remoteMeter: () => remote,
    mute: (on) => {
      if (micTrack) micTrack.enabled = !on;
    },
    silence: (on) => {
      silenced = on;
      if (player) player.muted = on;
    },
    onLost: (handler) => {
      lost = handler;
    },
    close: release,

    join: async ({ roomUrl, token }) => {
      const fail = (failure: CallFailure): JoinResult => {
        release();
        return { ok: false, failure };
      };

      let connection: RTCPeerConnection;
      try {
        // A public STUN server so the offer carries this side's public address. The
        // room runs on a host with no inbound UDP: it reaches out to the address it
        // is given, and a browser behind a NAT that offered only its private one
        // would never be reached.
        connection = new RTCPeerConnection({ iceServers: [{ urls: STUN_URL }] });
      } catch {
        return fail("unavailable");
      }
      peer = connection;

      // `addTrack` makes a send-and-receive audio transceiver by itself, which
      // is the whole line: no second transceiver for Talkeo's side.
      if (micTrack) connection.addTrack(micTrack, stream);

      connection.addEventListener("track", (event) => {
        if (closed) return;
        const heard = event.streams[0] ?? new MediaStream([event.track]);

        // ⚠ Played through an `<audio>` element, and only METERED through the
        // audio graph. Chrome gives silence from `createMediaStreamSource` on a
        // remote stream that is not also attached to a media element, and
        // Safari is the browser where routing a live remote stream into a
        // context has failed most often; an element with `autoplay` plays it in
        // all of them. The graph is then just an ear on the same stream, which
        // is all the glow needs, and it is not connected to the destination so
        // nothing plays twice.
        const element = new Audio();
        element.autoplay = true;
        element.srcObject = heard;
        element.muted = silenced;
        player = element;
        void element.play().catch(() => {
          // Autoplay refused: the press that started the call is a gesture, so
          // this is rare, and there is nothing to tell them that would help.
        });
        remote = meterOf(context, heard);
      });

      connection.addEventListener("connectionstatechange", () => {
        const state = connection.connectionState;
        if (state === "connected") {
          clearTimeout(recovering);
        } else if (state === "failed") {
          lose();
        } else if (state === "disconnected") {
          clearTimeout(recovering);
          recovering = setTimeout(lose, RECOVER_MS);
        }
      });

      try {
        await connection.setLocalDescription(await connection.createOffer());
        await gathered(connection);
      } catch {
        return fail("unavailable");
      }
      if (closed) return { ok: false, failure: "unavailable" };

      let response: Response;
      try {
        response = await fetch(`${roomUrl.replace(/\/$/, "")}/offer`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sdp: connection.localDescription?.sdp,
            type: "offer",
            token,
          }),
        });
      } catch {
        return fail("unavailable");
      }

      if (!response.ok) return fail(failureOf(response.status));

      try {
        const answer = (await response.json()) as RTCSessionDescriptionInit;
        if (closed) return { ok: false, failure: "unavailable" };
        await connection.setRemoteDescription({
          type: answer.type,
          sdp: answer.sdp,
        });
      } catch {
        return fail("unavailable");
      }
      return { ok: true };
    },
  };
}

function failureOf(status: number): CallFailure {
  if (status === 401) return "expired";
  if (status === 409) return "busy";
  // 413 is an offer the room finds too large, and everything else is the room
  // being down or unreachable. None of them is something the person can fix.
  return "unavailable";
}

/**
 * Waits for the browser to finish finding its network paths, up to a cap.
 *
 * The offer goes out in one piece with its paths in it rather than trickling,
 * because the room takes a single request. ⚠ Not waiting at all sends an offer
 * with no paths, which connects on nothing but the luckiest networks; waiting
 * for ever hangs the call on a machine whose gathering never says it is done. A
 * partial offer after the cap is the better failure.
 */
function gathered(connection: RTCPeerConnection): Promise<void> {
  if (connection.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(cap);
      connection.removeEventListener("icegatheringstatechange", check);
      resolve();
    };
    const check = () => {
      if (connection.iceGatheringState === "complete") done();
    };
    const cap = setTimeout(done, GATHER_CAP_MS);
    connection.addEventListener("icegatheringstatechange", check);
  });
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
