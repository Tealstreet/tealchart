import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

// Rank320: reference/pine-v6-reference-v1.json, array.slice remarks[2].
// Historical elements/slices cannot be modified; shallow copies can.
const script = (target: string, operation: string) => `//@version=6
indicator("Historical array mutation")
values = array.from(bar_index, bar_index + 10, bar_index + 20)
previous = values[1]
if bar_index > 0
    target = ${target}
    ${operation}
plot(values.get(0), "current")`;

describe('rank320 historical arrays and slices', () => {
  for (const target of ['previous', 'array.slice(previous, 0, 2)', 'previous.slice(0, 2)']) {
    it(`${target} refuses set through a historical reference`, () => {
      const source = script(target, 'target.set(0, 99)');
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      const result = runCompatScript(source);
      expect(result.errors.some((error) => /historical|read.?only|cannot.*modif/i.test(error.message))).toBe(true);
    });
  }
  for (const target of ['previous.copy()', 'previous.copy().slice(0, 2)']) {
    it(`${target} permits mutation of copied contents`, () => {
      const source = script(target, 'target.set(0, 99)');
      expect(checkProgram(parse(source)).diagnostics).toEqual([]);
      const result = runCompatScript(source);
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'current').values).toEqual(Array.from({ length: 12 }, (_, i) => i));
    });
  }
  it('a live offset-zero reference permits mutation', () => {
    const result = runCompatScript(`//@version=6
indicator("Current reference")
values = array.from(7, 8, 9)
current = values[0]
current.set(0, 99)
plot(values.get(0), "result")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'result').values).toEqual(Array(12).fill(99));
  });
});
