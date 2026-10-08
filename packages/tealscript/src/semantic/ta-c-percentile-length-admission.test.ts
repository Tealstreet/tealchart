import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const qualifiers = ['const', 'input', 'simple', 'series'] as const;
const members = ['percentile_nearest_rank', 'percentile_linear_interpolation'] as const;

function declaration(kind: 'int' | 'float', qualifier: (typeof qualifiers)[number]) {
  const literal = kind === 'int' ? '4' : '4.0';
  const value =
    qualifier === 'input'
      ? `input.${kind}(${literal})`
      : qualifier === 'series'
        ? kind === 'int'
          ? 'bar_index % 3 + 1'
          : 'close'
        : literal;
  return `${qualifier} ${kind} length = ${value}`;
}

function diagnostics(body: string) {
  return checkProgram(parse(`//@version=6\nindicator("TA-C percentile length")\n${body}`)).diagnostics;
}

// Pine v6 reference entries358/359 require series int length.
describe.each(members)('TA-C ta.%s integer length admission', (member) => {
  it.each(qualifiers)('refuses %s float length in positional and named calls', (qualifier) => {
    for (const call of [
      `ta.${member}(close, length, 50)`,
      `ta.${member}(percentage=50, source=close, length=length)`,
    ]) {
      expect(diagnostics(`${declaration('float', qualifier)}\nplot(${call})`)).toEqual([
        expect.objectContaining({
          code: 'type-mismatch',
          message: `ta.${member} length must be an integer, got float`,
        }),
      ]);
    }
  });

  it.each(qualifiers)('admits %s int length and fractional percentage', (qualifier) => {
    for (const call of [
      `ta.${member}(close, length, 50.5)`,
      `ta.${member}(percentage=50.5, source=close, length=length)`,
    ]) {
      expect(diagnostics(`${declaration('int', qualifier)}\nplot(${call})`)).toEqual([]);
    }
  });

  it('keeps same-name receiver methods independent of builtin length rules', () => {
    expect(
      diagnostics(`type Holder
    int seed
method ${member}(Holder self, float source, float length, int percentage) => source
holder = Holder.new(1)
plot(holder.${member}(close, 4.0, 50))`),
    ).toEqual([]);
  });
});
