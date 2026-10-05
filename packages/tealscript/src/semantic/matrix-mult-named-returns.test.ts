import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

// Pine v6 reference matrix.mult functions606–609; CF022 independently settles
// matrix-vector mult as array-returning. No runtime arithmetic is changed here.
describe('matrix.mult named receiver return inference', () => {
  it.each([
    ['matrix.mult(id2=v,id1=m)', 'array', 'int', 'CF022 matrix-vector native result; Pine v6 matrix.mult vector overload: https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.mult'],
    ['matrix.mult(id2=0.5,id1=m)', 'matrix', 'int', 'Pine v6 matrix.mult integer-matrix/scalar overload: https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.mult'],
    ['matrix.mult(id2=v,id=m)', 'array', 'int', 'CF022 matrix-vector native result; Pine v6 matrix.mult vector overload: https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.mult'],
    ['matrix.mult(id2=0.5,id=m)', 'matrix', 'int', 'Pine v6 matrix.mult integer-matrix/scalar overload: https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.mult'],
    ['matrix.mult(id1=m,v)', 'array', 'int', 'CF022 matrix-vector native result; Pine v6 matrix.mult vector overload: https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.mult'],
    ['matrix.mult(id=m,v)', 'array', 'int', 'CF022 matrix-vector native result; Pine v6 matrix.mult vector overload: https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.mult'],
    ['matrix.mult(id1=m,0.5)', 'matrix', 'int', 'Pine v6 matrix.mult integer-matrix/scalar overload: https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.mult'],
    ['matrix.mult(id=m,0.5)', 'matrix', 'int', 'Pine v6 matrix.mult integer-matrix/scalar overload: https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.mult'],
    ['matrix.mult(m,v)', 'array', 'int', 'CF022 matrix-vector native result; Pine v6 matrix.mult vector overload: https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.mult'],
    ['matrix.mult(m,0.5)', 'matrix', 'int', 'Pine v6 matrix.mult integer-matrix/scalar overload: https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.mult'],
    ['m.mult(id2=v)', 'array', 'int', 'CF022 matrix-vector native result; Pine v6 matrix.mult vector overload: https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.mult'],
    ['m.mult(id2=0.5)', 'matrix', 'int', 'Pine v6 matrix.mult integer-matrix/scalar overload: https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.mult'],
  ])('infers %s as %s<%s> — %s (rank134/138/142/146)', (call, kind, elementKind) => {
    const result = checkProgram(
      parse(`//@version=6
indicator("matrix named slots")
m = matrix.new<int>(2,3,17)
v = array.from(17,-23,31)
result = ${call}
`),
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'result')?.type).toEqual({
      kind,
      qualifier: 'series',
      elementType: { kind: elementKind },
    });
  });
});
