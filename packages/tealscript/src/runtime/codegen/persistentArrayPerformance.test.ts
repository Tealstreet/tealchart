import type { Bar } from '../context';
import type { CompiledBarContext } from './compile';

import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { createPineArray, getArrayValue } from '../arrays';
import { createPineUdtObject } from '../objects';
import { executeCompiled, tryCompile } from './execute';

const bars: Bar[] = [10, 20, 30].map((close, index) => ({
  time: (index + 1) * 60_000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 100,
}));

// Capture the real compiled runtime hooks without adding a production benchmark API.
function withRuntime(action: (ctx: CompiledBarContext) => void) {
  const compiled = tryCompile(parse('//@version=6\nindicator("Persistence hooks")\nplot(close)'));
  expect(compiled.success).toBe(true);
  const Base = compiled.ScriptClass;
  compiled.ScriptClass = class extends Base {
    override onBar(ctx: CompiledBarContext) {
      super.onBar(ctx);
      if (ctx.barIndex === 0) action(ctx);
    }
  };
  const result = executeCompiled(compiled, bars);
  expect(result).not.toBeNull();
  expect(result!.errors).toEqual([]);
  expect(result!.profile.swallowedErrors ?? []).toEqual([]);
  return result!;
}

function cpuMicros(action: () => void): number {
  const start = process.cpuUsage();
  action();
  const used = process.cpuUsage(start);
  return used.user + used.system;
}

