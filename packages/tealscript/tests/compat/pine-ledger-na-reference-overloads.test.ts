import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Pine v6 na series overload 67; ledger ranks 47, 52–53. Map metadata is disputed.
describe('documented nonnumeric na overload admissions', () => {
  for (const [kind, declaration] of [
    ['label', 'label source = na'], ['line', 'line source = na'],
    ['box', 'box source = na'], ['table', 'table source = na'],
    ['linefill', 'linefill source = na'], ['polyline', 'polyline source = na'],
    ['array', 'array<float> source = na'], ['matrix', 'matrix<float> source = na'],
    ['string', 'string source = na'],
    ['color', 'source = color.new(color.red, syminfo.minmove)'],
    ['color', 'source = close > open ? color.red : color.green'],
  ]) {
    it(`admits ${declaration} and returns series bool`, () => {
      const result = checkProgram(parse(`//@version=6\nindicator("NA reference overload")\n${declaration}\nvalue = na(source)`));
      expect(result.diagnostics).toEqual([]);
      expect(result.symbols.find((symbol) => symbol.name === 'source')?.type?.kind).toBe(kind);
      expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({ kind: 'bool', qualifier: 'series' });
    });
  }
});
