import { describe, expect, it, vi } from 'vitest';

import { parse } from '../../src/parser';
import { compile } from '../../src/runtime/codegen/compile';
import { executeCompiled, executeCompiledScript } from '../../src/runtime/codegen/execute';

const bar = { time: 60_000, open: 10, high: 11, low: 9, close: 10, volume: 100 };
const loops = [
  ['numeric for', 'for i = 1 to LIMIT'],
  ['while', 'while count < LIMIT'],
  ['collection for', 'for value in array.new<int>(LIMIT, 1)'],
  ['indexed collection for', 'for [index, value] in array.new<int>(LIMIT, 1)'],
] as const;

function execute(header: string, limit: number, times: number[], version = 6) {
  let read = 0;
  const bodyIndent = header.includes('\n') ? '        ' : '    ';
  const clockReads = [0, ...times];
  const clock = vi.spyOn(performance, 'now').mockImplementation(() => clockReads[Math.min(read++, clockReads.length - 1)]);
  try {
    const execution = executeCompiledScript(parse(`//@version=${version}
indicator("Loop time budget")
count = 0
${header.replace('LIMIT', String(limit))}
${bodyIndent}count += 1
plot(count)`), [bar]);
    if (execution.status !== 'success') throw new Error(execution.reason);
    return execution.result;
  } finally {
    clock.mockRestore();
  }
}

// Limitations / loop execution: 500 ms per loop and bar, including time in nested loops.
// Worklist1683: https://www.tradingview.com/pine-script-docs/writing/limitations/#loop-execution
describe('Pine loop execution time budget', () => {
  it.each([5, 6])('v%s permits the exact 500 ms boundary', (version) => {
    const result = execute('for i = 1 to 1', 1, [0, 500], version);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([1]);
  });

  it.each(loops)('finishes a fast %s beyond 10,000 iterations', (_, header) => {
    const result = execute(header, 12_001, [0]);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([12_001]);
  });

  it.each(loops)('reports a %s timeout instead of returning a truncated value', (_, header) => {
    const result = execute(header, 3, [0, 501]);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringContaining('500 ms') }),
    ]));
  });

  it('counts nested execution against the outer loop budget', () => {
    let elapsed = 0;
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => elapsed);
    try {
      const compiled = compile(parse(`//@version=6
indicator("Nested budget")
count = 0
for outer = 1 to 2
    for inner = 1 to 1
        array.sort(array.new_int(1))
        count += 1
plot(count)`));
      if (!compiled.success) throw new Error('Compilation failed');
      const onBar = compiled.ScriptClass.prototype.onBar;
      compiled.ScriptClass.prototype.onBar = function (ctx: Parameters<typeof onBar>[0]) {
        const sort = this._deps._arr.sort;
        this._deps._arr.sort = () => { elapsed += 325; };
        try { return onBar.call(this, ctx); } finally { this._deps._arr.sort = sort; }
      };
      const result = executeCompiled(compiled, [bar]);
      if (!result) throw new Error('Execution failed');
      expect(elapsed).toBe(650);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ message: expect.stringMatching(/line 4.*500 ms/) }),
      ]));
    } finally {
      clock.mockRestore();
    }
  });

  it('checks the elapsed time after the last iteration', () => {
    const result = execute('for i = 1 to 1', 1, [0, 501]);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringContaining('500 ms') }),
    ]));
  });
});
