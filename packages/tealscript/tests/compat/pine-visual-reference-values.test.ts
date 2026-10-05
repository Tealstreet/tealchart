import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: reference/pine-v6-reference-v1.json, retrieved 2026-10-03.
// Raw OHLC data authority: oracle-probes/v2/captures/v2/coverage-plot-1-v1.csv.
// Literal values follow supplied arguments and these authorities, never engine output.
const bars = compatibilityBars.slice(0, 6);
const source = (body: string) => `//@version=6\nindicator("Visual reference", overlay=true)\n${body}`;

describe('Pine v6 visual value reference', () => {
  for (const fn of ['plotbar', 'plotcandle'] as const) {
    // Native coverage-plot-1-v1.csv distinguishes raw exports from rendered extrema.
    // Supplied fields are retained even when high/low do not enclose open/close.
    it(`${fn} preserves supplied OHLC fields`, () => {
      const result = runCompatScript(
        source(`
o = bar_index == 0 ? 9 : bar_index == 1 ? -9 : bar_index == 2 ? 2 : 3
h = bar_index == 2 ? 9 : bar_index == 3 ? -9 : 1
l = bar_index == 4 ? 9 : bar_index == 5 ? -9 : -1
c = bar_index == 0 ? -2 : bar_index == 1 ? 2 : bar_index == 4 ? -3 : bar_index == 5 ? 9 : -4
${fn}(o, h, l, c, title="OHLC", color=#123456)
${fn}(7, 3, -2, -9, title="Close minimum", color=#654321)
`),
        { bars },
      );
      expect(result.errors).toEqual([]);
      const plot = getPlot(result, 'OHLC');
      expect(plot.openValues).toEqual([9, -9, 2, 3, 3, 3]);
      expect(plot.closeValues).toEqual([-2, 2, -4, -4, -3, 9]);
      expect(plot.highValues).toEqual([1, 1, 9, -9, 1, 1]);
      expect(plot.lowValues).toEqual([-1, -1, -1, -1, 9, -9]);
      expect(getPlot(result, 'Close minimum').highValues).toEqual([3, 3, 3, 3, 3, 3]);
      expect(getPlot(result, 'Close minimum').lowValues).toEqual([-2, -2, -2, -2, -2, -2]);
    });

    for (const missing of ['open', 'high', 'low', 'close'] as const) {
      // Native CSV retains each finite field beside a missing OHLC field.
      // The existing visibility/color mask still suppresses the incomplete draw.
      it(`${fn} retains raw fields and masks a bar with missing ${missing}`, () => {
        const args = ['open', 'high', 'low', 'close'].map((slot, i) =>
          slot === missing ? `bar_index == 2 ? na : ${[3, 9, -4, 2][i]}` : String([3, 9, -4, 2][i]),
        );
        const colors = fn === 'plotcandle' ? ', wickcolor=#654321, bordercolor=#ABCDEF' : '';
        const result = runCompatScript(source(`${fn}(${args.join(', ')}, title="Gap", color=#123456${colors})`), {
          bars,
        });
        expect(result.errors).toEqual([]);
        const plot = getPlot(result, 'Gap');
        expect(plot.values).toEqual([2, 2, null, 2, 2, 2]);
        expect(plot.openValues).toEqual(missing === 'open' ? [3, 3, null, 3, 3, 3] : Array(6).fill(3));
        expect(plot.highValues).toEqual(missing === 'high' ? [9, 9, null, 9, 9, 9] : Array(6).fill(9));
        expect(plot.lowValues).toEqual(missing === 'low' ? [-4, -4, null, -4, -4, -4] : Array(6).fill(-4));
        expect(plot.closeValues).toEqual(missing === 'close' ? [2, 2, null, 2, 2, 2] : Array(6).fill(2));
        expect(plot.color).toEqual(['#123456', '#123456', null, '#123456', '#123456', '#123456']);
        if (fn === 'plotcandle') {
          expect(plot.wickColor).toEqual(['#654321', '#654321', null, '#654321', '#654321', '#654321']);
          expect(plot.borderColor).toEqual(['#ABCDEF', '#ABCDEF', null, '#ABCDEF', '#ABCDEF', '#ABCDEF']);
        }
      });
    }
  }

  for (const fn of ['plotshape', 'plotchar'] as const) {
    // https://www.tradingview.com/pine-script-reference/v6/#fun_plotshape / #fun_plotchar
    // functions[2]/[3], series parameter: boolean treatment EXCEPT absolute.
    // Signed coordinates + zero + na reject booleanization, abs(), na->0,
    // stale coordinates. Inverse proof: finite absolute zero retained in copy.
    it(`${fn} retains zero and signed absolute coordinates`, () => {
      const result = runCompatScript(
        source(`
v = bar_index == 0 ? -7.5 : bar_index == 1 ? 0 : bar_index == 2 ? na : bar_index == 3 ? 4.25 : bar_index == 4 ? -2.5 : 8
${fn}(v, title="Absolute", location=location.absolute, color=#123456)
`),
        { bars },
      );
      expect(result.errors).toEqual([]);
      const plot = getPlot(result, 'Absolute');
      expect(plot.values).toEqual([-7.5, 0, null, 4.25, -2.5, 8]);
      expect(plot.color).toEqual(['#123456', '#123456', null, '#123456', '#123456', '#123456']);
    });

    // Same entries: numeric nonzero is visible at non-absolute locations.
    // Rejects positive-only visibility, na/zero->visible, dropped gaps, lost text.
    // RED mutation: toMarkerValue uses value > 0; restored PASS.
    it(`${fn} uses boolean visibility outside absolute locations`, () => {
      const result = runCompatScript(
        source(`
v = bar_index == 0 ? -7.5 : bar_index == 1 ? 0 : bar_index == 2 ? na : bar_index == 3 ? 4.25 : bar_index == 4 ? -2.5 : 8
${fn}(v, title="Visible", location=location.belowbar, color=#123456, text="one\\ntwo", textcolor=#654321)
`),
        { bars },
      );
      expect(result.errors).toEqual([]);
      const plot = getPlot(result, 'Visible');
      expect(plot.values.map((value) => value !== null)).toEqual([true, false, false, true, true, true]);
      expect(plot.color).toEqual(['#123456', null, null, '#123456', '#123456', '#123456']);
      expect(plot.textColor).toEqual(['#654321', null, null, '#654321', '#654321', '#654321']);
      expect(plot.textValues).toEqual(['one\ntwo', null, null, 'one\ntwo', 'one\ntwo', 'one\ntwo']);
    });
  }

  // https://www.tradingview.com/pine-script-reference/v6/#fun_plotarrow
  // functions[4], description: sign controls direction; magnitude controls height.
  // Nonmonotonic signed magnitudes reject sign-only/abs()/last/max output,
  // swapped colors, zero/na arrows, dropped gaps. RED: Math.abs(value); restored PASS.
  it('plotarrow preserves signed magnitude and suppresses zero/na arrows', () => {
    const result = runCompatScript(
      source(`
v = bar_index == 0 ? 7.5 : bar_index == 1 ? -2 : bar_index == 2 ? 0 : bar_index == 3 ? na : bar_index == 4 ? -9 : 1.25
plotarrow(v, title="Arrows", colorup=#123456, colordown=#654321)
`),
      { bars },
    );
    expect(result.errors).toEqual([]);
    const plot = getPlot(result, 'Arrows');
    expect(plot.values).toEqual([7.5, -2, null, null, -9, 1.25]);
    expect(plot.colorup).toEqual(['#123456', null, null, null, null, '#123456']);
    expect(plot.colordown).toEqual([null, '#654321', null, null, '#654321', null]);
    expect(plot.color).toEqual(['#123456', '#654321', null, null, '#654321', '#123456']);
  });
});
