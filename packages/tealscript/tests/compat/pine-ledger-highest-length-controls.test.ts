import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

describe('shared default-source binding preserves highest series-int', () => {
  for (const argumentsText of ['length', 'close, length']) {
    it(`accepts ta.highest(${argumentsText}) with a series-int length`, () => {
      const result = checkProgram(parse(`//@version=6
indicator("highest series length")
length = bar_index + 2
maximum = ta.highest(${argumentsText})
`));
      expect(result.diagnostics).toEqual([]);
      expect(result.symbols.find((symbol) => symbol.name === 'length')?.type).toEqual({ kind: 'int', qualifier: 'series' });
      expect(result.symbols.find((symbol) => symbol.name === 'maximum')?.type).toEqual({ kind: 'float', qualifier: 'series' });
    });
  }
});
