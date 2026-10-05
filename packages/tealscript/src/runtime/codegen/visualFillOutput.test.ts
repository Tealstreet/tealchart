import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';
import { ExecutionContext } from '../context';

const bars = [110, 112, 114].map((close, i) => ({
  time: (i + 1) * 1000, open: close, high: close + 2, low: close - 2, close, volume: 100,
}));

describe('Pine visual fill output', () => {
  it('preserves series gradient stops and colors with named and positional arguments', () => {
    for (const call of [
      'fill(a, b, high, low, color.green, color.red, "Gradient", display.all, false, false)',
      'fill(plot1=a, plot2=b, top_value=high, bottom_value=low, top_color=color.green, bottom_color=color.red, title="Gradient", fillgaps=false, editable=false)',
    ]) {
      const result = executeScript(parse(`//@version=6\nindicator("Gradient")\na = plot(high)\nb = plot(low)\n${call}`), bars);
      const fill = result.plots.find((plot) => plot.type === 'fill')!;
      expect(fill).toMatchObject({
        title: 'Gradient', editable: false, display: 31, fillgaps: false,
        gradient: {
          topValues: [112, 114, 116], bottomValues: [108, 110, 112],
          topColors: ['#4CAF50', '#4CAF50', '#4CAF50'], bottomColors: ['#F23645', '#F23645', '#F23645'],
        },
        plot1Id: result.plots[0].id, plot2Id: result.plots[1].id,
      });
    }
  });

  it('truncates all gradient arrays before replacing a realtime bar', () => {
    const ctx = new ExecutionContext();
    ctx.registerPlot({ id: 'gradient', type: 'fill', title: 'Gradient', color: [], gradient: {
      topValues: [3, 4, 5], bottomValues: [0, 1, 2],
      topColors: ['#ff0000', '#00ff00', '#0000ff'], bottomColors: [null, null, null],
    } });
    ctx.truncatePlots(2);
    expect(ctx.getPlots()[0].gradient).toEqual({
      topValues: [3, 4], bottomValues: [0, 1], topColors: ['#ff0000', '#00ff00'], bottomColors: [null, null],
    });
  });

  it('checks the documented gradient and flat positional tails', () => {
    for (const call of [
      'fill(a, b, high, low, color.green, color.red, "Gradient", display.all, false, false)',
      'fill(a, b, color.blue, "Flat", false, 2, false, display.all)',
    ]) {
      const result = checkProgram(parse(`//@version=6\nindicator("Fill")\na = plot(high)\nb = plot(low)\n${call}`));
      expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    }
  });

  it('checks horizontal-line fill tails using their own positional slots', () => {
    const result = checkProgram(parse(`//@version=6
indicator("Fill")
a = hline(120)
b = hline(100)
fill(a, b, color.blue, "Flat", false, true, display.none)`));
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });

  it('binds the horizontal fill positional tail without a show_last slot', () => {
    const result = executeScript(parse(`//@version=6
indicator("Levels")
a = hline(120)
b = hline(100)
fill(a, b, color.new(color.blue, 90), "Levels", false, true, display.none)`), bars);
    expect(result.plots.find((plot) => plot.type === 'fill')).toMatchObject({
      title: 'Levels', editable: false, fillgaps: true, display: 0,
      // TV-native CF009 settles v6 color.blue; preserve the 90% alpha.
      color: ['#2962FF1A', '#2962FF1A', '#2962FF1A'],
    });
    expect(result.plots.find((plot) => plot.type === 'fill')?.showLast).toBeUndefined();
  });
});
