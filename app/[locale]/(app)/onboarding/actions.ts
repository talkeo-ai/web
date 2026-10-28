"use server";

import { cookies } from "next/headers";

import { core } from "@/core";
import {
  isCoreError,
  type InterviewCard,
  type TalkeoTurn,
} from "@/core/contracts";
import type { Locale } from "@/lib/i18n/routing";

/**
 * Opening the conversation, or picking it back up.
 *
 * A Server Action rather than a Route Handler because it is a mutation the
 * screen drives, and because it has to set a cookie — which a Server Component
 * cannot do. The cookie is the only thing that makes leaving and coming back
 * land in the same conversation instead of starting a second one.
 *
 * What comes back is the service's side of resuming: where the interview is,
 * which cards are up, and what it last said. The thread itself does not — the
 * port is explicit that the transcript never leaves the service, so what a
 * screen redraws it from is its own cache.
 */

const SESSION_COOKIE = "talkeo_interview";
/** A conversation somebody can come back to tomorrow, and not much longer. */
const KEEPS_FOR = 60 * 60 * 24 * 7;

export type OpenedInterview = {
  sessionId: string;
  stage: number;
  stagesTotal: number;
  cards: InterviewCard[];
  closed: boolean;
  name: string;
  lastTurn: TalkeoTurn | null;
};

export async function openInterviewSession(
  locale: Locale,
): Promise<OpenedInterview> {
  const jar = await cookies();
  const known = jar.get(SESSION_COOKIE)?.value;

  if (known) {
    const resumed = await resume(known);
    // A session the service has never heard of is one from another deployment,
    // or one whose database was reset. Starting a new one beats showing an
    // error about an id nobody typed.
    if (resumed) return resumed;
  }

  const { user_id } = await core().createAnonymousUser();
  const { session_id, flow } = await core().createSession({
    user_id,
    client: {
      surface: "web",
      locale,
      // Text and audio both: the person chooses, and the choice is theirs to
      // change halfway through.
      artefacts: ["text", "audio"],
      supported_instruments: [],
    },
  });

  jar.set(SESSION_COOKIE, session_id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: KEEPS_FOR,
  });

  return {
    sessionId: session_id,
    stage: 1,
    stagesTotal: 0,
    cards: [],
    closed: false,
    name: flow.display_name ?? "",
    lastTurn: null,
  };
}

export type StartedCall =
  | { ok: true; token: string; roomUrl: string }
  | { ok: false; reason: "unavailable" | "no session" };

/**
 * A way into the voice room for the conversation this browser is in.
 *
 * The session comes from the cookie and not from the caller, like everything
 * else here: the id of a conversation is not something a page should be able to
 * hand over for somebody else's.
 *
 * Failure is a value and not a throw, because it is an ordinary outcome — a
 * deployment without a room, or a service that is down — and a Server Action
 * that throws reaches the screen as a stripped error with nothing to branch on.
 */
export async function startCall(): Promise<StartedCall> {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (!sessionId) return { ok: false, reason: "no session" };

  try {
    const { token, room_url } = await core().startCall({
      session_id: sessionId,
    });
    return { ok: true, token, roomUrl: room_url };
  } catch (error) {
    // A service that declined and one that could not be reached look the same
    // from the screen: either way there is no call to make.
    if (isCoreError(error) || error instanceof Error) {
      return { ok: false, reason: "unavailable" };
    }
    throw error;
  }
}

async function resume(sessionId: string): Promise<OpenedInterview | null> {
  try {
    const { state, flow } = await core().getInterviewState({
      session_id: sessionId,
    });
    return {
      sessionId,
      stage: state.stage,
      stagesTotal: state.stages_total,
      cards: state.cards,
      closed: state.closed,
      name: flow.display_name ?? "",
      lastTurn: state.last_turn ?? null,
    };
  } catch (error) {
    if (isCoreError(error)) return null;
    throw error;
  }
}
