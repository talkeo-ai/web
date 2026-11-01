import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CARD_COMMIT_PX, useCardDrag } from "./use-card-drag";

/** A pointer event as far as the hook reads one. */
function pointer(clientX: number, timeStamp = 0) {
  return {
    isPrimary: true,
    button: 0,
    clientX,
    timeStamp,
    pointerId: 1,
    target: document.createElement("div"),
    currentTarget: {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
    },
  } as unknown as React.PointerEvent<HTMLElement>;
}

describe("useCardDrag", () => {
  // A fast flick can deliver down, move and up before React renders in
  // between, so all three land on the handlers of one render. Read from that
  // render's state, the up saw "not held", returned early, and the card stayed
  // held with the button already released: it then followed the bare mouse
  // and was left wherever the mouse left it (Joaquin, 1/nov, three recordings).
  it("ends the drag when down, move and up arrive before a render", () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() => useCardDrag({ onCommit }));
    const handlers = result.current.handleProps;

    act(() => {
      handlers.onPointerDown(pointer(100));
      handlers.onPointerMove(pointer(100 + CARD_COMMIT_PX + 20));
      handlers.onPointerUp(pointer(100 + CARD_COMMIT_PX + 20));
    });

    expect(result.current.held).toBe(false);
    expect(result.current.dx).toBe(0);
    expect(onCommit).toHaveBeenCalledWith("right", CARD_COMMIT_PX + 20);
  });

  it("does not follow the pointer once the button is up", () => {
    const { result } = renderHook(() => useCardDrag({ onCommit: vi.fn() }));

    act(() => result.current.handleProps.onPointerDown(pointer(100)));
    act(() => result.current.handleProps.onPointerUp(pointer(140)));
    act(() => result.current.handleProps.onPointerMove(pointer(300)));

    expect(result.current.held).toBe(false);
    expect(result.current.dx).toBe(0);
  });

  // A quick shove let go short of the line came back (Joaquin, 1/nov).
  it("answers a fast push released short of the line", () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() => useCardDrag({ onCommit }));

    act(() => result.current.handleProps.onPointerDown(pointer(100, 1000)));
    act(() => result.current.handleProps.onPointerMove(pointer(130, 1030)));
    act(() => result.current.handleProps.onPointerMove(pointer(170, 1060)));
    act(() => result.current.handleProps.onPointerUp(pointer(170, 1070)));

    expect(onCommit).toHaveBeenCalledWith("right", 70);
  });

  it("lets a slow drag short of the line come back", () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() => useCardDrag({ onCommit }));

    act(() => result.current.handleProps.onPointerDown(pointer(100, 1000)));
    act(() => result.current.handleProps.onPointerMove(pointer(140, 1400)));
    act(() => result.current.handleProps.onPointerMove(pointer(170, 1800)));
    act(() => result.current.handleProps.onPointerUp(pointer(170, 1850)));

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("lets go when the browser takes the pointer away", () => {
    const { result } = renderHook(() => useCardDrag({ onCommit: vi.fn() }));

    act(() => result.current.handleProps.onPointerDown(pointer(100)));
    act(() => result.current.handleProps.onPointerMove(pointer(180)));
    act(() => result.current.handleProps.onLostPointerCapture());

    expect(result.current.held).toBe(false);
    expect(result.current.dx).toBe(0);
  });
});
