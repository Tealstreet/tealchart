import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

const check = (body: string) => checkProgram(parse(`//@version=6\nindicator("Point reference qualifier")\n${body}`));

describe('chart.point IDs retain series qualification', () => {
  it.each(['chart.point.new(1000, 0, 7.25)', 'chart.point.from_index(0, 7.25)', 'chart.point.from_time(1000, 7.25)'])(
    'constant arguments still return a series reference from %s',
    (call) => {
      const checked = check(`point = ${call}`);
      expect(checked.diagnostics).toEqual([]);
      expect(checked.symbols.find((symbol) => symbol.name === 'point')?.type).toEqual({
        kind: 'chart.point',
        qualifier: 'series',
      });
    },
  );

  it.each(['chart.point.copy(point)', 'point.copy()'])('retains series reference metadata for %s', (call) => {
    const checked = check(`point = chart.point.from_index(0, 7.25)\ncopied = ${call}`);
    expect(checked.diagnostics).toEqual([]);
    expect(checked.symbols.find((symbol) => symbol.name === 'copied')?.type).toEqual({
      kind: 'chart.point',
      qualifier: 'series',
    });
  });

  it('retains series metadata through typed declarations, aliases and UDF returns', () => {
    const checked = check(`identity(chart.point value) => value
var chart.point point = chart.point.from_index(0, 7.25)
alias = point
returned = identity(alias)`);
    expect(checked.diagnostics).toEqual([]);
    for (const name of ['point', 'alias', 'returned']) {
      expect(checked.symbols.find((symbol) => symbol.name === name)?.type).toEqual({
        kind: 'chart.point',
        qualifier: 'series',
      });
    }
  });

  it('retains series reference metadata in both tuple-returned points', () => {
    const checked = check(`pair(chart.point value) => [value, value]
point = chart.point.from_index(0, 7.25)
[firstPoint, secondPoint] = pair(point)`);
    expect(checked.diagnostics).toEqual([]);
    for (const name of ['firstPoint', 'secondPoint']) {
      expect(checked.symbols.find((symbol) => symbol.name === name)?.type).toEqual({
        kind: 'chart.point',
        qualifier: 'series',
      });
    }
  });

  it('retains series scalar fields without turning them into reference types', () => {
    const checked = check(`point = chart.point.new(1000, 0, 7.25)
price = point.price
index = point.index
timestamp = point.time
const float literal = 7.25`);
    expect(checked.diagnostics).toEqual([]);
    expect(checked.symbols.find((symbol) => symbol.name === 'price')?.type).toEqual({
      kind: 'float',
      qualifier: 'series',
    });
    for (const name of ['index', 'timestamp']) {
      expect(checked.symbols.find((symbol) => symbol.name === name)?.type).toEqual({
        kind: 'int',
        qualifier: 'series',
      });
    }
    expect(checked.symbols.find((symbol) => symbol.name === 'literal')?.type).toEqual({
      kind: 'float',
      qualifier: 'const',
    });
  });

  it('cannot weaken a constructed reference to simple', () => {
    const checked = check('simple chart.point point = chart.point.from_index(0, 7.25)');
    expect(checked.diagnostics).toContainEqual(
      expect.objectContaining({ severity: 'error', code: 'qualifier-mismatch' }),
    );
  });
});
