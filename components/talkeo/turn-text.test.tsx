import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { splitLines } from "@/lib/talkeo/lines";

import { TurnText } from "./turn-text";

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    disconnect() {}
  },
);

const opacities = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>("[data-word]")].map(
    (word) => word.style.opacity,
  );

describe("a turn being written out", () => {
  it("keeps unrevealed words hidden even if its first word was all of it", () => {
    // A streamed turn mounts on its first word, fully revealed at that moment.
    // Taken for history, every word after it showed solid as it arrived.
    const { container, rerender } = render(
      <TurnText arriving lines={splitLines("Hola,")} revealedWords={1} />,
    );
    rerender(
      <TurnText
        arriving
        lines={splitLines("Hola, qué bueno")}
        revealedWords={1}
      />,
    );

    expect(opacities(container)).toEqual(["1", "0", "0"]);
  });

  it("is drawn whole when it is history", () => {
    const { container } = render(
      <TurnText lines={splitLines("Hola, qué bueno")} revealedWords={3} />,
    );
    expect(opacities(container)).toEqual(["1", "1", "1"]);
  });
});
