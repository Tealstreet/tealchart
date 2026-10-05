import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { compatibilityBars } from './fixtures';

// array.slice remarks2 (reference entries943/1263): historical elements/slices
// are immutable; array.copy permits mutation of an independent copy or its slice.
function run(body: string) {
  const compiled = tryCompile(
    parse(`//@version=6
indicator("Historical slice certification")
items = array.from(bar_index, 9)
previous = items[1]
${body}`),
  );
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, compatibilityBars);
  expect(result).not.toBeNull();
  return result!;
}

for (const target of ['previous', 'array.slice(previous, 0, 1)', 'previous.slice(0, 1)']) {
  it(`refuses mutation of ${target}`, () => {
    const result = run(`if bar_index > 0
    target = ${target}
    target.set(0, 99)
plot(items.get(0))`);
    const messages = [
      ...result.errors.map((error) => error.message),
      ...(result.profile.swallowedErrors ?? []).map((error) => error.firstMessage),
    ];
    expect(messages.join(' ')).toMatch(/historical|read.?only|cannot.*modif/i);
  });
}

for (const copy of ['array.copy(previous)', 'previous.copy()', 'previous.copy().slice(0, 1)']) {
  it(`mutates ${copy} while preserving earlier instances and the live array`, () => {
    const result = run(`float copied = na
if bar_index > 0
    independent = ${copy}
    independent.set(0, 99)
    copied := independent.get(0)
plot(copied, "copy")
plot(bar_index > 0 ? previous.get(0) : na, "previous")
plot(items.get(0), "current")`);
    expect(result.errors).toEqual([]);
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
    const vectors = new Map(result.plots.map((plot) => [plot.title, plot.values]));
    expect(vectors.get('copy')).toEqual([null, ...Array(11).fill(99)]);
    expect(vectors.get('previous')).toEqual([null, ...Array.from({ length: 11 }, (_, i) => i)]);
    expect(vectors.get('current')).toEqual(Array.from({ length: 12 }, (_, i) => i));
  });
}
