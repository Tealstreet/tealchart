import type { Bar, DatafeedBar } from '../types';
import type { ResolutionInput } from './normalizeResolution';

import { intervalToMs } from './intervalMs';

const MIN_REALISTIC_EPOCH_SECONDS = 946_684_800; // 2000-01-01T00:00:00Z
const MIN_REALISTIC_EPOCH_MS = MIN_REALISTIC_EPOCH_SECONDS * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const normalizeEpochTimeToMs = (time: number): number => {
  if (!Number.isFinite(time)) return time;
  if (time >= MIN_REALISTIC_EPOCH_SECONDS && time < MIN_REALISTIC_EPOCH_MS) {
    return time * 1000;
  }
  return time;
};

const normalizeBarOpenTime = (time: number, resolution: ResolutionInput): number => {
  const timeMs = normalizeEpochTimeToMs(time);
  const intervalMs = intervalToMs(resolution);

  // Intraday TradingView bars are keyed by bucket-open timestamp. Some
  // exchange feeds emit the still-forming historical bar at a tick/update
  // timestamp, then realtime arrives at bucket-open and visibly moves the
  // candle. Normalize only realistic epoch timestamps so legacy unit tests and
  // synthetic custom data domains keep their exact coordinates.
  if (!Number.isFinite(timeMs) || timeMs < MIN_REALISTIC_EPOCH_MS) return timeMs;
  if (!Number.isFinite(intervalMs) || intervalMs <= 0 || intervalMs >= DAY_MS) return timeMs;

  return Math.floor(timeMs / intervalMs) * intervalMs;
};

export const normalizeDatafeedBar = (bar: DatafeedBar, resolution: ResolutionInput): Bar => ({
  ...bar,
  time: normalizeBarOpenTime(bar.time, resolution),
  volume: bar.volume ?? 0,
});

export const normalizeDatafeedBars = (bars: DatafeedBar[], resolution: ResolutionInput): Bar[] =>
  bars.map((bar) => normalizeDatafeedBar(bar, resolution));
