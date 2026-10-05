import { createHash } from 'node:crypto';
import fs from 'node:fs';

import { describe, expect, it } from 'vitest';

import { PercentRank } from './ta-classes';

const captures = new Map<string, Record<string, string>[]>();
const cases = [
  ['coverage-ta-1-v1', 'percentrank_len14_clean', 14],
  ['coverage-ta-1-v1', 'percentrank_len14_hole40_41', 14],
  ['coverage-ta-1-v1', 'percentrank_len14_lead0_4', 14],
] as const;
const captureHashes: Record<string, string> = {
  'warmup-seed-ma-v2': '64cdc6fc06cc64d0ee2a48210418d55a37a9fa247492d8451335239f6ebf92f0',
  'coverage-ta-1-v1': '9ac3693e2fe77eda33b90b5d334914800f80a8255209f0e3fb486ffae9dba538',
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

describe('native PercentRank operation order', () => {
  it.each(cases)('matches binary64 capture %s %s', (name, title, length) => {
    const percentrank = new PercentRank(length);
    const mismatches: unknown[] = [];
    let count = 0;
    for (const [index, row] of readCapture(name).entries()) {
      const actual = percentrank.compute(source(row, name, title));
      const expected = number(row[title]);
      if (Object.is(actual, expected)) continue;
      count++;
      if (mismatches.length < 3) mismatches.push({ index, actual: bits(actual), expected: bits(expected) });
    }
    expect({ count, mismatches }).toEqual({ count: 0, mismatches: [] });
  });

  it('replaces repeated same-bar updates without changing physical lag', () => {
    const historical = new PercentRank(14);
    const realtime = new PercentRank(14);
    for (const row of readCapture('coverage-ta-1-v1').slice(0, 60)) {
      const price = number(row.input_close);
      const expected = historical.compute(price);
      realtime.compute(price * 1.1);
      expect(Object.is(realtime.recompute(price), expected)).toBe(true);
      expect(Object.is(realtime.recompute(price), expected)).toBe(true);
    }
  });
  it('restores independent snapshots across missing source values', () => {
    const original = new PercentRank(2);
    original.compute(10);
    original.compute(NaN);
    original.compute(12);
    const snapshot = original.save();
    const fork = new PercentRank(2);
    fork.restore(snapshot);
    const values = [13, 14, NaN, 16, 17];
    const expected = values.map((value) => original.compute(value));
    expect(values.map((value) => fork.compute(value))).toEqual(expected);
    fork.restore(snapshot);
    expect(values.map((value) => fork.compute(value))).toEqual(expected);
  });
  it('preserves preceding window, fixed denominator and current-NA rank zero', () => {
    const rank = new PercentRank(2);
    expect(rank.compute(1)).toBeNaN();
    expect(rank.compute(2)).toBeNaN();
    expect(rank.compute(1)).toBe(50);
    expect(rank.compute(NaN)).toBe(0);
    expect(rank.compute(3)).toBe(50);
    expect(() => new PercentRank(0)).toThrow('positive integer');
    expect(() => new PercentRank(1.5)).toThrow('positive integer');
  });
});
