import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const start = Date.UTC(2026, 9, 1);
function bars(prices: number[], step: number): Bar[] {
  return prices.map((close, index) => ({
    time: start + index * step * 60000,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 100,
  }));
}
describe('selected custom get return is a string', () => {
  for (const version of [5, 6]) {
    it(`v${version} requested enum array custom get`, () => {
      const source = `//@version=${version}
indicator("Custom get string boundary")
enum Direction
    up = "rising"
    down = "falling"
method get(array<Direction> values, string marker) => marker
values = request.security_lower_tf("REMOTE:ALT", "1", close > 0 ? Direction.up : Direction.down)
custom = values.get("Direction.up")
plot(custom == "Direction.up" ? 1 : 99, "Raw custom")
plot(str.tostring(custom) == "Direction.up" ? 1 : 99, "Bound custom string")
plot(str.tostring(values.get("Direction.up")) == "Direction.up" ? 1 : 99, "Inline custom string")
plot(array.get(values, 0) == Direction.down ? -4 : 7, "Builtin identity")
plot(str.tostring(array.get(values, 0)) == "falling" ? -4 : str.tostring(array.get(values, 0)) == "rising" ? 7 : 99, "Namespace builtin title")`;
      const result = runCompatScript(source, {
        bars: bars([900, 901, 902], 2),
        engineOptions: {
          requestDatafeed: new InMemoryRequestDatafeed([
            { symbol: 'REMOTE:ALT', timeframe: '1', bars: bars([-7, 13, -11, 12, 15, -2], 1) },
          ]),
          runtime: { timeframe: { period: '2' } },
        },
      });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Raw custom').values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Builtin identity').values).toEqual([-4, -4, 7]);
      expect(getPlot(result, 'Bound custom string').values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Inline custom string').values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Namespace builtin title').values).toEqual([-4, -4, 7]);
    });
    it(`v${version} selected get overload retains its own string or enum return`, () => {
      const source = `//@version=${version}
indicator("Custom get overload boundary")
enum Direction
    up = "rising"
    down = "falling"
method get(array<Direction> values, string marker) => marker
method get(array<Direction> values, int index) => array.get(values, index)
values = request.security_lower_tf("REMOTE:ALT", "1", close > 0 ? Direction.up : Direction.down)
customString = values.get(marker="Direction.down")
customEnum = values.get(index=0)
plot(customString == "Direction.down" ? 1 : 99, "Raw custom string")
plot(str.tostring(customString) == "Direction.down" ? 1 : 99, "Selected string title")
plot(str.tostring(values.get("Direction.up")) == "Direction.up" ? 1 : 99, "Inline selected string")
plot(str.tostring(customEnum) == "falling" ? -4 : str.tostring(customEnum) == "rising" ? 7 : 99, "Selected enum title")
plot(str.tostring(array.get(values, 0)) == "falling" ? -4 : str.tostring(array.get(values, 0)) == "rising" ? 7 : 99, "Namespace enum title")`;
      const result = runCompatScript(source, {
        bars: bars([900, 901, 902], 2),
        engineOptions: {
          requestDatafeed: new InMemoryRequestDatafeed([
            { symbol: 'REMOTE:ALT', timeframe: '1', bars: bars([-7, 13, -11, 12, 15, -2], 1) },
          ]),
          runtime: { timeframe: { period: '2' } },
        },
      });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Raw custom string').values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Selected string title').values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Inline selected string').values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Selected enum title').values).toEqual([-4, -4, 7]);
      expect(getPlot(result, 'Namespace enum title').values).toEqual([-4, -4, 7]);
    });
    it(`v${version} builtin reads retain enum titles when no custom get is declared`, () => {
      const source = `//@version=${version}
indicator("Builtin get enum boundary")
enum Direction
    up = "rising"
    down = "falling"
values = request.security_lower_tf("REMOTE:ALT", "1", close > 0 ? Direction.up : Direction.down)
value = values.get(0)
plot(str.tostring(value) == "falling" ? -4 : str.tostring(value) == "rising" ? 7 : 99, "Bound builtin title")
plot(str.tostring(values.get(0)) == "falling" ? -4 : str.tostring(values.get(0)) == "rising" ? 7 : 99, "Inline builtin title")
plot(str.tostring(array.get(values, 0)) == "falling" ? -4 : str.tostring(array.get(values, 0)) == "rising" ? 7 : 99, "Namespace builtin title")`;
      const result = runCompatScript(source, {
        bars: bars([900, 901, 902], 2),
        engineOptions: {
          requestDatafeed: new InMemoryRequestDatafeed([
            { symbol: 'REMOTE:ALT', timeframe: '1', bars: bars([-7, 13, -11, 12, 15, -2], 1) },
          ]),
          runtime: { timeframe: { period: '2' } },
        },
      });
      expect(result.errors).toEqual([]);
      for (const title of ['Bound builtin title', 'Inline builtin title', 'Namespace builtin title']) {
        expect(getPlot(result, title).values).toEqual([-4, -4, 7]);
      }
    });
  }
});
