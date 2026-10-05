import { describe, expect, it } from 'vitest';

import type { PlotOutput } from '../../src/runtime';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Independently derived from reference/pine-v6-reference-v1.json (2026-10-03).
// Each row cites its exact official function entry. Distinct numeric, color,
// enum and boolean sentinels reject shifted/dropped/duplicated slots and defaults
// overriding explicit arguments. Reversed named arguments reject object-key order
// binding. RED proof for slots: force display.all instead of supplied display.none.
// RED proof for defaults: replace display.all fallbacks with display.none.
interface VisualCase {
  fn: string;
  authority: string;
  prelude?: string;
  args: Array<[string, string]>;
  expected: Partial<PlotOutput>;
  minimal: string;
  defaults: Partial<PlotOutput>;
}
const shared = { editable: false, showLast: 4, display: 0, format: 'volume', precision: 2, forceOverlay: true };
const visualCases: VisualCase[] = [
  {
    fn: 'plot', authority: 'functions[1], #fun_plot',
    args: [['series', 'bar_index == 0 ? 3 : bar_index == 1 ? -2 : 1'], ['title', '"Slots"'], ['color', '#123456'], ['linewidth', '3'],
      ['style', 'plot.style_circles'], ['trackprice', 'true'], ['histbase', '-7'], ['offset', '-2'],
      ['join', 'true'], ['editable', 'false'], ['show_last', '4'], ['display', 'display.none'],
      ['format', 'format.volume'], ['precision', '2'], ['force_overlay', 'true'], ['linestyle', 'plot.linestyle_dotted']],
    expected: { ...shared, linewidth: 3, style: 'circles', trackprice: true, histbase: -7, offset: -2, join: true, lineStyle: 'dotted' },
    minimal: 'plot(close, title="Defaults")',
    defaults: { linewidth: 1, style: 'line', trackprice: false, histbase: 0, offset: 0, join: false, editable: true, display: 31, forceOverlay: false, lineStyle: 'solid' },
  },
  {
    fn: 'plotshape', authority: 'functions[2], #fun_plotshape',
    args: [['series', 'true'], ['title', '"Slots"'], ['style', 'shape.diamond'], ['location', 'location.bottom'],
      ['color', '#123456'], ['offset', '-2'], ['text', '"one\\ntwo"'], ['textcolor', '#654321'],
      ['editable', 'false'], ['size', 'size.huge'], ['show_last', '4'], ['display', 'display.none'],
      ['format', 'format.volume'], ['precision', '2'], ['force_overlay', 'true']],
    expected: { ...shared, shape: 'diamond', location: 'bottom', offset: -2, text: 'one\ntwo', size: 'huge' },
    minimal: 'plotshape(true, title="Defaults")',
    defaults: { shape: 'xcross', location: 'abovebar', size: 'auto', offset: 0, editable: true, display: 31, forceOverlay: false },
  },
  {
    fn: 'plotchar', authority: 'functions[3], #fun_plotchar',
    args: [['series', 'true'], ['title', '"Slots"'], ['char', '"★"'], ['location', 'location.top'],
      ['color', '#123456'], ['offset', '-2'], ['text', '"one\\ntwo"'], ['textcolor', '#654321'],
      ['editable', 'false'], ['size', 'size.tiny'], ['show_last', '4'], ['display', 'display.none'],
      ['format', 'format.volume'], ['precision', '2'], ['force_overlay', 'true']],
    expected: { ...shared, char: '★', location: 'top', offset: -2, text: 'one\ntwo', size: 'tiny' },
    minimal: 'plotchar(true, title="Defaults")',
    defaults: { location: 'abovebar', size: 'auto', offset: 0, editable: true, display: 31, forceOverlay: false },
  },
  {
    fn: 'plotarrow', authority: 'functions[4], #fun_plotarrow',
    args: [['series', 'bar_index == 1 ? -3 : 2'], ['title', '"Slots"'], ['colorup', '#123456'], ['colordown', '#654321'],
      ['offset', '-2'], ['minheight', '9'], ['maxheight', '37'], ['editable', 'false'], ['show_last', '4'],
      ['display', 'display.none'], ['format', 'format.volume'], ['precision', '2'], ['force_overlay', 'true']],
    expected: { ...shared, offset: -2, minHeight: 9, maxHeight: 37, values: [2, -3, 2],
      colorup: ['#123456', null, '#123456'], colordown: [null, '#654321', null] },
    minimal: 'plotarrow(2, title="Defaults")',
    defaults: { minHeight: 5, maxHeight: 100, offset: 0, editable: true, display: 31, forceOverlay: false },
  },
  {
    fn: 'plotbar', authority: 'functions[5], #fun_plotbar',
    args: [['open', '3'], ['high', '9'], ['low', '-4'], ['close', '2'], ['title', '"Slots"'], ['color', '#123456'],
      ['editable', 'false'], ['show_last', '4'], ['display', 'display.none'], ['format', 'format.volume'], ['precision', '2'], ['force_overlay', 'true']],
    expected: { ...shared, openValues: [3, 3, 3], highValues: [9, 9, 9], lowValues: [-4, -4, -4], closeValues: [2, 2, 2] },
    minimal: 'plotbar(3, 9, -4, 2, title="Defaults")',
    defaults: { editable: true, display: 31, forceOverlay: false },
  },
  {
    fn: 'plotcandle', authority: 'functions[6], #fun_plotcandle',
    args: [['open', '3'], ['high', '9'], ['low', '-4'], ['close', '2'], ['title', '"Slots"'], ['color', '#123456'],
      ['wickcolor', '#654321'], ['editable', 'false'], ['show_last', '4'], ['bordercolor', '#ABCDEF'],
      ['display', 'display.none'], ['format', 'format.volume'], ['precision', '2'], ['force_overlay', 'true']],
    expected: { ...shared, openValues: [3, 3, 3], highValues: [9, 9, 9], lowValues: [-4, -4, -4], closeValues: [2, 2, 2],
      wickColor: ['#654321', '#654321', '#654321'], borderColor: ['#ABCDEF', '#ABCDEF', '#ABCDEF'] },
    minimal: 'plotcandle(3, 9, -4, 2, title="Defaults")',
    defaults: { editable: true, display: 31, forceOverlay: false },
  },
  {
    fn: 'barcolor', authority: 'functions[7], #fun_barcolor',
    args: [['color', '#123456'], ['offset', '-1'], ['editable', 'false'], ['show_last', '4'], ['title', '"Slots"'], ['display', 'display.none']],
    expected: { offset: -1, editable: false, showLast: 4, display: 0 },
    minimal: 'barcolor(#123456, title="Defaults")', defaults: { offset: 0, editable: true, display: 31 },
  },
  {
    fn: 'bgcolor', authority: 'functions[8], #fun_bgcolor',
    args: [['color', '#123456'], ['offset', '-1'], ['editable', 'false'], ['show_last', '4'], ['title', '"Slots"'], ['display', 'display.none'], ['force_overlay', 'true']],
    expected: { offset: -1, editable: false, showLast: 4, display: 0, forceOverlay: true },
    minimal: 'bgcolor(#123456, title="Defaults")', defaults: { offset: 0, editable: true, display: 31, forceOverlay: false },
  },
  {
    fn: 'hline', authority: 'functions[56], #fun_hline',
    args: [['price', '-7.25'], ['title', '"Slots"'], ['color', '#123456'], ['linestyle', 'hline.style_dashed'], ['linewidth', '3'], ['editable', 'false'], ['display', 'display.none']],
    expected: { price: -7.25, color: '#123456', lineStyle: 'dashed', linewidth: 3, editable: false, display: 0 },
    minimal: 'hline(-7.25, title="Defaults")', defaults: { price: -7.25, linewidth: 1, editable: true, display: 31 },
  },
  {
    fn: 'fill', authority: 'functions[59], #fun_fill (plot-color overload)',
    prelude: 'a = plot(9, title="Upper")\nb = plot(-4, title="Lower")',
    args: [['plot1', 'a'], ['plot2', 'b'], ['color', '#123456'], ['title', '"Slots"'], ['editable', 'false'], ['show_last', '4'], ['fillgaps', 'true'], ['display', 'display.none']],
    expected: { plot1Id: 'plot_Upper', plot2Id: 'plot_Lower', editable: false, showLast: 4, fillgaps: true, display: 0 },
    minimal: 'fill(a, b, title="Defaults")', defaults: { editable: true, fillgaps: false, display: 31 },
  },
];

