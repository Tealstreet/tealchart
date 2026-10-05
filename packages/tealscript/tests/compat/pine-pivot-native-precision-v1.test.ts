import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { PivotPointLevels } from '../../src/runtime/codegen/ta-classes';

const captureHashes = { 'coverage-ta-4-v1': 'e2853d53e3dd67e95eb198995f077cc09c921709febfe199fb536ba9df3a6456' };
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

const cases = [false, true].flatMap((skipHole) =>
  [
    { level: 'R3', component: 5 },
    { level: 'R4', component: 7 },
    { level: 'S4', component: 8 },
    { level: 'R5', component: 9 },
    { level: 'S5', component: 10 },
  ].map((level) => ({
    ...level,
    skipHole,
    title: `pivot_levels_traditional_anchor20_${skipHole ? 'skip40_' : ''}frozen_${level.level}`,
  })),
);

describe('native TradingView Traditional pivot binary64 values', () => {
  it.each(cases)('$title matches the capture without a tolerance', ({ title, component, skipHole }) => {
    const pivot = new PivotPointLevels();
    for (const [bar, row] of captures['coverage-ta-4-v1']!.entries()) {
      const anchor = bar % 20 === 0 && !(skipHole && (bar === 40 || bar === 41));
      const levels = pivot.compute(
        'Traditional',
        anchor,
        false,
        row.input_open!,
        row.input_high!,
        row.input_low!,
        row.input_close!,
      );
      expect(levels[component], `${title} bar${bar}`).toBe(row[title]);
    }
  });
});
