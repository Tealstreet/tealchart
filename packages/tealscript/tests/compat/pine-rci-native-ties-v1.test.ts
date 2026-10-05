import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { RCI } from '../../src/runtime/codegen/ta-classes';

const csv = readFileSync(new URL('../../oracle-probes/v2/captures/v2/coverage-ta-2-v1.csv', import.meta.url), 'utf8');
const captureHash = '63d6162eeca68ad27852c1de1ccf7c512f3fea7c3cad13b5c760e33ec36a9b8d';
expect(createHash('sha256').update(csv).digest('hex')).toBe(captureHash);
const [header, ...lines] = csv.trim().split(/\r?\n/);
const columns = header!.split(',');
const rows = lines.slice(0, -1).map((line) => {
  const values = line.split(',');
  return Object.fromEntries(
    columns.map((column, index) => [column, values[index] === '' ? NaN : Number(values[index])]),
  );
});

describe('native TradingView RCI tied and distinct rank precision', () => {
  it.each(['clean', 'hole40_41', 'lead0_4'])(
    'rci_len14_%s matches every historical native value exactly',
    (pattern) => {
      const rci = new RCI(14);
      for (const [bar, row] of rows.entries()) {
        const missing = (pattern === 'hole40_41' && (bar === 40 || bar === 41)) || (pattern === 'lead0_4' && bar < 5);
        expect(rci.compute(missing ? NaN : row.input_close!), `rci_len14_${pattern} bar${bar}`).toBe(
          row[`rci_len14_${pattern}`],
        );
      }
      expect(rows.length).toBeGreaterThan(24000);
    },
  );
});
