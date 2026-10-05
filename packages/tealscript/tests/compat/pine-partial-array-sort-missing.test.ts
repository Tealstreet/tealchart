import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/arrays/#sorting
// Missing elements sort last ascending and first descending; stability is unspecified.
describe('PARTIAL rank 782: documented missing-element placement', () => {
  for (const type of ['int', 'float', 'string']) {
    for (const order of ['ascending', 'descending']) {
      for (const method of [false, true]) {
        it(`${type} ${method ? 'method' : 'namespace'} ${order} places both missing elements correctly`, () => {
          const values =
            type === 'string'
              ? ['"z"', '""', '"a"', '""', '"m"']
              : type === 'float'
                ? ['5.5', 'na', '1.25', 'na', '3.75']
                : ['5', 'na', '1', 'na', '3'];
          const expected =
            type === 'string'
              ? order === 'ascending'
                ? ['a', 'm', 'z', '', '']
                : ['', '', 'z', 'm', 'a']
              : type === 'float'
                ? order === 'ascending'
                  ? [1.25, 3.75, 5.5, null, null]
                  : [null, null, 5.5, 3.75, 1.25]
                : order === 'ascending'
                  ? [1, 3, 5, null, null]
                  : [null, null, 5, 3, 1];
          const outputs = expected
            .map((value, index) => {
              const expression =
                type === 'string' ? `values.get(${index}) == "${value}" ? 1 : 0` : `values.get(${index})`;
              return `plot(${expression}, title="Slot ${index}")`;
            })
            .join('\n');
          const result = runCompatScript(`//@version=6
indicator("Missing sort")
values = array.new<${type}>()
${values.map((value) => `values.push(${value})`).join('\n')}
${method ? `values.sort(order.${order})` : `array.sort(values, order.${order})`}
${outputs}`);

          expect(result.errors).toEqual([]);
          expected.forEach((value, index) => {
            expect(getPlot(result, `Slot ${index}`).values).toEqual(Array(12).fill(type === 'string' ? 1 : value));
          });
        });
      }
    }
  }
});
