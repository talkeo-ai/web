/**
 * The one-way queue behind an open channel's `messages()`.
 *
 * Messages arrive from an event handler and are read by a loop that may not be
 * at its `await` yet, so neither side can assume the other is ready: what has
 * arrived is buffered, and a reader that got there first is parked. Dropping one
 * here would drop a fragment of what somebody is reading.
 *
 * Its own module so the adapters can have it without importing the file that
 * imports them.
 */
export class MessageQueue<T> {
  private readonly buffered: T[] = [];
  private readonly waiting: ((result: IteratorResult<T>) => void)[] = [];
  private finished = false;

  push(value: T): void {
    if (this.finished) return;
    const waiter = this.waiting.shift();
    if (waiter) waiter({ value, done: false });
    else this.buffered.push(value);
  }

  /** No more will come. Whatever is buffered is still delivered first. */
  finish(): void {
    if (this.finished) return;
    this.finished = true;
    for (const waiter of this.waiting.splice(0)) {
      waiter({ value: undefined, done: true });
    }
  }

  iterate(): AsyncIterable<T> {
    return {
      [Symbol.asyncIterator]: () => ({
        next: (): Promise<IteratorResult<T>> => {
          const buffered = this.buffered.shift();
          if (buffered !== undefined) {
            return Promise.resolve({ value: buffered, done: false });
          }
          if (this.finished) {
            return Promise.resolve({ value: undefined, done: true });
          }
          return new Promise((resolve) => this.waiting.push(resolve));
        },
      }),
    };
  }
}
