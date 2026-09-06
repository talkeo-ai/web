import "server-only";

import { cookies } from "next/headers";

import { SESSION_COOKIE_OPTIONS } from "./anonymous-id";

/**
 * The two things asked before the conversation starts.
 *
 * ⚠ Scaffolding, and the only state this app keeps about the person. The
 * service owns what it knows — `flow.display_name` is where the name belongs,
 * and how to speak is not in the contract at all (`mode` there means something
 * else). Both are held here until the interview can be told, and then this
 * file goes away rather than becoming a second source of truth.
 *
 * ⚠ Reads cookies. Call from a Server Action, or from a component behind a
 * `<Suspense>` boundary.
 */

const NAME_COOKIE = "talkeo_name";
const SPEAKS_COOKIE = "talkeo_speaks";

/** How the person answers: out loud, or typed. */
export type EntryMode = "voice" | "text";

export type EntryAnswers = {
  name: string | null;
  mode: EntryMode | null;
};

export async function readEntryAnswers(): Promise<EntryAnswers> {
  const store = await cookies();
  const mode = store.get(SPEAKS_COOKIE)?.value;

  return {
    name: store.get(NAME_COOKIE)?.value || null,
    mode: mode === "voice" || mode === "text" ? mode : null,
  };
}

export async function writeEntryName(name: string): Promise<void> {
  const store = await cookies();
  store.set(NAME_COOKIE, name, SESSION_COOKIE_OPTIONS);
}

export async function writeEntryMode(mode: EntryMode): Promise<void> {
  const store = await cookies();
  store.set(SPEAKS_COOKIE, mode, SESSION_COOKIE_OPTIONS);
}
