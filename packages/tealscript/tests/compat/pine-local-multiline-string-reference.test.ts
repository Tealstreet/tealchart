import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const authority = 'https://www.tradingview.com/pine-script-docs/concepts/strings/#multiline-strings';
const bars = compatibilityBars.slice(0, 2);
const cases = [
  {
    name: 'triple-double-quoted literal inside an if block',
    body: 'if true\n    string text = """head\n    body\n        tail"""\n    label.new(bar_index, close, text)',
    expected: 'head\n    body\n        tail',
  },
  {
    name: 'triple-apostrophe literal inside a UDF block',
    body: "render() =>\n    string text = '''head\n    body\n        tail'''\n    text + \"!\"\nlabel.new(bar_index, close, render())",
    expected: 'head\n    body\n        tail!',
  },
];

describe(`local multiline strings retain absolute indentation [${authority}]`, () => {
  for (const testCase of cases) {
    it(testCase.name, () => {
      const result = runCompatScript(
        `//@version=6\nindicator("Local multiline strings")\n${testCase.body}\nplot(bar_index - 7, "After")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile?.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'After').values).toEqual([-7, -6]);
      const labels = result.drawings.filter((drawing) => drawing.type === 'label');
      expect(labels).toHaveLength(bars.length);
      expect(labels.map((label) => label.text)).toEqual(bars.map(() => testCase.expected));
    });
  }
});
