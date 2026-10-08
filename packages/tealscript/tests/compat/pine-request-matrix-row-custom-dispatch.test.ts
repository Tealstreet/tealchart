import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const start = Date.UTC(2026, 9, 1);
const bars = (points: Array<[number, number]>): Bar[] =>
  points.map(([offset, close]) => ({
    time: start + offset * 60_000,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 100,
  }));

const setup = (shape: string, builtin: boolean) => `
${shape === 'matrix' ? 'enum Direction\n    up = "rising"\n    down = "dip"\n    flat = "stillness"' : ''}
method get(array<${shape === 'matrix' ? 'Direction' : 'float'}> values, string marker) => marker
choose(float value) =>
    ${
      shape === 'matrix'
        ? `matrix<Direction> choices = matrix.new<Direction>(2, 2, Direction.flat)
    choices.set(1, 1, value > 0 ? Direction.up : value < 0 ? Direction.down : Direction.flat)
    for row in choices
        array<Direction> values = row
        values.get(${builtin ? '1' : '"Direction.up"'})`
        : `array<float> values = array.from(0.0, value)
    values.get(${builtin ? '1' : '"Direction.up"'})`
    }`;
const options = (lower: boolean) => ({
  bars: lower
    ? bars([
        [0, 900],
        [3, 700],
        [6, 800],
      ])
    : bars([
        [0, 900],
        [1, 901],
        [2, 902],
        [3, 903],
      ]),
  engineOptions: {
    requestDatafeed: new InMemoryRequestDatafeed([
      {
        symbol: 'REMOTE:ALT',
        timeframe: '1',
        bars: lower
          ? bars([
              [0, -7],
              [1, 13],
              [2, 0],
              [6, 12],
              [8, -11],
              [9, 17],
            ])
          : bars([
              [0, -7],
              [1, 13],
              [2, 0],
              [3, -11],
            ]),
      },
    ]),
    runtime: { timeframe: { period: lower ? '3' : '1' } },
  },
});

// Requested child programs retain local method dependencies and overload selection.
// Authority: reference/pine-v6-reference-v1.json method/for-in/request entries.
describe('requested custom collection dispatch', () => {
  for (const version of [5, 6]) {
    for (const method of ['security', 'security_lower_tf']) {
      it(`v${version} custom get retains nested helper and requested global dependency through ${method}`, () => {
        const lower = method === 'security_lower_tf';
        const chosen = lower ? 'array.get(requested, 0)' : 'requested';
        const result = runCompatScript(
          `//@version=${version}
indicator("Requested custom get dependencies")
scale = close * 10
adjust(float value) => value + scale
method get(array<float> values, string marker) => adjust(array.get(values, 1))
choose(float value) =>
    values = array.from(0.0, value)
    values.get("marker")
requested = request.${method}("REMOTE:ALT", "1", choose(close))
plot(${lower ? `array.size(requested) > 0 ? ${chosen} : na` : chosen}, "Value")`,
          options(lower),
        );
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
        expect(getPlot(result, 'Value').values).toEqual(lower ? [-77, null, 132] : [-77, 143, 0, -121]);
      });
    }
    for (const shape of ['array', 'matrix']) {
      it(`v${version} direct ${shape} custom get remains a string`, () => {
        const result = runCompatScript(
          `//@version=${version}
indicator("Direct collection custom get")
${setup(shape, false)}
chosen = choose(close)
plot(chosen == "Direction.up" ? 1 : 99, "Identity")
plot(str.tostring(chosen) == "Direction.up" ? 1 : 99, "Title")`,
          options(false),
        );
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
        for (const title of ['Identity', 'Title']) expect(getPlot(result, title).values, title).toEqual([1, 1, 1, 1]);
      });
      for (const method of ['security', 'security_lower_tf']) {
        for (const builtin of [false, true]) {
          it(`v${version} ${shape} ${builtin ? 'builtin index' : 'custom marker'} get through ${method}`, () => {
            const lower = method === 'security_lower_tf';
            const chosen = lower ? 'array.get(requested, 0)' : 'requested';
            const guard = (value: string) => (lower ? `array.size(requested) > 0 ? (${value}) : na` : value);
            const value = !builtin
              ? `${chosen} == "Direction.up" ? 1 : 99`
              : shape === 'matrix'
                ? `${chosen} == Direction.up ? 7 : ${chosen} == Direction.down ? -4 : ${chosen} == Direction.flat ? 2 : 99`
                : chosen;
            const title = !builtin
              ? `str.tostring(${chosen}) == "Direction.up" ? 1 : 99`
              : shape === 'matrix'
                ? `str.tostring(${chosen}) == "rising" ? 7 : str.tostring(${chosen}) == "dip" ? -4 : str.tostring(${chosen}) == "stillness" ? 2 : 99`
                : chosen;
            const result = runCompatScript(
              `//@version=${version}
indicator("Requested collection custom get")
${setup(shape, builtin)}
requested = request.${method}("REMOTE:ALT", "1", choose(close))
plot(${guard(value)}, "Identity")
plot(${guard(title)}, "Title")
${lower ? 'plot(array.size(requested), "Count")' : ''}`,
              options(lower),
            );
            expect(result.errors).toEqual([]);
            expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
            const expected = !builtin
              ? lower
                ? [1, null, 1]
                : [1, 1, 1, 1]
              : shape === 'matrix'
                ? lower
                  ? [-4, null, 7]
                  : [-4, 7, 2, -4]
                : lower
                  ? [-7, null, 12]
                  : [-7, 13, 0, -11];
            for (const name of ['Identity', 'Title']) expect(getPlot(result, name).values, name).toEqual(expected);
            if (lower) expect(getPlot(result, 'Count').values).toEqual([3, 0, 2]);
          });
        }
      }
    }
  }
});
