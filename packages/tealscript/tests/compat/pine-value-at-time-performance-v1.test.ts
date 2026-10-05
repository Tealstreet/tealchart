import type { CompiledBarContext } from '../../src/runtime/codegen/compile';

import { describe, expect, it } from 'vitest';

import { getOfficialTradingViewLibrary } from '../../src/officialTradingViewLibraries';
import { parse } from '../../src/parser/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { createPineArray } from '../../src/runtime/arrays';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { Scope } from '../../src/runtime/scope';
import { checkProgram } from '../../src/semantic/checker';

function execute(times: number[], target: string, limit = '') {
  const source = `//@version=5
import TradingView/ValueAtTime/2 as vat
indicator("nearest timestamp")
[value, stamp, current] = vat.valueAtTime(close, ${target}${limit})
plot(value)
plot(stamp)`;
  const ast = parse(source);
  const library = getOfficialTradingViewLibrary('TradingView/ValueAtTime/2');
  if (!library?.program) throw new Error('ValueAtTime library is unavailable');
  const libraries = new Map([['TradingView/ValueAtTime/2', library.program]]);
  expect(checkProgram(ast, { libraries }).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast, undefined, { libraries });
  expect(compiled.success).toBe(true);
  if (!compiled.success) throw new Error('Compilation failed');
  const bars = times.map((time, i) => ({ time, open: i + 10, high: i + 11, low: i + 9, close: i + 10, volume: 1 }));
  const start = process.cpuUsage();
  const result = executeCompiled(compiled, bars, undefined, { libraries });
  const cpu = process.cpuUsage(start);
  expect(result!.errors).toEqual([]);
  return { plots: result!.plots.map((p) => p.values), cpuMs: (cpu.user + cpu.system) / 1000 };
}

