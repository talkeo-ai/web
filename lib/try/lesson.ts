/**
 * The practice you can try without an account: a few sentences to translate by
 * tapping words, after Duolingo's first lesson (Appllama, onb_9vyd9 and
 * onb_y43xz, 1/nov). Duolingo's own test of putting a lesson before sign-up
 * gave +20% daily active users (First Round Review, 2017).
 *
 * The sentences are the classic traps of a Spanish speaker, each with the line
 * that explains it: the point is to show in twenty seconds what Talkeo does —
 * notice what is hard for you and say why — not to teach a lesson.
 *
 * Content is static and lives in the messages; nothing here calls the Core.
 */

export type TryItem = {
  prompt: string;
  /** The words of the right answer, in order. */
  answer: string[];
  /** The tiles on offer: the answer's words plus traps, already mixed. */
  bank: string[];
  /** Why the trap is a trap, shown after checking. */
  tip: string;
};

/** Indices into `bank`, in the order they were tapped. */
export type Picked = number[];

export function pick(picked: Picked, index: number): Picked {
  return picked.includes(index) ? picked : [...picked, index];
}

export function unpick(picked: Picked, index: number): Picked {
  return picked.filter((i) => i !== index);
}

export function sentence(item: TryItem, picked: Picked): string[] {
  return picked.map((i) => item.bank[i]);
}

/** Right when the tapped words are the answer's, in its order. */
export function isRight(item: TryItem, picked: Picked): boolean {
  const said = sentence(item, picked);
  return (
    said.length === item.answer.length &&
    said.every((word, i) => word === item.answer[i])
  );
}
