import { describe, expect, it } from "vitest";

import es from "@/messages/es.json";

import { BANDS, estimate, type LevelCard } from "./level-check";

const cards = es.levelCheck.cards as LevelCard[];
const isReal = cards.map((c) => Boolean(c.band));

describe("level check", () => {
  it("has one real word per band and at least one invented word", () => {
    const bands = cards.filter((c) => c.band).map((c) => c.band);
    expect(new Set(bands)).toEqual(new Set(BANDS));
    expect(cards.some((c) => !c.band)).toBe(true);
  });

  it("knowing every real word and no invented one is C2", () => {
    expect(estimate(cards, isReal).band).toBe("C2");
  });

  it("knowing nothing is A1", () => {
    expect(estimate(cards, cards.map(() => false)).band).toBe("A1");
  });

  it("saying yes to everything is not C2: the invented words count against it", () => {
    const result = estimate(cards, cards.map(() => true));
    expect(result.band).not.toBe("C2");
    expect(result.fooled.length).toBeGreaterThan(0);
  });

  it("three real words known is B1", () => {
    let left = 3;
    const knows = cards.map((c) => (c.band && left-- > 0 ? true : false));
    expect(estimate(cards, knows).band).toBe("B1");
  });
});
