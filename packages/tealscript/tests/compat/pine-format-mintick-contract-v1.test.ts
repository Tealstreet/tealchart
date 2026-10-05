import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// format.mintick: tick multiples, ties upward, trailing zeros. These values
// are independently derived, including a non-power-of-ten tick and negative ties.
const cases = [
  { tick: 0.25, values: [1.125, -1.125, 2, 0, -0.125], rounded: [1.25, -1, 2, 0, 0], lengths: [4, 5, 4, 4, 4] },
  { tick: 0.01, values: [1.005, -1.005, 2, 0, -0.005], rounded: [1.01, -1, 2, 0, 0], lengths: [4, 5, 4, 4, 4] },
  {
    tick: 1e-7,
    values: [1.5e-7, -1.5e-7, 2e-7, 0, -0.5e-7],
    rounded: [2e-7, -1e-7, 2e-7, 0, 0],
    lengths: [9, 10, 9, 9, 9],
  },
];

describe('Pine format.mintick numeric text contract', () => {
  for (const data of cases) {
    for (const named of [false, true]) {
      it(`rounds and pads tick ${data.tick} (${named ? 'named' : 'positional'}) [visual-output row 50]`, () => {
        const bars = data.values.map((close, index) => ({ ...compatibilityBars[index], close }));
        const args = named ? 'format=format.mintick, value=close' : 'close, format.mintick';
        const result = runCompatScript(
          `//@version=6\nindicator("Mintick text")\ns = str.tostring(${args})\nplot(str.tonumber(s), title="Rounded")\nplot(str.length(s), title="Length")`,
          {
            bars,
            engineOptions: { runtime: { syminfo: { mintick: data.tick } } },
          },
        );
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'Rounded').values).toEqual(data.rounded);
        expect(getPlot(result, 'Length').values).toEqual(data.lengths);
      });
    }
  }
});
