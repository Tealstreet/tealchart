import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { LinReg } from '../../src/runtime/codegen/ta-classes';

const captureHashes = {
  'warmup-seed-ma-v2': '64cdc6fc06cc64d0ee2a48210418d55a37a9fa247492d8451335239f6ebf92f0',
  'coverage-ta-2-v1': '63d6162eeca68ad27852c1de1ccf7c512f3fea7c3cad13b5c760e33ec36a9b8d',
  'coverage-tab-1-v1': 'a1c5830fe34d2749e75961702255d0d51dcf79655750536b940a637c0302e4bb',
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
      offset: 0,
      source: holes ? 'input_close_holes_p1_p2_p40_p41_p80to85' : 'input_close_clean_seed0',
      title: `linreg_len${length}_${holes ? 'holes_p1_p2_p40_p41_p80to85' : 'clean_seed0'}_offset0`,
    })),
  ),
  ...['clean', 'hole40_41', 'lead0_4'].map((pattern) => ({
    probe: 'coverage-ta-2-v1',
    length: 14,
    offset: 0,
    source: pattern,
    title: `linreg_len14_${pattern}`,
  })),
  { probe: 'coverage-tab-1-v1', length: 0, offset: 0, source: 'input_dynamic_source', title: 'linreg_dynamic_builtin' },
  {
    probe: 'coverage-tab-1-v1',
    length: 3,
    offset: 3,
    source: 'input_close',
    title: 'linreg_offset_legal_explicit_int_cast_control',
  },
];

describe('native TradingView linear regression binary64 values', () => {
  it.each(cases)('$title matches the capture without a tolerance', ({ probe, title, length, offset, source }) => {
    const linreg = length ? new LinReg(length, offset) : null;
    const history: number[] = [];
    for (const [bar, row] of captures[probe]!.entries()) {
      const unavailable = (source === 'hole40_41' && (bar === 40 || bar === 41)) || (source === 'lead0_4' && bar < 5);
      const value = unavailable ? NaN : source in row ? row[source]! : row.input_close!;
      history.push(value);
      let actual: number;
      if (linreg) actual = linreg.compute(value);
      else {
        const dynamic = new LinReg(row.input_dynamic_length!, offset);
        actual = NaN;
        for (const sample of history.slice(-row.input_dynamic_length!)) actual = dynamic.compute(sample);
      }
      expect(actual, `${title} bar${bar}`).toBe(row[title]);
    }
  });
});
