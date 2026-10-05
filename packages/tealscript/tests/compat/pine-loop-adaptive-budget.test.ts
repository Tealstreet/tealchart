import { describe, expect, it, vi } from 'vitest';

import { parse } from '../../src/parser';
import { compile } from '../../src/runtime/codegen/compile';
import { executeCompiled, executeCompiledScript } from '../../src/runtime/codegen/execute';

const bars = [{ time: 0, open: 1, high: 1, low: 1, close: 1, volume: 1 }];

describe('shared loop watchdog', () => {
  it('uses fixed shared clock sampling for a cheap 100-iteration loop', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    try {
      const result = executeCompiledScript(parse(`//@version=6
indicator("Cheap loop")
count = 0
for i = 0 to 99
    count += 1
plot(count)`), bars);
      expect(result.status).toBe('success');
      if (result.status !== 'success') throw new Error(result.reason);
      expect(result.result.plots[0].values).toEqual([100]);
      expect(now.mock.calls.length).toBe(5);
    } finally {
      now.mockRestore();
    }
  });
  it('bounds a consistently expensive body within 64 iterations', () => {
    let elapsed = 0;
    let firstBodyReads = 0;
    const now = vi.spyOn(performance, 'now').mockImplementation(() => elapsed);
    try {
      const compiled = compile(parse(`//@version=6
indicator("Heavy sort budget")
var data = array.new_float(100000, 1)
count = 0
for i = 0 to 4999
    array.sort(data)
    count += 1
plot(count)`));
      expect(compiled.success).toBe(true);
      if (!compiled.success) throw new Error('Compilation failed');
      const onBar = compiled.ScriptClass.prototype.onBar;
      compiled.ScriptClass.prototype.onBar = function (ctx: Parameters<typeof onBar>[0]) {
        const sort = this._deps._arr.sort;
        this._deps._arr.sort = () => {
          if (elapsed === 0) firstBodyReads = now.mock.calls.length;
          elapsed += 7;
        };
        try { return onBar.call(this, ctx); } finally { this._deps._arr.sort = sort; }
      };
      const result = executeCompiled(compiled, bars);
      if (!result) throw new Error('Execution failed');
      expect(result.errors[0]?.message).toBe('Loop at line 5 exceeds the 500 ms execution time limit');
      expect(firstBodyReads).toBe(2);
      expect(elapsed).toBeGreaterThan(500);
      expect(elapsed).toBeLessThanOrEqual(500 + 64 * 7);
    } finally {
      now.mockRestore();
    }
  });
});
