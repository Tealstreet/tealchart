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
const options = (version: number, lower = false) => ({
  bars: bars(lower),
  engineOptions: {
    libraries: new Map([
      ['Test/Defaults/1', parse(`//@version=${version}\nlibrary("Defaults")\nexport read(float value = 12) => value`)],
    ]),
    requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'REMOTE:ALT', timeframe: '1', bars: bars(false) }]),
    runtime: { timeframe: { period: lower ? '3' : '1' } },
  },
});
const declaration = `enum Direction
    up = "rising"
    down = "dip"
type Payload
    Direction choice`;
const run = (source: string, version: number, lower = false) => {
  const result = runCompatScript(
    `//@version=${version}\nindicator("Definition scope defaults certificate")\n${source}`,
    options(version, lower),
  );
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
  return result;
};

// The function header belongs to its definition scope, including defaults.
// Authority: User-defined functions / Function scopes.
describe('omitted default definition scope', () => {
  for (const version of [5, 6]) {
    for (const shape of ['enum', 'udt', 'numeric']) {
      for (const shadow of [true, false]) {
        it(`v${version} ${shape} ${shadow ? 'shadow' : 'distinct'} global default`, () => {
          const numeric = shape === 'numeric';
          const result = run(
            `${numeric ? '' : declaration}
defaultValue = ${numeric ? '12.0' : shape === 'enum' ? 'Direction.up' : 'Payload.new(Direction.up)'}
read(value = defaultValue) => ${numeric ? 'value' : `str.tostring(${shape === 'enum' ? 'value' : 'value.choice'})`}
observe(float ${shadow ? 'defaultValue' : 'callerValue'}) => read()
value = observe(close)
plot(${numeric ? 'value' : 'value == "rising" ? 12 : 99'}, "Value")`,
            version,
          );
          expect(getPlot(result, 'Value').values).toEqual([12, 12, 12, 12]);
        });
      }
    }
    for (const request of ['direct', 'security', 'security_lower_tf']) {
      const lower = request === 'security_lower_tf';
      for (const family of ['supplied', 'annotated', 'imported', 'literal']) {
        it(`v${version} ${family} control through ${request}`, () => {
          const supplied = family === 'supplied';
          const source =
            family === 'imported'
              ? 'import Test/Defaults/1 as defaults\nobserve(float callerValue) => defaults.read()'
              : `read(${family === 'annotated' ? 'float ' : ''}value = 12) => value\nobserve(float callerValue) => read(${supplied ? 'value = callerValue' : ''})`;
          const result = run(
            `${source}
requested = ${request === 'direct' ? 'observe(close)' : `request.${request}("REMOTE:ALT", "1", observe(close))`}
value = ${lower ? 'array.size(requested) > 0 ? array.get(requested, 0) : na' : 'requested'}
plot(value, "Value")`,
            version,
            lower,
          );
          expect(getPlot(result, 'Value').values).toEqual(
            lower
              ? supplied
                ? [20, 23, null, null]
                : [12, 12, null, null]
              : supplied
                ? [20, 21, 22, 23]
                : [12, 12, 12, 12],
          );
        });
      }
    }
  }
});
