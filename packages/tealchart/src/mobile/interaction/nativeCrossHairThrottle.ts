export interface NativeCrossHairThrottle {
  push(time: number, price: number): void;
  cancel(): void;
}

/**
 * Leading and trailing: the first move emits at once, and the last move of a
 * burst still lands, so a crosshair that stops mid-window reports where it stopped.
 */
export function createNativeCrossHairThrottle(
  emit: (time: number, price: number) => void,
  intervalMs: number,
  now: () => number = Date.now,
): NativeCrossHairThrottle {
  let lastEmitAt = -Infinity;
  let pending: { time: number; price: number } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    timer = null;
    if (!pending) return;
    const { time, price } = pending;
    pending = null;
    lastEmitAt = now();
    emit(time, price);
  };

  return {
    push(time, price) {
      pending = { time, price };
      const wait = intervalMs - (now() - lastEmitAt);
      if (wait <= 0) {
        if (timer) clearTimeout(timer);
        flush();
        return;
      }
      if (!timer) timer = setTimeout(flush, wait);
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      pending = null;
    },
  };
}
