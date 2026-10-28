/**
 * Where to go after signing in, from a `?next=` the browser brought.
 *
 * Only a path on this site: `//evil.com` is a URL to another host in a
 * browser's eyes, and anything with a scheme or a backslash can turn into one.
 * Everything else goes home. (The old Talkeo's `isSafeRedirect`, for the same
 * reason.)
 */
export const AFTER_SIGN_IN = "/home";

export function safeNext(next: string | null | undefined): string {
  if (!next) return AFTER_SIGN_IN;
  if (!next.startsWith("/") || next.startsWith("//")) return AFTER_SIGN_IN;
  if (next.includes("\\") || next.includes(":")) return AFTER_SIGN_IN;
  return next;
}
