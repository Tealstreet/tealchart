import type { Bar } from '../../src/runtime';

export function generateDeterministicBars(count: number, seed: number = 42): Bar[] {
  const bars: Bar[] = [];
  let price = 100;
  const baseTime = 1_700_000_000_000;
  const interval = 60_000;

  let state = seed;
  const nextRand = (): number => {
    state = (Math.imul(state, 1103515245) + 12345) & 0x7fffffff;
    return (state / 0x7fffffff) * 2 - 1;
  };

  for (let i = 0; i < count; i++) {
    const drift = nextRand() * 2;
    const volatility = 1 + Math.abs(nextRand()) * 2;

    const open = Math.round((price + drift * 0.3) * 100) / 100;
    const move1 = nextRand() * volatility;
    const move2 = nextRand() * volatility;
    const close = Math.round((open + drift + nextRand() * volatility * 0.5) * 100) / 100;

    const high = Math.round(Math.max(open, close, open + Math.abs(move1)) * 100) / 100;
    const low = Math.round(Math.min(open, close, open - Math.abs(move2)) * 100) / 100;
    const volume = Math.round(800 + Math.abs(nextRand()) * 1200);

    bars.push({
      time: baseTime + i * interval,
      open,
      high,
      low,
      close,
      volume,
    });

    price = close;
  }

  return bars;
}
