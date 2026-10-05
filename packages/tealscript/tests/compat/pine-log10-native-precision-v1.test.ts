import type { Bar } from '../../src/runtime/context';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

const capture = readFileSync(
  new URL('../../oracle-probes/v2/captures/v2/coverage-math-1-v1-attempt2.csv', import.meta.url),
  'utf8',
);
expect(createHash('sha256').update(capture).digest('hex')).toBe(
  '0914d422c185c46f1a15cac447517c84e456c7fca70afab9728dd706f72b2a42',
);
const source = readFileSync(new URL('../../oracle-probes/v2/coverage-math-1-v1.pine', import.meta.url), 'utf8');
expect(createHash('sha256').update(source).digest('hex')).toBe(
  '9a62267fed136796a9682aa05d561970edbb232d71fa7f26fd7f30834c4c461f',
);
const [header, ...lines] = capture.trim().split(/\r?\n/);
const columns = header!.split(',');
const rows = lines.slice(0, -1).map((line) => {
  const values = line.split(',');
  return Object.fromEntries(
    columns.map((column, index) => [column, values[index] === '' ? NaN : Number(values[index])]),
  );
});
const bars: Bar[] = rows.map((row) => ({
  time: row.input_time!,
  open: row.input_open!,
  high: row.input_high!,
  low: row.input_low!,
  close: row.input_close!,
  volume: row.input_volume!,
}));
const nativeRun = executeScript(parse(source), bars, undefined, {
  runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } },
});
expect(nativeRun.errors).toEqual([]);

describe('native TradingView log10 binary64 values', () => {
  it.each(['clean', 'hole97', 'warm0_7'])('log10_%s matches historical capture without tolerance', (pattern) => {
    const title = `log10_${pattern}`;
    const actual = nativeRun.plots.find((plot) => plot.title === title)!.values;
    expect(actual).toHaveLength(rows.length);
    let finite = 0;
    for (const [index, row] of rows.entries()) {
      const expected = row[title]!;
      expect(actual[index], `${title} bar${index}`).toBe(Number.isNaN(expected) ? null : expected);
      if (Number.isFinite(expected)) finite += 1;
    }
    expect(finite).toBeGreaterThan(23000);
  });

  it.each([4, 5, 6])('keeps v%s powers of ten and unavailable-domain controls', (version) => {
    const call = version === 4 ? 'log10(close)' : 'math.log10(number=close)';
    const declaration = version === 4 ? 'study' : 'indicator';
    const controlBars = [0, -1, 1, 10, 100, 0.1].map((close, index) => ({
      time: (index + 1) * 60000,
      open: close,
      high: close,
      low: close,
      close,
      volume: 10,
    }));
    const run = executeScript(
      parse(`//@version=${version}\n${declaration}("Log10 domains")\nplot(${call})`),
      controlBars,
    );
    expect(run.errors).toEqual([]);
    expect(run.plots[0]!.values).toEqual([null, null, 0, 1, 2, -1]);
  });
});
