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

describe('local UDT receiver method collection body metadata', () => {
  for (const binding of ['udf', 'method', 'typed-method']) {
    for (const version of [5, 6]) {
      for (const request of ['direct', 'security', 'security_lower_tf']) {
        const lower = request === 'security_lower_tf';
        for (const family of ['array', 'matrix', 'map']) {
          for (const shape of ['enum', 'udt', 'string']) {
            it(`v${version} ${request} ${binding} ${family} preserves ${shape} supplied argument type through nested forwarding`, () => {
              const elementType = shape === 'enum' ? 'lib.Direction' : shape === 'udt' ? 'lib.Payload' : 'string';
              const initial =
                shape === 'enum'
                  ? 'lib.Direction.up'
                  : shape === 'udt'
                    ? 'lib.Payload.new(choice = lib.Direction.up)'
                    : '"Direction.up"';
              const constructor =
                family === 'array'
                  ? `array.new<${elementType}>(initial_value = ${initial}, size = 1)`
                  : family === 'matrix'
                    ? `matrix.new<${elementType}>(initial_value = ${initial}, columns = 1, rows = 1)`
                    : 'make()';
              const helpers =
                family === 'map'
                  ? `make() =>
    result = map.new<string, ${elementType}>()
    result.put("key", ${initial})
    result`
                  : '';
              const annotation = family === 'map' ? `map<string, ${elementType}>` : `${family}<${elementType}>`;
              const read =
                binding === 'udf'
                  ? 'read(value)'
                  : `method read(Marker marker, ${binding === 'typed-method' ? `${annotation} ` : ''}value)`;
              const forward = binding === 'udf' ? 'read(value)' : 'Marker.new(1).read(value)';
              const get =
                (family === 'array' ? 'value.get(0)' : family === 'matrix' ? 'value.get(0, 0)' : 'value.get("key")') +
                (shape === 'udt' ? '.choice' : '');
              const call =
                request === 'direct'
                  ? `forward(${constructor})`
                  : `request.${request}("REMOTE:ALT", "1", forward(${constructor}))`;
              const expected = shape === 'string' ? 2 : 1;
              const result = runCompatScript(
                `//@version=${version}
indicator("Local UDT receiver supplied collection hunt")
import Test/SuppliedTypes/1 as lib
type Marker
    int token
${helpers}
${read} => str.tostring(${get})
forward(value) => ${forward}
requested = ${call}
value = ${lower ? 'array.size(requested) > 0 ? array.get(requested, 0) : na' : 'requested'}
plot(na(value) ? na : value == "rising" ? 1 : value == "Direction.up" ? 2 : 99, "Value")`,
                {
                  bars: bars(lower),
                  engineOptions: {
                    libraries: new Map([
                      [
                        'Test/SuppliedTypes/1',
                        parse(`//@version=${version}
library("SuppliedTypes")
export enum Direction
    up = "rising"
export type Payload
    Direction choice`),
                      ],
                    ]),
                    requestDatafeed: new InMemoryRequestDatafeed([
                      { symbol: 'REMOTE:ALT', timeframe: '1', bars: bars(false) },
                    ]),
                    runtime: { timeframe: { period: lower ? '3' : '1' } },
                  },
                },
              );
              expect(result.errors).toEqual([]);
              expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
              expect(getPlot(result, 'Value').values).toEqual(
                lower ? [expected, expected, null, null] : [expected, expected, expected, expected],
              );
            });
          }
        }
      }
    }
  }
});
