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

describe('requested scalar constructor defaults', () => {
  for (const version of [5, 6]) {
    for (const request of ['direct', 'security', 'security_lower_tf']) {
      const lower = request === 'security_lower_tf';
      for (const family of ['array', 'matrix', 'map']) {
        it(`v${version} ${request} ${family} preserves named mixed calls through a scalar return`, () => {
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
indicator("Requested scalar constructor default certificate")
enum Direction
    up = "rising"
${helpers}
read(string suffix, value = ${constructors[0]}) => str.tostring(${get}) + suffix
observe(float Direction) => read(suffix = "") + ":" + read(value = ${constructors[1]}, suffix = "")
requested = ${call}
value = ${lower ? 'array.size(requested) > 0 ? array.get(requested, 0) : na' : 'requested'}
plot(na(value) ? na : value == "rising:Direction.up" ? 1 : 99, "Value")`,
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
          expect(getPlot(result, 'Value').values).toEqual(lower ? [1, 1, null, null] : [1, 1, 1, 1]);
        });
      }
    }
  }
});
