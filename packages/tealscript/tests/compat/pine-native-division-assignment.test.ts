import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

const reference = '~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json';
const capturedBars = [
  { time: 1788134400000, open: 77682, high: 77682.01, low: 77572, close: 77674.04, volume: 0 },
  { time: 1788134520000, open: 77674.5, high: 77780.34, low: 77646, close: 77758.24, volume: 0 },
  { time: 1788134640000, open: 77758.24, high: 77827.99, low: 77724, close: 77740.01, volume: 0 },
];

const cases = [
  { name: 'corpus-fractional-series-division-int', source: `//@version=6
indicator("V3-CORPUS-FRACTIONAL-SERIES-DIVISION-INT")
int elapsed = (time - time[1]) / 1000
plot(elapsed, "OUTCOME")
`, expected: [null, 120, 120] },
  { name: 'corpus-fractional-timeframe-division-int', source: `//@version=6
indicator("V3-CORPUS-FRACTIONAL-TIMEFRAME-DIVISION-INT")
length() =>
    int tf_mins = timeframe.in_seconds() / 60
    tf_mins
plot(length(), "OUTCOME")
`, expected: [2, 2, 2] },
];

for (const { name, source, expected } of cases) {
  describe(`Native oracle-probes/v3/captures/v3/${name}-attempt1.csv; ${reference} operators[15]`, () => {
    it('admits the captured whole-valued integer-division initializer and reproduces its native prefix', () => {
      const checked = checkProgram(parse(source));
      expect(checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
      const result = runCompatScript(source, {
        bars: capturedBars,
        engineOptions: { runtime: { timeframe: { period: '2' } } },
      });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'OUTCOME').values).toEqual(expected);
      const refused = checkProgram(parse(`//@version=6
indicator("Integer assignment controls")
int fractionalConstant = 5 / 2
int floatOperand = close / 2
`));
      // Native v5 capture-round fractional-int-division-const-control accepts
      // integer operand division in v6; float operands remain refused.
      expect(refused.diagnostics.filter((diagnostic) => diagnostic.code === 'type-mismatch')).toHaveLength(1);
      expect(refused.diagnostics.filter((diagnostic) => diagnostic.code === 'type-mismatch')[0]?.message).toContain('floatOperand');
    });
  });
}
