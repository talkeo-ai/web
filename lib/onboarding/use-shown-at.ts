"use client";

import { useEffect, useRef } from "react";

/**
 * How long a card has been on screen, measured from when it got there.
 *
 * Only the client can see this, which is why the contract asks for it. It is
 * taken from the first paint rather than from the request that fetched the
 * item: what is being timed is the person, not the network.
 */
export function useShownAt() {
  const shown = useRef(0);

  useEffect(() => {
    shown.current = performance.now();
  }, []);

  return () => Math.max(0, Math.round(performance.now() - shown.current));
}
