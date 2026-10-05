import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const reference = 'https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#negative-indices-in-arrays';
const script = (version: number, method: string, namespace: boolean, index: number): string => {
  const tail = method === 'set' || method === 'insert' ? ', value=29' : '';
  const call = namespace ? `array.${method}(id=a, index=i${tail})` : `a.${method}(index=i${tail})`;
  const statement = method === 'get' || method === 'remove' ? `value = ${call}` : call;
  return `//@version=${version}
indicator("Array negative version boundary")
a = array.from(17, -8, 43, 5)
i = bar_index < 100 ? ${index} : 0
${statement}
plot(${method === 'get' || method === 'remove' ? 'value' : 'a.get(0)'}, title="Value")
plot(a.size(), title="Size")
plot(a.get(0), title="First")
plot(a.get(a.size()-1), title="Last")
`;
};

const verify = (source: string, expected: number[]): void => {
  const result = runCompatScript(source);
  expect(result.errors, reference).toEqual([]);
  for (const [index, title] of ['Value', 'Size', 'First', 'Last'].entries()) {
    expect(getPlot(result, title).values, reference).toEqual(Array(12).fill(expected[index]));
  }
};

const positive = {
  get: [17, 4, 17, 5],
  set: [29, 4, 29, 5],
  insert: [29, 5, 29, 5],
  remove: [17, 3, -8, 5],
};
const negativeLast = {
  get: [5, 4, 17, 5],
  set: [17, 4, 17, 29],
  insert: [17, 5, 17, 5],
  remove: [5, 3, 17, 43],
};

describe('documented array negative-index version boundary', () => {
  for (const method of ['get', 'set', 'insert', 'remove'] as const) {
    for (const namespace of [true, false]) {
      for (const index of [-1, -4]) {
        it(`${method} ${namespace ? 'namespace' : 'receiver'} accepts ${index} in v6 and refuses it in v5`, () => {
          verify(script(5, method, namespace, 0), positive[method]);
          verify(script(6, method, namespace, index), index === -1 ? negativeLast[method] : positive[method]);
          const result = runCompatScript(script(5, method, namespace, index));
          expect(result.errors.some((error) => /Array index.*(negative|bounds|v5)/i.test(error.message)), reference).toBe(true);
        });
      }
    }
  }
});
