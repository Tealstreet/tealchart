import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Reference: https://www.tradingview.com/pine-script-reference/v6/,
// functions[10]/[13]/[17]/[21]/[25]/[29]/[445]. The CPU budget is an engine performance gate.
describe('color conversion performance', () => {
  it('preserves RGB channels and label colors within the conversion CPU budget', () => {
    const bars = Array.from({ length: 500 }, (_, index) => ({
      ...compatibilityBars[0],
      time: compatibilityBars[0].time + index * 120_000,
    }));
    const started = process.cpuUsage();
    const result = runCompatScript(
      `//@version=6
indicator("Color conversion performance")
var id = label.new(0, 1)
for iteration = 0 to 1999
    converted = color.new(color.rgb(bar_index % 256, iteration % 256, 200), (bar_index % 2) * 100)
    label.set_color(id, converted)
selected = color.new(color.rgb(bar_index % 256, 207, 200), (bar_index % 2) * 100)
plot(color.r(selected), "red")
plot(color.g(selected), "green")
plot(color.b(selected), "blue")
plot(color.t(selected), "transparency")
`,
      { bars },
    );
    const cpu = process.cpuUsage(started);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'red').values).toEqual(bars.map((_, index) => index % 256));
    expect(getPlot(result, 'green').values).toEqual(bars.map(() => 207));
    expect(getPlot(result, 'blue').values).toEqual(bars.map(() => 200));
    expect(getPlot(result, 'transparency').values).toEqual(bars.map((_, index) => (index % 2) * 100));
    expect(result.drawings).toHaveLength(1);
    expect(result.drawings[0]).toMatchObject({ type: 'label', color: '#F3CFC800' });
    if (process.env.TEALSCRIPT_PERF_ASSERT === '1') {
      expect(cpu.user + cpu.system).toBeLessThan(3_000_000);
    }
  });

  it('retains hex channels when transparency replaces the original alpha', () => {
    const result = runCompatScript(`//@version=6
indicator("Hex color controls")
selected = bar_index % 2 == 0 ? #1234ab : #ff00cc80
converted = color.new(selected, (bar_index % 2) * 100)
plot(color.r(converted), "red")
plot(color.g(converted), "green")
plot(color.b(converted), "blue")
plot(color.t(converted), "transparency")
`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'red').values).toEqual(compatibilityBars.map((_, index) => (index % 2 === 0 ? 18 : 255)));
    expect(getPlot(result, 'green').values).toEqual(compatibilityBars.map((_, index) => (index % 2 === 0 ? 52 : 0)));
    expect(getPlot(result, 'blue').values).toEqual(compatibilityBars.map((_, index) => (index % 2 === 0 ? 171 : 204)));
    expect(getPlot(result, 'transparency').values).toEqual(compatibilityBars.map((_, index) => (index % 2) * 100));
  });
});
