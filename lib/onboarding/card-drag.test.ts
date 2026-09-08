import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CARD_COMMIT_PX, CARD_RESIST_PX } from "@/lib/onboarding/motion";
import { useCardDrag, type Side } from "@/lib/onboarding/use-card-drag";

/**
 * Enough of a pointer event for the hook, which reads four things off it and
 * captures the pointer on the element it was handed.
 */
function pointer(clientX: number, target?: Partial<HTMLElement>) {
  const element = {
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
  };

  return {
    isPrimary: true,
    button: 0,
    pointerId: 1,
    clientX,
    currentTarget: element,
    target: { closest: () => null, ...target },
  } as never;
}

/**
 * Each step reads the handlers again, because each one is answered by a
 * render: the move handler of the render before the press still thinks nothing
 * is being held, which in a browser never happens.
 */
function drag(hook: Hook, from: number, to: number) {
  act(() => hook.result.current.handleProps.onPointerDown(pointer(from)));
  act(() => hook.result.current.handleProps.onPointerMove(pointer(to)));
  act(() => hook.result.current.handleProps.onPointerUp(pointer(to)));
}

type Hook = ReturnType<typeof renderHook<ReturnType<typeof useCardDrag>, void>>;

function setup(allow: Record<Side, boolean> = { left: true, right: true }) {
  const onCommit = vi.fn();
  const hook = renderHook(() => useCardDrag({ allow, onCommit }));
  return { onCommit, hook };
}

describe("dragging a card", () => {
  it("answers with the side it was thrown to", () => {
    const { onCommit, hook } = setup();

    drag(hook, 0, CARD_COMMIT_PX + 10);
    expect(onCommit).toHaveBeenCalledWith("right", CARD_COMMIT_PX + 10);

    drag(hook, 0, -(CARD_COMMIT_PX + 10));
    expect(onCommit).toHaveBeenLastCalledWith("left", -(CARD_COMMIT_PX + 10));
  });

  it("says nothing for a card that was only nudged", () => {
    const { onCommit, hook } = setup();

    drag(hook, 0, CARD_COMMIT_PX - 1);
    expect(onCommit).not.toHaveBeenCalled();
    expect(hook.result.current.dx).toBe(0);
  });

  it("lets a side that is not on offer move, and never commit", () => {
    const { onCommit, hook } = setup({ left: true, right: false });

    act(() => hook.result.current.handleProps.onPointerDown(pointer(0)));
    act(() => hook.result.current.handleProps.onPointerMove(pointer(400)));

    const { dx } = hook.result.current;
    expect(dx).toBeGreaterThan(0);
    expect(dx).toBeLessThan(CARD_RESIST_PX);

    act(() => hook.result.current.handleProps.onPointerUp(pointer(400)));
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("leaves a press that started on a control to that control", () => {
    const { hook } = setup();

    act(() =>
      hook.result.current.handleProps.onPointerDown(
        pointer(0, { closest: () => ({}) as HTMLElement }),
      ),
    );
    act(() => hook.result.current.handleProps.onPointerMove(pointer(300)));

    // Untouched: taking the pointer here would send the click to the card
    // instead of to the button under the finger.
    expect(hook.result.current.dx).toBe(0);
    expect(hook.result.current.held).toBe(false);
  });
});
