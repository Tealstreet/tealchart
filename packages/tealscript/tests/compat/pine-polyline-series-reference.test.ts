import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

const check = (body: string) =>
  checkProgram(
    parse(`//@version=6
indicator("Polyline reference qualifier")
points = array.from(chart.point.from_index(0, 7), chart.point.from_index(1, 9))
${body}`),
  );

describe('polyline IDs retain series qualification', () => {
  it.each([
    'handle = polyline.new(points)',
    'polyline handle = polyline.new(points)',
    'var polyline handle = polyline.new(points)',
    'polyline handle = na',
  ])('retains reference metadata for %s', (declaration) => {
    const checked = check(declaration);
    expect(checked.diagnostics).toEqual([]);
    expect(checked.symbols.find((symbol) => symbol.name === 'handle')?.type).toEqual({
      kind: 'polyline',
      qualifier: 'series',
    });
  });

  it('retains series metadata across a plain alias and a typed UDF return', () => {
    const checked = check(`identity(polyline value) => value
handle = polyline.new(points)
alias = handle
returned = identity(alias)`);
    expect(checked.diagnostics).toEqual([]);
    for (const name of ['handle', 'alias', 'returned']) {
      expect(checked.symbols.find((symbol) => symbol.name === name)?.type).toEqual({
        kind: 'polyline',
        qualifier: 'series',
      });
    }
  });

  it('retains series qualification in each tuple-returned reference', () => {
    const checked = check(`pair(polyline value) => [value, value]
handle = polyline.new(points)
[firstHandle, secondHandle] = pair(handle)`);
    expect(checked.diagnostics).toEqual([]);
    for (const name of ['firstHandle', 'secondHandle']) {
      expect(checked.symbols.find((symbol) => symbol.name === name)?.type).toEqual({
        kind: 'polyline',
        qualifier: 'series',
      });
    }
  });

  it('cannot weaken a constructed reference to simple', () => {
    const checked = check('simple polyline handle = polyline.new(points)');
    expect(checked.diagnostics).toContainEqual(
      expect.objectContaining({ severity: 'error', code: 'qualifier-mismatch' }),
    );
  });
});
