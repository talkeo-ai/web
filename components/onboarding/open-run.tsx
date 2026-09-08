"use client";

import { useEffect, useRef } from "react";

/**
 * Opens the run, from the one place that can.
 *
 * Opening writes two cookies and then navigates, and only a Server Action does
 * both reliably: a page cannot set a cookie at all, and a route handler loses
 * what it sets when it redirects — which is a door that opens a run, forgets
 * it, and sends the visitor back to itself forever.
 *
 * So the door renders nothing and asks for one on arrival. The ref is what
 * keeps development's double mount from opening two.
 */
export function OpenRun({ start }: { start: () => Promise<void> }) {
  const asked = useRef(false);

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    void start();
  }, [start]);

  return null;
}
