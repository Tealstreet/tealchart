import { beforeAll, describe, expect, it } from 'vitest';

import { compatibilityBars, runCompatScript } from './fixtures';

const authority = 'https://www.tradingview.com/pine-script-docs/concepts/strings/#literal-strings';
const bars = compatibilityBars.slice(0, 2);
const cases = [
  {
    name: 'double-quoted global literal',
    body: 'text = "left\n   middle\n       right"\nlabel.new(bar_index, close, text)',
    expected: 'left middle right',
  },
  {
    name: 'single-quoted global literal',
    body: "text = 'alpha\n  beta\n      gamma'\nlabel.new(bar_index, close, text)",
    expected: 'alpha beta gamma',
  },
  {
    name: 'double-quoted UDF return literal',
    body: 'render() =>\n    "up\n       down\n            third"\nlabel.new(bar_index, close, render())',
    expected: 'up down third',
  },
];

describe(`v6 wrapped single-line strings insert one space and no line terminators [${authority}]`, () => {
  const outputs = new Map<string, Array<string | undefined>>();

  beforeAll(() => {
    for (const testCase of cases) {
      const result = runCompatScript(`//@version=6\nindicator("Wrapped strings")\n${testCase.body}`, { bars });
      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile?.swallowedErrors ?? []).toEqual([]);
      const labels = result.drawings.filter((drawing) => drawing.type === 'label');
      expect(labels).toHaveLength(bars.length);
      for (const label of labels) expect(typeof label.text).toBe('string');
      outputs.set(
        testCase.name,
        labels.map((label) => label.text),
      );
    }
  });

  for (const testCase of cases) {
    it(`${testCase.name}`, () => {
      expect(outputs.get(testCase.name)).toEqual(bars.map(() => testCase.expected));
    });
  }
});
