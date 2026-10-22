"use client";

import { openInterview, type InterviewChannel, type InterviewMessage } from "@/core/channel";

/**
 * One channel per session, one loop over it, and any number of readers.
 *
 * ⚠ **The channel's `messages()` has ONE consumer, and this is what enforces it.**
 * `MessageQueue` hands every iterator the same buffer and the same waiter list,
 * so two loops over one channel do not each see everything — they split it. And
 * a loop that is closing checks whether it is still wanted only AFTER taking a
 * message off the queue, so it takes one with it.
 *
 * React mounts an effect, tears it down and mounts it again, which meant a
 * second loop and therefore exactly one message lost per remount. The lost one
 * is the first of the turn, `turn_started`; without it the reducer has no live
 * turn and drops every `text` that follows, so Talkeo spoke to a blank screen
 * and the words appeared at `turn_done`, once it had finished saying them.
 * Measured in a browser on 9/sep, on every first entry — a reload hid it,
 * because a resumed session is served from the cache and never reads the socket
 * at all.
 *
 * So the loop belongs to the channel and not to the reader. A remount swaps a
 * listener; nothing restarts, and nothing is taken off the queue by somebody on
 * their way out.
 */

type Listener = (message: InterviewMessage) => void;

type Shared = {
  channel: InterviewChannel;
  listeners: Set<Listener>;
  /**
   * What arrived while nobody was listening.
   *
   * A remount removes the old listener and adds the new one a tick apart, and
   * the service does not pause for it. Held rather than dropped, and handed to
   * whoever arrives — which is the whole point of the exercise.
   */
  held: InterviewMessage[];
};

const open = new Map<string, Shared>();

/** Closing is deferred by a tick: a teardown and the remount after it are one breath. */
function releaseIn(sessionId: string, shared: Shared, listener: Listener): void {
  shared.listeners.delete(listener);
  setTimeout(() => {
    const still = open.get(sessionId);
    if (!still || still !== shared || still.listeners.size > 0) return;
    open.delete(sessionId);
    still.channel.close();
  }, 0);
}

function pump(sessionId: string, shared: Shared): void {
  void (async () => {
    for await (const message of shared.channel.messages()) {
      if (open.get(sessionId) !== shared) return;
      if (shared.listeners.size === 0) {
        shared.held.push(message);
        continue;
      }
      // Copied: a listener may leave while the others are being told.
      for (const listener of [...shared.listeners]) listener(message);
    }
  })();
}

/**
 * Read this session's channel. Returns it, and how to stop reading.
 *
 * The channel is opened on the first reader and closed a tick after the last
 * one leaves.
 */
export function readInterview(
  sessionId: string,
  listener: Listener,
): { channel: InterviewChannel; opened: boolean; release: () => void } {
  const known = open.get(sessionId);
  if (known) {
    known.listeners.add(listener);
    // Whatever arrived in the gap goes to whoever turned up, in order.
    for (const message of known.held.splice(0)) listener(message);
    return {
      channel: known.channel,
      opened: false,
      release: () => releaseIn(sessionId, known, listener),
    };
  }

  const shared: Shared = {
    channel: openInterview(sessionId),
    listeners: new Set([listener]),
    held: [],
  };
  open.set(sessionId, shared);
  pump(sessionId, shared);
  return {
    channel: shared.channel,
    // Whether this reader is the one that opened it, which is how the caller
    // knows whether the conversation still has to be asked for.
    opened: true,
    release: () => releaseIn(sessionId, shared, listener),
  };
}

/** Tests only. */
export function forgetInterviews(): void {
  for (const [sessionId, shared] of open) {
    open.delete(sessionId);
    shared.channel.close();
  }
}
