import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

import { registerCollectionReferenceCases } from './collection-reference-fixtures';

const ref = 'https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.concat';
const setup = 'a = matrix.new<int>(2, 2, 0)\na.set(0, 0, 17)\na.set(0, 1, -8)\na.set(1, 0, 43)\na.set(1, 1, 5)\nb = matrix.new<int>(1, 2, 0)\nb.set(0, 0, 71)\nb.set(0, 1, -31)';

describe('documented matrix concat argument binding', () => {
  it('retains the left matrix element type for out-of-order named arguments', () => {
    const result = checkProgram(parse(`//@version=6
indicator("Typed concat")
a = matrix.new<int>(2, 2, 17)
b = matrix.new<int>(1, 2, -8)
joined = matrix.concat(id2=b, id1=a)
`));
    expect(result.diagnostics, ref).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'joined')?.type, ref).toMatchObject({
      kind: 'matrix', elementType: { kind: 'int' },
    });
  });

  registerCollectionReferenceCases([
    ...['matrix.concat(id1=a, id2=b)', 'matrix.concat(id2=b, id1=a)'].map((call) => ({
      name: `${call} appends right rows and returns the mutable left matrix`,
      reference: ref,
      rejects: 'dropping id1, reversing receivers, detached returns, and mutating the right matrix',
      source: `${setup}\njoined = ${call}\njoined.set(0, 1, 29)`,
      expressions: ['a.rows()', 'a.get(0, 1)', 'a.get(2, 0)', 'a.get(2, 1)', 'b.rows()', 'b.get(0, 1)'],
      expected: [3, 29, 71, -31, 1, -31],
    })),
  ]);
});
