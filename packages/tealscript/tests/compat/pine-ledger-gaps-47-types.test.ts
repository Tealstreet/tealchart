import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const check = (body: string) => checkProgram(parse(`//@version=6\nindicator("Ledger47 types")\n${body}`));

// https://www.tradingview.com/pine-script-docs/language/type-system/
// These inspect normal inferred types; explicit const reference annotations
// have separate native/authority history and are not used as refusal controls.
describe('ledger47 scalar and reference inference', () => {
  it.each(['1.0', '1e0', '1E0', '1.5', '1e-2'])('decimal/exponent spelling %s infers float, rank1864', (literal) => {
    const result = check(`value = ${literal}`);
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((s) => s.name === 'value')?.type).toMatchObject({ kind: 'float' });
  });
  it('integer spelling still infers int, rank1864 control', () => {
    expect(check('value=1').symbols.find((s) => s.name === 'value')?.type).toMatchObject({ kind: 'int' });
  });
  it.each([
    ['point', 'point = chart.point.from_index(0, 10)', 'chart.point'],
    [
      'shape',
      'points = array.from(chart.point.from_index(0, 10), chart.point.from_index(1, 12))\nshape = polyline.new(points)',
      'polyline',
    ],
    ['object', 'type Record\n    float price\nobject = Record.new(7)', 'udt'],
  ])('inferred reference %s is inherently series, ranks1858/1859/1861', (name, source, kind) => {
    const result = check(source);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.symbols.find((s) => s.name === name)?.type).toMatchObject({ kind, qualifier: 'series' });
  });
  it.each(['[7, "x", true, 3.0]', 'values()'])(
    'retains heterogeneous tuple element kinds for %s, rank1866',
    (initializer) => {
      const result = check('values() => [7, "x", true, 3.0]\n[count, title, enabled, level] = ' + initializer);
      expect(result.diagnostics).toEqual([]);
      expect(
        ['count', 'title', 'enabled', 'level'].map((name) => result.symbols.find((s) => s.name === name)?.type?.kind),
      ).toEqual(['int', 'string', 'bool', 'float']);
    },
  );
});
