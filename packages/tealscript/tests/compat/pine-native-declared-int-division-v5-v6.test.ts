import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');
const bars = [0, 1, 2].map((i) => ({ time: 1788134400000 + i * 120000, open: 1, high: 2, low: 0, close: 1, volume: 1 }));

// Exact v5 capture-round source hashes/headers, including two version6 controls.
// Native declared integer targets preserve raw fractional division values.
const cases = [
  {
    "name": "corpus-compile-v5-series-int-division-v1.pine",
    "source": "//@version=5\nindicator(\"corpus-compile-v5-series-int-division-v1\")\nint target = bar_index / 2\nplot(target,\"target\")\nplot(int(bar_index / 2),\"explicit_int_control\")\nplot(math.floor(bar_index / 2),\"floor_control\")\nplot(bar_index / 2,\"unannotated_control\")\n",
    "plot": "target",
    "expected": [
      0,
      0.5,
      1
    ]
  },
  {
    "name": "corpus-compile-v5-simple-int-division-v1.pine",
    "source": "//@version=5\nindicator(\"corpus-compile-v5-simple-int-division-v1\")\nvar int target = timeframe.in_seconds(timeframe.period) / 60\nplot(target,\"target\")\nplot(int(timeframe.in_seconds(timeframe.period) / 60),\"explicit_int_control\")\nplot(math.floor(timeframe.in_seconds(timeframe.period) / 60),\"floor_control\")\nplot(timeframe.in_seconds(timeframe.period) / 60,\"unannotated_control\")\n",
    "plot": "target",
    "expected": [
      2,
      2,
      2
    ]
  },
  {
    "name": "fractional-int-division-const-control-v1.pine",
    "source": "//@version=6\nindicator(\"V5-FRACTIONAL-INT-DIVISION-CONST-CONTROL-V1\", precision=16)\nconst int numerator = 5\nint assigned = numerator / 2\nplot(time, \"INPUT_TIME\")\nplot(numerator, \"NUMERATOR\")\nplot(numerator / 2, \"RAW\")\nplot(assigned, \"ASSIGNED\")\nplot(assigned * 2 - numerator, \"RESIDUAL\")\n",
    "plot": "ASSIGNED",
    "expected": [
      2.5,
      2.5,
      2.5
    ]
  },
  {
    "name": "fractional-int-division-input-control-v1.pine",
    "source": "//@version=6\nindicator(\"V5-FRACTIONAL-INT-DIVISION-INPUT-CONTROL-V1\", precision=16)\nnumerator = input.int(5, \"Numerator\")\nint assigned = numerator / 2\nplot(time, \"INPUT_TIME\")\nplot(numerator, \"NUMERATOR\")\nplot(numerator / 2, \"RAW\")\nplot(assigned, \"ASSIGNED\")\nplot(assigned * 2 - numerator, \"RESIDUAL\")\n",
    "plot": "ASSIGNED",
    "expected": [
      2.5,
      2.5,
      2.5
    ]
  }
];

describe('native declared integer division initializers', () => {
  it.each(cases)('matches captured RUNS and values for $name', ({ source, plot, expected }) => {
    expect(errors(source)).toEqual([]);
    const result = runCompatScript(source, { bars, engineOptions: { runtime: { timeframe: { period: '2' } } } });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, plot).values).toEqual(expected);
  });
  for (const version of [5, 6]) {
    it.each(['5.5 / 2', '5 / 2.0', 'close / 2', '2.5'])(`v${version} keeps float-to-int refusal for %s`, (expression) => {
      expect(errors(`//@version=${version}\nindicator("Float operand control")\nint value = ${expression}\nplot(value)`).some((d) => d.code === 'type-mismatch')).toBe(true);
    });
  }
});
