import type { WordTiming } from "@/core/contracts";

/**
 * When the voice reaches each word of a turn.
 *
 * With a real voice behind it `word_timings` covers every word and this is
 * arithmetic. Until then it covers a handful — the recorded turns carry
 * between one and five anchors for up to thirty-six words — so the gaps are
 * filled rather than assumed away, and a turn with no timings at all still
 * gets a cadence instead of appearing all at once.
 */
export type Timeline = {
  /** Milliseconds from the start of the turn to the start of this word. */
  startOf(wordIndex: number): number;
  durationMs: number;
};

/**
 * Milliseconds per character of speech.
 *
 * Measured across the ten recorded turns: their anchored spans run 50 to 78 ms
 * per character, median 66.7, and the one turn timed all the way to its last
 * word gives 60. This is the middle of that, and it is only ever reached when
 * the service sends no timings — which it does today, because there is no
 * voice yet.
 */
const MS_PER_CHAR = 65;

/** Longer words take longer to say. Never zero, or a gap divides by nothing. */
function weightOf(word: string): number {
  return Math.max(word.length, 1);
}

/**
 * Builds the map from the anchors the turn carries.
 *
 * `knownDurationMs` is the audio's own length once it has loaded. It wins over
 * anything derived: the file is the ground truth about how long the turn takes.
 */
export function buildTimeline(
  words: string[],
  timings: readonly WordTiming[],
  knownDurationMs?: number,
): Timeline {
  const count = words.length;

  if (count === 0) {
    return { startOf: () => 0, durationMs: knownDurationMs ?? 0 };
  }

  const weights = words.map(weightOf);
  // starts[i] is when word i begins; the extra last entry is when the turn ends.
  const starts = new Array<number | undefined>(count + 1).fill(undefined);

  // A word's end is the next word's start, so every anchor pins two points.
  // Real starts are written second, so an anchor always beats a derived end.
  for (const timing of timings) {
    const index = timing.word_index;
    if (index < 0 || index >= count) continue;
    starts[index + 1] = timing.end_ms;
  }
  for (const timing of timings) {
    const index = timing.word_index;
    if (index < 0 || index >= count) continue;
    starts[index] = timing.start_ms;
  }

  const known = starts
    .map((value, index) => ({ index, value }))
    .filter((entry): entry is { index: number; value: number } => {
      return entry.value !== undefined;
    });

  // The pace to extrapolate at, outside the anchored span. Taken from the span
  // itself when there is one, so a fast or slow turn stays fast or slow.
  let msPerWeight = MS_PER_CHAR;
  if (known.length >= 2) {
    const first = known[0]!;
    const last = known[known.length - 1]!;
    let spanWeight = 0;
    for (let i = first.index; i < last.index; i += 1) spanWeight += weights[i]!;
    if (spanWeight > 0) msPerWeight = (last.value - first.value) / spanWeight;
  }

  if (known.length === 0) {
    // No anchors: the whole turn is cadence. Scaled to the audio when it is
    // there, which is the case that arrives the day a voice ships without
    // timings alongside it.
    let total = 0;
    for (const weight of weights) total += weight;
    const perWeight =
      knownDurationMs && total > 0 ? knownDurationMs / total : MS_PER_CHAR;

    let elapsed = 0;
    for (let i = 0; i <= count; i += 1) {
      starts[i] = elapsed;
      if (i < count) elapsed += weights[i]! * perWeight;
    }

    // The file's own length is the ground truth, so the end is set rather than
    // accumulated: adding up thirty-six products lands a fraction of a
    // millisecond past it, and the turn would never reach its own end.
    if (knownDurationMs !== undefined) starts[count] = knownDurationMs;
  } else {
    // Before the first anchor, walk backwards at the pace.
    const first = known[0]!;
    for (let i = first.index - 1; i >= 0; i -= 1) {
      starts[i] = starts[i + 1]! - weights[i]! * msPerWeight;
    }

    // Between anchors, share the gap out by how long the words are.
    for (let pair = 0; pair < known.length - 1; pair += 1) {
      const from = known[pair]!;
      const to = known[pair + 1]!;
      let gapWeight = 0;
      for (let i = from.index; i < to.index; i += 1) gapWeight += weights[i]!;
      if (gapWeight === 0) continue;

      const perWeight = (to.value - from.value) / gapWeight;
      let elapsed = from.value;
      for (let i = from.index; i < to.index; i += 1) {
        starts[i] = elapsed;
        elapsed += weights[i]! * perWeight;
      }
    }

    // After the last anchor, forward at the same pace.
    const last = known[known.length - 1]!;
    for (let i = last.index + 1; i <= count; i += 1) {
      starts[i] = starts[i - 1]! + weights[i - 1]! * msPerWeight;
    }
  }

  // Anchors are sorted by index above but their times are the service's, so a
  // non-monotonic pair would otherwise let the reveal walk backwards.
  const resolved = starts as number[];
  for (let i = 1; i <= count; i += 1) {
    resolved[i] = Math.max(resolved[i]!, resolved[i - 1]!);
  }
  const offset = resolved[0]!;
  for (let i = 0; i <= count; i += 1) resolved[i]! -= offset;

  return {
    startOf(wordIndex) {
      if (wordIndex <= 0) return resolved[0]!;
      if (wordIndex >= count) return resolved[count]!;
      return resolved[wordIndex]!;
    },
    durationMs: Math.max(resolved[count]!, knownDurationMs ?? 0),
  };
}
