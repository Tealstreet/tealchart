import { describe, expect, it } from 'vitest';

import { compatibilityBars, runCompatScript } from './fixtures';

// Native authority: v20 S1 sources/captures at 4b2a3a89d6, including 151px strokes and box zero.
const points = 'a = chart.point.from_index(0, 4)\nb = chart.point.from_index(1, 4)';
const routes = [
  ['line coordinates', 'line.new(0, 4, 1, 4, width=W)', 'width', false],
  ['line points', 'line.new(a, b, width=W)', 'width', false],
  ['line setter', 'id = line.new(0, 4, 1, 4)\nline.set_width(id, W)', 'width', false],
  ['line receiver', 'id = line.new(a, b)\nid.set_width(W)', 'width', false],
  ['box coordinates', 'box.new(0, 5, 1, 3, border_width=W)', 'borderWidth', true],
  ['box points', 'box.new(a, b, border_width=W)', 'borderWidth', true],
  ['box setter', 'id = box.new(0, 5, 1, 3)\nbox.set_border_width(id, W)', 'borderWidth', true],
  ['box receiver', 'id = box.new(a, b)\nid.set_border_width(W)', 'borderWidth', true],
  ['polyline', 'polyline.new(array.from(a, b), line_width=W)', 'lineWidth', false],
] as const;

describe('Drawing stroke width', () => {
  for (const [name, source, field, box] of routes) {
    for (const [width, expected] of [
      ['151', 151],
      ['1', 1],
      ['0', box ? 0 : 1],
      ['-1', 1],
      ['int(na)', 1],
    ] as const) {
      it(`${name} preserves ${width} as ${expected}`, () => {
        const result = runCompatScript(
          `//@version=6\nindicator("Stroke width")\n${points}\n${source.replace('W', width)}`,
          {
            bars: compatibilityBars.slice(0, 2),
          },
        );
        expect(result.errors).toEqual([]);
        expect(result.drawings).toHaveLength(2);
        expect(result.drawings!.map((drawing) => Reflect.get(drawing, field))).toEqual([expected, expected]);
      });
    }
  }
});
