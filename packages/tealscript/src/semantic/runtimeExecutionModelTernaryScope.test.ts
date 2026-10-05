import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const authority = 'https://www.tradingview.com/pine-script-docs/language/operators/#-ternary-operator';

function errors(body: string) {
  return checkProgram(parse(`//@version=6\nindicator("Ternary scope")\n${body}`)).diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  );
}

describe(`runtime execution model row1819 ternary scope [${authority}]`, () => {
  it('keeps global-only calls in the enclosing scope and distinguishes an if local scope', () => {
    expect(errors('selected = bar_index % 2 == 0 ? plot(close, "Close") : plot(open, "Open")')).toEqual([]);
    expect(errors('if bar_index % 2 == 0\n    plot(close, "Close")')).toContainEqual(
      expect.objectContaining({ code: 'scope-mismatch' }),
    );
  });
});
