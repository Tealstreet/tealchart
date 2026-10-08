import { beforeAll, describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const authority = 'https://www.tradingview.com/pine-script-docs/language/script-structure/#compiler-annotations';
const division =
  'https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#fractional-division-of-constants';
const bars = compatibilityBars.slice(0, 3);
const literals = [
  { name: 'double quoted', source: '"//@version=5"', length: 12 },
  { name: 'single quoted', source: "'//@version=5'", length: 12 },
  { name: 'triple double quoted', source: '"""\n//@version=5\n"""', length: 14 },
  { name: 'triple single quoted', source: "'''\n//@version=5\n'''", length: 14 },
];

function values(literal: string, leadingAnnotation: boolean): Array<number | null> {
  const source = `${leadingAnnotation ? '//@version=6\n' : ''}indicator("Version annotation strings")
message = ${literal}
${leadingAnnotation ? '' : '//@version=6\n'}plot(5 / 2, "Result")
plot(str.length(message), "Literal length")`;
  const result = runCompatScript(source, { bars });
  expect(result.errors).toEqual([]);
  expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
  const output = getPlot(result, 'Result').values;
  expect(output).toHaveLength(bars.length);
  const expectedLength = literals.find((candidate) => candidate.source === literal)?.length ?? 5;
  expect(getPlot(result, 'Literal length').values).toEqual(bars.map(() => expectedLength));
  return output;
}

describe(`compiler annotations are comments, while quoted text is literal [${authority}; ${division}]`, () => {
  const lateResults = new Map<string, Array<number | null>>();

  beforeAll(() => {
    for (const literal of literals) lateResults.set(literal.name, values(literal.source, false));
  });

  for (const literal of literals) {
    it(`uses the real late v6 annotation after ${literal.name} annotation text`, () => {
      expect(lateResults.get(literal.name)).toEqual([2.5, 2.5, 2.5]);
    });

    it(`retains a leading real v6 annotation before ${literal.name} annotation text`, () => {
      expect(values(literal.source, true)).toEqual([2.5, 2.5, 2.5]);
    });
  }

  it('applies a real late annotation after ordinary string text', () => {
    expect(values('"plain"', false)).toEqual([2.5, 2.5, 2.5]);
  });
});
