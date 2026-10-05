import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import type { Bar } from '../../src/runtime/context';
import { checkProgram } from '../../src/semantic/checker';

// Ledger rank 425: version-rules-v1#210, sqrt:x becomes math.sqrt:number.
// Authority: official v5 migration guide, math namespace rename table.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/#math-namespace-for-math-related-functions-and-variables
const bars: Bar[] = [9, 0.25, 0, 4].map((close, index) => ({
  time: (index + 1) * 60_000, open: close, high: close + 1,
  low: close - 1, close, volume: 10,
}));

function source(version: number, expression: string): string {
  return `//@version=${version}\n${version === 4 ? 'study' : 'indicator'}("Sqrt argument rename")\nplot(${expression})`;
}

describe('sqrt published argument migration', () => {
  // Independent exact roots expose an ignored legacy named argument,
  // identity/squaring substitution and modern old-slot acceptance.
  it('binds v4 x and modern number, refusing modern x [row 425]', () => {
    for (const [version, expression] of [[4, 'sqrt(x=close)'], [5, 'math.sqrt(number=close)'], [6, 'math.sqrt(number=close)']] as const) {
      const ast = parse(source(version, expression));
      expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
      const result = executeScript(ast, bars);
      expect(result.errors).toEqual([]);
      expect(result.plots).toHaveLength(1);
      expect(result.plots[0].values).toEqual([3, 0.5, 0, 2]);
    }
    expect(checkProgram(parse(source(4, 'sqrt(number=close)'))).diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unknown-argument' }),
    ]));
    for (const version of [5, 6]) {
      expect(checkProgram(parse(source(version, 'math.sqrt(x=close)'))).diagnostics).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'unknown-argument', message: expect.stringContaining("Unknown argument 'x'") }),
      ]));
    }
  });
  it.each([['strings', '"bad"'], ['booleans', 'true']])('refuses %s through the legacy x slot', (_kind, value) => {
    const errors = checkProgram(parse(source(4, `sqrt(x=${value})`))).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    expect(errors).toEqual([expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('must be a number') })]);
  });

});
