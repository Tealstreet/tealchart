import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import type { Bar } from '../../src/runtime/context';
import { checkProgram } from '../../src/semantic/checker';

// Ledger ranks 438/441: runtime-execution-model-v1#154, series-history-na-v3#203.
// Derived price builtins require sizing their underlying series instead.
// https://www.tradingview.com/pine-script-reference/v6/#fun_max_bars_back
const bars: Bar[] = [12, -4, 3].map((close, index) => ({
  time: (index + 1) * 60_000, open: close - 2, high: close + 7,
  low: close - 3, close, volume: 10,
}));

describe('max_bars_back derived price targets', () => {
  it('refuses direct derived builtin targets in positional and named calls [rows 438/441]', () => {
    for (const target of ['hl2', 'hlc3', 'ohlc4', 'hlcc4']) {
      for (const argumentsText of [`${target}, 3`, `${target}, num=3`]) {
        const ast = parse(`//@version=6\nindicator("Derived buffer")\nmax_bars_back(${argumentsText})\nplot(close)`);
        expect(checkProgram(ast).diagnostics).toEqual(expect.arrayContaining([
          expect.objectContaining({ severity: 'error', message: expect.stringContaining(target) }),
        ]));
        expect(() => executeScript(ast, bars)).toThrow(`max_bars_back cannot target derived builtin ${target}`);
      }
    }

    const ast = parse(`//@version=6
indicator("Underlying buffers")
max_bars_back(high, 3)
max_bars_back(low, num=3)
stored = hl2
max_bars_back(stored, 3)
plot(hl2)
plot(stored[1])`);
    expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([[14, -2, 5], [null, 14, -2]]);
  });
});
