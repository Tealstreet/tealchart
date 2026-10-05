import type { Bar } from '../../src/runtime';

import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

// Reference entries704 gaps/lookahead; other-timeframes-and-data historical HTF timing.
// Existing native HTF captures remain authority beyond this deterministic provider domain.
it('releases confirmed 3-minute values on their closing 1-minute bars with distinct gaps modes', () => {
  const start = Date.UTC(2026, 0, 1);
  const bar = (time: number, close: number): Bar => ({ time, open: close, high: close, low: close, close, volume: 1 });
  const chart = Array.from({ length: 9 }, (_, i) => bar(start + i * 60_000, 100 + i));
  const requested = [10, 20, 30].map((value, i) => bar(start + i * 180_000, value));
  const source = `//@version=6
indicator("Historical merge certification")
plot(request.security("TEST", "3", close), "default")
plot(request.security("TEST", "3", close, gaps=barmerge.gaps_off, lookahead=barmerge.lookahead_off), "carry")
plot(request.security("TEST", "3", close, gaps=barmerge.gaps_on, lookahead=barmerge.lookahead_off), "gaps")`;
  const compiled = tryCompile(parse(source));
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, chart, undefined, {
    requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'TEST', timeframe: '3', bars: requested }]),
    runtime: { timeframe: { period: '1' }, syminfo: { tickerid: 'TEST', timezone: 'Etc/UTC' } },
  });
  expect(result?.errors).toEqual([]);
  const vectors = new Map(result?.plots.map((plot) => [plot.title, plot.values]));
  expect(vectors.get('default')).toEqual([null, null, 10, 10, 10, 20, 20, 20, 30]);
  expect(vectors.get('carry')).toEqual(vectors.get('default'));
  expect(vectors.get('gaps')).toEqual([null, null, 10, null, null, 20, null, null, 30]);
});
