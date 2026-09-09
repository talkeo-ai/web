#!/usr/bin/env node
/**
 * Regenerates the placeholder audio the fixture adapter serves.
 *
 * Every file is silence. What matters is how long each one lasts: the parts
 * that sync the screen to the voice read the clock off a real `<audio>`
 * element, so a file that ends before the words do sends the turn back to its
 * fallback halfway through and the sync path stops being exercised.
 *
 * A turn's length is the one its `word_timings` imply, not the last stamp in
 * them. The recorded turns are anchored sparsely — one turn stamps a single
 * word out of twenty-five — so the tail is extrapolated at the pace of the
 * anchored span. The rule mirrors `lib/talkeo/timeline.ts`, which is the one
 * the screens use; keep the two in step.
 *
 * Everything else the fixtures point at is an exercise or a reply with no
 * timings to imply anything, and stays at one second.
 *
 *   node scripts/mock-audio.mjs
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = join(root, "core", "mock", "fixtures");
const outDir = join(root, "public", "mock-audio");

/** Mirrors `MS_PER_CHAR` in `lib/talkeo/timeline.ts`. */
const MS_PER_CHAR = 65;
/** A breath at the end, so the file does not cut on the last syllable. */
const TAIL_MS = 250;
const DEFAULT_MS = 1000;

const weightOf = (word) => Math.max(word.length, 1);

function durationMsOf(turn) {
  const words = turn.text.trim().split(/\s+/);
  const anchors = (turn.word_timings ?? [])
    .filter((t) => t.word_index >= 0 && t.word_index < words.length)
    .sort((a, b) => a.word_index - b.word_index);

  if (anchors.length === 0) {
    const total = words.reduce((sum, word) => sum + weightOf(word), 0);
    return total * MS_PER_CHAR + TAIL_MS;
  }

  const first = anchors[0];
  const last = anchors[anchors.length - 1];

  let msPerWeight = MS_PER_CHAR;
  if (anchors.length >= 2) {
    let spanWeight = 0;
    for (let i = first.word_index; i < last.word_index; i += 1) {
      spanWeight += weightOf(words[i]);
    }
    if (spanWeight > 0) {
      msPerWeight = (last.start_ms - first.start_ms) / spanWeight;
    }
  }

  let elapsed = last.end_ms;
  for (let i = last.word_index + 1; i < words.length; i += 1) {
    elapsed += weightOf(words[i]) * msPerWeight;
  }
  return elapsed + TAIL_MS;
}

/** Every `{kind:"audio", url}` anywhere in the recorded fixtures. */
function collectUrls(node, into) {
  if (Array.isArray(node)) {
    for (const child of node) collectUrls(child, into);
    return into;
  }
  if (node && typeof node === "object") {
    if (node.kind === "audio" && typeof node.url === "string") into.add(node.url);
    for (const child of Object.values(node)) collectUrls(child, into);
  }
  return into;
}

const urls = new Set();
const durations = new Map();

for (const name of readdirSync(fixtures).filter((f) => f.endsWith(".json"))) {
  const data = JSON.parse(readFileSync(join(fixtures, name), "utf8"));
  collectUrls(data, urls);

  // Only a turn carries the words and stamps a length can be read from.
  for (const entry of Object.values(data.talkeo_turn ?? {})) {
    const turn = entry.turn;
    if (!turn?.audio?.url || !turn.text) continue;
    durations.set(turn.audio.url, durationMsOf(turn));
  }
}

mkdirSync(outDir, { recursive: true });

for (const url of [...urls].sort()) {
  const ms = Math.round(durations.get(url) ?? DEFAULT_MS);
  const file = join(outDir, url.replace(/^\/mock-audio\//, ""));

  execFileSync(
    "ffmpeg",
    [
      ...["-v", "error", "-y"],
      ...["-f", "lavfi", "-i", "anullsrc=r=8000:cl=mono"],
      ...["-t", (ms / 1000).toFixed(3)],
      ...["-c:a", "libmp3lame", "-b:a", "8k"],
      file,
    ],
    { stdio: "inherit" },
  );

  const derived = durations.has(url) ? "from word_timings" : "default";
  console.log(`${url.padEnd(32)} ${String(ms).padStart(6)} ms  (${derived})`);
}
