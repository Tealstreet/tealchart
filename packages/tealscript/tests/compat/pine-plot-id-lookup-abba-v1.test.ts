import { describe, expect, it, vi } from 'vitest';

import { ExecutionContext } from '../../src/runtime/context';
import { compatibilityBars, runCompatScript } from './fixtures';

describe('compiled plot ID lookup', () => {
  it('updates every visual family without allocating ordered plot snapshots per call', () => {
    const snapshots = vi.spyOn(ExecutionContext.prototype, 'getPlots');
    try {
      const result = runCompatScript(`//@version=6
indicator("Plot lookup")
first = plot(close, "same", color=color.red)
second = plot(open, "same", color=color.blue)
hline(1)
fill(first, second, color=color.green)
plotshape(close > open)
plotchar(close > open)
plotarrow(close - open)
bgcolor(color.yellow)
barcolor(color.orange)
plotbar(open, high, low, close)
plotcandle(open, high, low, close)
`);
      expect(result.errors).toEqual([]);
      expect(result.plots.slice(0, 2).map((plot) => plot.values)).toEqual([
        compatibilityBars.map((bar) => bar.close),
        compatibilityBars.map((bar) => bar.open),
      ]);
      expect(result.plots.map((plot) => plot.type)).toEqual([
        'plot',
        'plot',
        'hline',
        'fill',
        'plotshape',
        'plotchar',
        'plotarrow',
        'bgcolor',
        'barcolor',
        'plotbar',
        'plotcandle',
      ]);
      expect(snapshots).toHaveBeenCalledTimes(1);
    } finally {
      snapshots.mockRestore();
    }
  });

  it('keeps fresh public snapshots in plot order while sharing current plot objects', () => {
    const context = new ExecutionContext();
    context.registerPlot({ id: 'b', type: 'plot', title: 'same', color: '#ff0000' });
    context.registerPlot({ id: 'a', type: 'hline', title: 'same', color: '#0000ff' });
    const first = context.getPlots();
    const second = context.getPlots();
    expect(first).not.toBe(second);
    expect(first.map((plot) => plot.id)).toEqual(['b', 'a']);
    expect(first[0]).toBe(context.plots.get('b'));
    first.pop();
    expect(context.getPlots()).toHaveLength(2);
    const moved = context.plots.get('b')!;
    context.plots.delete('b');
    context.plots.set('b', moved);
    expect(context.getPlots().map((plot) => plot.id)).toEqual(['b', 'a']);
    context.plots.delete('a');
    expect(context.getPlots().map((plot) => plot.id)).toEqual(['b']);
  });

  it('keeps title and numeric-index selection restricted to ordered plots', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Plot selection")
hline(7, "same")
plot(close, "same")
plot(open, "same")
selected = input.source(close, "Selected")
plot(selected, "Selected output")
alertcondition(true, "Selection", '{{plot_0}}|{{plot_1}}|{{plot("same")}}')`,
      {
        inputs: new Map([['input_Selected', 'same']]),
      },
    );
    expect(result.errors).toEqual([]);
    expect(result.plots[3].values).toEqual(compatibilityBars.map((bar) => bar.close));
    expect(result.alerts[0].renderedMessages).toEqual(
      compatibilityBars.map((bar) => `${bar.close}|${bar.open}|${bar.close}`),
    );
  });

  it('keeps duplicate-title fill handles and independent gradient updates matched by ID', () => {
    const result = runCompatScript(`//@version=6
indicator("Fill matching")
a = plot(close, "same")
b = plot(open, "same")
h1 = hline(10, "same")
h2 = hline(0, "same")
fill(a, b, color=color.red, title="same")
fill(a, b, top_value=high, bottom_value=low, top_color=color.green, bottom_color=color.yellow, title="same")
fill(hline1=h1, hline2=h2, color=color.orange, title="same")`);
    expect(result.errors).toEqual([]);
    const [first, second, highLine, lowLine, flat, gradient, horizontal] = result.plots;
    expect(new Set(result.plots.map((plot) => plot.id)).size).toBe(7);
    expect([flat.plot1Id, flat.plot2Id]).toEqual([first.id, second.id]);
    expect([gradient.plot1Id, gradient.plot2Id]).toEqual([first.id, second.id]);
    expect([horizontal.plot1Id, horizontal.plot2Id]).toEqual([highLine.id, lowLine.id]);
    expect(flat.values).toEqual(compatibilityBars.map(() => 1));
    expect(horizontal.values).toEqual(compatibilityBars.map(() => 1));
    expect(gradient.gradient?.topValues).toEqual(compatibilityBars.map((bar) => bar.high));
    expect(gradient.gradient?.bottomValues).toEqual(compatibilityBars.map((bar) => bar.low));
    expect(flat.gradient).toBeUndefined();
    expect(horizontal.gradient).toBeUndefined();
  });
});
