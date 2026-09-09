/**
 * The delivery marks the service writes into a turn's text.
 *
 * The copy carries them inline — `[happy] Hola, [pause] soy Talkeo.` — because
 * they are instructions for the voice, which reads the same string. On screen
 * they are square brackets in the middle of a sentence.
 *
 * ⚠ Stripping them has to happen **before** anything counts words. `marks` and
 * `word_timings` are numbered against the words the person hears, and a tag
 * left in the string is one more token: every index after the first tag lands
 * one word late, so a highlight fires on the wrong word and a line reveals out
 * of step. That is the same defect the two units of `lines.ts` exist to
 * prevent, arriving from the other direction.
 *
 * They are not thrown away. Each one keeps the word index it preceded, which is
 * what a voice will want when there is one — and what says, later, whether the
 * service should be sending them apart from the text instead.
 */

export type VoiceTag = {
  /** The name between the brackets, lowercased. */
  name: string;
  /** The word it sits in front of, numbered in the stripped text. */
  wordIndex: number;
};

export type SpokenText = {
  /** The turn with every tag removed and its spacing repaired. */
  text: string;
  tags: VoiceTag[];
};

/**
 * A bracketed lowercase word, and nothing else.
 *
 * Deliberately narrow: text can legitimately contain brackets — a quote, an
 * aside, a placeholder the model wrote — and eating those would silently lose
 * words the person was meant to read. A tag is one word, no spaces, no
 * punctuation.
 */
const TAG = /\[([a-z][a-z_-]*)\]/g;

export function stripVoiceTags(text: string): SpokenText {
  const tags: VoiceTag[] = [];

  // Words counted as they survive, so an index is always against the text that
  // comes out rather than the one that went in.
  let wordsBefore = 0;
  let lastEnd = 0;
  let stripped = "";

  for (const match of text.matchAll(TAG)) {
    const before = text.slice(lastEnd, match.index);
    wordsBefore += countWords(before);
    stripped += before;
    tags.push({ name: match[1]!, wordIndex: wordsBefore });
    lastEnd = match.index + match[0].length;
  }

  stripped += text.slice(lastEnd);

  // A tag removed from between two words leaves two spaces behind, and the
  // tokeniser splits on runs of whitespace — but the text is also what gets
  // rendered, and a double space is visible.
  return { text: stripped.replace(/\s{2,}/g, " ").trim(), tags };
}

function countWords(fragment: string): number {
  const trimmed = fragment.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}
