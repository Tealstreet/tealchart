import type { ScriptDependencies } from '../../src/runtime/codegen/compile';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

// Reference: https://www.tradingview.com/pine-script-reference/v6/ /entries/652.
// Constructor lookup counts are an engine performance gate; EMA values follow the documented recurrence.
const bars = Array.from({ length: 3 }, (_, index) => ({
  time: index * 120_000,
  open: 3,
  high: 3,
  low: 3,
  close: 3,
  volume: 1,
}));

function execute() {
  const compiled = tryCompile(
    parse(`//@version=6
indicator("Root dynamic TA")
length = input.int(2)
plot(ta.ema(close, length))
`),
  );
  expect(compiled.success).toBe(true);
  if (!compiled.success || !compiled.ScriptClass) throw new Error('Compilation failed');
  let lookups = 0;
  const instances: InstanceType<typeof compiled.ScriptClass>[] = [];
  const Original = compiled.ScriptClass;
  compiled.ScriptClass = class extends Original {
    constructor(deps: ScriptDependencies) {
      super(deps);
      instances.push(this);
      const cache = (this as unknown as { _dynamicTACache: Map<string, unknown> })._dynamicTACache;
      const get = cache.get.bind(cache);
      cache.get = (key) => {
        lookups += 1;
        return get(key);
      };
    }
  };
  const result = executeCompiled(compiled, bars);
  expect(result?.errors).toEqual([]);
  expect(result?.plots[0].values).toHaveLength(3);
  [1, 2].forEach((index) => expect(result?.plots[0].values[index]).toBe(3));
  return { lookups, instance: instances[0] };
}

describe('root dynamic TA binding performance', () => {
  it('reuses unchanged constructor arguments without rebuilding the keyed lookup on each bar', () => {
    expect(execute().lookups).toBeLessThanOrEqual(1);
  });

  it('uses the restored EMA state after a snapshot replaces cached instances', () => {
    const { instance } = execute();
    type Entry = { className: string; args: unknown[]; instance: { compute(value: number): number } };
    const root = instance as unknown as {
      _dynamicTACache: Map<string, Entry>;
      _dynamicTA(member: string, className: string, args: unknown[]): Entry['instance'];
      save(): unknown;
      restore(snapshot: unknown): void;
    };
    const [key, entry] = [...root._dynamicTACache][0];
    const snapshot = root.save();
    entry.instance.compute(4);
    root.restore(snapshot);
    expect(root._dynamicTA(key.split(':')[0], entry.className, entry.args).compute(4)).toBeCloseTo(11 / 3, 14);
  });
});
