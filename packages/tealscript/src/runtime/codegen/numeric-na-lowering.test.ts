import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';
import { compile } from './compile';

const bars = [1, 2, 3].map((close, index) => ({
  time: (index + 1) * 120000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));

function generated(source: string) {
  const result = compile(parse(source));
  expect(result.success).toBe(true);
  return result.generatedCode;
}

describe('numeric na lowering', () => {
  it.each(['int x = na', 'float x = na', 'float x = close'])('bypasses table normalization for %s', (declaration) => {
    const source = `//@version=6\nindicator("numeric")\n${declaration}\nplot(na(x) ? 1 : 0)`;
    expect(generated(source)).not.toContain('__resolveTableReference');
    const result = executeScript(parse(source), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual(declaration.includes('close') ? [0, 0, 0] : [1, 1, 1]);
  });

  it('preserves normalization for tables after deletion', () => {
    const source = `//@version=6
indicator("table")
var table t = table.new(position.top_right, 1, 1)
if bar_index == 1
    table.delete(t)
plot(na(t) ? 1 : 0)`;
    const result = executeScript(parse(source), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([0, 1, 1]);
    expect(generated(source)).toContain('__resolveTableReference');
  });

  it('preserves unknown UDF operand normalization and one evaluation', () => {
    const source = `//@version=6
indicator("unknown")
f(x) => na(x)
var table t = table.new(position.top_right, 1, 1)
if bar_index == 1
    table.delete(t)
plot(f(t) ? 1 : 0)`;
    const result = executeScript(parse(source), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([0, 1, 1]);
    expect(generated(source)).toContain('__resolveTableReference');
  });
});
