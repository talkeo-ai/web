import type { NextRequest, NextResponse } from "next/server";

/**
 * The anonymous identity.
 *
 * A visitor is a complete user from the first minute: evidence and state are
 * stored against this id long before an email exists. Leaving an email later
 * attaches identity to this same id — nothing is migrated.
 *
 * The cookie is the anchor that lets us find the same person on day two.
 */
export const ANONYMOUS_ID_COOKIE = "talkeo_uid";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/** Shared by every cookie that anchors a visitor, so they expire together. */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ONE_YEAR_IN_SECONDS,
} as const;

/**
 * Ensures the request carries an anonymous id, minting one when it does not.
 *
 * This runs in `proxy.ts` because it is the only place that can write a cookie
 * before the page renders: a Server Component cannot set one, and waiting for a
 * client round-trip would lose the first interactions of the session.
 *
 * Returns the id so the proxy can hand it to the request it forwards.
 */
export function ensureAnonymousId(
  request: NextRequest,
  response: NextResponse,
): string {
  const existing = request.cookies.get(ANONYMOUS_ID_COOKIE)?.value;
  if (existing) return existing;

  const id = crypto.randomUUID();

  response.cookies.set(ANONYMOUS_ID_COOKIE, id, SESSION_COOKIE_OPTIONS);

  return id;
}
