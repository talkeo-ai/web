import "server-only";

import { headers } from "next/headers";

/**
 * The address a request came from, as the edge in front of this server saw it.
 *
 * Fly puts it in `Fly-Client-IP`, a header a browser cannot set because the
 * edge overwrites it. Elsewhere the first `x-forwarded-for` hop is the best
 * there is. The service believes it only because this server sends it with
 * the service key, and uses it only to group devices by network.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("fly-client-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "127.0.0.1"
  );
}

export async function userAgent(): Promise<string | undefined> {
  return (await headers()).get("user-agent") ?? undefined;
}
