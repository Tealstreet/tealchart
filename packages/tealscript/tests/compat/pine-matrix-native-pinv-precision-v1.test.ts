import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';

const source = readFileSync(new URL('../../oracle-probes/v2/coverage-matrix-1-v1.pine', import.meta.url), 'utf8');
const sourceSha256 = 'c75a1be5b5e4e9ee23cce8490fce372361d540b56a50a085317e4ebdbe4a96e8';
const captureSha256 = 'd27e7f8fd85ae9027b4fa5efb04e2d6ae24d820d3f14c08af54a67803c68967f';
const bars = Array.from({ length: 100 }, (_, index) => ({
  time: 1788134400000 + index * 120000,
  open: 100,
  high: 101,
  low: 99,
  close: 100,
  volume: 10,
}));
const cases: { title: string; cells: [number, number | null][] }[] = [
  {
    title: 'matrix_pinv00_clean',
    cells: [
      [0, 0.3636363636363636],
      [1, 0.3333333333333333],
      [2, 0.30769230769230765],
      [3, 0.2857142857142857],
      [4, 0.26666666666666666],
      [5, 0.25],
      [6, 0.23529411764705882],
      [7, 0.22222222222222224],
      [8, 0.21052631578947367],
      [9, 0.2],
      [10, 0.1904761904761905],
      [11, 0.18181818181818182],
      [12, 0.17391304347826086],
      [13, 0.16666666666666669],
      [14, 0.16],
      [15, 0.15384615384615385],
      [16, 0.14814814814814814],
      [17, 0.3636363636363636],
      [18, 0.3333333333333333],
      [40, 0.23529411764705882],
      [41, 0.22222222222222224],
      [42, 0.21052631578947367],
      [43, 0.2],
      [44, 0.1904761904761905],
      [45, 0.18181818181818182],
      [97, 0.17391304347826086],
      [98, 0.16666666666666669],
    ],
  },
  {
    title: 'matrix_pinv00_hole97',
    cells: [
      [0, 0.3636363636363636],
      [1, 0.3333333333333333],
      [2, 0.30769230769230765],
      [3, 0.2857142857142857],
      [4, 0.26666666666666666],
      [5, 0.25],
      [6, 0.23529411764705882],
      [7, 0.22222222222222224],
      [8, 0.21052631578947367],
      [9, 0.2],
      [10, 0.1904761904761905],
      [11, 0.18181818181818182],
      [12, 0.17391304347826086],
      [13, 0.16666666666666669],
      [14, 0.16],
      [15, 0.15384615384615385],
      [16, 0.14814814814814814],
      [17, 0.3636363636363636],
      [18, 0.3333333333333333],
      [40, null],
      [41, null],
      [42, null],
      [43, 0.2],
      [44, 0.1904761904761905],
      [45, 0.18181818181818182],
      [97, 0.17391304347826086],
      [98, 0.16666666666666669],
    ],
  },
  {
    title: 'matrix_pinv00_warm0_7',
    cells: [
      [0, null],
      [1, null],
      [2, null],
      [3, null],
      [4, null],
      [5, null],
      [6, null],
      [7, null],
      [8, 0.21052631578947367],
      [9, 0.2],
      [10, 0.1904761904761905],
      [11, 0.18181818181818182],
      [12, 0.17391304347826086],
      [13, 0.16666666666666669],
      [14, 0.16],
      [15, 0.15384615384615385],
      [16, 0.14814814814814814],
      [17, 0.3636363636363636],
      [18, 0.3333333333333333],
      [40, 0.23529411764705882],
      [41, 0.22222222222222224],
      [42, 0.21052631578947367],
      [43, 0.2],
      [44, 0.1904761904761905],
      [45, 0.18181818181818182],
      [97, 0.17391304347826086],
      [98, 0.16666666666666669],
    ],
  },
];

describe('Native v2 matrix pseudoinverse precision', () => {
  for (const { title, cells } of cases) {
    it(`matches ${title} from capture ${captureSha256}`, () => {
      expect(createHash('sha256').update(source).digest('hex')).toBe(sourceSha256);
      const execution = executeCompiledScript(parse(source), bars, undefined, {
        runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } },
      });
      expect(execution.status).toBe('success');
      if (execution.status !== 'success') throw new Error(JSON.stringify(execution));
      expect(execution.result.errors).toEqual([]);
      const plot = execution.result.plots.find((value) => value.title === title);
      expect(plot).toBeDefined();
      for (const [index, expected] of cells) {
        if (expected === null) expect(plot!.values[index]).toBeNull();
        else expect(plot!.values[index]).toBe(expected);
      }
    });
  }
});
