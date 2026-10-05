import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { ALMA } from '../../src/runtime/codegen/ta-classes';

const captureHashes = {
  'warmup-seed-ma-v2': '64cdc6fc06cc64d0ee2a48210418d55a37a9fa247492d8451335239f6ebf92f0',
  'coverage-ta-2-v1': '63d6162eeca68ad27852c1de1ccf7c512f3fea7c3cad13b5c760e33ec36a9b8d',
};
const captures = Object.fromEntries(
  Object.entries(captureHashes).map(([probe, hash]) => {
    const csv = readFileSync(new URL(`../../oracle-probes/v2/captures/v2/${probe}.csv`, import.meta.url), 'utf8');
    expect(createHash('sha256').update(csv).digest('hex')).toBe(hash);
    const [header, ...lines] = csv.trim().split(/\r?\n/);
    const columns = header!.split(',');
    const rows = lines.slice(0, -1).map((line) => {
      const values = line.split(',');
      return Object.fromEntries(
        columns.map((column, index) => [column, values[index] === '' ? NaN : Number(values[index])]),
      );
    });
    return [probe, rows];
  }),
);

const cases = [
  ...[2, 5].flatMap((length) =>
    [false, true].map((holes) => ({
      probe: 'warmup-seed-ma-v2',
      length,
      floor: false,
      source: holes ? 'input_close_holes_p1_p2_p40_p41_p80to85' : 'input_close_clean_seed0',
      title: `alma_len${length}_${holes ? 'holes_p1_p2_p40_p41_p80to85' : 'clean_seed0'}_offset085_sigma6_floorfalse`,
    })),
  ),
  {
    probe: 'warmup-seed-ma-v2',
    length: 5,
    floor: true,
    source: 'input_close_clean_seed0',
    title: 'alma_len5_clean_seed0_offset085_sigma6_floortrue',
  },
  ...['clean', 'hole40_41', 'lead0_4'].map((pattern) => ({
    probe: 'coverage-ta-2-v1',
    length: 14,
    floor: false,
    source: pattern,
    title: `alma_len14_${pattern}`,
  })),
];

describe('native TradingView ALMA binary64 values', () => {
  it.each(cases)('$title matches the capture without a tolerance', ({ probe, title, length, floor, source }) => {
    const alma = new ALMA(length, 0.85, 6, floor);
    for (const [bar, row] of captures[probe]!.entries()) {
      const unavailable = (source === 'hole40_41' && (bar === 40 || bar === 41)) || (source === 'lead0_4' && bar < 5);
      const value = unavailable ? NaN : source in row ? row[source]! : row.input_close!;
      expect(alma.compute(value), `${title} bar${bar}`).toBe(row[title]);
    }
  });
});
