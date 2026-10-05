import type { CompiledBarContext } from '../../src/runtime/codegen/compile';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime';
import { ARRAY_HELPERS, compile, MAP_HELPERS, MATRIX_HELPERS, UDT_HELPERS } from '../../src/runtime/codegen/compile';
import { HistoryBufferSizing } from '../../src/runtime/codegen/history';
import { divideV5ConstInts } from '../../src/runtime/codegen/runtime';
import * as ta from '../../src/runtime/codegen/ta-classes';
import { checkProgram } from '../../src/semantic/checker';

const bars = [10, 20, 30, 40, 50].map((close, i) => ({
  time: 60000 * (i + 1),
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 100,
}));

const cases = [
  [
    'nested parameters',
    `previous(float x) => x[1]
wrap(float x) => previous(x)
plot(wrap(close))
plot(wrap(close+100))`,
    [
      [null, 10, 20, 30, 40],
      [null, 110, 120, 130, 140],
    ],
  ],
  [
    'sparse nested parameters',
    `previous(float x) => x[1]
wrap(float x) => previous(x)
plot(wrap(close))
plot(bar_index % 2 == 0 ? wrap(close+100) : -1)`,
    [
      [null, 10, 20, 30, 40],
      [null, -1, 110, -1, 130],
    ],
  ],
  [
    'nested locals',
    `previous(float x) =>
    local = x*2
    local[1]
wrap(float x) => previous(x)
plot(wrap(close))
plot(wrap(close+100))`,
    [
      [null, 20, 40, 60, 80],
      [null, 220, 240, 260, 280],
    ],
  ],
  [
    'three levels',
    `previous(float x) => x[1]
middle(float x) => previous(x)
wrap(float x) => middle(x)
plot(wrap(close))
plot(wrap(close+100))`,
    [
      [null, 10, 20, 30, 40],
      [null, 110, 120, 130, 140],
    ],
  ],
  [
    'switch nested scope',
    `previous(float x) => x[1]
wrap(float x) =>
    switch
        true => previous(x)
plot(wrap(close))
plot(wrap(close+100))`,
    [
      [null, 10, 20, 30, 40],
      [null, 110, 120, 130, 140],
    ],
  ],
  [
    'direct parameter controls',
    `previous(float x) => x[1]
plot(previous(close))
plot(previous(close+100))`,
    [
      [null, 10, 20, 30, 40],
      [null, 110, 120, 130, 140],
    ],
  ],
  [
    'nested persistent controls',
    `child() =>
    var int count=0
    count += 1
    count
wrap() => child()
plot(wrap())
plot(bar_index % 2 == 0 ? wrap() : -1)`,
    [
      [1, 2, 3, 4, 5],
      [1, -1, 2, -1, 3],
    ],
  ],
  [
    'while parameter history',
    `f(int x) =>
    result=0
    while x[1] > 0
        result := 1
        break
    result
plot(f(int(close)))`,
    [[0, 1, 1, 1, 1]],
  ],
  [
    'for parameter history',
    `f(int x) =>
    result=0
    for i=0 to x[1]
        result += 1
    result
plot(f(int(close)))`,
    [[0, 11, 21, 31, 41]],
  ],
  [
    'while local history',
    `f(float x) =>
    local=x*2
    result=0
    while local[1] > 0
        result := 1
        break
    result
plot(f(close))`,
    [[0, 1, 1, 1, 1]],
  ],
  [
    'loop initializer nested scope',
    `previous(float x) => x[1]
wrap(float x) =>
    result=for i=0 to 0
        previous(x)
    result
plot(wrap(close))
plot(wrap(close+100))`,
    [
      [null, 10, 20, 30, 40],
      [null, 110, 120, 130, 140],
    ],
  ],
  [
    'nested endpoint scope controls',
    `previous(int x) => x[1]
wrap(int x) =>
    result=0
    for i=0 to previous(x)
        result += 1
    result
plot(wrap(int(close)))
plot(wrap(int(close)+100))`,
    [
      [0, 11, 21, 31, 41],
      [0, 111, 121, 131, 141],
    ],
  ],
  [
    'loop initializer local history',
    `wrap(float x) =>
    result=for i=0 to 0
        local=x*2
        local[1]
    result
plot(wrap(close))
plot(wrap(close+100))`,
    [
      [null, 20, 40, 60, 80],
      [null, 220, 240, 260, 280],
    ],
  ],
  [
    'switch arm local history',
    `wrap(float x) =>
    switch
        true =>
            local=x*2
            local[1]
plot(wrap(close))
plot(wrap(close+100))`,
    [
      [null, 20, 40, 60, 80],
      [null, 220, 240, 260, 280],
    ],
  ],
] as const;

// https://www.tradingview.com/pine-script-docs/language/user-defined-functions/#scope-of-a-function-call
describe('independent nested written-call histories', () => {
  it.each(cases)('%s', (_name, body, expected) => {
    const ast = parse(`//@version=6\nindicator("Nested history")\n${body}`);
    expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = executeScript(ast, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual(expected);
  });

  it.each([
    ['parameters', 0, 1],
    ['locals', 2, 2],
  ] as const)('restores %s through replacement and rollback', (_name, index, factor) => {
    const compiled = compile(parse(`//@version=6\nindicator("History rollback")\n${cases[index][1]}`), 50);
    expect(compiled.success).toBe(true);
    const script = new compiled.ScriptClass({
      ...new HistoryBufferSizing(50, 50).dependencies(50, () => false),
      maxBarsBack: 50,
      constIntDivide: divideV5ConstInts,
      _arr: ARRAY_HELPERS,
      _map: MAP_HELPERS,
      _mtx: MATRIX_HELPERS,
      _udt: UDT_HELPERS,
      ...ta,
    });
    const tick = (barIndex: number, close: number, isFirstTick = true) => {
      const values: unknown[] = [];
      const ctx: Partial<CompiledBarContext> = {
        bar: { ...bars[barIndex], close },
        barIndex,
        lastBarIndex: barIndex,
        isFirstTick,
        barstate: {
          isfirst: barIndex === 0,
          islast: true,
          ishistory: true,
          isrealtime: false,
          isnew: isFirstTick,
          isconfirmed: true,
          islastconfirmedhistory: true,
        },
        syminfo: {},
        timeframe: {},
        chart: {},
        plot(index, _function, _call, value) {
          values[index] = typeof value === 'number' && Number.isNaN(value) ? null : value;
        },
      };
      script.onBar(ctx as CompiledBarContext);
      return values;
    };
    expect(tick(0, 10)).toEqual([null, null]);
    const snap = script.save();
    expect(tick(1, 20)).toEqual([10 * factor, 110 * factor]);
    expect(tick(1, 25, false)).toEqual([10 * factor, 110 * factor]);
    expect(tick(2, 30)).toEqual([25 * factor, 125 * factor]);
    script.restore(snap);
    expect(tick(1, 40)).toEqual([10 * factor, 110 * factor]);
    expect(tick(2, 50)).toEqual([40 * factor, 140 * factor]);
  });
});
