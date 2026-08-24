import "server-only";

import { cookies } from "next/headers";

import { ANONYMOUS_ID_COOKIE } from "./anonymous-id";

export type CurrentUser = {
  id: string;
  /** An email turns the same id into a registered user. Nothing is migrated. */
  email: string | null;
};

/**
 * Reads the current user on the server.
 *
 * ⚠ This reads cookies, so it makes the calling scope request-dependent. Never
 * call it at the top of a `page.tsx` or `layout.tsx`: that drops the
 * prerendered shell for the whole route. Call it inside a component rendered
 * behind a `<Suspense>` boundary.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const id = store.get(ANONYMOUS_ID_COOKIE)?.value;

  if (!id) return null;

  // The email lands here once the Core is wired up; the anonymous id is already
  // a real user for everything else.
  return { id, email: null };
}
