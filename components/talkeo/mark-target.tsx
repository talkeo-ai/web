"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Mark, MarkAction } from "@/core/contracts";

/**
 * The seam between what the assistant says and what the screen does about it.
 *
 * A turn names its targets by string — `area:vocabulary`, `card:map`,
 * `control:voice` — and this is what turns that name into something a
 * component can react to. Anything that wants to be pointed at declares the
 * name it answers to; nothing here knows what a highlight looks like, which is
 * the point: the drawing is the screen's business and the timing is not.
 */

export type FiredMark = {
  action: MarkAction;
  /** Rises every time the same target is marked again, so a repeat re-fires. */
  seq: number;
};

type MarkStore = {
  fired: ReadonlyMap<string, FiredMark>;
  fire: (mark: Mark) => void;
  reset: () => void;
};

const MarkContext = createContext<MarkStore | null>(null);

export function MarkTargets({ children }: { children: ReactNode }) {
  const [fired, setFired] = useState<ReadonlyMap<string, FiredMark>>(
    () => new Map(),
  );

  const fire = useCallback((mark: Mark) => {
    setFired((previous) => {
      const next = new Map(previous);
      const seq = (previous.get(mark.target)?.seq ?? 0) + 1;
      next.set(mark.target, { action: mark.action, seq });
      return next;
    });
  }, []);

  const reset = useCallback(() => setFired(new Map()), []);

  const store = useMemo<MarkStore>(
    () => ({ fired, fire, reset }),
    [fired, fire, reset],
  );

  return <MarkContext value={store}>{children}</MarkContext>;
}

/**
 * Hands marks to the store. Outside a provider it is a no-op rather than a
 * throw: a turn still has to play on a screen that points at nothing.
 */
export function useFireMark(): (mark: Mark) => void {
  const store = useContext(MarkContext);
  return store?.fire ?? noop;
}

export function useResetMarks(): () => void {
  const store = useContext(MarkContext);
  return store?.reset ?? noop;
}

/** What the voice has done to this target so far, or null if it has not. */
export function useMarkTarget(target: string): FiredMark | null {
  const store = useContext(MarkContext);
  return store?.fired.get(target) ?? null;
}

function noop() {}
