import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { PivotHigh, PivotLow } from '../../src/runtime/codegen/ta-classes';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Exact v20 S5 source bytes and native RE10001 captures at 4b2a3a89d6.
const captures = [
  {
    source:
      '//@version=6\nindicator("silent-s5-pivothigh-strengths--1-0-v20-v1", precision=16)\nfloat source = 100.0 + bar_index % 7\nfloat result = ta.pivothigh(source, -1, 0)\nplot(bar_index, title="CHART_INDEX", display=display.data_window)\nplot(time, title="CHART_TIME_MS", display=display.data_window)\nplot(source, title="SOURCE")\nplot(-1, title="LEFT_STRENGTH", display=display.data_window)\nplot(0, title="RIGHT_STRENGTH", display=display.data_window)\nplot(result, title="PIVOT_HIGH")\nplot(na(result) ? 1 : 0, title="RESULT_NA", display=display.data_window)\n',
    sha256: '0b01684a98ea1482c4e3c1a96d03de490d833781ac29db7aa8ad1c6e6a9b83a6',
    message:
      "Error on bar 0: Invalid value of the 'leftbars' argument (-1) in the 'pivothigh' function. It must be >= 0.",
  },
  {
    source:
      '//@version=6\nindicator("silent-s5-pivothigh-strengths-0--1-v20-v1", precision=16)\nfloat source = 100.0 + bar_index % 7\nfloat result = ta.pivothigh(source, 0, -1)\nplot(bar_index, title="CHART_INDEX", display=display.data_window)\nplot(time, title="CHART_TIME_MS", display=display.data_window)\nplot(source, title="SOURCE")\nplot(0, title="LEFT_STRENGTH", display=display.data_window)\nplot(-1, title="RIGHT_STRENGTH", display=display.data_window)\nplot(result, title="PIVOT_HIGH")\nplot(na(result) ? 1 : 0, title="RESULT_NA", display=display.data_window)\n',
    sha256: '243872f3eb6240300cc2d58222d2d3b8eecd78d30124616332e3416214582f56',
    message:
      "Error on bar 0: Invalid value of the 'rightbars' argument (-1) in the 'pivothigh' function. It must be >= 0.",
  },
  {
    source:
      '//@version=6\nindicator("silent-s5-pivothigh-strengths-0-0-v20-v1", precision=16)\nfloat source = 100.0 + bar_index % 7\nfloat result = ta.pivothigh(source, 0, 0)\nplot(bar_index, title="CHART_INDEX", display=display.data_window)\nplot(time, title="CHART_TIME_MS", display=display.data_window)\nplot(source, title="SOURCE")\nplot(0, title="LEFT_STRENGTH", display=display.data_window)\nplot(0, title="RIGHT_STRENGTH", display=display.data_window)\nplot(result, title="PIVOT_HIGH")\nplot(na(result) ? 1 : 0, title="RESULT_NA", display=display.data_window)\n',
    sha256: '18566ae9aa0f7d9f833f122a242605a6436de9969984ea018887ba6e4dd7272c',
    message: null,
  },
];

describe('native v20 S5 pivot strengths', () => {
  for (const capture of captures) {
    it(`executes exact source ${capture.sha256}`, () => {
      expect(createHash('sha256').update(capture.source).digest('hex')).toBe(capture.sha256);
      expect(checkProgram(parse(capture.source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      const result = runCompatScript(capture.source);
      if (capture.message) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toMatchObject({ message: capture.message, code: 'RE10001', barIndex: 0 });
      } else {
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'PIVOT_HIGH').values).toEqual(compatibilityBars.map((_, i) => 100 + (i % 7)));
      }
    });
  }
  for (const fn of ['pivothigh', 'pivotlow']) {
    for (const [argument, left, right] of [
      ['leftbars', -1, 0],
      ['rightbars', 0, -1],
    ] as const) {
      it(`${fn} ${argument} refuses only at its executed static call`, () => {
        const body = `ta.${fn}(close, ${left}, ${right})`;
        const skipped = runCompatScript(`//@version=6
indicator("skipped pivot")
if bar_index < 0
    ${body}
plot(1, "SAFE")`);
        expect(skipped.errors).toEqual([]);
        expect(getPlot(skipped, 'SAFE').values).toEqual(compatibilityBars.map(() => 1));
        const delayed = runCompatScript(`//@version=6
indicator("delayed pivot")
if bar_index == 3
    ${body}
plot(1, "SAFE")`);
        expect(delayed.errors).toHaveLength(1);
        expect(delayed.errors[0]).toMatchObject({
          code: 'RE10001',
          barIndex: 3,
          message: `Error on bar 3: Invalid value of the '${argument}' argument (-1) in the '${fn}' function. It must be >= 0.`,
        });
        expect(getPlot(delayed, 'SAFE').values.slice(0, 3)).toEqual([1, 1, 1]);
      });
      it(`${fn} ${argument} refuses dynamic UDF strengths at the invalid bar`, () => {
        const source = `//@version=6
indicator("dynamic pivot")
pivot(float source, int strength) => ta.${fn}(source, ${argument === 'leftbars' ? 'strength, 0' : '0, strength'})
strength = bar_index == 3 ? -1 : 0
plot(pivot(close, strength), "PIVOT")`;
        expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
        const result = runCompatScript(source);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toMatchObject({
          code: 'RE10001',
          barIndex: 3,
          message: `Error on bar 3: Invalid value of the '${argument}' argument (-1) in the '${fn}' function. It must be >= 0.`,
        });
        expect(getPlot(result, 'PIVOT').values.slice(0, 3)).toEqual(compatibilityBars.slice(0, 3).map((b) => b.close));
      });
    }
  }
  it('retains noninteger strength normalization, snapshots and recomputation', () => {
    for (const Pivot of [PivotHigh, PivotLow]) {
      const pivot = new Pivot(1.5, 0.5);
      const integer = new Pivot(1, 0);
      for (const value of [2, 4, 1, 3]) {
        expect(pivot.compute(value)).toBe(integer.compute(value));
      }
      const saved = pivot.save();
      const savedInteger = integer.save();
      expect(pivot.compute(7)).toBe(integer.compute(7));
      expect(pivot.recompute(8)).toBe(integer.recompute(8));
      pivot.restore(saved);
      integer.restore(savedInteger);
      expect(pivot.compute(8)).toBe(integer.compute(8));
      expect(new Pivot(-1.5, -0.5).compute(17)).toBe(17);
    }
  });
});
