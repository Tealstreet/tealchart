import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime';
import { checkProgram } from '../../src/semantic/checker';

const bars: Bar[] = [2, 6, 3, 9].map((close, index) => ({
  time: (index + 1) * 60000,
  open: [5, 1, 4, 8][index],
  high: 10,
  low: 0,
  close,
  volume: 100,
}));
function program(version: number, call: string) {
  return parse(`//@version=${version}\n${version === 4 ? 'study' : 'indicator'}("Ledger24 renames")\nplot(${call})`);
}
function values(version: number, call: string, expected: (number | null)[]) {
  const ast = program(version, call);
  expect(checkProgram(ast).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const result = executeScript(ast, bars);
  expect(result.errors).toEqual([]);
  expect(result.plots[0].values).toHaveLength(expected.length);
  for (const [index, value] of expected.entries()) {
    if (value === null) expect(result.plots[0].values[index]).toBeNull();
    else expect(result.plots[0].values[index]).toBeCloseTo(value, 9);
  }
}
const correlation = [null, null, -1, 0.5694947974514994];

// Published v4→v5 namespace and slot migration table, version-rules-v1 rows114/144–146/168/195–196.
describe('ledger gaps24 published renames', () => {
  it('binds legacy log10 x (924)', () => values(4, 'log10(x=1000)', [3, 3, 3, 3]));
  it.each([
    'correlation(source_a=close, source_b=open, length=3)',
    'correlation(length=3, source_b=open, source_a=close)',
    'correlation(source_a=close, open, 3)',
    'correlation(source_a=close, open, int(bar_index % 1) + 3)',
    'correlation(close, source_b=open, length=3)',
  ])('binds legacy correlation sources: %s (928–930)', (call) => values(4, call, correlation));

  it.each([5, 6])('binds modern log10 number in v%i (924)', (version) =>
    values(version, 'math.log10(number=1000)', [3, 3, 3, 3]),
  );
  it.each([5, 6])('binds modern correlation sources in v%i (928–930)', (version) => {
    values(version, 'ta.correlation(length=3, source2=open, source1=close)', correlation);
  });
  it.each([5, 6])('refuses legacy log10 x in v%i (924)', (version) => {
    expect(checkProgram(program(version, 'math.log10(x=1000)')).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'unknown-argument' })]),
    );
  });
  it.each([5, 6])('refuses both legacy correlation source slots in v%i (929/930)', (version) => {
    for (const call of [
      'ta.correlation(source_a=close, source2=open, length=3)',
      'ta.correlation(source1=close, source_b=open, length=3)',
    ]) {
      expect
        .soft(checkProgram(program(version, call)).diagnostics)
        .toEqual(expect.arrayContaining([expect.objectContaining({ code: 'unknown-argument' })]));
    }
  });

  it.each([4, 5, 6])('executes the percentrank namespace at its v%i boundary (938)', (version) => {
    // Native rank_clean_builtin / 18ace021d3: the namespace control retains length+1 startup.
    values(version, `${version === 4 ? '' : 'ta.'}percentrank(close, 3)`, [null, null, null, 100]);
    if (version >= 5)
      expect(checkProgram(program(version, 'percentrank(close, 3)')).diagnostics).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'version-mismatch' })]),
      );
  });
  it.each([4, 5, 6])('executes the MFI namespace at its v%i boundary (952)', (version) => {
    // Native initial-flow rule: positive 200 + 600, negative 200 => 80 at bar 1.
    values(version, `${version === 4 ? '' : 'ta.'}mfi(close, 2)`, [null, 80, 200 / 3, 75]);
    if (version >= 5)
      expect(checkProgram(program(version, 'mfi(close, 2)')).diagnostics).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'version-mismatch' })]),
      );
  });
});
