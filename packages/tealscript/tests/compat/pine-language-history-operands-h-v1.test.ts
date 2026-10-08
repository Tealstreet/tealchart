import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Language rows 140–144: Operators manual history operands and unavailable values.
const bars = compatibilityBars.slice(0, 4);

function values(body: string, version: number, title: string) {
  const source = `//@version=${version}\nindicator("History operands")\n${body}`;
  expect(checkProgram(parse(source)).diagnostics).toEqual([]);
  const result = runCompatScript(source, { bars });
  expect(result.errors).toEqual([]);
  expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
  return getPlot(result, title).values;
}

for (const version of [5, 6]) {
  describe(`v${version} documented history operands`, () => {
    it('row 140 preserves unavailable history until the referenced bar exists', () => {
      expect(values('plot(close[2], "Past")', version, 'Past')).toEqual([null, null, 102, 105]);
      expect(values('plot(na(close[2]) ? 1 : 0, "Missing")', version, 'Missing')).toEqual([1, 1, 0, 0]);
    });

    it('row 141 retrieves the previous value of a declared variable', () => {
      expect(values('value = close * 3 + 7\nplot(value[1], "Past")', version, 'Past')).toEqual([null, 313, 322, 328]);
    });

    it('row 142 retrieves the previous value of a compound expression', () => {
      expect(values('plot((close * 2 + 5)[1], "Past")', version, 'Past')).toEqual([null, 209, 215, 219]);
    });

    it('row 143 retrieves the previous result of an every-bar function call', () => {
      expect(values('calculate(source) => source * 2 + 9\nplot(calculate(close)[1], "Past")', version, 'Past')).toEqual(
        [null, 213, 219, 223],
      );
    });

    it('row 144 refuses applying history twice directly', () => {
      const result = checkProgram(parse(`//@version=${version}\nindicator("Chained history")\nplot(close[1][2])`));
      expect(result.diagnostics).toEqual([
        expect.objectContaining({ code: 'type-mismatch', message: 'History [] cannot be chained on the same value' }),
      ]);
    });
  });
}
