import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { finishGoogleSignIn } from "@/lib/session/actions";
import { GOOGLE_NEXT_COOKIE } from "@/lib/session/google";
import { safeNext } from "@/lib/session/next-path";

/**
 * Where Google sends the browser back after the person picks an account.
 *
 * Nothing is checked here: `state` and `code` go to the service as they came,
 * and the service checks the state it issued, the PKCE verifier it kept and
 * the token Google signs. This only turns the answer into a session cookie and
 * a place to land.
 *
 * Cancelling at Google, or any failure, lands back on the sign-in screen with
 * a line saying so, never on an error page.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const state = params.get("state");
  const code = params.get("code");

  const jar = await cookies();
  const next = safeNext(jar.get(GOOGLE_NEXT_COOKIE)?.value);
  jar.delete(GOOGLE_NEXT_COOKIE);

  const back = (path: string) =>
    NextResponse.redirect(new URL(path, request.url));

  if (!state || !code) return back("/login?error=google");

  const result = await finishGoogleSignIn(state, code);
  if (!result.ok) return back("/login?error=google");

  // Landing on an account that already existed is said, once, on the sign-in
  // screen, which then goes on to `next`; the code path shows the same notice.
  return back(
    result.switched
      ? `/login?switched=1&next=${encodeURIComponent(next)}`
      : next,
  );
}
