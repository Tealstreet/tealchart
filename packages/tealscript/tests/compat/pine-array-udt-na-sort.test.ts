import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const reference = 'https://www.tradingview.com/pine-script-docs/language/arrays/#sorting';
const declaration = '//@version=6\nindicator("Missing UDT sort IDs")\ntype Number\n    float value\n';
const orders = ['ascending', 'descending'] as const;

const call = (method: 'sort' | 'sort_indices', form: 'namespace' | 'receiver', order: string): string =>
  form === 'namespace' ? `array.${method}(a, order.${order})` : `a.${method}(order.${order})`;

const values = (source: string, expected: number[]): void => {
  const result = runCompatScript(source);
  expect(result.errors, reference).toEqual([]);
  for (const [index, value] of expected.entries()) {
    expect(getPlot(result, `Value ${index}`).values, reference).toEqual(Array(12).fill(Number.isNaN(value) ? null : value));
  }
};

describe('UDT sort default-field missing-ID refusal', () => {
  for (const method of ['sort', 'sort_indices'] as const) {
    for (const form of ['namespace', 'receiver'] as const) {
      it(`${method} ${form} refuses na IDs while permitting na numeric values and object fields`, () => {
        for (const order of orders) {
          const indices = order === 'ascending' ? [2, 0, 1] : [1, 0, 2];
          const sorted = order === 'ascending' ? [-8, 43, NaN] : [NaN, 43, -8];
          for (const objectValues of [false, true]) {
            const source = objectValues
              ? 'a = array.from(Number.new(43), Number.new(na), Number.new(-8))'
              : 'a = array.from(43.0, na, -8.0)';
            const result = method === 'sort' ? call(method, form, order) : `s = ${call(method, form, order)}`;
            const plots = [0, 1, 2].map((index) => {
              const expression = method === 'sort_indices' ? `s.get(${index})` : `a.get(${index})${objectValues ? '.value' : ''}`;
              return `plot(${expression}, title="Value ${index}")`;
            }).join('\n');
            values(`${declaration}${source}\n${result}\n${plots}`, method === 'sort_indices' ? indices : sorted);
          }
          for (const missingIndex of [0, 1, 2]) {
            const objects = ['Number.new(43)', 'Number.new(-8)'];
            objects.splice(missingIndex, 0, 'na');
            const result = runCompatScript(`${declaration}a = array.from(${objects.join(', ')})\n${call(method, form, order)}`);
            expect(result.errors.some((error) => /Array.*(na|user-defined type)/i.test(error.message)), reference).toBe(true);
          }
        }
      });
    }
  }
});
