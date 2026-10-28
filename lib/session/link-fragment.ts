/**
 * Reads `#email=..&code=..` the way the service writes it into the sign-in mail
 * (Python's `urlencode`, so `+` arrives as `%2B` and a space as `+`).
 */
export function readFragment(
  hash: string,
): { email: string; code: string } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const email = params.get("email")?.trim();
  const code = params.get("code")?.trim();
  return email && code ? { email, code } : null;
}