describe('Pine v6 visual parameter reference', () => {
  for (const row of visualCases) {
    for (const mode of ['positional', 'reversed named'] as const) {
      it(`${row.fn} binds ${mode} slots [${row.authority}]`, () => {
        const args = mode === 'positional' ? row.args.map(([, value]) => value)
          : [...row.args].reverse().map(([name, value]) => `${name}=${value}`);
        const result = runCompatScript(`//@version=6
indicator("Visual slots", overlay=false, format=format.percent, precision=6)
${row.prelude ?? ''}
${row.fn}(${args.join(', ')})
`, { bars: compatibilityBars.slice(0, 3) });
        expect(result.errors).toEqual([]);
        const plot = getPlot(result, 'Slots');
        expect(plot).toMatchObject({ type: row.fn, ...row.expected });
        // All slots calls specify #123456; hline uses a static color payload.
        if (row.fn !== 'hline' && row.fn !== 'plotarrow') {
          const count = 3;
          expect(Array.isArray(plot.color) ? plot.color.slice() : plot.color).toEqual(Array(count).fill('#123456'));
        }
        if (row.fn === 'plotshape' || row.fn === 'plotchar') {
          // PlotOutput permits a constant color or its equivalent per-bar series.
          expect(typeof plot.textColor === 'string' ? Array(3).fill(plot.textColor) : plot.textColor)
            .toEqual(['#654321', '#654321', '#654321']);
          expect(plot.textValues).toEqual(['one\ntwo', 'one\ntwo', 'one\ntwo']);
        }
        if (row.fn === 'plot') expect(plot.values).toEqual([3, -2, 1]);
      });
    }
    it(`${row.fn} applies documented defaults [${row.authority}]`, () => {
      const result = runCompatScript(`//@version=6
indicator("Visual defaults", overlay=true)
${row.prelude ?? ''}
${row.minimal}
`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Defaults')).toMatchObject({ type: row.fn, ...row.defaults });
    });
  }
});
