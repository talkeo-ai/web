"use client";

import type { DeviceSignals } from "@/core/contracts";

/**
 * What a first visit hands the service so it can give this device an allowance:
 * a browser fingerprint and a bot check token.
 *
 * Neither is believed alone. The service hashes the fingerprint with the
 * network it came from, so clearing the browser does not refill the allowance,
 * and verifies the token with Cloudflare once. Both are gathered here, in the
 * page, because only the page can compute them; the server never sees the
 * browser otherwise.
 *
 * The bot check is a Turnstile widget created in invisible mode (the mode
 * belongs to the site key, not to anything set here; Cloudflare's test key for
 * it is `1x00000000000000000000BB`), rendered off screen and torn down once it
 * answers. Without a site key configured there is no check to run,
 * and the token says so: the mock takes it, a service with accounts on refuses
 * it, which is the loud failure a missing key should be.
 */

const TURNSTILE_SCRIPT =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** What the service gets when no site key is configured. */
export const UNCONFIGURED_CHALLENGE = "unconfigured";

type Turnstile = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "error-callback": () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let script: Promise<Turnstile> | undefined;

function loadTurnstile(): Promise<Turnstile> {
  script ??= new Promise<Turnstile>((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const tag = document.createElement("script");
    tag.src = TURNSTILE_SCRIPT;
    tag.async = true;
    tag.onload = () =>
      window.turnstile
        ? resolve(window.turnstile)
        : reject(new Error("turnstile did not load"));
    tag.onerror = () => {
      // A later visit gets to try again rather than inheriting this failure.
      script = undefined;
      reject(new Error("turnstile did not load"));
    };
    document.head.append(tag);
  });
  return script;
}

async function challengeToken(): Promise<string> {
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!sitekey) return UNCONFIGURED_CHALLENGE;

  const turnstile = await loadTurnstile();
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  document.body.append(host);

  try {
    return await new Promise<string>((resolve, reject) => {
      const widget = turnstile.render(host, {
        sitekey,
        callback: (token) => {
          turnstile.remove(widget);
          resolve(token);
        },
        "error-callback": () => {
          turnstile.remove(widget);
          reject(new Error("bot check failed"));
        },
      });
    });
  } finally {
    host.remove();
  }
}

async function fingerprint(): Promise<string> {
  const FingerprintJS = (await import("@fingerprintjs/fingerprintjs")).default;
  const agent = await FingerprintJS.load();
  return (await agent.get()).visitorId;
}

/** Both signals, gathered in parallel: each takes from tens of ms to a couple of seconds. */
export async function deviceSignals(): Promise<DeviceSignals> {
  const [id, token] = await Promise.all([fingerprint(), challengeToken()]);
  return { fingerprint: id, challenge_token: token };
}
