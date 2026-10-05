import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Authority: reference/pine-v6-reference-v1.json functions[209]; native v2 CSV rows0–95.
// coverage-register-ta-1-v1 stoch_recovery_len4_builtin retains the last defined ratio.
describe('native stochastic zero-range recovery', () => {
  it('retains the last defined value after a nonzero high-low window becomes flat', () => {
    const [header, ...lines] = readFileSync(
      new URL('../../oracle-probes/v2/captures/v2/coverage-register-ta-1-v1.csv', import.meta.url),
      'utf8',
    )
      .trim()
      .split('\n');
    const names = header.split(',');
    const rows = lines
      .slice(0, 96)
      .map((line) =>
        Object.fromEntries(line.split(',').map((value, index) => [names[index], value === '' ? null : Number(value)])),
      );
    const bars = rows.map((row) => ({
      time: Number(row.time) * 1000,
      open: Number(row.input_open),
      high: Number(row.input_high),
      low: Number(row.input_low),
      close: Number(row.input_close),
      volume: Number(row.input_volume),
    }));
    const source = `//@version=6\nindicator("stochastic recovery")\np = bar_index % 64\nh = p == 24 or p == 25 ? 7.0 : 5.0\nl = p == 24 or p == 25 ? 3.0 : 5.0\nplot(ta.stoch(5.0, h, l, 4), "value")`;
    const result = runCompatScript(source, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'value').values).toEqual(rows.map((row) => row.stoch_recovery_len4_builtin));
  });
});
