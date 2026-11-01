import { describe, expect, it } from "vitest";

import es from "@/messages/es.json";
import en from "@/messages/en.json";
import pt from "@/messages/pt.json";

import { isRight, pick, unpick, type TryItem } from "./lesson";

const item: TryItem = {
  prompt: "Tengo 25 años.",
  answer: ["I", "am", "25", "years", "old"],
  bank: ["have", "years", "I", "old", "25", "am"],
  tip: "",
};

describe("try lesson", () => {
  it("is right only with the answer's words in order", () => {
    expect(isRight(item, [2, 5, 4, 1, 3])).toBe(true);
    expect(isRight(item, [2, 0, 4, 1, 3])).toBe(false);
    expect(isRight(item, [5, 2, 4, 1, 3])).toBe(false);
    expect(isRight(item, [2, 5, 4, 1])).toBe(false);
  });

  it("does not pick the same tile twice, and gives it back", () => {
    expect(pick([2], 2)).toEqual([2]);
    expect(unpick(pick([2], 5), 2)).toEqual([5]);
  });

  // Every sentence has to be solvable from its own tiles, in every locale: a
  // missing word in the bank is a lesson nobody can pass.
  it.each([
    ["es", es],
    ["en", en],
    ["pt", pt],
  ])("every %s sentence can be built from its bank", (_, messages) => {
    const items = messages.try.items as TryItem[];
    expect(items.length).toBeGreaterThan(0);
    for (const it of items) {
      const left = [...it.bank];
      for (const word of it.answer) {
        const at = left.indexOf(word);
        expect(at, `${it.prompt}: "${word}" not in the bank`).toBeGreaterThanOrEqual(0);
        left.splice(at, 1);
      }
      expect(left.length, `${it.prompt}: no trap left in the bank`).toBeGreaterThan(0);
    }
  });
});
