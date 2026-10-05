import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const reference = 'https://www.tradingview.com/pine-script-docs/language/arrays/#sorting';
const header =
  '//@version=6\nindicator("Ineligible method retains builtin matrix provenance")\ntype Record\n    float value\n';

describe('ineligible matrix methods preserve builtin return provenance', () => {
  for (const operation of ['copy', 'transpose', 'submatrix', 'concat']) {
    for (const member of ['sort', 'sort_indices']) {
      for (const kind of ['Record', 'float']) {
        it(`${operation} with an absent required argument preserves ${kind} through ${member}`, () => {
          const parameters =
            operation === 'submatrix'
              ? ', int fr, int tr, int fc, int tc, int extra'
              : operation === 'concat'
                ? ', matrix<Record> other, int extra'
                : ', int extra';
          const positional = operation === 'submatrix' ? '0, 1, 0, 2' : operation === 'concat' ? 'm' : '';
          const named =
            operation === 'submatrix'
              ? 'to_column=2, from_column=0, to_row=1, from_row=0'
              : operation === 'concat'
                ? 'id2=m'
                : '';
          for (const form of ['receiver', 'named', 'namespace']) {
            const argumentsText = form === 'named' ? named : positional;
            const call =
              form === 'namespace'
                ? `matrix.${operation}(m${argumentsText ? ',' + argumentsText : ''})`
                : `m.${operation}(${argumentsText})`;
            const result =
              runCompatScript(`${header}method ${operation}(matrix<Record> receiver${parameters}) => matrix.new<float>(1, 1, 42)
m = matrix.new<${kind}>(1, 2)
n = ${call}
values = n.row(0)
plot(matrix.rows(n), "Rows")
plot(matrix.columns(n), "Columns")
plot(values.size(), "Size")
plot(na(values.get(0)) ? 1 : 0, "Missing")
values.${member}()`);
            const columns = operation === 'transpose' ? 1 : 2;
            expect(getPlot(result, 'Rows').values[0], reference).toBe(
              operation === 'transpose' || operation === 'concat' ? 2 : 1,
            );
            expect(getPlot(result, 'Columns').values[0], reference).toBe(columns);
            expect(getPlot(result, 'Size').values[0], reference).toBe(columns);
            expect(getPlot(result, 'Missing').values[0], reference).toBe(1);
            if (kind === 'Record') {
              expect(
                result.errors.some((error) => /Array sort_field.*na object IDs/.test(error.message)),
                reference,
              ).toBe(true);
            } else {
              expect(result.errors, reference).toEqual([]);
            }
          }
        });
      }
    }
  }
});
