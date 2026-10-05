import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Official reference/pine-v6-reference-v1.json constants; assertions target
// the runtime payload consumed by the renderer, not pixel geometry.
// RED proof: remove the selected metadata field in executeCompiled's result.
const groups = [
  { namespace: 'plot.style_', parameter: 'style', field: 'style', fn: 'plot', firstEntry: 27,
    options: ['line', 'linebr', 'stepline', 'stepline_diamond', 'histogram', 'cross', 'area', 'areabr', 'columns', 'circles', 'steplinebr'] },
  { namespace: 'plot.linestyle_', parameter: 'linestyle', field: 'lineStyle', fn: 'plot', firstEntry: 38,
    options: ['solid', 'dashed', 'dotted'] },
  { namespace: 'hline.style_', parameter: 'linestyle', field: 'lineStyle', fn: 'hline', firstEntry: 9,
    options: ['solid', 'dotted', 'dashed'] },
  { namespace: 'shape.', parameter: 'style', field: 'shape', fn: 'plotshape', firstEntry: 53,
    options: ['xcross', 'cross', 'circle', 'triangleup', 'triangledown', 'flag', 'arrowup', 'arrowdown', 'labelup', 'labeldown', 'square', 'diamond'] },
  { namespace: 'location.', parameter: 'location', field: 'location', fn: 'plotshape', firstEntry: 65,
    options: ['abovebar', 'belowbar', 'top', 'bottom', 'absolute'] },
  { namespace: 'size.', parameter: 'size', field: 'size', fn: 'plotchar', firstEntry: 21,
    options: ['auto', 'tiny', 'small', 'normal', 'large', 'huge'] },
  { namespace: 'format.', parameter: 'format', field: 'format', fn: 'plot', firstEntry: 41,
    options: ['inherit', 'price', 'volume', 'percent'] },
] as const;

describe('Pine v6 visual constant payloads', () => {
  for (const group of groups) {
    group.options.forEach((option, i) => {
      const token = `${group.namespace}${option}`;
      it(`preserves ${token} [constants[${group.firstEntry + i}]]`, () => {
        const result = runCompatScript(`//@version=6
indicator("Constants", overlay=true)
${group.fn}(1, title="Token", ${group.parameter}=${token})
`, { bars: compatibilityBars.slice(0, 3) });
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'Token')).toMatchObject({ type: group.fn, [group.field]: option });
      });
    });
  }

  // constants[175..181] name display targets; bit values are the output schema.
  for (const [option, bits] of [['none', 0], ['pane', 1], ['data_window', 2], ['price_scale', 8], ['status_line', 4], ['pine_screener', 16], ['all', 31]] as const) {
    it(`preserves display.${option} [constants[${175 + ['none', 'pane', 'data_window', 'price_scale', 'status_line', 'pine_screener', 'all'].indexOf(option)}]]`, () => {
      const result = runCompatScript(`//@version=6
indicator("Display")
plot(close, title="Token", display=display.${option})
`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Token').display).toBe(bits);
    });
  }

  for (const [i, option] of ['right', 'left', 'none'].entries()) {
    it(`preserves scale.${option} declaration [constants[${70 + i}]]`, () => {
      const result = runCompatScript(`//@version=6
indicator("Scale", overlay=true, scale=scale.${option})
plot(close)
`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expect(result.indicatorScale).toBe(option);
    });
  }
});
