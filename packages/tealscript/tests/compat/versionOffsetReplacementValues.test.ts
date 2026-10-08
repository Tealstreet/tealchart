import { beforeAll, describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

const bars = [10, 20, 30, 40].map((close, index) => ({
  time: (index + 1) * 60_000, open: close, high: close + 1, low: close - 1, close, volume: 100,
}));

// Version ledger26; the v5 guide states that [] is equivalent to the deprecated offset().
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/#removed-iff-and-offset
// Values are independently calculated from source=2*close+1, with unavailable history missing.
const cases = [
  [0, [21, 41, 61, 81]],
  [1, [null, 21, 41, 61]],
  [2, [null, null, 21, 41]],
] as const;
const values = new Map<string, Array<number | null>>();

beforeAll(() => {
  for (const version of [4, 5, 6]) {
    for (const [distance] of cases) {
      const expression = version === 4 ? `offset(source, ${distance})` : `source[${distance}]`;
      const source = `//@version=${version}
${version === 4 ? 'study' : 'indicator'}("Offset replacement")
source = close * 2 + 1
plot(${expression}, "history")`;
      expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
      const result = runCompatScript(source, { bars });
      expect(result.errors).toEqual([]);
      const actual = getPlot(result, 'history').values;
      expect(actual).toHaveLength(bars.length);
      values.set(`${version}:${distance}`, actual);
    }
  }
});

describe('offset replacement preserves calculated-source history', () => {
  for (const version of [5, 6]) {
    it.each(cases)('v' + version + ' reads the calculated source %i bars back', (distance, expected) => {
      expect(values.get(`${version}:${distance}`)).toEqual(expected);
    });
  }

  // Named open defect: legacy offset does not register calculated-source history during analysis.
  it.fails.each(cases)('V4_OFFSET_CALCULATED_SOURCE_MISSING at distance %i', (distance, expected) => {
    expect(values.get(`4:${distance}`)).toEqual(expected);
  });

  it('the removed builtin does not replace a user-declared offset function in v5', () => {
    const source = `//@version=5
indicator("Offset local")
offset(source, distance) => source + distance
plot(offset(close, 2), "local")`;
    expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const result = runCompatScript(source, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'local').values).toEqual([12, 22, 32, 42]);
  });
});
