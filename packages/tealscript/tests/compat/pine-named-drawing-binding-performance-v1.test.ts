import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Reference: https://www.tradingview.com/pine-script-reference/v6/, functions[437]/[452].
// The CPU bound is an engine regression gate; Pine specifies the setter/getter effects.
describe('named drawing binding performance', () => {
  it('preserves named setter identities within the binding CPU budget', () => {
    const bars = Array.from({ length: 500 }, (_, index) => ({
      ...compatibilityBars[0],
      time: compatibilityBars[0].time + index * 120_000,
    }));
    const started = process.cpuUsage();
    const result = runCompatScript(`//@version=6
indicator("Named drawing binding")
var id = label.new(0, 1)
for iteration = 0 to 1999
    label.set_x(x=bar_index, id=id)
plot(label.get_x(id), "x")
`, { bars });
    const cpu = process.cpuUsage(started);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'x').values).toEqual(bars.map((_, index) => index));
    expect(result.drawings).toHaveLength(1);
    expect(result.drawings[0]).toMatchObject({ type: 'label', x: 499 });
    if (process.env.TEALSCRIPT_PERF_ASSERT === '1') {
      expect(cpu.user + cpu.system).toBeLessThan(550_000);
    }
  });

  it('retains positional setters and getter IDs alongside named setters', () => {
    const result = runCompatScript(`//@version=6
indicator("Drawing binding controls")
var first = label.new(0, 1)
var second = label.new(0, 2)
label.set_x(first, bar_index)
label.set_x(x=bar_index + 1, id=second)
plot(label.get_x(id=first), "first")
plot(label.get_x(second), "second")
`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'first').values).toEqual(compatibilityBars.map((_, index) => index));
    expect(getPlot(result, 'second').values).toEqual(compatibilityBars.map((_, index) => index + 1));
  });
});
