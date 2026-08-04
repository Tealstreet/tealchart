import type { SharedValue } from 'react-native-reanimated';

import { useEffect } from 'react';

import { useSharedValue } from 'react-native-reanimated';

const NATIVE_COUNTDOWN_TICK_MS = 1000;

export function getNativeCountdownNextTickDelay(nowMs: number, tickMs = NATIVE_COUNTDOWN_TICK_MS): number {
  if (!Number.isFinite(nowMs) || !Number.isFinite(tickMs) || tickMs <= 0) return NATIVE_COUNTDOWN_TICK_MS;
  const elapsed = nowMs % tickMs;
  return elapsed === 0 ? tickMs : tickMs - elapsed;
}

export function useNativeCountdownClock(enabled: boolean): SharedValue<number> {
  const nowMs = useSharedValue(Date.now());

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextTick = () => {
      if (cancelled) return;
      const nextNowMs = Date.now();
      nowMs.value = nextNowMs;
      timeout = setTimeout(scheduleNextTick, getNativeCountdownNextTickDelay(nextNowMs));
    };

    scheduleNextTick();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [enabled, nowMs]);

  return nowMs;
}
