import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { DMI } from '../../src/runtime/codegen/ta-classes';

const captureHashes = {
  'coverage-ta-3-v1': '900b9f3fe5a8c8fcd4f73ce9062f4fced2d087dafaefb02754a7456c027d94fd',
  'coverage-tab-1-v1': 'a1c5830fe34d2749e75961702255d0d51dcf79655750536b940a637c0302e4bb',
};

const captures = Object.fromEntries(
  Object.entries(captureHashes).map(([probe, hash]) => {
    const csv = readFileSync(new URL(`../../oracle-probes/v2/captures/v2/${probe}.csv`, import.meta.url), 'utf8');
    expect(createHash('sha256').update(csv).digest('hex')).toBe(hash);
    const [header, ...lines] = csv.trim().split(/\r?\n/);
    const columns = header!.split(',');
    const rows = lines.slice(0, 600).map((line) => {
      const values = line.split(',');
      return Object.fromEntries(
        columns.map((column, index) => [column, values[index] === '' ? NaN : Number(values[index])]),
      );
    });
    return [probe, rows];
  }),
);

const cases = [5, 14, 28].flatMap((length) => [
  { probe: 'coverage-ta-3-v1', title: `dmi_plus_di${length}_adx${length}_chart_clean`, length, component: 0 },
  { probe: 'coverage-ta-3-v1', title: `dmi_minus_di${length}_adx${length}_chart_clean`, length, component: 1 },
  { probe: 'coverage-ta-3-v1', title: `dmi_adx_di${length}_adx${length}_chart_clean`, length, component: 2 },
  { probe: 'coverage-ta-3-v1', title: `control_dmi_di_sum_len${length}`, length, component: 3 },
]);
cases.push({ probe: 'coverage-tab-1-v1', title: 'dmi_legal_explicit_int_cast_control', length: 3, component: 0 });

describe('native TradingView DMI binary64 values', () => {
  it.each(cases)('$title matches the captured values without a tolerance', ({ probe, title, length, component }) => {
    const dmi = new DMI(length, length);
    for (const [bar, row] of captures[probe]!.entries()) {
      const values = dmi.compute(row.input_high!, row.input_low!, row.input_close!);
      const actual = component === 3 ? values[0] + values[1] : values[component]!;
      expect(actual, `${title} bar${bar}`).toBe(row[title]);
    }
  });
});
