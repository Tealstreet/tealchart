import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const reference = 'https://www.tradingview.com/pine-script-docs/language/methods/#method-overloading';
describe('eligible custom matrix methods select the matching receiver overload', () => {
  for (const operation of ['copy', 'transpose', 'submatrix', 'concat']) {
    for (const kind of ['Record', 'float']) {
      for (const sorting of ['sort', 'sort_indices']) {
        for (const matrixFirst of [true, false]) {
          it(`${operation} returns the custom ${kind} result through ${sorting} with matrix declaration ${matrixFirst ? 'first' : 'last'}`, () => {
            const parameters =
              operation === 'concat'
                ? ', matrix<Record> other'
                : operation === 'submatrix'
                  ? ', int fr, int tr, int fc, int tc'
                  : '';
            const arrayParameters =
              operation === 'concat'
                ? ', array<float> other'
                : operation === 'submatrix'
                  ? ', int fr, int tr, int fc, int tc'
                  : '';
            const args = operation === 'concat' ? 'm' : operation === 'submatrix' ? '0, 1, 0, 1' : '';
            const matrixMethod = `method ${operation}(matrix<Record> receiver${parameters}) =>\n    matrix.new<${kind}>(1, 1${kind === 'float' ? ', 42' : ''})`;
            const arrayMethod = `method ${operation}(array<float> receiver${arrayParameters}) =>\n    receiver`;
            const bars = kind === 'Record' ? compatibilityBars.slice(0, 1) : compatibilityBars;
            const result = runCompatScript(
              `//@version=6
indicator("Eligible matrix overload")
type Record
    float value
${matrixFirst ? matrixMethod + '\n' + arrayMethod : arrayMethod + '\n' + matrixMethod}
m = matrix.new<Record>(1, 2)
n = m.${operation}(${args})
a = n.row(0)
plot(matrix.rows(n), "Rows")
plot(matrix.columns(n), "Columns")
plot(array.size(a), "Size")
plot(na(array.get(a, 0)) ? 1 : 0, "Missing")
plot(${kind === 'Record' ? 'na' : 'array.get(a, 0)'}, "Value")
a.${sorting}()`,
              { bars },
            );
            expect(getPlot(result, 'Rows').values, reference).toEqual(bars.map(() => 1));
            expect(getPlot(result, 'Columns').values, reference).toEqual(bars.map(() => 1));
            expect(getPlot(result, 'Size').values, reference).toEqual(bars.map(() => 1));
            expect(getPlot(result, 'Missing').values, reference).toEqual(bars.map(() => (kind === 'Record' ? 1 : 0)));
            if (kind === 'Record') {
              expect(
                result.errors.some((error) => /Array sort_field.*na object IDs/.test(error.message)),
                reference,
              ).toBe(true);
            } else {
              expect(result.errors, reference).toEqual([]);
              expect(getPlot(result, 'Value').values, reference).toEqual(bars.map(() => 42));
            }
            expect(result.profile?.swallowedErrors ?? [], reference).toEqual([]);
          });
        }
      }
    }
  }
});
