import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { checkProgram } from '../../src/semantic/checker';

// Ledger rank 436: runtime-execution-model-v1#151.
// The archived v6 max_bars_back reference declares num as const int.
// https://www.tradingview.com/pine-script-reference/v6/#fun_max_bars_back
function errors(declaration: string, argument: string) {
  const source = `//@version=6\nindicator("History num type")\n${declaration}\nmax_bars_back(close, ${argument})`;
  return checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('max_bars_back const int num contract', () => {
  const qualifiedDepths = ['depth = input.int(3)', 'simple int depth = 3', 'depth = bar_index'];
  it.each(qualifiedDepths.flatMap((declaration) => ['depth', 'num=depth'].map((argument) => [declaration, argument])))(
    'refuses a non-const depth [row 436]: %s / %s',
    (declaration, argument) => {
      expect(errors(declaration, argument)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining('const') }),
        ]),
      );
    },
  );

  it.each([
    ['', '3'],
    ['', 'num=2+1'],
    ['const int depth = 3', 'num=depth'],
  ])('accepts a const int depth [row 436]: %s / %s', (declaration, argument) => {
    expect(errors(declaration, argument)).toEqual([]);
  });

  it('refuses float, string and bool depths rather than coercing them [row 436]', () => {
    for (const declaration of ['const float depth = 3.0', 'const string depth = "3"', 'const bool depth = true']) {
      for (const argument of ['depth', 'num=depth']) {
        expect(errors(declaration, argument)).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('int') }),
          ]),
        );
      }
    }
    expect(errors('const int depth = 3', 'depth')).toEqual([]);
  });
});
