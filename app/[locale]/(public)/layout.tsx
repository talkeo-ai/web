import { Suspense } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/**
 * The public shell: header plus whatever page is showing.
 *
 * The header lives here rather than in each page so every route under
 * `(public)` renders as a *single* root element. A page that returns several
 * siblings straight into `<body>` gives the router nothing stable to match on
 * when the locale changes, and the incoming tree ends up appended next to the
 * outgoing one instead of replacing it — two headers, two `<main>`s, and the
 * stale copy is the one left on top.
 */
export default function PublicLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* The header reads the pathname, which on the catch-all route is
          request data — without a boundary that fails the whole shell's
          prerender and unknown URLs get the framework's bare error document
          instead of the 404 page. Concrete routes still prerender the header
          whole; only the catch-all streams it. The empty fallback shifts
          nothing: the bar is fixed, and pages reserve its space themselves. */}
      <Suspense>
        <SiteHeader />
      </Suspense>
      {children}
      <SiteFooter />
    </div>
  );
}
