/**
 * Reveals thoughts one at a time at a fixed cadence, independent of how fast
 * the network delivers them. The server may send all thoughts for a step in a
 * single burst; this scheduler paces them so the UI reads as a calm, steady
 * progression rather than a flicker.
 *
 * It also exposes when the queue has drained AND the server signalled there
 * are no more thoughts, so the caller can release the buffered final text at
 * exactly the right moment.
 */

export interface RevealThought {
  id: string;
  title: string;
  subtitle?: string;
}

export interface ThoughtRevealScheduler {
  /** Queue a thought for display. */
  enqueue: (thought: RevealThought) => void;
  /** The server will send no further thoughts. Resolves `done` once drained. */
  seal: () => void;
  /** Resolves when every queued thought has finished revealing. */
  whenDrained: () => Promise<void>;
  /** Stop immediately; queued thoughts are dropped. */
  dispose: () => void;
}

export interface ThoughtRevealCallbacks {
  onReveal: (thought: RevealThought, index: number) => void;
  onComplete: (thoughtId: string, index: number) => void;
}

export interface ThoughtRevealOptions {
  /** Time a thought stays on screen (running) before it is marked completed. */
  perThoughtMs?: number;
  /** Pause between finishing one thought and starting the next. */
  gapMs?: number;
  /**
   * Safety valve: if the reveals would take longer than this, tighten the
   * cadence so we never keep the user waiting on cosmetics.
   */
  maxTotalMs?: number;
}

export function createThoughtRevealScheduler(
  callbacks: ThoughtRevealCallbacks,
  options: ThoughtRevealOptions = {},
): ThoughtRevealScheduler {
  const perThoughtMs = options.perThoughtMs ?? 620;
  const gapMs = options.gapMs ?? 90;
  const maxTotalMs = options.maxTotalMs ?? 4200;

  const queue: RevealThought[] = [];
  let index = 0;
  let sealed = false;
  let disposed = false;
  let running = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let drainResolvers: Array<() => void> = [];

  const settleIfDrained = () => {
    if (sealed && !running && queue.length === 0) {
      const resolvers = drainResolvers;
      drainResolvers = [];
      resolvers.forEach((r) => r());
    }
  };

  const effectivePerThoughtMs = (remaining: number) => {
    // If there is a big backlog, speed up so total reveal time stays bounded.
    const projected = remaining * (perThoughtMs + gapMs);
    if (projected <= maxTotalMs) return perThoughtMs;
    const scaled = Math.max(120, (maxTotalMs / remaining) - gapMs);
    return scaled;
  };

  const pump = () => {
    if (disposed) return;
    if (queue.length === 0) {
      running = false;
      settleIfDrained();
      return;
    }

    running = true;
    const thought = queue.shift()!;
    const myIndex = index++;
    const remaining = queue.length + 1;

    callbacks.onReveal(thought, myIndex);

    const dwell = effectivePerThoughtMs(remaining);
    timer = setTimeout(() => {
      timer = null;
      if (disposed) return;
      callbacks.onComplete(thought.id, myIndex);
      // Short gap so completion registers visually before the next appears.
      timer = setTimeout(() => {
        timer = null;
        if (disposed) return;
        pump();
      }, gapMs);
    }, dwell);
  };

  return {
    enqueue(thought) {
      if (disposed || sealed) return;
      queue.push(thought);
      if (!running && timer == null) pump();
    },
    seal() {
      sealed = true;
      settleIfDrained();
    },
    whenDrained() {
      if (sealed && !running && queue.length === 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        drainResolvers.push(resolve);
      });
    },
    dispose() {
      disposed = true;
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
      queue.length = 0;
      running = false;
      const resolvers = drainResolvers;
      drainResolvers = [];
      resolvers.forEach((r) => r());
    },
  };
}
