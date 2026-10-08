import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function check(source: string) {
  const ast = parse(source);
  return { errors: checkProgram(ast).diagnostics.filter((d) => d.severity === 'error') };
}

function program(fn: string, length: string, version = 6) {
  const call =
    fn === 'falling'
      ? `plot(ta.falling(close, ${length}) ? 1 : 0)`
      : fn === 'kc'
        ? `[middle, upper, lower] = ta.kc(close, ${length}, 2.0)\nplot(middle)`
        : `plot(ta.kcw(close, ${length}, 2.0))`;
  return `//@version=${version}\nindicator("Length kind")\n${call}\n`;
}

describe('falling/kc/kcw integer lengths', () => {
  for (const fn of ['falling', 'kc', 'kcw']) {
    for (const form of ['named', 'positional']) {
      it(`${fn} refuses ${form} float length`, () => {
        const source = program(fn, '3.0');
        const call =
          form === 'named'
            ? source
                .replace('close, 3.0', `${fn === 'falling' ? 'source' : 'series'}=close, length=3.0`)
                .replace('length=3.0, 2.0', 'length=3.0, mult=2.0')
            : source;
        expect(check(call).errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ message: expect.stringMatching(/length.*integer.*float/) }),
          ]),
        );
      });
    }
    for (const length of ['3', 'input.int(3)', 'int(3.0)']) {
      it(`${fn} retains ${length} integer length`, () => {
        const result = check(program(fn, length));
        expect(result.errors).toEqual([]);
      });
    }
    it(`${fn} retains the earlier v5 float admission route`, () => {
      const result = check(program(fn, '3.0', 5));
      expect(result.errors).toEqual([]);
    });
  }
  it('falling retains series integer length', () => {
    expect(check(program('falling', 'bar_index % 3 + 1')).errors).toEqual([]);
  });
});
