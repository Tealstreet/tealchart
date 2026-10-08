import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const start = Date.UTC(2026, 9, 1);
const bars = (prices: number[], step: number): Bar[] =>
  prices.map((close, index) => ({
    time: start + index * step * 60_000,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 100,
  }));
const librarySource = (version: number, extraction: string) => `//@version=${version}
library("Directions")
export enum Direction
    up = "rising"
    down = "dip"
    flat = "stillness"
export type Payload
    ${extraction === 'keys' ? 'map<Direction, string>' : 'map<string, Direction>'} choices
export make(float value) =>
    direction = value > 0 ? Direction.up : Direction.down
    entries = ${extraction === 'keys' ? 'map.new<Direction, string>()' : 'map.new<string, Direction>()'}
    ${extraction === 'keys' ? 'map.put(entries, direction, "Direction.up")' : 'map.put(entries, "Direction.up", direction)'}
    ${extraction === 'keys' ? 'map.put(entries, Direction.flat, "Direction.down")' : 'map.put(entries, "Direction.down", Direction.flat)'}
    Payload.new(entries)`;
const options = (version: number, extraction: string, lower: boolean) => ({
  bars: bars([900, 901], lower ? 2 : 1),
  engineOptions: {
    libraries: new Map([['Test/Directions/1', parse(librarySource(version, extraction))]]),
    requestDatafeed: new InMemoryRequestDatafeed([
      { symbol: 'REMOTE:ALT', timeframe: '1', bars: bars([-7, 13, -11, 12], 1) },
    ]),
    runtime: { timeframe: { period: lower ? '2' : '1' } },
  },
});

// map.keys/values preserve key/value types and return arrays in insertion order.
// Enum str.tostring returns declared titles; selected custom methods retain their
// own return type. Authority: reference/pine-v6-reference-v1.json entries.
describe('request enum map extraction', () => {
  for (const version of [5, 6]) {
    for (const extraction of ['keys', 'values']) {
      for (const method of ['security', 'security_lower_tf']) {
        for (const binding of ['positional', 'named']) {
          it(`v${version} ${extraction} after ${method} with ${binding} arguments`, () => {
            const lower = method === 'security_lower_tf';
            const args =
              binding === 'named'
                ? 'expression=lib.make(value=close), timeframe="1", symbol="REMOTE:ALT"'
                : '"REMOTE:ALT", "1", lib.make(close)';
            const object = lower ? 'array.get(requested, 0)' : 'requested';
            const field = `${object}.choices`;
            const source = `//@version=${version}
indicator("Requested enum map extraction")
import Test/Directions/1 as lib
requested = request.${method}(${args})
extracted = ${binding === 'named' ? `map.${extraction}(id=${field})` : `${field}.${extraction}()`}
plain = map.${extraction === 'keys' ? 'values' : 'keys'}(${field})
main = array.get(extracted, 0)
flat = extracted.get(1)
plot(main == lib.Direction.down ? -4 : main == lib.Direction.up ? 7 : 99, "Identity")
plot(str.tostring(main) == "dip" ? -4 : str.tostring(main) == "rising" ? 7 : 99, "Title")
plot(str.tostring(flat) == "stillness" ? 2 : 99, "Flat title")
plot(str.tostring(array.get(plain, 0)) == "Direction.up" ? 1 : 99, "Plain first")
plot(str.tostring(array.get(plain, 1)) == "Direction.down" ? 1 : 99, "Plain second")
plot(array.size(extracted), "Size")
${lower ? 'plot(array.size(requested), "Count")' : ''}`;
            const result = runCompatScript(source, options(version, extraction, lower));
            expect(result.errors[0]?.message).toBeUndefined();
            expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
            const codes = lower ? [-4, -4] : [-4, 7];
            expect(getPlot(result, 'Identity').values).toEqual(codes);
            expect(getPlot(result, 'Title').values).toEqual(codes);
            expect(getPlot(result, 'Flat title').values).toEqual([2, 2]);
            expect(getPlot(result, 'Plain first').values).toEqual([1, 1]);
            expect(getPlot(result, 'Plain second').values).toEqual([1, 1]);
            expect(getPlot(result, 'Size').values).toEqual([2, 2]);
            if (lower) expect(getPlot(result, 'Count').values).toEqual([2, 2]);
          });
        }
      }
      it(`v${version} selected custom ${extraction} retains a string array`, () => {
        const result = runCompatScript(
          `//@version=${version}
indicator("Requested custom map extraction strings")
import Test/Directions/1 as lib
method ${extraction}(${extraction === 'keys' ? 'map<lib.Direction, string>' : 'map<string, lib.Direction>'} entries) => array.from("Test/Directions/1.Direction.up", "Test/Directions/1.Direction.down")
requested = request.security("REMOTE:ALT", "1", lib.make(close))
custom = requested.choices.${extraction}()
plot(array.get(custom, 0) == "Test/Directions/1.Direction.up" ? 1 : 99, "Raw")
plot(str.tostring(array.get(custom, 0)) == "Test/Directions/1.Direction.up" ? 1 : 99, "Title")
plot(str.tostring(custom.get(1)) == "Test/Directions/1.Direction.down" ? 1 : 99, "Other title")`,
          options(version, extraction, false),
        );
        expect(result.errors[0]?.message).toBeUndefined();
        expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
        for (const name of ['Raw', 'Title', 'Other title']) expect(getPlot(result, name).values).toEqual([1, 1]);
      });
    }
  }
});
