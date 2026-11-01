import { describe, expect, it } from "vitest";

import { BANDS, KNOBS, PSEUDO, REAL, estimate, play, runningBand, type Answer } from "./level-check";

const knowsUpTo = (band: (typeof BANDS)[number]) => (w: { band?: string }) =>
  Boolean(w.band) && BANDS.indexOf(w.band as never) <= BANDS.indexOf(band);

describe("level check", () => {
  it("serves the Core's thirty, one invented word after every five real ones", () => {
    const answers = play(() => true);
    expect(answers).toHaveLength(KNOBS.total);
    const pseudo = answers.filter((a) => !a.word.band);
    expect(pseudo).toHaveLength(KNOBS.total / (KNOBS.pseudoEvery + 1));
    // The sixth card is the first invented one.
    expect(answers[5].word.band).toBeUndefined();
  });

  it("never shows the same word twice", () => {
    const answers = play(() => false);
    expect(new Set(answers.map((a) => a.word.word)).size).toBe(answers.length);
  });

  it("starts at A2 and climbs after two yes in a row", () => {
    const answers = play(() => true);
    expect(answers[0].shown).toBe("A2");
    expect(answers[2].shown).toBe("B1");
  });

  it("steps down after two no in a row", () => {
    const yesNo = (known: boolean, band: "A2"): Answer => ({
      word: { word: `w${Math.random()}`, band, pos: "noun", ipa: "" },
      shown: band,
      known,
    });
    expect(runningBand([yesNo(false, "A2"), yesNo(false, "A2")])).toBe("A1");
  });

  it("knowing every real word and no invented one is C2", () => {
    expect(estimate(play((w) => Boolean(w.band))).band).toBe("C2");
  });

  it("knowing nothing is A1", () => {
    expect(estimate(play(() => false)).band).toBe("A1");
  });

  it("saying yes to everything is not C2: the invented words take it down", () => {
    const result = estimate(play(() => true));
    expect(result.band).not.toBe("C2");
    expect(result.fooled.length).toBeGreaterThan(0);
  });

  it("someone who knows up to B1 lands on B1", () => {
    expect(estimate(play(knowsUpTo("B1"))).band).toBe("B1");
  });

  it("has enough words for the ladder in every band", () => {
    for (const band of BANDS) {
      expect(REAL.filter((w) => w.band === band).length).toBeGreaterThanOrEqual(8);
    }
    expect(PSEUDO.length).toBeGreaterThanOrEqual(KNOBS.total / (KNOBS.pseudoEvery + 1));
  });
});
