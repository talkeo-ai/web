"use server";

import { cookies, headers } from "next/headers";

import {
  core,
  isCoreError,
  type Account,
  type DeviceSignals,
  type ErrorCode,
} from "@/core";
import type { Locale } from "@/lib/i18n/routing";

import { clientIp, userAgent } from "./client-ip";
import { GOOGLE_CALLBACK_PATH, GOOGLE_NEXT_COOKIE } from "./google";
import {
  clearSessionToken,
  readSessionToken,
  storeSessionToken,
} from "./core-session";
import { safeNext } from "./next-path";

/**
 * The account's writes, as Server Actions: each one may change the session
 * cookie, and only an action or a route handler can.
 *
 * They answer with a result rather than throwing. Every failure here is a case
 * a screen shows a line for (a wrong code, too many codes, no session), not a
 * bug, so it travels as a value; anything else still throws.
 *
 * A session the service says is over is cleared on the spot, so the next page
 * starts a fresh anonymous one instead of carrying a dead token around.
 */

export type Failed = { ok: false; code: ErrorCode };

async function attempt<T>(run: () => Promise<T>): Promise<T | Failed> {
  try {
    return await run();
  } catch (error) {
    if (!isCoreError(error)) throw error;
    if (error.code === "UNAUTHENTICATED") await clearSessionToken();
    return { ok: false, code: error.code };
  }
}

/** Whether this browser already holds a session, so the page knows whether to gather signals. */
export async function hasSession(): Promise<boolean> {
  return Boolean(await readSessionToken());
}

/**
 * The first visit: an anonymous user on this device. A browser that already
 * holds a session keeps it; the call is idempotent from the page's side.
 */
export async function startAnonymous(
  device: DeviceSignals,
): Promise<{ ok: true } | Failed> {
  if (await readSessionToken()) return { ok: true };
  return attempt(async () => {
    const started = await core().beginAnonymous({
      device,
      client_ip: await clientIp(),
      user_agent: await userAgent(),
    });
    await storeSessionToken(started.session_token);
    return { ok: true as const };
  });
}

export async function sendCode(
  email: string,
  locale: Locale,
): Promise<{ ok: true; expiresIn: number } | Failed> {
  return attempt(async () => {
    const sent = await core().startEmailCode({
      email: email.trim(),
      client_ip: await clientIp(),
      locale,
    });
    return { ok: true as const, expiresIn: sent.expires_in };
  });
}

export async function verifyCode(
  email: string,
  code: string,
): Promise<{ ok: true; switched: boolean } | Failed> {
  return attempt(async () => {
    const signed = await core().verifyEmailCode({
      email: email.trim(),
      code: code.trim(),
    });
    await storeSessionToken(signed.session_token);
    return { ok: true as const, switched: signed.switched };
  });
}

async function origin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function startGoogle(
  next: string | null,
): Promise<{ ok: true; url: string } | Failed> {
  return attempt(async () => {
    const { authorize_url } = await core().beginGoogle({
      redirect_uri: `${await origin()}${GOOGLE_CALLBACK_PATH}`,
    });
    const jar = await cookies();
    jar.set(GOOGLE_NEXT_COOKIE, safeNext(next), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      // Long enough to pick an account; a stale one only decides where to land.
      maxAge: 60 * 10,
    });
    return { ok: true as const, url: authorize_url };
  });
}

export async function finishGoogleSignIn(
  state: string,
  code: string,
): Promise<{ ok: true; switched: boolean } | Failed> {
  return attempt(async () => {
    const signed = await core().finishGoogle({
      state,
      code,
      redirect_uri: `${await origin()}${GOOGLE_CALLBACK_PATH}`,
    });
    await storeSessionToken(signed.session_token);
    return { ok: true as const, switched: signed.switched };
  });
}

/** Who is signed in, for a client component; null with no live session. */
export async function readAccount(): Promise<Account | null> {
  const result = await attempt(async () => ({
    ok: true as const,
    account: (await core().getAccount()).account,
  }));
  return result.ok ? result.account : null;
}

export async function signOut(): Promise<void> {
  await attempt(() => core().signOut());
  await clearSessionToken();
}

export async function deleteAccount(): Promise<{ ok: true } | Failed> {
  return attempt(async () => {
    await core().deleteAccount({ confirm: true });
    await clearSessionToken();
    return { ok: true as const };
  });
}
