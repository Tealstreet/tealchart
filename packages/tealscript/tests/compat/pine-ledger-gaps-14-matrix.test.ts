import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const reference = 'https://www.tradingview.com/pine-script-reference/v6/';

describe(`Ledger gaps555-559: ${reference} functions[567]`, () => {
  it('initializes omitted numeric values to na and explicit values across all cells', () => {
    const result = runCompatScript(`//@version=6
indicator("Matrix initial values")
missing = matrix.new<float>(2, 2)
filled = matrix.new<int>(initial_value=7, rows=2, columns=2)
plot(na(matrix.get(missing, 0, 0)) and na(matrix.get(missing, 1, 1)) ? 1 : 0, title="Missing")
plot(matrix.get(filled, 0, 0) + matrix.get(filled, 1, 1), title="Filled")
`, { bars: compatibilityBars.slice(0, 1) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Missing').values).toEqual([1]);
    expect(getPlot(result, 'Filled').values).toEqual([14]);
  });

  it('defaults omitted dimensions to zero and binds optional named rows and columns independently', () => {
    const result = runCompatScript(`//@version=6
indicator("Matrix dimensions")
empty = matrix.new<int>()
rowsOnly = matrix.new<int>(rows=2)
columnsOnly = matrix.new<int>(columns=3)
plot(matrix.rows(empty) + matrix.columns(empty), title="Empty")
plot(matrix.rows(rowsOnly), title="Rows")
plot(matrix.columns(rowsOnly), title="Rows Columns")
plot(matrix.rows(columnsOnly), title="Columns Rows")
plot(matrix.columns(columnsOnly), title="Columns")
`, { bars: compatibilityBars.slice(0, 1) });
    expect(result.errors).toEqual([]);
    for (const [title, expected] of [['Empty', 0], ['Rows', 2], ['Rows Columns', 0], ['Columns Rows', 0], ['Columns', 3]] as const) {
      expect(getPlot(result, title).values).toEqual([expected]);
    }
  });

  // Verified namespace guard18c6030685 (inside2877) refuses UDT variable box.
  // This valid matrix control uses boxValue; the original invalid fixture is archived.
  it('returns the declared generic element type and refuses incompatible initial values', () => {
    const valid = checkProgram(parse(`//@version=6
indicator("Matrix generic type")
type Box
    float value
boxValue = Box.new(1.0)
boxes = matrix.new<Box>(1, 1, boxValue)
bools = matrix.new<bool>(1, 1, true)
missingInts = matrix.new<int>(1, 1, int(na))
ints = matrix.new<int>(1, 1, 7)
floats = matrix.new<float>(1, 1, 7)
plot(matrix.get(ints, 0, 0) + matrix.get(floats, 0, 0))
`));
    expect(valid.diagnostics).toEqual([]);
    const types = new Map(valid.symbols.map((symbol) => [symbol.name, symbol.type]));
    expect(types.get('ints')).toMatchObject({ kind: 'matrix', elementType: { kind: 'int' } });
    expect(types.get('floats')).toMatchObject({ kind: 'matrix', elementType: { kind: 'float' } });
    const legacy = checkProgram(parse(`//@version=5
indicator("Legacy bool matrix")
legacyBools = matrix.new<bool>(1, 1, 1)
`));
    expect(legacy.diagnostics).toEqual([]);
    const invalid = checkProgram(parse(`//@version=6
indicator("Matrix incompatible initializer")
wrong = matrix.new<int>(initial_value="wrong", columns=1, rows=1)
`));
    expect(invalid.diagnostics.some((diagnostic) => diagnostic.code === 'type-mismatch')).toBe(true);
  });
});
