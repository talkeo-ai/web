import "server-only";

import { cookies } from "next/headers";

/**
 * The service's session for this browser.
 *
 * The service hands out the token when a visitor starts anonymous or signs in,
 * and every call made for this browser carries it. It lives in a cookie the
 * page's scripts cannot read, so nothing running in the browser can copy it,
 * and it never appears in a URL.
 *
 * Only Server Actions and Route Handlers can write it: a Server Component that
 * learns the session ended cannot clear the cookie, it can only send the person
 * somewhere that does.
 */
export const CORE_SESSION_COOKIE = "talkeo_session";

/**
 * The service ends a session at 180 days at most (30 idle); the cookie keeps it
 * as long, and the service is the one that says when it is over.
 */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export async function readSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(CORE_SESSION_COOKIE)?.value;
}

export async function storeSessionToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(CORE_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionToken(): Promise<void> {
  const store = await cookies();
  store.delete(CORE_SESSION_COOKIE);
}
