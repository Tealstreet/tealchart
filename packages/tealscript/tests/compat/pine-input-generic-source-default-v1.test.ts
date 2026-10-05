import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');

describe('Generic input source defaults', () => {
  // Native v4 input-generic-computed-source-v1: CE10212 on close * 2.
  for (const named of [false, true]) {
    it(`${named ? 'named' : 'positional'} computed source default is refused`, () => {
      const call = named ? 'input(defval=close*2,title="ComputedSource")' : 'input(close*2,"ComputedSource")';
      expect(
        errors(`//@version=6
indicator("INPUT-GENERIC-SOURCE-DEFAULT-AUTHORITY")
selected=${call}
plot(close,"OUTCOME")`),
      ).toContainEqual(
        expect.objectContaining({
          code: 'qualifier-mismatch',
          message: expect.stringContaining('constant type, or "source" builtin variables'),
        }),
      );
    });
  }
  it('accepts constant expressions and bare source builtins', () => {
    expect(
      errors(`//@version=6
indicator("Generic input defaults")
n = input(1 + 2)
f = input(1.5 * 2)
b = input(true)
s = input("text")
c = input(color.red)
source = input(close)
typical = input(hlc3)
vol = input(volume)
plot(source)`),
    ).toEqual([]);
  });
  it('retains computed numeric input.source defaults', () => {
    expect(
      errors(`//@version=6
indicator("Typed input source")
selected = input.source(close * 2)
plot(selected)`),
    ).toEqual([]);
  });
  it('retains a local callable named input', () => {
    expect(
      errors(`//@version=6
indicator("Input function shadow")
input(float value) => value * 2
selected = input(close * 2)
plot(selected)`),
    ).toEqual([]);
  });
});
