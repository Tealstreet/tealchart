import { expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeCompiled, tryCompile } from './execute';

it('does not build unused confirmation history for same-timeframe selection modes', () => {
  for (const gaps of ['gaps_on', 'gaps_off']) {
    for (const lookahead of ['lookahead_on', 'lookahead_off']) {
      let timeReads = 0;
      const bars = Array.from({ length: 2_000 }, (_, i) => ({
        get time() {
          timeReads += 1;
          return i * 60_000;
        },
        open: i,
        high: i,
        low: i,
        close: i,
        volume: 1,
      }));
      const chart = [0, 1].map((i) => ({ ...bars[i]! }));
      timeReads = 0;
      const compiled = tryCompile(
        parse(`//@version=6
indicator("same timeframe confirmation")
plot(request.security("OTHER", "1", close, gaps=barmerge.${gaps}, lookahead=barmerge.${lookahead}))`),
      );
      expect(compiled.success).toBe(true);
      const result = executeCompiled(compiled, chart, undefined, {
        runtime: { timeframe: { period: '1' } },
        requestDatafeed: { getBars: () => ({ ok: true, context: { symbol: 'OTHER', timeframe: '1', bars } }) },
      })!;
      expect(result.errors).toEqual([]);
      expect(result.plots[0]!.values).toEqual([0, 1]);
      expect(timeReads).toBeLessThan(6_200);
    }
  }
});
