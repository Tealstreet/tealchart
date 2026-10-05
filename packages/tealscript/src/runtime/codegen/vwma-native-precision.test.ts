import { createHash } from 'node:crypto';
import fs from 'node:fs';

import { describe, expect, it } from 'vitest';

import { VWMA } from './ta-classes';

const captures = new Map<string, Record<string, string>[]>();
const cases = [
  ['warmup-seed-ma-v2', 'vwma_len2_clean_seed0', 2],
  ['warmup-seed-ma-v2', 'vwma_len5_clean_seed0', 5],
  ['warmup-seed-ma-v2', 'vwma_len2_holes_p1_p2_p40_p41_p80to85', 2],
  ['warmup-seed-ma-v2', 'vwma_len5_holes_p1_p2_p40_p41_p80to85', 5],
  ['coverage-ta-2-v1', 'vwma_len14_clean', 14],
  ['coverage-ta-2-v1', 'vwma_len14_hole40_41', 14],
  ['coverage-ta-2-v1', 'vwma_len14_lead0_4', 14],
] as const;
const captureHashes: Record<string, string> = {
  'warmup-seed-ma-v2': '64cdc6fc06cc64d0ee2a48210418d55a37a9fa247492d8451335239f6ebf92f0',
  'coverage-ta-2-v1': '63d6162eeca68ad27852c1de1ccf7c512f3fea7c3cad13b5c760e33ec36a9b8d',
};
function readCapture(name: string): Record<string, string>[] {
  if (!captures.has(name)) {
    const raw = fs.readFileSync(new URL(`../../../oracle-probes/v2/captures/v2/${name}.csv`, import.meta.url));
    expect(createHash('sha256').update(raw).digest('hex')).toBe(captureHashes[name]);
    const [header, ...lines] = raw.toString().trim().split(/\r?\n/);
    const names = header.split(',');
    captures.set(
      name,
      lines.map((line) => Object.fromEntries(line.split(',').map((value, index) => [names[index], value]))),
    );
  }
  return captures.get(name)!;
}
const number = (value: string): number => (value === '' ? NaN : Number(value));
function source(row: Record<string, string>, name: string, title: string): number {
  if (name === 'warmup-seed-ma-v2') {
    return number(row[title.includes('holes') ? 'input_close_holes_p1_p2_p40_p41_p80to85' : 'input_close_clean_seed0']);
  }
  const index = Number(row.input_bar_index);
  if (title.includes('hole40_41') && (index === 40 || index === 41)) return NaN;
  if (title.includes('lead0_4') && index < 5) return NaN;
  return number(row.input_close);
}
const bits = (value: number): string => {
  const bytes = Buffer.alloc(8);
  bytes.writeDoubleBE(value);
  return bytes.toString('hex');
};

describe('native VWMA operation order', () => {
  it.each(cases)('matches binary64 capture %s %s', (name, title, length) => {
    const vwma = new VWMA(length);
    const mismatches: unknown[] = [];
    let count = 0;
    for (const [index, row] of readCapture(name).entries()) {
      const actual = vwma.compute(source(row, name, title), number(row.input_volume));
      const expected = number(row[title]);
      if (Object.is(actual, expected)) continue;
      count++;
      if (mismatches.length < 3) mismatches.push({ index, actual: bits(actual), expected: bits(expected) });
    }
    expect({ count, mismatches }).toEqual({ count: 0, mismatches: [] });
  });

  it('replaces a same-bar update without retaining either speculative mean', () => {
    const rowData = readCapture('coverage-ta-2-v1').slice(0, 60);
    const historical = new VWMA(14);
    const realtime = new VWMA(14);
    for (const row of rowData) {
      const price = number(row.input_close);
      const volume = number(row.input_volume);
      const expected = historical.compute(price, volume);
      realtime.compute(price * 1.1, volume * 2);
      expect(Object.is(realtime.recompute(price, volume), expected)).toBe(true);
      expect(Object.is(realtime.recompute(price, volume), expected)).toBe(true);
    }
  });

  it('restores independent snapshots including compensation across holes', () => {
    const rows = readCapture('coverage-ta-2-v1').slice(0, 60);
    const original = new VWMA(14);
    for (const row of rows.slice(0, 39)) original.compute(number(row.input_close), number(row.input_volume));
    const snapshot = original.save();
    const fork = new VWMA(14);
    fork.restore(snapshot);
    const expected = rows
      .slice(39)
      .map((row) => original.compute(source(row, 'coverage-ta-2-v1', 'hole40_41'), number(row.input_volume)));
    const values = rows
      .slice(39)
      .map((row) => fork.compute(source(row, 'coverage-ta-2-v1', 'hole40_41'), number(row.input_volume)));
    expect(values).toEqual(expected);
    fork.restore(snapshot);
    expect(
      rows.slice(39).map((row) => fork.compute(source(row, 'coverage-ta-2-v1', 'hole40_41'), number(row.input_volume))),
    ).toEqual(expected);
  });

  it('keeps invalid lengths and zero volume visible', () => {
    expect(() => new VWMA(0)).toThrow('positive integer');
    expect(() => new VWMA(1.5)).toThrow('positive integer');
    const vwma = new VWMA(2);
    expect(vwma.compute(1, 0)).toBeNaN();
    expect(vwma.compute(2, 0)).toBeNaN();
  });
});
