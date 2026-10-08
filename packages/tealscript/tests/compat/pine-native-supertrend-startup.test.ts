import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { type Bar } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

function capturedRows(name: string): Array<Record<string, string>> {
  const lines = readFileSync(new URL(`../../oracle-probes/v2/captures/v2/${name}.csv`, import.meta.url), 'utf8').trim().split(/\r?\n/);
  const headers = lines[0].split(',');
  expect(new Set(headers).size).toBe(headers.length);
  return lines.slice(1, 31).map((line) => Object.fromEntries(line.split(',').map((value, index) => [headers[index], value])));
}

function capturedBars(rows: Array<Record<string, string>>): Bar[] {
  return rows.map((row) => ({ time: Number(row.time) * 1000, open: Number(row.open), high: Number(row.high), low: Number(row.low), close: Number(row.close), volume: Number(row.input_volume) }));
}

// Authority: https://www.tradingview.com/pine-script-reference/v6/, fun_ta.supertrend.
// Native: coverage-ta-3-v1.csv and coverage-tad-1-v1.csv, bars0–29.
describe('native Supertrend startup output', () => {
  it.each([5, 14, 28, 3])('matches captured line and direction with ATR period%s', (period) => {
    const name = period === 3 ? 'coverage-tad-1-v1' : 'coverage-ta-3-v1';
    const rows = capturedRows(name);
    const factor = period === 3 ? 2 : 3;
    const result = runCompatScript(`//@version=6
indicator("Native Supertrend startup")
[line, direction] = ta.supertrend(${factor}, ${period})
plot(line, "line")
plot(direction, "direction")`, { bars: capturedBars(rows) });
    expect(result.errors).toEqual([]);
    for (const member of ['line', 'direction']) {
      const column = period === 3 ? `supertrend_fixed_${member}` : `supertrend_${member}_factor3_atr${period}_chart_clean`;
      const actual = getPlot(result, member).values;
      for (let index = 0; index < rows.length; index++) {
        const text = rows[index][column];
        expect(text).not.toBeUndefined();
        if (text === '') expect.soft(actual[index], `${member} bar${index}`).toBeNull();
        else expect.soft(actual[index], `${member} bar${index}`).toBeCloseTo(Number(text), 7);
      }
    }
  });
});
