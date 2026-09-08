/**
 * The two units a turn is read in, cut once so they cannot disagree.
 *
 * The screen reveals a line at a time; the voice syncs by word index, which is
 * what `marks` and `word_timings` are numbered in. Both have to come out of one
 * tokenisation, or a mark lands on a line that is not showing yet.
 */

export type TurnLine = {
  words: string[];
  /** Where this line's first word sits in the turn as a whole. */
  firstWordIndex: number;
};

/**
 * Whitespace, and nothing cleverer.
 *
 * The service numbers `word_index` against the text it sent, so the split has
 * to be the one anybody would reach for. Punctuation stays attached to its
 * word: dropping it would renumber everything after the first comma.
 */
export function splitWords(text: string): string[] {
  const trimmed = text.trim();
  return trimmed.length === 0 ? [] : trimmed.split(/\s+/);
}

// Sentence-final punctuation, allowing a closing quote or bracket after it.
const SENTENCE_END = /[.!?…]+["'»”’)\]]*$/;

/**
 * A line is a sentence, because the voice pauses where the sentence does.
 *
 * Cutting anywhere else puts the reveal out of step with what is being said —
 * a line that appears mid-clause reads as the text racing the voice.
 */
export function splitLines(text: string): TurnLine[] {
  const words = splitWords(text);
  const lines: TurnLine[] = [];

  let firstWordIndex = 0;
  let current: string[] = [];

  for (const [index, word] of words.entries()) {
    current.push(word);

    // The last word closes its line whether or not it is punctuated: an
    // unterminated sentence is still something to show.
    if (SENTENCE_END.test(word) || index === words.length - 1) {
      lines.push({ words: current, firstWordIndex });
      firstWordIndex = index + 1;
      current = [];
    }
  }

  return lines;
}

/** Which line a word belongs to, or the last one for an index past the end. */
export function lineOfWord(lines: TurnLine[], wordIndex: number): number {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (wordIndex >= lines[index]!.firstWordIndex) return index;
  }
  return 0;
}