describe('ValueAtTime nearest timestamp selection', () => {
  it('keeps the earlier observation on an equal-distance gap', () => {
    expect(execute([0, 1000, 5000, 9000], '3000').plots).toEqual([
      [10, 11, 11, 11],
      [0, 1000, 1000, 1000],
    ]);
  });

  it('selects exact timestamps and endpoints outside the collected interval', () => {
    expect(execute([0, 1000, 5000], '1000').plots).toEqual([
      [10, 11, 11],
      [0, 1000, 1000],
    ]);
    expect(execute([0, 1000, 5000], '-1000').plots).toEqual([
      [10, 10, 10],
      [0, 0, 0],
    ]);
    expect(execute([0, 1000, 5000], '9000').plots).toEqual([
      [10, 11, 12],
      [0, 1000, 5000],
    ]);
  });

  it('updates equal timestamps and trims both collected arrays together', () => {
    expect(execute([0, 1000, 1000, 5000], '1000').plots).toEqual([
      [10, 11, 12, 12],
      [0, 1000, 1000, 1000],
    ]);
    expect(execute([0, 1000, 5000, 9000], '3000', ', 5000').plots).toEqual([
      [10, 11, 11, 12],
      [0, 1000, 1000, 5000],
    ]);
  });

  it('preserves input-order ties for an unordered time index', () => {
    expect(execute([5000, 1000, 9000, 3000], '3000').plots).toEqual([
      [10, 10, 10, 13],
      [5000, 5000, 5000, 3000],
    ]);
  });

  it('returns missing values for a missing target', () => {
    expect(execute([0, 1000, 5000], 'float(na)').plots).toEqual([
      [null, null, null],
      [null, null, null],
    ]);
  });

  it('keeps the first observation when distant timestamp distances round to an equal value', () => {
    expect(execute([0, 1000, 5000], '1e20').plots).toEqual([
      [10, 10, 10],
      [0, 0, 0],
    ]);
  });

  it.skipIf(process.env.TEALSCRIPT_PERF_ASSERT !== '1')(
    'avoids search-index descriptors for materialized period outputs',
    () => {
      const ast = parse(`//@version=5
import TradingView/ValueAtTime/2 as vat
indicator("period batch allocation")
var periods = array.from("1W", "1M", "1Y")
[values, stamps, current, description] = vat.getDataAtPeriodOffsets(periods, close)
plot(array.get(values, 0))
plot(array.get(stamps, 0))
array.set(values, 0, -17)`);
      const library = getOfficialTradingViewLibrary('TradingView/ValueAtTime/2');
      if (!library?.program) throw new Error('ValueAtTime library is unavailable');
      const libraries = new Map([['TradingView/ValueAtTime/2', library.program]]);
      const compiled = tryCompile(ast, undefined, { libraries });
      expect(compiled.success).toBe(true);
      if (!compiled.success) throw new Error('Compilation failed');
      const allocations: number[] = [];
      const bindings: number[] = [];
      const targetCopies: number[] = [];
      const stateReads: number[] = [];
      const outputArrays: unknown[] = [];
      const onBar = compiled.ScriptClass.prototype.onBar;
      compiled.ScriptClass.prototype.onBar = function (ctx: CompiledBarContext) {
        const callBuiltin = ctx.callBuiltin;
        ctx.callBuiltin = (name: string, ...args: [unknown[], Record<string, unknown>?, string?]) => {
          if (name !== 'TradingView.ValueAtTime.getDataAtPeriodOffsets') return callBuiltin(name, ...args);
          const defineProperty = Object.defineProperty;
          const fromEntries = Object.fromEntries;
          const slice = Array.prototype.slice;
          const get = Scope.prototype.get;
          let reads = 0;
          Scope.prototype.get = function (key: string) {
            if (key.startsWith('__tv_valueAtTime_data_')) reads++;
            return get.call(this, key);
          };
          const targetValues = ((args[0] as unknown[])[0] as { values: unknown[] }).values;
          let copies = 0;
          Array.prototype.slice = function (...args) {
            if (this === targetValues) copies++;
            return slice.apply(this, args);
          };
          let bindingCount = 0;
          Object.fromEntries = ((entries: Iterable<readonly [PropertyKey, unknown]>) => {
            bindingCount++;
            return fromEntries(entries);
          }) as typeof Object.fromEntries;
          let count = 0;
          Object.defineProperty = ((object, key, descriptor) => {
            if (key === 'values' && (object as { __tealscriptArray?: boolean }).__tealscriptArray === true) count++;
            return defineProperty(object, key, descriptor);
          }) as typeof Object.defineProperty;
          try {
            const result = callBuiltin(name, ...args) as unknown[];
            outputArrays.push(result[0], result[1]);
            return result;
          } finally {
            Object.defineProperty = defineProperty;
            Object.fromEntries = fromEntries;
            Array.prototype.slice = slice;
            Scope.prototype.get = get;
            stateReads.push(reads);
            targetCopies.push(copies);
            allocations.push(count);
            bindings.push(bindingCount);
          }
        };
        try {
          return onBar.call(this, ctx);
        } finally {
          ctx.callBuiltin = callBuiltin;
        }
      };
      const bars = [0, 1000, 2000].map((time, i) => ({
        time,
        open: i + 10,
        high: i + 11,
        low: i + 9,
        close: i + 10,
        volume: 1,
      }));
      const result = executeCompiled(compiled, bars, undefined, { libraries });
      expect(result!.errors).toEqual([]);
      expect(result!.plots.map((plot) => plot.values)).toEqual([
        [10, 10, 10],
        [0, 0, 0],
      ]);
      expect(new Set(outputArrays).size).toBe(6);
      expect(allocations).toEqual([2, 0, 0]);
      expect(bindings).toEqual([0, 0, 0]);
      expect(targetCopies).toEqual([1, 0, 0]);
      expect(stateReads).toEqual([0, 0, 0]);
    },
  );

  it.skipIf(process.env.TEALSCRIPT_PERF_ASSERT !== '1')(
    'reuses pure period conversions across requested contexts',
    () => {
      const ast = parse(`//@version=5
import TradingView/ValueAtTime/2 as vat
indicator("requested calendar conversions")
plot(request.security("A", "2", vat.periodToTimestamp("1M", time)))
plot(request.security("B", "2", vat.periodToTimestamp("1M", time)))
plot(request.security("C", "2", vat.periodToTimestamp("1M", time)))`);
      const library = getOfficialTradingViewLibrary('TradingView/ValueAtTime/2');
      if (!library?.program) throw new Error('ValueAtTime library is unavailable');
      const libraries = new Map([['TradingView/ValueAtTime/2', library.program]]);
      const compiled = tryCompile(ast, undefined, { libraries });
      expect(compiled.success).toBe(true);
      if (!compiled.success) throw new Error('Compilation failed');
      const nativeDate = globalThis.Date;
      const references = [nativeDate.UTC(2024, 2, 31), nativeDate.UTC(2024, 3, 1), nativeDate.UTC(2024, 3, 2)];
      const bars = references.map((time) => ({ time, open: 10, high: 11, low: 9, close: 10, volume: 1 }));
      let conversions = 0;
      globalThis.Date = new Proxy(nativeDate, {
        construct(target, args, newTarget) {
          if (new Error().stack?.includes('tradingViewValueAtTimePeriodTimestamp')) conversions++;
          return Reflect.construct(target, args, newTarget);
        },
      });
      let result;
      try {
        result = executeCompiled(compiled, bars, undefined, {
          libraries,
          requestDatafeed: new InMemoryRequestDatafeed(
            ['A', 'B', 'C'].map((symbol) => ({ symbol, timeframe: '2', bars })),
          ),
          runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } },
        });
      } finally {
        globalThis.Date = nativeDate;
      }
      expect(result!.errors).toEqual([]);
      const expected = [nativeDate.UTC(2024, 1, 31), nativeDate.UTC(2024, 2, 1), nativeDate.UTC(2024, 2, 2)];
      expect(result!.plots.map((plot) => plot.values)).toEqual([expected, expected, expected]);
      expect(conversions).toBe(3);
    },
  );

  it.skipIf(process.env.TEALSCRIPT_PERF_ASSERT !== '1')(
    'avoids confirmation calendars for lookahead-on requests',
    () => {
      const bars = [1, 2, 3].map((close, i) => ({
        time: 1_700_000_000_000 + i * 120_000,
        open: close,
        high: close,
        low: close,
        close,
        volume: 1,
      }));
      const compiled = tryCompile(
        parse(`//@version=6
indicator("lookahead confirmation work")
plot(request.security("A", "1D", close, lookahead=barmerge.lookahead_on))`),
      );
      expect(compiled.success).toBe(true);
      if (!compiled.success) throw new Error('Compilation failed');
      const nativeDate = globalThis.Date;
      let confirmationDates = 0;
      globalThis.Date = new Proxy(nativeDate, {
        construct(target, args, newTarget) {
          if (new Error().stack?.includes('requestBarCloseTimes')) confirmationDates++;
          return Reflect.construct(target, args, newTarget);
        },
      });
      let result;
      try {
        result = executeCompiled(compiled, bars, undefined, {
          requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'A', timeframe: '1D', bars }]),
          runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } },
        });
      } finally {
        globalThis.Date = nativeDate;
      }
      expect(result!.errors).toEqual([]);
      expect(result!.plots[0].values).toEqual([1, 2, 3]);
      expect(confirmationDates).toBe(0);
    },
  );

  it.skipIf(process.env.TEALSCRIPT_PERF_ASSERT !== '1')(
    'reduces period batches only when their outputs are observed',
    () => {
      const ast = parse(`//@version=6
import TradingView/ValueAtTime/2 as vat
indicator("unobserved requested batches")
var periods = array.from("1M")
float observed = na
if barstate.islast
    [values, stamps, current, description] = request.security("A", "2", vat.getDataAtPeriodOffsets(periods, close))
    observed := array.get(values, 0)
plot(observed)`);
      const library = getOfficialTradingViewLibrary('TradingView/ValueAtTime/2');
      if (!library?.program) throw new Error('ValueAtTime library is unavailable');
      const libraries = new Map([['TradingView/ValueAtTime/2', library.program]]);
      const compiled = tryCompile(ast, undefined, { libraries });
      expect(compiled.success).toBe(true);
      if (!compiled.success) throw new Error('Compilation failed');
      const nativeDate = globalThis.Date;
      const bars = [0, 1, 2].map((i) => ({
        time: nativeDate.UTC(2024, 3, i + 1),
        open: i + 10,
        high: i + 11,
        low: i + 9,
        close: i + 10,
        volume: 1,
      }));
      let conversions = 0;
      globalThis.Date = new Proxy(nativeDate, {
        construct(target, args, newTarget) {
          if (new Error().stack?.includes('computeTradingViewValueAtTimePeriodTimestamp')) conversions++;
          return Reflect.construct(target, args, newTarget);
        },
      });
      let result;
      try {
        result = executeCompiled(compiled, bars, undefined, {
          libraries,
          requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'A', timeframe: '2', bars }]),
          runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } },
        });
      } finally {
        globalThis.Date = nativeDate;
      }
      expect(result!.errors).toEqual([]);
      expect(result!.plots[0].values).toEqual([null, null, 10]);
      expect(conversions).toBe(1);
    },
  );

  it('preserves deferred batch prefixes, target slices and destructive collection updates', () => {
    for (const inputTimes of [
      [0, 1000, 1000, 5000, 9000],
      [5000, 1000, 9000, 3000],
    ]) {
      const ast = parse(`//@version=6
import TradingView/ValueAtTime/2 as vat
indicator("deferred collection snapshots")
var targets = array.from(-99, 1000, -98)
var selected = array.slice(targets, 1, 2)
[values, stamps, current, description] = vat.getDataAtTimes(selected, close, 3000)
array.set(targets, 1, bar_index == 0 ? 1000 : time)
plot(close)`);
      const library = getOfficialTradingViewLibrary('TradingView/ValueAtTime/2');
      if (!library?.program) throw new Error('ValueAtTime library is unavailable');
      const libraries = new Map([['TradingView/ValueAtTime/2', library.program]]);
      const compiled = tryCompile(ast, undefined, { libraries });
      expect(compiled.success).toBe(true);
      if (!compiled.success) throw new Error('Compilation failed');
      const batches: { values: number[] }[][] = [];
      const onBar = compiled.ScriptClass.prototype.onBar;
      compiled.ScriptClass.prototype.onBar = function (ctx: CompiledBarContext) {
        const callBuiltin = ctx.callBuiltin;
        ctx.callBuiltin = (name: string, ...args: [unknown[], Record<string, unknown>?, string?]) => {
          const result = callBuiltin(name, ...args);
          if (name === 'TradingView.ValueAtTime.getDataAtTimes') {
            batches.push(result as { values: number[] }[]);
            return [undefined, undefined, 0, ''];
          }
          return result;
        };
        try {
          return onBar.call(this, ctx);
        } finally {
          ctx.callBuiltin = callBuiltin;
        }
      };
      const bars = inputTimes.map((time, i) => ({
        time,
        open: i + 10,
        high: i + 11,
        low: i + 9,
        close: i + 10,
        volume: 1,
      }));
      const result = executeCompiled(compiled, bars, undefined, { libraries });
      expect(result!.errors).toEqual([]);
      const expected =
        inputTimes[0] === 0
          ? [
              [[10], [0]],
              [[11], [1000]],
              [[12], [1000]],
              [[13], [5000]],
              [[14], [9000]],
            ]
          : [
              [[10], [5000]],
              [[11], [1000]],
              [[12], [9000]],
              [[12], [9000]],
            ];
      expect(batches.map((batch) => batch.slice(0, 2).map((array) => array.values))).toEqual(expected);
      expect(JSON.parse(JSON.stringify(batches[0].slice(0, 2)))).toEqual([
        { __tealscriptArray: true, values: expected[0][0] },
        { __tealscriptArray: true, values: expected[0][1] },
      ]);
      batches[0][0].values = [-17];
      batches[0][1].values = [-19];
      expect(batches[0].slice(0, 2).map((array) => array.values)).toEqual([[-17], [-19]]);
      expect(batches.slice(1).map((batch) => batch[0].values[0])).toEqual(
        expected.slice(1).map((batch) => batch[0][0]),
      );
    }
  });

  it('coerces reference targets at the call even when returned arrays remain unobserved', () => {
    const compiled = tryCompile(parse('//@version=6\nindicator("reference targets")\nplot(close)'));
    expect(compiled.success).toBe(true);
    if (!compiled.success) throw new Error('Compilation failed');
    let conversions = 0;
    let timestamp = 0;
    const targets = createPineArray(1, {
      valueOf() {
        conversions++;
        return timestamp;
      },
    });
    const batches: { values: number[] }[][] = [];
    const atReturn: number[] = [];
    const onBar = compiled.ScriptClass.prototype.onBar;
    compiled.ScriptClass.prototype.onBar = function (ctx: CompiledBarContext) {
      timestamp = ctx.bar.time;
      batches.push(
        ctx.callBuiltin('TradingView.ValueAtTime.getDataAtTimes', [targets, ctx.bar.close]) as { values: number[] }[],
      );
      atReturn.push(conversions);
      return onBar.call(this, ctx);
    };
    const result = executeCompiled(
      compiled,
      [0, 1000].map((time, i) => ({ time, open: i + 10, high: i + 11, low: i + 9, close: i + 10, volume: 1 })),
    );
    expect(result!.errors).toEqual([]);
    expect(atReturn).toEqual([1, 2]);
    expect(batches.map((batch) => batch.slice(0, 2).map((array) => array.values))).toEqual([
      [[10], [0]],
      [[11], [1000]],
    ]);
    expect(conversions).toBe(2);
  });

  it('retains UTC calendar rollover, time clipping and missing period references', () => {
    const cases: [string, number, number][] = [
      ['1M', Date.UTC(2024, 2, 31, 12, 34, 56, 78), Date.UTC(2024, 2, 2, 12, 34, 56, 78)],
      ['1Y', Date.UTC(2024, 1, 29, 23), Date.UTC(2023, 2, 1, 23)],
      ['1M', -0.9, Date.UTC(1969, 11, 1)],
      ['1M', Date.parse('0001-01-31T00:00:00.001Z'), Date.UTC(1900, 11, 31, 0, 0, 0, 1)],
      ['1M', Date.UTC(2024, 3, 1) + 24.9, Date.UTC(2024, 2, 1) + 24],
      ['YTD', Date.UTC(2024, 11, 31, 23, 59), Date.UTC(2024, 0, 1)],
      ['1D', Infinity, NaN],
      ['1W', -Infinity, NaN],
      ['1M', 8_640_000_000_000_001, NaN],
      ['invalid', 0, NaN],
    ];
    const compiled = tryCompile(parse('//@version=6\nindicator("calendar references")\nplot(close)'));
    expect(compiled.success).toBe(true);
    if (!compiled.success) throw new Error('Compilation failed');
    const actual: unknown[] = [];
    const onBar = compiled.ScriptClass.prototype.onBar;
    compiled.ScriptClass.prototype.onBar = function (ctx: CompiledBarContext) {
      for (const [period, reference] of cases)
        actual.push(ctx.callBuiltin('TradingView.ValueAtTime.periodToTimestamp', [period, reference]));
      return onBar.call(this, ctx);
    };
    const result = executeCompiled(compiled, [{ time: 0, open: 1, high: 1, low: 1, close: 1, volume: 1 }]);
    expect(result!.errors).toEqual([]);
    expect(actual).toEqual(cases.map((entry) => entry[2]));
  });

  it.skipIf(process.env.TEALSCRIPT_PERF_ASSERT !== '1')('bounds CPU for a growing nearest timestamp index', () => {
    const count = 16000;
    const result = execute(
      Array.from({ length: count }, (_, i) => i * 1000),
      'time - 1500',
    );
    expect(result.plots[0]!.slice(-3)).toEqual([16005, 16006, 16007]);
    expect(result.plots[1]!.slice(-3)).toEqual([15995000, 15996000, 15997000]);
    console.info('nearest execution CPU ms', result.cpuMs);
    expect(result.cpuMs).toBeLessThan(800);
  });

  it.skipIf(process.env.TEALSCRIPT_PERF_ASSERT !== '1')('bounds CPU for batches before the first observation', () => {
    const run = (missing: boolean) => {
      const targets = Array.from({ length: 32 }, (_, i) => (missing ? 'float(na)' : String(-1000 - i * 1000)));
      const ast = parse(`//@version=5
import TradingView/ValueAtTime/2 as vat
indicator("before-first batch")
var targets = array.from(${targets.join(',')})
[values, stamps, current, description] = vat.getDataAtTimes(targets, close)
plot(array.get(values, 0))
plot(array.get(values, 31))
plot(array.get(stamps, 0))
plot(array.get(stamps, 31))`);
      const library = getOfficialTradingViewLibrary('TradingView/ValueAtTime/2');
      if (!library?.program) throw new Error('ValueAtTime library is unavailable');
      const libraries = new Map([['TradingView/ValueAtTime/2', library.program]]);
      expect(checkProgram(ast, { libraries }).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      const compiled = tryCompile(ast, undefined, { libraries });
      expect(compiled.success).toBe(true);
      if (!compiled.success) throw new Error('Compilation failed');
      const bars = Array.from({ length: 16000 }, (_, i) => ({
        time: i * 1000,
        open: i + 10,
        high: i + 11,
        low: i + 9,
        close: i + 10,
        volume: 1,
      }));
      const start = process.cpuUsage();
      const result = executeCompiled(compiled, bars, undefined, { libraries });
      const cpu = process.cpuUsage(start);
      expect(result!.errors).toEqual([]);
      return { plots: result!.plots.map((p) => p.values), cpuMs: (cpu.user + cpu.system) / 1000 };
    };
    const control = run(true);
    const result = run(false);
    expect(control.plots).toEqual(Array.from({ length: 4 }, () => Array(16000).fill(null)));
    expect(result.plots).toEqual([
      Array(16000).fill(10),
      Array(16000).fill(10),
      Array(16000).fill(0),
      Array(16000).fill(0),
    ]);
    process.stdout.write(`before-first batch CPU ms ${result.cpuMs}; missing-target control ${control.cpuMs}\n`);
    expect(result.cpuMs).toBeLessThan(control.cpuMs * 1.25 + 20);
  });
});
