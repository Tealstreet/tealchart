import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const bars = compatibilityBars.slice(0, 5);
const valueSource = 'v = bar_index == 0 ? -7.5 : bar_index == 1 ? 0 : bar_index == 2 ? na : bar_index == 3 ? 4.25 : -2.5';
const colorSource = 'c = bar_index == 0 ? #123456 : bar_index == 1 ? na : bar_index == 2 ? #654321 : bar_index == 3 ? #ABCDEF : #123456';
function run(body: string) {
  return runCompatScript(`//@version=6\nindicator("Visual gaps", overlay=true)\n${body}`, { bars });
}

describe('Pine visual gap and returning-color output', () => {
  // functions[1]: numeric series includes zero and negative coordinates; na gaps.
  // Distinct signs, zero and internal na reject truthiness, absolute values,
  // gap filling and last-value caching.
  it('preserves signed plot coordinates, zero and internal na [functions[1]]', () => {
    const result = run(`${valueSource}\nplot(v, title="Values", color=#123456)`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Values').values).toEqual([-7.5, 0, null, 4.25, -2.5]);
  });

  for (const [fn, entry] of [['plot', 1], ['bgcolor', 8], ['barcolor', 7]] as const) {
    // Each color parameter accepts series color. na hides that bar only;
    // the returning first color rejects permanently hidden/cached output.
    it(`${fn} preserves na and returning series colors [functions[${entry}]]`, () => {
      const result = run(`${colorSource}\n${fn}(${fn === 'plot' ? 'close, ' : ''}color=c, title="Colors")`);
      expect(result.errors).toEqual([]);
      const output = getPlot(result, 'Colors');
      expect(output.color).toEqual(['#123456', null, '#654321', '#ABCDEF', '#123456']);
      if (fn === 'plot') expect(output.values).toEqual(bars.map((bar) => bar.close));
    });
  }

  // functions[57]: top/bottom values and colors are separate series parameters.
  // Nonmonotonic, signed stops and returning colors reject swapping/caching;
  // na endpoint colors remain payload decisions for the renderer.
  for (const mode of ['positional', 'reversed named'] as const) {
    it(`preserves independent gradient series with ${mode} args [functions[57]]`, () => {
      const args = mode === 'positional'
        ? 'a, b, v, -9, c, #2468AC, "Gradient", display.none, true, false'
        : 'editable=false, fillgaps=true, display=display.none, title="Gradient", bottom_color=#2468AC, top_color=c, bottom_value=-9, top_value=v, plot2=b, plot1=a';
      const result = run(`${valueSource}\n${colorSource}\na = plot(12, title="Upper")\nb = plot(-11, title="Lower")\nfill(${args})`);
      expect(result.errors).toEqual([]);
      const output = getPlot(result, 'Gradient');
      expect(output).toMatchObject({
        plot1Id: 'plot_Upper', plot2Id: 'plot_Lower', display: 0, editable: false, fillgaps: true,
        gradient: {
          topValues: [-7.5, 0, null, 4.25, -2.5], bottomValues: [-9, -9, -9, -9, -9],
          topColors: ['#123456', null, '#654321', '#ABCDEF', '#123456'],
          bottomColors: ['#2468AC', '#2468AC', '#2468AC', '#2468AC', '#2468AC'],
        },
      });
    });
  }
});
