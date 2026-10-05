import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import type { Bar } from '../../src/runtime/context';
import { checkProgram } from '../../src/semantic/checker';

// Ledger ranks 401-403: version-rules-v1#153-155.
// Authority: official v5 migration guide, TA namespace rename table.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/#ta-namespace-for-technical-analysis-functions-and-variables
const bars: Bar[] = [2, -1, -1, 3, -2].map((close, index) => ({
  time: (index + 1) * 60_000, open: 1, high: Math.max(close, 1),
  low: Math.min(close, 1), close, volume: 10,
}));

function source(version: number, expression: string): string {
  return `//@version=${version}\n${version === 4 ? 'study' : 'indicator'}("Crossunder rename")\nplot(${expression} ? 1 : 0)`;
}

function errors(version: number, expression: string) {
  return checkProgram(parse(source(version, expression))).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('crossunder published name and argument migration', () => {
  // Repeated sub-threshold bars and crossings distinguish direction,
  // swapped operands, wrong named binding and always-true/false results.
  it.each(['crossunder(x=close, y=1)', 'crossunder(y=1, x=close)', 'crossunder(close, y=1)'])
    ('binds the legacy v4 slots in %s [rows 401-403]', (legacy) => {
      for (const [version, expression] of [[4, legacy], [4, 'crossunder(close, 1)'], [5, 'ta.crossunder(source2=1, source1=close)']] as const) {
        const ast = parse(source(version, expression));
        expect(errors(version, expression)).toEqual([]);
        const result = executeScript(ast, bars);
        expect(result.errors).toEqual([]);
        expect(result.plots).toHaveLength(1);
        expect(result.plots[0].values).toEqual([0, 1, 0, 0, 1]);
      }
      expect(errors(5, 'crossunder(close, 1)')).toEqual(expect.arrayContaining([
        expect.objectContaining({ severity: 'error', message: expect.stringContaining('crossunder') }),
      ]));
      for (const expression of ['ta.crossunder(x=close, source2=1)', 'ta.crossunder(source1=close, y=1)']) {
        expect(errors(5, expression)).toEqual(expect.arrayContaining([
          expect.objectContaining({ code: 'unknown-argument' }),
        ]));
      }
    });
});
