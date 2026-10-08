import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
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

// Omitted arguments use header defaults in the defining scope.
// Authority: User-defined functions / Function scopes and optional parameters.
describe('requested local collection defaults', () => {
  for (const version of [5, 6]) {
    for (const request of ['direct', 'security', 'security_lower_tf']) {
      const lower = request === 'security_lower_tf';
      for (const family of ['array', 'matrix', 'map']) {
        for (const shape of ['enum', 'udt', 'string']) {
          const string = shape === 'string';
          for (const typed of string ? [false] : [false, true]) {
            it(`v${version} ${request} ${family} ${typed ? 'typed ' : ''}${string ? 'ordinary string' : shape === 'udt' ? 'UDT enum field' : 'enum title'} default`, () => {
              const type = string ? 'string' : shape === 'udt' ? 'Payload' : 'Direction';
              const initial = string
                ? '"Direction.up"'
                : shape === 'udt'
                  ? 'Payload.new(Direction.up)'
                  : 'Direction.up';
              const setup =
                family === 'array'
                  ? `defaultValue = array.from(${initial})`
                  : family === 'matrix'
                    ? `defaultValue = matrix.new<${type}>(1, 1, ${initial})`
                    : `make() =>
    result = map.new<string, ${type}>()
    map.put(result, "key", ${initial})
    result
defaultValue = make()`;
              const access =
                family === 'array'
                  ? 'array.get(value, 0)'
                  : family === 'matrix'
                    ? 'matrix.get(value, 0, 0)'
                    : 'map.get(value, "key")';
              const result = runCompatScript(
                `//@version=${version}
indicator("Requested collection default certificate")
enum Direction
    up = "rising"
    down = "dip"
${shape === 'udt' ? 'type Payload\n    Direction choice' : ''}
${setup}
read(${typed ? `${family}<${family === 'map' ? 'string, ' : ''}${type}> ` : ''}value = defaultValue) => str.tostring(${access}${shape === 'udt' ? '.choice' : ''})
observe(float defaultValue) => read()
requested = ${request === 'direct' ? 'observe(close)' : `request.${request}("REMOTE:ALT", "1", observe(close))`}
value = ${lower ? 'array.size(requested) > 0 ? array.get(requested, 0) : na' : 'requested'}
plot(na(value) ? na : value == "rising" ? 1 : value == "Direction.up" ? 2 : 99, "Value")`,
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
              const expected = string ? 2 : 1;
              expect(getPlot(result, 'Value').values).toEqual(
                lower ? [expected, expected, null, null] : [expected, expected, expected, expected],
              );
            });
          }
        }
        it(`v${version} ${request} ${family} supplied collection precedence`, () => {
          const setup =
            family === 'array'
              ? 'defaultValue = array.from(Direction.up)\nsuppliedValue = array.from(Direction.down)'
              : family === 'matrix'
                ? 'defaultValue = matrix.new<Direction>(1, 1, Direction.up)\nsuppliedValue = matrix.new<Direction>(1, 1, Direction.down)'
                : `make(bool down) =>
    result = map.new<string, Direction>()
    map.put(result, "key", down ? Direction.down : Direction.up)
    result
defaultValue = make(false)
suppliedValue = make(true)`;
          const access =
            family === 'array'
              ? 'array.get(value, 0)'
              : family === 'matrix'
                ? 'matrix.get(value, 0, 0)'
                : 'map.get(value, "key")';
          const result = runCompatScript(
            `//@version=${version}
indicator("Requested supplied collection default certificate")
enum Direction
    up = "rising"
    down = "dip"
${setup}
read(${family}<${family === 'map' ? 'string, ' : ''}Direction> value = defaultValue) => str.tostring(${access})
observe(float callerValue) => read(suppliedValue)
requested = ${request === 'direct' ? 'observe(close)' : `request.${request}("REMOTE:ALT", "1", observe(close))`}
value = ${lower ? 'array.size(requested) > 0 ? array.get(requested, 0) : na' : 'requested'}
plot(na(value) ? na : value == "dip" ? 3 : 99, "Value")`,
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
          expect(getPlot(result, 'Value').values).toEqual(lower ? [3, 3, null, null] : [3, 3, 3, 3]);
        });
      }
      it(`v${version} ${request} imported collection default unchanged`, () => {
        const library = parse(`//@version=${version}
library("CollectionDefaults")
export enum Direction
    up = "rising"
    down = "dip"
export read(array<Direction> value = array.from(Direction.up)) => str.tostring(array.get(value, 0))`);
        const result = runCompatScript(
          `//@version=${version}
indicator("Requested imported collection default certificate")
import Test/CollectionDefaults/1 as defaults
observe(float callerValue) => defaults.read()
requested = ${request === 'direct' ? 'observe(close)' : `request.${request}("REMOTE:ALT", "1", observe(close))`}
value = ${lower ? 'array.size(requested) > 0 ? array.get(requested, 0) : na' : 'requested'}
plot(na(value) ? na : value == "rising" ? 1 : 99, "Value")`,
          {
            bars: bars(lower),
            engineOptions: {
              libraries: new Map([['Test/CollectionDefaults/1', library]]),
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
});
