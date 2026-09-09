import type { CardEdit } from "@/core/contracts";

/**
 * What is waiting to go, and whether it may.
 *
 * Two rules, and they are deliberately different from each other:
 *
 * - **Typing is never blocked; sending is.** While Talkeo is still writing there
 *   is nothing to send a message to yet, but taking the keyboard away is not how
 *   a conversation works — you compose your answer while the other person
 *   finishes. So the field stays live and the send waits.
 * - **A card edit queues, and travels with their next turn.** Never on its own,
 *   so the model never receives one while it is talking and there is no race to
 *   resolve. If they edit, do not confirm, and then speak, it goes anyway: they
 *   already wrote it, and asking again would be treating them as if they did not
 *   know what they did.
 *
 * A queue for text as well was the alternative, and it is not taken: it is the
 * same mechanism twice for a case that does not need it, and two things in
 * flight is where the ordering bugs live.
 */

export type Outbox = {
  /** Edits made since the last turn went out, latest per card and field. */
  pending: CardEdit[];
};

export const nothingPending: Outbox = { pending: [] };

/**
 * An edit joins the queue, replacing an earlier one for the same line.
 *
 * Replacing rather than appending because the person rewrote the same line: two
 * versions of it would reach the model as two changes of mind, and only the
 * second one is true.
 */
export function queueEdit(outbox: Outbox, edit: CardEdit): Outbox {
  const others = outbox.pending.filter(
    (waiting) => !(waiting.card === edit.card && waiting.field === edit.field),
  );
  return { pending: [...others, edit] };
}

/** Everything waiting, and an emptied outbox. Called when their turn goes out. */
export function flush(outbox: Outbox): { edits: CardEdit[]; rest: Outbox } {
  return { edits: outbox.pending, rest: nothingPending };
}

/**
 * Whether their turn can go now.
 *
 * `answering` is a turn in flight. `listening` is the microphone being open,
 * which is their turn already — sending typed text into it would be answering
 * twice.
 */
export function canSend({
  text,
  answering,
}: {
  text: string;
  answering: boolean;
}): boolean {
  return text.trim().length > 0 && !answering;
}

/** What the one trailing control in the composer does right now. */
export type ComposerAction = "send" | "call" | "hang up";

/**
 * One slot, because the two are never both the thing to press.
 *
 * With text in the field there is something to send and speaking would throw it
 * away; with the field empty there is nothing to send. In a call and empty, the
 * thing offered is leaving the call — not sending nothing.
 */
export function composerAction({
  text,
  inCall,
}: {
  text: string;
  inCall: boolean;
}): ComposerAction {
  if (text.trim().length > 0) return "send";
  return inCall ? "hang up" : "call";
}
