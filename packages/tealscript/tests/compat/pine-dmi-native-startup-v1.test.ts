import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { DMI } from '../../src/runtime/codegen/ta-classes';

const nativeRows = (probe: string) => {
  const csv = readFileSync(new URL(`../../oracle-probes/v2/captures/v2/${probe}.csv`, import.meta.url), 'utf8');
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const columns = header!.split(',');
  return lines.slice(0, 600).map((line) => Object.fromEntries(line.split(',').map((value, i) => [columns[i]!, value === '' ? NaN : Number(value)])));
};

const cases = [5, 14, 28].flatMap((length) => [
  { probe: 'coverage-ta-3-v1', column: `dmi_plus_di${length}_adx${length}_chart_clean`, length, component: 0 },
  { probe: 'coverage-ta-3-v1', column: `dmi_minus_di${length}_adx${length}_chart_clean`, length, component: 1 },
  { probe: 'coverage-ta-3-v1', column: `control_dmi_di_sum_len${length}`, length, component: 3 },
]);
cases.push({ probe: 'coverage-tab-1-v1', column: 'dmi_legal_explicit_int_cast_control', length: 3, component: 0 });

describe('native TradingView DMI startup', () => {
  // Authority: oracle-probes/v2/captures/v2/{coverage-ta-3-v1,coverage-tab-1-v1}.csv, bars0–599.
  it.each(cases)('$column matches native startup and convergence', ({ probe, column, length, component }) => {
    const dmi = new DMI(length, length);
    for (const [bar, row] of nativeRows(probe).entries()) {
      const values = dmi.compute(row.input_high!, row.input_low!, row.input_close!);
      const actual = component === 3 ? values[0] + values[1] : values[component]!;
      const expected = row[column]!;
      if (Number.isNaN(expected)) expect(actual, `${column} bar${bar}`).toBeNaN();
      else expect(Math.abs(actual - expected), `${column} bar${bar}`).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(expected)));
    }
  });
});
