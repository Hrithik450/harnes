export interface SmoothStreamWriter {
  push: (chunk: string) => void;
  /** Instantly reveal everything (stop / abort only). */
  flush: () => void;
  /** Drop all buffered text without painting (caller must clear the bubble). */
  reset: () => void;
  /** Keep revealing at the current pace until display catches up, or until maxWaitMs. */
  drain: (maxWaitMs?: number) => Promise<void>;
  dispose: () => void;
  getReceived: () => string;
  getDisplayed: () => string;
}

export interface CreateSmoothStreamWriterOptions {
  onFlush: (displayed: string) => void;
  /** Steady reveal speed in characters per second. @default 180 */
  charsPerSecond?: number;
  /** Hard cap per animation frame to prevent burst-dumps. @default 12 */
  maxCharsPerFrame?: number;
}

/** Backlog (chars) that starts doubling the reveal speed. */
const CATCH_UP_LAG_CHARS = 160;
/** Ceiling on the catch-up multiplier — never let it become a dump. */
const MAX_CATCH_UP = 8;

export function createSmoothStreamWriter(
  options: CreateSmoothStreamWriterOptions,
): SmoothStreamWriter {
  const charsPerSecond = Math.max(1, options.charsPerSecond ?? 180);
  const maxCharsPerFrame = Math.max(1, options.maxCharsPerFrame ?? 12);

  let received = "";
  let displayed = "";
  let rafId: number | null = null;
  let disposed = false;
  let lastTickMs = 0;
  let carry = 0;
  let drainResolve: (() => void) | null = null;

  const settleDrain = () => {
    if (drainResolve && displayed.length >= received.length) {
      const resolve = drainResolve;
      drainResolve = null;
      resolve();
    }
  };

  const schedule = () => {
    if (disposed || rafId != null) return;
    rafId = requestAnimationFrame(tick);
  };

  const tick = (now: number) => {
    rafId = null;
    if (disposed) return;

    if (lastTickMs === 0) lastTickMs = now;
    const elapsedSec = Math.min(0.05, (now - lastTickMs) / 1000);
    lastTickMs = now;

    if (displayed.length < received.length) {
      const lag = received.length - displayed.length;
      // When network delivers tokens in bursts, speed up dynamically.
      const catchUp = Math.min(MAX_CATCH_UP, 1 + lag / CATCH_UP_LAG_CHARS);
      carry += elapsedSec * charsPerSecond * catchUp;
      let step = Math.floor(carry);
      carry -= step;

      if (step < 1) step = 0;

      // If lag is significant, expand frame capacity so text catches up smoothly.
      const frameLimit =
        lag > 100
          ? Math.max(maxCharsPerFrame, Math.ceil(lag / 6))
          : maxCharsPerFrame;
      step = Math.min(lag, Math.max(step, lag > 200 ? 8 : 1), frameLimit);

      if (step > 0) {
        displayed = received.slice(0, displayed.length + step);
        options.onFlush(displayed);
      }
    }

    if (!disposed && displayed.length < received.length) {
      schedule();
    } else {
      lastTickMs = 0;
      carry = 0;
      settleDrain();
    }
  };

  return {
    push(chunk: string) {
      if (!chunk || disposed) return;
      received += chunk;
      schedule();
    },
    flush() {
      if (disposed) return;
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      carry = 0;
      lastTickMs = 0;
      displayed = received;
      options.onFlush(displayed);
      settleDrain();
    },
    reset() {
      if (disposed) return;
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      received = "";
      displayed = "";
      carry = 0;
      lastTickMs = 0;
      settleDrain();
    },
    drain(maxWaitMs?: number) {
      if (disposed || displayed.length >= received.length) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        let timer: ReturnType<typeof setTimeout> | null = null;
        const previous = drainResolve;
        const finish = () => {
          if (timer != null) {
            clearTimeout(timer);
            timer = null;
          }
          previous?.();
          resolve();
        };

        if (maxWaitMs && maxWaitMs > 0) {
          timer = setTimeout(() => {
            if (!disposed && displayed.length < received.length) {
              if (rafId != null) {
                cancelAnimationFrame(rafId);
                rafId = null;
              }
              carry = 0;
              lastTickMs = 0;
              displayed = received;
              options.onFlush(displayed);
            }
            finish();
          }, maxWaitMs);
        }

        drainResolve = finish;
        schedule();
      });
    },
    dispose() {
      disposed = true;
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      // Unblock any pending drain waiter.
      if (drainResolve) {
        const resolve = drainResolve;
        drainResolve = null;
        resolve();
      }
    },
    getReceived: () => received,
    getDisplayed: () => displayed,
  };
}
