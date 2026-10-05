import { describe, expect, it } from 'vitest';

import { compatibilityBars, runCompatScript } from './fixtures';

// Native v4 drawing-default-blue-v5/v6-v1 grids: DEFAULT and color.blue match #2962FF.
const cases = [
  ['box border coordinate', 'box.new(0, 12, 0, 10', 'border_color', 'borderColor'],
  ['box border point', 'box.new(a, b', 'border_color', 'borderColor'],
  ['box background coordinate', 'box.new(0, 12, 0, 10', 'bgcolor', 'bgcolor'],
  ['box background point', 'box.new(a, b', 'bgcolor', 'bgcolor'],
  ['polyline line', 'polyline.new(array.from(a, b)', 'line_color', 'lineColor'],
] as const;

describe('native v4 drawing blue literal controls', () => {
  for (const version of [5, 6]) {
    for (const [name, call, argument, field] of cases) {
      it(`v${version} ${name} default and blue match the native literal`, () => {
        const source = `//@version=${version}
indicator("Native drawing blue")
a = chart.point.from_index(0, 12)
b = chart.point.from_index(0, 10)
${call})
${call}, ${argument}=color.blue)
${call}, ${argument}=#2196F3)
${call}, ${argument}=#2962FF)`;
        const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 1) });
        expect(result.errors).toEqual([]);
        expect(result.drawings).toHaveLength(4);
        expect(result.drawings!.map((drawing) => (drawing as unknown as Record<string, unknown>)[field])).toEqual([
          '#2962FF',
          '#2962FF',
          '#2196F3',
          '#2962FF',
        ]);
      });
    }
  }
});
