import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";

import { routing } from "@/lib/i18n/routing";
import { ensureAnonymousId } from "@/lib/session/anonymous-id";

/**
 * `proxy.ts` is what Next.js 16 calls the file that used to be `middleware.ts`.
 * It runs on the Node.js runtime.
 *
 * Two jobs, in order: resolve the locale, then make sure the visitor carries an
 * anonymous id. The id is minted on every route, including public ones, so that
 * the first interaction of a session already has somewhere to be stored. Public
 * pages never read it, so they stay fully prerendered.
 */
const handleLocale = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const response = handleLocale(request);
  ensureAnonymousId(request, response);
  return response;
}

export const config = {
  // Everything except API routes, Next internals and files with an extension.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
