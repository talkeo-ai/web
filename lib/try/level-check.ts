/**
 * A rough level from a handful of words: the yes/no vocabulary test (Meara &
 * Buxton 1987; Meara's X_Lex), cut down to fit a landing. Each real word sits
 * in one CEFR band, from A1 to C2; a few invented words are mixed in, and
 * saying you know one of them counts against you — it is how the method tells
 * knowing from clicking yes.
 *
 * It is an estimate from eight cards and says so on screen: the real
 * measurement is the onboarding's. Nothing here calls the Core.
 */

export const BANDS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Band = (typeof BANDS)[number];

export type LevelCard = {
  word: string;
  /** The band a real word belongs to; absent on an invented one. */
  band?: Band;
};

export type LevelResult = {
  band: Band;
  /** Real words said known, out of the real words shown. */
  known: number;
  real: number;
  /** Invented words said known. */
  fooled: string[];
};

/**
 * One band per real word known, from the bottom, minus one per invented word
 * claimed. Counting rather than requiring each band in order, because a learner
 * who knows "reluctant" and not "borrow" is still past A2; the invented words
 * are what keeps counting honest.
 */
export function estimate(cards: LevelCard[], knows: boolean[]): LevelResult {
  let known = 0;
  let real = 0;
  const fooled: string[] = [];
  cards.forEach((card, i) => {
    if (card.band) {
      real += 1;
      if (knows[i]) known += 1;
    } else if (knows[i]) {
      fooled.push(card.word);
    }
  });
  const steps = Math.max(0, known - fooled.length);
  const index = Math.min(BANDS.length - 1, Math.max(0, steps - 1));
  return { band: BANDS[index], known, real, fooled };
}
