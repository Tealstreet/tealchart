import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

// Native v9 attempt1: wma-length-v5-derived-be-v1 and wma-length-v6-untyped-be-v1.
// CSV SHA256 beec2fe7b07cfb8db7a06d780edb9c5ea6f512100c289e5c214c60253506fc55 / 4eea35313866aca9bca1c27de9845cfd088f299817ae561cc6c3a1a203427729.
const capturedCloses = [77674.04, 77758.24, 77740.01, 77508.86, 77437.58, 77636, 77725.99, 77797.91];
const expected = [null, null, null, 77644.599, 77551.516, 77561.447, 77619.598, 77707.91900000001];
const observations = [
  {
    name: 'v5 input-derived integer division',
    source: '//@version=5\nindicator("derived")\nn = input.int(9)\nplot(ta.wma(close, n / 2))\n',
  },
  {
    name: 'v6 untyped function integer argument division',
    source: '//@version=6\nindicator("untyped")\nf(n) => ta.wma(close, n / 2)\nplot(f(input.int(9)))\n',
  },
];

describe('captured derived WMA lengths', () => {
  for (const observation of observations) {
    it(`matches the native first eight samples for ${observation.name}`, () => {
      expect(
        checkProgram(parse(observation.source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
      ).toEqual([]);
      const result = runCompatScript(observation.source, {
        bars: capturedCloses.map((close, index) => ({
          time: 1788134400000 + index * 120000,
          open: close,
          high: close,
          low: close,
          close,
          volume: 1,
        })),
      });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Plot 1').values).toEqual(expected);
    });
  }
});
