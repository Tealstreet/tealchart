import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

describe('ledger gaps 107/109/110: documented v5 and v6 color palettes', () => {
  for (const [ranks, name, oldHex, newHex, oldChannels, newChannels] of [
    ['107/109', 'red', '#FF5252', '#F23645', [255, 82, 82], [242, 54, 69]],
    ['110', 'yellow', '#FFEB3B', '#FDD835', [255, 235, 59], [253, 216, 53]],
    ['migration control', 'teal', '#00897B', '#089981', [0, 137, 123], [8, 153, 129]],
  ] as const) {
    it(`ranks ${ranks}: color.${name} uses the declared version in values, channels and plots`, () => {
      for (const version of [5, 6]) {
        const hex = version === 5 ? oldHex : newHex;
        const channels = version === 5 ? oldChannels : newChannels;
        const result = runCompatScript(`//@version=${version}
indicator("Versioned color")
tint = color.${name}
selected = input.color(tint, "Tint")
plot(close, "paint", color=selected)
plot(close, "fade", color=color.new(tint, 25))
plot(color.r(tint), "r")
plot(color.g(tint), "g")
plot(color.b(tint), "b")
plot(tint == ${hex} ? 1 : 0, "literal identity")
`);
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'paint').color).toEqual(Array(12).fill(hex));
        expect(getPlot(result, 'fade').color).toEqual(Array(12).fill(`${hex}BF`));
        for (const [index, title] of ['r', 'g', 'b'].entries()) {
          expect(getPlot(result, title).values).toEqual(Array(12).fill(channels[index]));
        }
        expect(getPlot(result, 'literal identity').values).toEqual(Array(12).fill(1));
        expect(result.inputs.find((input) => input.title === 'Tint')?.defval).toBe(hex);
      }
    });
  }
});
