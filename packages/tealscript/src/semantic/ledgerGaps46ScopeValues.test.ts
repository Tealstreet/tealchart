import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { executeCompiledScript } from '../runtime/codegen/execute';
import { checkProgram } from './checker';

const bars = [10, 20, 30].map((close, index) => ({
  time: 1700000000000 + index * 60000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));

function values(body: string) {
  const ast = parse(`//@version=6\nindicator("Scope value controls")\n${body}\n`);
  expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  const executed = executeCompiledScript(ast, bars);
  expect(executed.status).toBe('success');
  if (executed.status !== 'success') throw new Error(executed.reason);
  expect(executed.result.errors).toEqual([]);
  return executed.result.plots.map((plot) => plot.values);
}

describe('ledger scope value controls', () => {
  it('1802 keeps scalar namespace names and builtin member calls usable together', () => {
    expect(values('barstate = 7\nsyminfo = 9\nmath = -11\nplot(barstate + syminfo + math.abs(math))')).toEqual([
      [27, 27, 27],
    ]);
  });

  it('1808 reassigns the function-local shadow while preserving the global value', () => {
    expect(
      values(
        'var int total = 1\nchange() =>\n    int total = 5\n    total += 2\n    total\nplot(change())\nplot(total)',
      ),
    ).toEqual([
      [7, 7, 7],
      [1, 1, 1],
    ]);
  });

  it('1809 reassigns the block-local shadow while preserving the parameter', () => {
    expect(
      values(
        'record(int value, array<int> values) =>\n    if bar_index >= 0\n        int value = 5\n        value += 2\n        array.push(values, value)\n    value\nvar values = array.new<int>()\nplot(record(9, values))\nplot(array.get(values, 0))',
      ),
    ).toEqual([
      [9, 9, 9],
      [7, 7, 7],
    ]);
  });

  it('1810 changes global referenced contents without replacing their IDs', () => {
    expect(
      values(
        'type Holder\n    int value = 1\nvar holder = Holder.new()\nvar values = array.new<int>()\nchange() =>\n    holder.value += 2\n    array.push(values, holder.value)\n    holder.value\nplot(change())\nplot(array.size(values))',
      ),
    ).toEqual([
      [3, 5, 7],
      [1, 2, 3],
    ]);
  });
});
