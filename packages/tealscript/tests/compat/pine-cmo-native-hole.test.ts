import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { CMO } from '../../src/runtime/codegen/ta-classes';
import { getPlot, runCompatScript } from './fixtures';

// TradingView v1 capture, unchanged source/capture: first 80 of 23923 rows.
// Expected values come directly from the native builtin, not an engine formula.
const csv = readFileSync(
  new URL('../../oracle-probes/captures/v1/na-holes-oscillators-v1.csv', import.meta.url),
  'utf8',
);
const [header, ...lines] = csv.trim().split(/\r?\n/);
const columns = header!.split(',');
const rows = lines
  .slice(0, 80)
  .map((line) => Object.fromEntries(line.split(',').map((value, index) => [columns[index]!, value])));
const bars = rows.map((row) => ({
  time: Number(row.time) * 1000,
  open: Number(row.open),
  high: Number(row.high),
  low: Number(row.low),
  close: Number(row.close),
  volume: Number(row.input_volume),
}));
const expected = (variant: string) =>
  rows.map((row) => (row[`cmo_len14_${variant}`] === '' ? null : Number(row[`cmo_len14_${variant}`])));
const holeSource = (index: number) => (index === 40 || index === 41 ? NaN : bars[index]!.close);

function expectNative(actual: number | null, native: number | null) {
  if (native === null) expect(actual === null || Number.isNaN(actual)).toBe(true);
  else {
    expect(actual).not.toBeNull();
    expect(Number.isFinite(actual)).toBe(true);
    expect(actual!).toBeCloseTo(native, 10);
  }
}

describe('CMO native missing-source capture', () => {
  it.each([
    ['clean', 'close'],
    ['nahole_bar40_41', 'bar_index == 40 or bar_index == 41 ? na : close'],
    ['nastart_bar0_2', 'bar_index < 3 ? na : close'],
  ])('matches the native %s vector, including warmup and recovery', (variant, source) => {
    expect(createHash('sha256').update(csv).digest('hex')).toBe(
      '3023fb721431d8aee85b5c61c6e39680266ba8b4835c5c9b979cc09297caab9e',
    );
    const result = runCompatScript(
      `//@version=6\nindicator("CMO native")\ns = ${source}\nplot(ta.cmo(s, 14), title="CMO")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    const values = getPlot(result, 'CMO').values;
    expect(values).toHaveLength(80);
    expected(variant).forEach((value, index) => expectNative(values[index]!, value));
    if (variant === 'nahole_bar40_41') {
      expect(values.slice(40, 43)).toEqual(Array(3).fill(-34.74477087897256));
    }
  });

  it('replaces provisional samples across missing-source transitions', () => {
    const cmo = new CMO(14);
    const native = expected('nahole_bar40_41');
    for (let index = 0; index < 39; index++) cmo.compute(holeSource(index));
    for (let index = 39; index < 80; index++) {
      cmo.compute(bars[index]!.close + 1000);
      cmo.recompute(NaN);
      expectNative(cmo.recompute(holeSource(index)), native[index]!);
    }
  });

  it('restores both sum windows and the previous raw sample after a divergent run', () => {
    const cmo = new CMO(14);
    const native = expected('nahole_bar40_41');
    for (let index = 0; index < 40; index++) cmo.compute(holeSource(index));
    const saved = cmo.save();
    for (let index = 40; index < 60; index++) cmo.compute(bars[index]!.close + index * 1000);
    cmo.restore(saved);
    for (let index = 40; index < 80; index++) expectNative(cmo.compute(holeSource(index)), native[index]!);
  });
});
