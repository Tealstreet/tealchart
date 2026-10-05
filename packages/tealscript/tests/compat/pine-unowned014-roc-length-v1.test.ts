import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { tryCompile } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

// Reference functions[192]: length admits series/simple/input/const int.
// https://www.tradingview.com/pine-script-reference/v6/#fun_ta.roc
const program = (length: string, named: boolean) =>
  parse(`//@version=6
indicator("ROC length contract")
plot(ta.roc(${named ? `source=close, length=${length}` : `close, ${length}`}))`);

describe('unowned014 ROC length kind (ledger882)', () => {
  it.each(
    ['2.0', '2.5', 'float(2)', 'input.float(2)', 'close'].flatMap((length) =>
      [false, true].map((named) => ({ length, named })),
    ),
  )('refuses known float length $length, named=$named', ({ length, named }) => {
    const ast = program(length, named);
    expect(
      checkProgram(ast).diagnostics.some(
        (diagnostic) =>
          diagnostic.severity === 'error' &&
          diagnostic.code === 'type-mismatch' &&
          diagnostic.message.includes('length must be an int'),
      ),
    ).toBe(true);
  });

  it.each(
    ['2', 'input.int(2)', 'bar_index % 2 + 1'].flatMap((length) => [false, true].map((named) => ({ length, named }))),
  )('admits int length $length, named=$named', ({ length, named }) => {
    const ast = program(length, named);
    expect(checkProgram(ast).diagnostics).toEqual([]);
    expect(tryCompile(ast).success).toBe(true);
  });

  it('preserves a matching local callable named roc', () => {
    const ast = parse(`//@version=6
indicator("Local ROC")
roc(float source, float length) => source + length
plot(roc(close, 2.5))`);
    expect(checkProgram(ast).diagnostics).toEqual([]);
    expect(tryCompile(ast).success).toBe(true);
  });
});
