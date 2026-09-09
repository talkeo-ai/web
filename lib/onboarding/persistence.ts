"use client";

import type { Said } from "./conversation";

/**
 * What a reloaded screen redraws the conversation from.
 *
 * Authority splits, and that is what keeps it honest. **The service is the truth**
 * for where the interview is, which cards are up and what it last said — that all
 * comes back from `getInterviewState`. **The browser keeps the presentation**: the
 * thread, and the last turn's audio.
 *
 * The thread is here because the port is explicit that the transcript never
 * leaves the service. The audio is here because re-synthesising it on a reload
 * would produce a different take of the same sentence and bill for it again —
 * five reloads, five recordings. What is cached is what THIS person's voice
 * already said in THIS session, which is the same voice from the same moment.
 * (Pre-generated audio shared between people is a different thing and stays out.)
 *
 * IndexedDB and not `localStorage`: audio is binary, and the string store both
 * cannot hold it and is capped where a minute of speech is not.
 */

const DB = "talkeo-onboarding";
const STORE = "conversations";
const VERSION = 1;

export type RememberedTurn = {
  text: string;
  /** Raw PCM as it came off the socket, joined. */
  audio: ArrayBuffer | null;
  sampleRate: number;
};

export type Remembered = {
  sessionId: string;
  thread: Said[];
  lastTurn: RememberedTurn | null;
};

function open(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DB, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "sessionId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    // A browser with storage refused or full is a browser that shows the
    // conversation without its history, which is worse than having it and much
    // better than not opening.
    request.onerror = () => resolve(null);
  });
}

export async function remember(what: Remembered): Promise<void> {
  const db = await open();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(what);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  db.close();
}

export async function recall(sessionId: string): Promise<Remembered | null> {
  const db = await open();
  if (!db) return null;
  const found = await new Promise<Remembered | null>((resolve) => {
    const request = db.transaction(STORE).objectStore(STORE).get(sessionId);
    request.onsuccess = () => resolve((request.result as Remembered) ?? null);
    request.onerror = () => resolve(null);
  });
  db.close();
  return found;
}

/** At the close, because there is nothing left to come back to. */
export async function forget(sessionId: string): Promise<void> {
  const db = await open();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(sessionId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  db.close();
}

/** The frames of one turn, joined into the one buffer the player wants. */
export function joinFrames(frames: ArrayBuffer[]): ArrayBuffer | null {
  if (frames.length === 0) return null;
  const total = frames.reduce((sum, frame) => sum + frame.byteLength, 0);
  const joined = new Uint8Array(total);
  let at = 0;
  for (const frame of frames) {
    joined.set(new Uint8Array(frame), at);
    at += frame.byteLength;
  }
  return joined.buffer;
}
