import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Official v4/v5 migration guides and version-rules-v1 rows122..124,
// 143/169/170/199/42. Compiler refusals are the witness, not numeric captures.
describe('ledger legacy names and slots', () => {
  it.each([
    ['rsi', 'close, 3', 'ta.rsi', 447],
    ['pivotlow', 'low, 1, 1', 'ta.pivotlow', 453],
    ['pivothigh', 'high, 1, 1', 'ta.pivothigh', 457],
    ['change', 'close', 'ta.change', 461],
    ['pow', 'close, 2', 'math.pow', 462],
  ])('migrates %s(%s) to %s (row%s)', (oldName, args, newName) => {
    expect(checkProgram(parse(`//@version=4\nstudy("Legacy")\nx = ${oldName}(${args})`)).diagnostics).toEqual([]);
    expect(checkProgram(parse(`//@version=5\nindicator("Modern")\nx = ${newName}(${args})`)).diagnostics).toEqual([]);
    const rejected = checkProgram(parse(`//@version=5\nindicator("Legacy refusal")\nx = ${oldName}(${args})`));
    expect(rejected.diagnostics.some((d) => d.code === 'version-mismatch' && d.message.includes(newName))).toBe(true);
  });

});
