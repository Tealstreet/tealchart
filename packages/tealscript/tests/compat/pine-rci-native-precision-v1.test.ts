import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { RCI } from '../../src/runtime/codegen/ta-classes';

const captureHashes = { 'coverage-ta-2-v1': '63d6162eeca68ad27852c1de1ccf7c512f3fea7c3cad13b5c760e33ec36a9b8d' };
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

describe('native TradingView no-tie RCI binary64 values', () => {
  it.each(['clean', 'hole40_41', 'lead0_4'])('rci_len14_%s matches native without a tolerance', (pattern) => {
    const rci = new RCI(14);
    const title = `rci_len14_${pattern}`;
    const history: number[] = [];
    let matched = 0;
    for (const [bar, row] of captures['coverage-ta-2-v1']!.entries()) {
      const unavailable = (pattern === 'hole40_41' && (bar === 40 || bar === 41)) || (pattern === 'lead0_4' && bar < 5);
      const source = unavailable ? NaN : row.input_close!;
      history.push(source);
      const actual = rci.compute(source);
      const window = history.slice(-14);
      if (window.length === 14 && window.every(Number.isFinite) && new Set(window).size === 14) {
        expect(actual, `${title} bar${bar}`).toBe(row[title]);
        matched += 1;
      }
    }
    expect(matched).toBeGreaterThan(19000);
  });
});
