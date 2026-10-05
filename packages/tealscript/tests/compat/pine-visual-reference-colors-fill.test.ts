import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Independent expectations from reference/pine-v6-reference-v1.json (2026-10-03).
// A returning, nonconstant color sequence rejects first/last color caching,
// constant/default substitution, reversed order, and mixing independent channels.
// RED mutation: toPlotColor returns #000000; restored PASS for each ordinary case.
const colors = ['#123456', '#654321', '#ABCDEF', '#123456'];
const bars = compatibilityBars.slice(0, 4);
function runVisual(body: string) {
  return runCompatScript(`//@version=6
indicator("Reference colors", overlay=true)
c = bar_index == 0 ? #123456 : bar_index == 1 ? #654321 : bar_index == 2 ? #ABCDEF : #123456
d = bar_index < 2 ? #FEDCBA : #2468AC
${body}
`, { bars });
}

const colorCases = [
  { name: 'plot', entry: 'functions[1], #fun_plot', call: 'plot(bar_index == 1 ? -3 : 2, title="Colors", color=c)' },
  { name: 'plotshape', entry: 'functions[2], #fun_plotshape', call: 'plotshape(true, title="Colors", color=c, text="T", textcolor=d)' },
  { name: 'plotchar', entry: 'functions[3], #fun_plotchar', call: 'plotchar(true, title="Colors", color=c, char="★", textcolor=d)' },
  { name: 'plotbar', entry: 'functions[5], #fun_plotbar', call: 'plotbar(3, 9, -4, 2, title="Colors", color=c)' },
  { name: 'plotcandle', entry: 'functions[6], #fun_plotcandle', call: 'plotcandle(3, 9, -4, 2, title="Colors", color=c, wickcolor=d, bordercolor=bar_index < 2 ? #13579B : #97531A)' },
  { name: 'plot fill', entry: 'functions[59], #fun_fill', call: 'a = plot(9, title="Upper")\nb = plot(-4, title="Lower")\nfill(a, b, c, title="Colors")' },
  { name: 'hline fill', entry: 'functions[58], #fun_fill', call: 'a = hline(9, title="Upper")\nb = hline(-4, title="Lower")\nfill(a, b, color=c, title="Colors")' },
];

describe('Pine v6 visual series colors and hline fill reference', () => {
  for (const row of colorCases) {
    // Each cited color parameter accepts series color, with examples using
    // conditional colors. Hline's own color is deliberately constant.
    it(`${row.name} retains per-bar color channels [${row.entry}]`, () => {
      const result = runVisual(row.call);
      expect(result.errors).toEqual([]);
      const plot = getPlot(result, 'Colors');
      expect(plot.color).toEqual(colors);
      if (row.name === 'plotshape' || row.name === 'plotchar') {
        expect(plot.textColor).toEqual(['#FEDCBA', '#FEDCBA', '#2468AC', '#2468AC']);
      }
      if (row.name === 'plotcandle') {
        expect(plot.wickColor).toEqual(['#FEDCBA', '#FEDCBA', '#2468AC', '#2468AC']);
        expect(plot.borderColor).toEqual(['#13579B', '#13579B', '#97531A', '#97531A']);
      }
      if (row.name.endsWith('fill')) {
        const prefix = row.name === 'hline fill' ? 'hline' : 'plot';
        expect(plot.plot1Id).toBe(`${prefix}_Upper`);
        expect(plot.plot2Id).toBe(`${prefix}_Lower`);
      }
    });
  }

  // functions[4], #fun_plotarrow: both directional colors accept series color.
  // Opposite signs with different same-direction colors reject swapped channels,
  // caching, using body color for both directions, or abs()/sign-only series.
  it('plotarrow selects independent series color channels by sign [functions[4], #fun_plotarrow]', () => {
    const result = runVisual('plotarrow(bar_index == 0 ? 3 : bar_index == 1 ? -2 : bar_index == 2 ? 7 : -1, title="Colors", colorup=c, colordown=d)');
    expect(result.errors).toEqual([]);
    const plot = getPlot(result, 'Colors');
    expect(plot.values).toEqual([3, -2, 7, -1]);
    expect(plot.color).toEqual(['#123456', '#FEDCBA', '#ABCDEF', '#2468AC']);
    expect(plot.colorup).toEqual(['#123456', null, '#ABCDEF', null]);
    expect(plot.colordown).toEqual([null, '#FEDCBA', null, '#2468AC']);
  });

  for (const fn of ['bgcolor', 'barcolor'] as const) {
    for (const offset of [-1, 1]) {
      // Native v7 barcolor-series-offset-v5: source_plot_row + native_main_candles[].color.
      // BARCOLOR-NATIVE-MODEL-AUDIT-v1.json contradicts pre-shifting source samples.
      it(`${fn} retains source colors with offset ${offset} [functions[${fn === 'bgcolor' ? 8 : 7}]]`, () => {
        const result = runVisual(`${fn}(c, offset=${offset}, title="Colors")`);
        expect(result.errors).toEqual([]);
        const plot = getPlot(result, 'Colors');
        expect(plot.offset).toBe(offset);
        expect(Array.isArray(plot.color) ? plot.color.slice() : plot.color)
          .toEqual(colors);
      });
    }
  }

  // https://www.tradingview.com/pine-script-reference/v6/#fun_fill
  // functions[58]: hline overload has NO show_last between editable/fillgaps.
  // Inverse proof: isolated copy selects the seven hline parameter names; GREEN.
  for (const mode of ['positional', 'named'] as const) {
    it(`hline fill binds ${mode} overload [functions[58], #fun_fill]`, () => {
      const call = mode === 'positional'
        ? 'fill(a, b, #123456, "Fill slots", false, true, display.none)'
        : 'fill(hline2=b, display=display.none, title="Fill slots", color=#123456, editable=false, fillgaps=true, hline1=a)';
      const result = runVisual(`a = hline(9, title="Upper")\nb = hline(-4, title="Lower")\n${call}`);
      expect(result.errors).toEqual([]);
      const plot = getPlot(result, 'Fill slots');
      expect(plot).toMatchObject({ type: 'fill', plot1Id: 'hline_Upper', plot2Id: 'hline_Lower', editable: false, fillgaps: true, display: 0 });
      expect(plot.color).toEqual(['#123456', '#123456', '#123456', '#123456']);
    });
  }

  // Same entry: omitted editable/fillgaps/display default to true/false/all.
  it('hline fill applies documented overload defaults [functions[58], #fun_fill]', () => {
    const result = runVisual('a = hline(9)\nb = hline(-4)\nfill(a, b, title="Fill defaults", color=c)');
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Fill defaults')).toMatchObject({ type: 'fill', editable: true, fillgaps: false, display: 31, color: colors });
  });
});