describe('persistent array bookkeeping', () => {
  const timingIt = process.env.TEALSCRIPT_PERF_ASSERT === '1' ? it : it.skip;

  timingIt('keeps numeric writes close to the same nonpersistent array writes', () => {
    let runtime!: CompiledBarContext;
    withRuntime((ctx) => {
      runtime = ctx;
    });
    const ordinary = createPineArray(64, 0);
    const persistent = createPineArray(64, 0);
    runtime.markPersistentRuntimeValue(persistent);
    const write = (array: typeof ordinary) => {
      for (let index = 0; index < 500_000; index++) runtime.arraySet(array, index % 64, index + 0.25);
    };
    write(ordinary);
    write(persistent);
    const ratios: number[] = [];
    for (let sample = 0; sample < 5; sample++) {
      // Alternate order to avoid consistently favoring one path during JIT/GC activity.
      const first = sample % 2 === 0 ? ordinary : persistent;
      const second = sample % 2 === 0 ? persistent : ordinary;
      const firstUs = cpuMicros(() => write(first));
      const secondUs = cpuMicros(() => write(second));
      ratios.push(sample % 2 === 0 ? secondUs / firstUs : firstUs / secondUs);
    }
    const medianRatio = ratios.sort((left, right) => left - right)[2]!;
    console.info(JSON.stringify({ numericPersistentWriteRatio: medianRatio, ratios }));
    expect(persistent.values).toEqual(ordinary.values);
    // v56:555/582 profiles identify numeric bin writes; persistence adds no handle traversal here.
    expect(medianRatio).toBeLessThan(1.8);
  });

  it('preserves numeric, missing, boolean and text values through persistent writes', () => {
    withRuntime((ctx) => {
      const array = createPineArray(5);
      ctx.markPersistentRuntimeValue(array);
      const values = [3.125, Number.NaN, false, 'ordinary text', null];
      values.forEach((value, index) => ctx.arraySet(array, index, value));
      expect(array.values).toEqual(values);
    });
  });

  it.each(['push', 'set', 'unshift', 'insert', 'concat', 'indexed'] as const)(
    'keeps newly inserted nested drawing handles persistent through %s',
    (operation) => {
      const result = withRuntime((ctx) => {
        const array = createPineArray(operation === 'set' || operation === 'indexed' ? 1 : 0);
        ctx.markPersistentRuntimeValue(array);
        const handle = ctx.callBuiltin('line.new', [0, 10, 1, 20], undefined, operation);
        expect(typeof handle).toBe('string');
        const child = createPineUdtObject('Slot', [
          ['price', 7.25],
          ['line', handle],
        ]);
        const nested = createPineArray(1, child);
        if (operation === 'push') ctx.arrayPush(array, nested);
        if (operation === 'set') ctx.arraySet(array, 0, nested);
        if (operation === 'unshift') ctx.arrayUnshift(array, nested);
        if (operation === 'insert') ctx.arrayInsert(array, 0, nested);
        if (operation === 'concat') ctx.arrayConcat(array, createPineArray(1, nested));
        if (operation === 'indexed') {
          array.values[0] = nested;
          ctx.markPersistentArrayDrawing(array, nested);
        }
        expect(getArrayValue(array, 0)).toBe(nested);
        expect(getArrayValue(nested, 0)).toBe(child);
        expect(nested.persistent).toBe(true);
        expect(child.persistent).toBe(true);
      });
      expect(result.drawings).toHaveLength(1);
      expect(result.drawings[0]).toMatchObject({ type: 'line', persistent: true, y1: 10, y2: 20 });
    },
  );

  it('revisits aliased containers and cycles after a nested UDT drawing field changes', () => {
    const result = withRuntime((ctx) => {
      const array = createPineArray();
      const child = createPineUdtObject('Slot', [
        ['parent', array],
        ['line', Number.NaN],
      ]);
      array.values.push(child, child);
      ctx.markPersistentRuntimeValue(array);
      expect(child.persistent).toBe(true);
      const handle = ctx.callBuiltin('line.new', [0, 13, 1, 23], undefined, 'changed');
      child.fields.set('line', handle);
      ctx.markPersistentUdtField(child, 'line');
      ctx.arraySet(array, 0, child);
      expect(array.values[0]).toBe(array.values[1]);
      expect(child.fields.get('parent')).toBe(array);
    });
    expect(result.drawings[0]).toMatchObject({ type: 'line', persistent: true, y1: 13, y2: 23 });
  });

  it('marks a replaced UDT field containing an array and its later drawing insertion', () => {
    const result = withRuntime((ctx) => {
      const owner = createPineUdtObject('Owner', [
        ['pool', Number.NaN],
        ['price', Number.NaN],
      ]);
      ctx.markPersistentRuntimeValue(owner);
      const pool = createPineArray();
      owner.fields.set('pool', pool);
      ctx.markPersistentUdtField(owner, 'pool');
      expect(pool.persistent).toBe(true);
      owner.fields.set('price', 42.125);
      ctx.markPersistentUdtField(owner, 'price');
      expect(owner.fields.get('price')).toBe(42.125);
      const handle = ctx.callBuiltin('label.new', [0, 15, 'late'], undefined, 'late');
      ctx.arrayPush(pool, handle);
      expect(getArrayValue(pool, 0)).toBe(handle);
    });
    expect(result.drawings[0]).toMatchObject({ type: 'label', text: 'late', persistent: true });
  });

  it('preserves view aliases and recursively marks initial nested drawing handles', () => {
    const result = withRuntime((ctx) => {
      const handle = ctx.callBuiltin('box.new', [0, 18, 1, 8], undefined, 'initial');
      const child = createPineUdtObject('BoxSlot', [['box', handle]]);
      const parent = createPineArray<unknown>(2, Number.NaN);
      parent.values[1] = child;
      const view = { __tealscriptArray: true as const, values: [], view: { parent, from: 1, to: 2 } };
      ctx.markPersistentRuntimeValue(view);
      expect(child.persistent).toBe(true);
      ctx.arraySet(view, 0, child);
      expect(getArrayValue(parent, 1)).toBe(getArrayValue(view, 0));
    });
    expect(result.drawings[0]).toMatchObject({ type: 'box', persistent: true, top: 18, bottom: 8 });
  });

  it('leaves drawings written to an ordinary array nonpersistent', () => {
    const result = withRuntime((ctx) => {
      const array = createPineArray();
      const handle = ctx.callBuiltin('line.new', [0, 5, 1, 6], undefined, 'ordinary');
      ctx.arrayPush(array, handle);
      expect(array.persistent).not.toBe(true);
      expect(getArrayValue(array, 0)).toBe(handle);
    });
    expect(result.drawings[0]?.type).toBe('line');
    expect(result.drawings[0]?.persistent).not.toBe(true);
  });
});
