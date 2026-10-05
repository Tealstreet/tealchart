import { describe, expect, it } from 'vitest';

import { compatibilityBars, runCompatScript } from './fixtures';

const cases = [
  {
    call: 'box.new(4, 13, 1, -7',
    colors: ['border_color', 'bgcolor'],
    fields: ['borderColor', 'bgcolor'],
    type: 'box',
  },
  { call: 'box.new(a, b', colors: ['border_color', 'bgcolor'], fields: ['borderColor', 'bgcolor'], type: 'box' },
  { call: 'polyline.new(array.from(a, b)', colors: ['line_color'], fields: ['lineColor'], type: 'polyline' },
];

describe('documented drawing symbolic blue defaults', () => {
  for (const version of [5, 6]) {
    for (const { call, colors, fields, type } of cases) {
      it(`v${version} ${call}) defaults to color.blue and preserves explicit colors`, () => {
        const explicit = (value: string) => call + colors.map((name) => `, ${name}=${value}`).join('') + ')';
        const source = `//@version=${version}
indicator("Symbolic defaults")
a=chart.point.new(1700000000000, 4, 13)
b=chart.point.new(1700000060000, 1, -7)
${call})
${explicit('color.blue')}
${explicit('#123456')}
${explicit('na')}
plot(color.r(color.blue),title="r")
plot(color.g(color.blue),title="g")
plot(color.b(color.blue),title="b")`;
        const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 1) });
        expect(result.errors).toEqual([]);
        expect(result.drawings?.map((drawing) => drawing.type)).toEqual([type, type, type, type]);
        const channels = ['r', 'g', 'b'].map((title) => result.plots.find((plot) => plot.title === title)!.values[0]!);
        expect(channels.every((value) => Number.isInteger(value) && value >= 0 && value <= 255)).toBe(true);
        const blue =
          '#' +
          channels
            .map((value) => value.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();
        for (const [index, expected] of [blue, blue, '#123456', null].entries()) {
          expect(result.drawings![index]).toMatchObject(Object.fromEntries(fields.map((field) => [field, expected])));
        }
      });
    }
  }
});
