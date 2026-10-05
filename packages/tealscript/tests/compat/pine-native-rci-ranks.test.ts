import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import type { Bar } from '../../src/runtime/context';

// Native CSV: oracle-probes/v2/captures/v2/coverage-ta-2-v1.csv, bars14..63.
// Bar55 has tied closes; the native RCI is -7.260730466229202, not -7.14285714285714.
const lines = readFileSync(new URL('../../oracle-probes/v2/captures/v2/coverage-ta-2-v1.csv', import.meta.url), 'utf8').split('\n');
const headers = lines[0].split(',');
const rows = lines.slice(1, 65).map((line) => line.split(','));
const bars: Bar[] = rows.map((row) => ({
  time: Number(row[0]) * 1000, open: Number(row[1]), high: Number(row[2]),
  low: Number(row[3]), close: Number(row[4]), volume: 10,
}));

describe('native RCI average price rank normalization', () => {
  it.each(['clean', 'hole40_41', 'lead0_4'])('matches every complete finite %s rank window at bars14..63', (kind) => {
    const missing = (index: number) => kind === 'hole40_41' ? index === 40 || index === 41 : kind === 'lead0_4' && index < 5;
    const source = kind === 'hole40_41' ? 'bar_index == 40 or bar_index == 41 ? na : close' : kind === 'lead0_4' ? 'bar_index < 5 ? na : close' : 'close';
    const ast = parse(`//@version=6\nindicator("Native RCI ranks")\nsource = ${source}\nplot(ta.rci(source, 14))`);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots).toHaveLength(1);
    const expectedColumn = headers.indexOf(`rci_len14_${kind}`);
    for (let index = 14; index < bars.length; index += 1) {
      if (Array.from({ length: 14 }, (_, offset) => missing(index - offset)).some(Boolean)) continue;
      expect(result.plots[0].values[index], `native ${kind} bar ${index}`).toBeCloseTo(Number(rows[index][expectedColumn]), 10);
    }
  });
});
