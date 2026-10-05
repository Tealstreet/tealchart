import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

const source = readFileSync(new URL('../../oracle-probes/v4/native-float-magnitude-output-v1.pine', import.meta.url), 'utf8');
const bars = Array.from({ length: 16 }, (_, index) => ({
  time: 1788134400000 + index * 120000, open: 1, high: 2, low: 0, close: 1, volume: 1,
}));

describe('native float magnitude plot boundary', () => {
  it('reuses the original native source and suppresses large plot values', () => {
    const result = executeScript(parse(source), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.find((plot) => plot.title === 'OUTCOME')?.values).toEqual([
      9e99, null, null, null, null, null, null, 0,
      9e99, null, null, null, null, null, null, 0,
    ]);
    expect(result.plots.find((plot) => plot.title === 'SCALED_SOURCE')?.values).toEqual([
      0.9, 1, 1.1, -1.1, 10, null, null, 0,
      0.9, 1, 1.1, -1.1, 10, null, null, 0,
    ]);
  });

  it('preserves arithmetic and historical source values above the output bound', () => {
    const result = executeScript(parse(source), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.find((plot) => plot.title === 'SOURCE_NA')?.values).toEqual(Array(16).fill(0));
    expect(result.plots.find((plot) => plot.title === 'PREVIOUS_NA')?.values).toEqual([1, ...Array(15).fill(0)]);
    expect(result.logs.slice(0, 5).map((log) => log.message)).toEqual([
      'phase=0; source-na=false; scaled=0.9; previous-na=true',
      'phase=1; source-na=false; scaled=1; previous-na=false',
      'phase=2; source-na=false; scaled=1.1; previous-na=false',
      'phase=3; source-na=false; scaled=-1.1; previous-na=false',
      'phase=4; source-na=false; scaled=10; previous-na=false',
    ]);
  });
});
