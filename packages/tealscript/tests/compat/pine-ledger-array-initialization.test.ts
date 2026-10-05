import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import type { Bar } from '../../src/runtime/context';
import { checkProgram } from '../../src/semantic/checker';

// Ledger ranks 428-432: collections-v1#243, #246-249.
// array.new repeats one initial value; array.from seeds individual zero-based slots.
const bars: Bar[] = [{ time: 60_000, open: 12, high: 19, low: 9, close: 12, volume: 10 }];

function values(body: string) {
  const ast = parse(`//@version=6\nindicator("Array initialization")\n${body}`);
  expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  const result = executeScript(ast, bars);
  expect(result.errors).toEqual([]);
  return result.plots.map((plot) => plot.values);
}

describe('generic array constructor slots and zero-based elements', () => {
  it('binds reversed size/initial_value names and changes only index zero [rows 428/429/431/432]', () => {
    expect(values(`items = array.new<float>(initial_value=-7, size=3)
array.set(items, 0, 11)
plot(array.size(items))
plot(array.get(items, 0))
plot(array.get(items, 1))
plot(array.get(items, 2))`)).toEqual([[3], [11], [-7], [-7]]);
  });

  it('uses array.from to initialize individual elements in argument order [row 430]', () => {
    expect(values(`items = array.from(13, -5, 2)
plot(array.size(items))
plot(array.get(items, 0))
plot(array.get(items, 1))
plot(array.get(items, 2))`)).toEqual([[3], [13], [-5], [2]]);
  });
});
