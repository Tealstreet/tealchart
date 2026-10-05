import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: pine-v6-reference-v1.json (2026-10-03), entries 1146-1150.
// Each point field is read directly, independently of drawing projections.
describe('Official chart.point fields and copies', () => {
  for (const [call, missing, present, value] of [
    ['chart.point.from_index(4, -7.25)', 'time', 'index', 4],
    ['chart.point.from_time(1700000060000, -7.25)', 'index', 'time', 1700000060000],
  ] as const) {
    it(`${call} leaves ${missing} unavailable [1146, 1148]`, () => {
      const result = runCompatScript(`//@version=6
indicator("Point fields")
p = ${call}
plot(na(p.${missing}) ? 1 : 0, title="missing")
plot(p.${present}, title="coordinate")
plot(p.price, title="price")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'missing').values).toEqual([1]);
      expect(getPlot(result, 'coordinate').values).toEqual([value]);
      expect(getPlot(result, 'price').values).toEqual([-7.25]);
    });
  }

  for (const price of ['', 'price=-7.25']) {
    it(`chart.point.now(${price}) captures the execution bar [1149]`, () => {
      const bars = compatibilityBars.slice(0, 3);
      const result = runCompatScript(`//@version=6
indicator("Current point")
p = chart.point.now(${price})
plot(p.time, title="time")
plot(p.index, title="index")
plot(p.price, title="price")`, { bars });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'time').values).toEqual(bars.map((bar) => bar.time));
      expect(getPlot(result, 'index').values).toEqual([0, 1, 2]);
      expect(getPlot(result, 'price').values).toEqual(bars.map((bar) => price ? -7.25 : bar.close));
    });
  }

  it('chart.point.now preserves an explicitly unavailable price [1149]', () => {
    const result = runCompatScript(`//@version=6
indicator("Unavailable point price")
float unavailable = na
p = chart.point.now(price=unavailable)
plot(na(p.price) ? 1 : 0, title="missing")
plot(p.time, title="time")
plot(p.index, title="index")`, { bars: compatibilityBars.slice(0, 1) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'missing').values).toEqual([1]);
    expect(getPlot(result, 'time').values).toEqual([compatibilityBars[0]!.time]);
    expect(getPlot(result, 'index').values).toEqual([0]);
  });

  for (const method of [false, true]) {
    it(`chart.point.copy ${method ? 'method' : 'function'} makes an independent point [1147]`, () => {
      const result = runCompatScript(`//@version=6
indicator("Point copy")
a = chart.point.new(1700000000000, 4, -7.25)
b = ${method ? 'a.copy()' : 'chart.point.copy(a)'}
a.price := 13.5
a.index := 1
b.time := 1700000060000
plot(a.time, title="at")
plot(a.index, title="ai")
plot(a.price, title="ap")
plot(b.time, title="bt")
plot(b.index, title="bi")
plot(b.price, title="bp")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      for (const [title, value] of Object.entries({ at: 1700000000000, ai: 1, ap: 13.5, bt: 1700000060000, bi: 4, bp: -7.25 })) {
        expect(getPlot(result, title).values).toEqual([value]);
      }
    });
  }
});
