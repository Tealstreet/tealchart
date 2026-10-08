import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const start = Date.UTC(2026, 9, 1);
const bars = (lower: boolean): Bar[] =>
  [0, 1, 2, 3].map((offset) => ({
    time: start + offset * (lower ? 3 : 1) * 60_000,
    open: 20 + offset,
    high: 21 + offset,
    low: 19 + offset,
    close: 20 + offset,
    volume: 100,
  }));

describe('requested named constructor defaults', () => {
  for (const version of [5, 6]) {
    for (const request of ['direct', 'security', 'security_lower_tf']) {
      const lower = request === 'security_lower_tf';
      for (const family of ['array', 'matrix', 'map']) {
        it(`v${version} ${request} ${family} separates omitted enum and supplied string calls`, () => {
          const constructors =
            family === 'array'
              ? ['array.from(Direction.up)', 'array.from("Direction.up")']
              : family === 'matrix'
                ? ['matrix.new<Direction>(1, 1, Direction.up)', 'matrix.new<string>(1, 1, "Direction.up")']
                : ['enumMap()', 'stringMap()'];
          const helpers =
            family === 'map'
              ? `enumMap() =>
    result = map.new<string, Direction>()
    map.put(result, "key", Direction.up)
    result
stringMap() =>
    result = map.new<string, string>()
    map.put(result, "key", "Direction.up")
    result`
              : '';
          const get =
            family === 'array'
              ? 'array.get(value, 0)'
              : family === 'matrix'
                ? 'matrix.get(value, 0, 0)'
                : 'map.get(value, "key")';
          const call =
            request === 'direct' ? 'observe(close)' : `request.${request}("REMOTE:ALT", "1", observe(close))`;
          const result = runCompatScript(
            `//@version=${version}
indicator("Requested named constructor default certificate")
enum Direction
    up = "rising"
${helpers}
read(string suffix, value = ${constructors[0]}) => str.tostring(${get}) + suffix
observe(float Direction) => [read(suffix = ""), read(value = ${constructors[1]}, suffix = "")]
[enumResult, stringResult] = ${call}
enumText = ${lower ? 'array.size(enumResult) > 0 ? array.get(enumResult, 0) : na' : 'enumResult'}
stringText = ${lower ? 'array.size(stringResult) > 0 ? array.get(stringResult, 0) : na' : 'stringResult'}
plot(na(enumText) ? na : enumText == "rising" ? 1 : 99, "Enum")
plot(na(stringText) ? na : stringText == "Direction.up" ? 2 : 99, "String")`,
            {
              bars: bars(lower),
              engineOptions: {
                requestDatafeed: new InMemoryRequestDatafeed([
                  { symbol: 'REMOTE:ALT', timeframe: '1', bars: bars(false) },
                ]),
                runtime: { timeframe: { period: lower ? '3' : '1' } },
              },
            },
          );
          expect(result.errors).toEqual([]);
          expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
          expect(getPlot(result, 'Enum').values).toEqual(lower ? [1, 1, null, null] : [1, 1, 1, 1]);
          expect(getPlot(result, 'String').values).toEqual(lower ? [2, 2, null, null] : [2, 2, 2, 2]);
        });
      }
    }
  }
});

describe('typed tuple call context controls', () => {
  for (const family of ['array', 'matrix', 'map']) {
    it(`v6 direct ${family} preserves explicitly typed tuple parameters`, () => {
      const defaultValue =
        family === 'array'
          ? 'array.from(Direction.up)'
          : family === 'matrix'
            ? 'matrix.new<Direction>(1, 1, Direction.up)'
            : 'enumMap()';
      const helpers =
        family === 'map'
          ? `enumMap() =>
    result = map.new<string, Direction>()
    map.put(result, "key", Direction.up)
    result`
          : '';
      const annotation = `${family}<${family === 'map' ? 'string, ' : ''}Direction>`;
      const get =
        family === 'array'
          ? 'array.get(value, 0)'
          : family === 'matrix'
            ? 'matrix.get(value, 0, 0)'
            : 'map.get(value, "key")';
      const result = runCompatScript(
        `//@version=6
indicator("Typed tuple call context control")
enum Direction
    up = "rising"
${helpers}
read(${annotation} value = ${defaultValue}) => str.tostring(${get})
observe() => [read(), "Direction.up"]
[enumResult, stringResult] = observe()
plot(enumResult == "rising" ? 1 : 99, "Enum")
plot(stringResult == "Direction.up" ? 2 : 99, "String")`,
        { bars: bars(false) },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
      expect(getPlot(result, 'Enum').values).toEqual([1, 1, 1, 1]);
      expect(getPlot(result, 'String').values).toEqual([2, 2, 2, 2]);
    });
  }
});
