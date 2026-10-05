import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import type { Bar } from '../../src/runtime/context';
import { checkProgram } from '../../src/semantic/checker';

// Ledger ranks 437/440: runtime-execution-model-v1#152, series-history-na-v3#201.
// Archived v6 reference max_bars_back num description sets the maximum to 5000.
// https://www.tradingview.com/pine-script-reference/v6/#fun_max_bars_back
const bars: Bar[] = [12, -4, 3].map((close, index) => ({
  time: (index + 1) * 60_000, open: close, high: close + 1,
  low: close - 1, close, volume: 10,
}));

function source(argument: string): string {
  return `//@version=6\nindicator("History function limit")\nmax_bars_back(close, ${argument})\nplot(close)`;
}

describe('max_bars_back function depth ceiling', () => {
  // Exact boundary and named/positional calls reject both an off-by-one
  // ceiling and validation limited to one argument-binding path.
  it('accepts 5000 and rejects 5001 in the checker and runtime [rows 437/440]', () => {
    for (const argument of ['5001', 'num=5001']) {
      const ast = parse(source(argument));
      expect(checkProgram(ast).diagnostics).toEqual(expect.arrayContaining([
        expect.objectContaining({ severity: 'error', message: expect.stringContaining('5000') }),
      ]));
      expect(executeScript(ast, bars).errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining('5000') }),
      ]));
    }
    for (const argument of ['4999', '5000', 'num=5000']) {
      const ast = parse(source(argument));
      expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
      const result = executeScript(ast, bars);
      expect(result.errors).toEqual([]);
      expect(result.plots).toHaveLength(1);
      expect(result.plots[0].values).toEqual([12, -4, 3]);
    }
  });
});
