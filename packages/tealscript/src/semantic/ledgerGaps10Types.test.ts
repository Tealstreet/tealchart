import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const check = (body: string) => checkProgram(parse(`//@version=6\nindicator("ledger types")\n${body}\n`));
const errors = (body: string) => check(body).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');

// Independent type/assignment contracts from the Pine v6 type-system and enums
// manuals. Explicit qualifiers avoid duplicating scalar inference row 389 (lane C).
describe('ledger gaps 10 value and reference types', () => {
  it.each([
    ['int', '3', '3.5'],
    ['float', '3.5', '"bad"'],
    ['bool', 'true', '3'],
    ['string', '"ok"', '3'],
    ['color', 'color.red', '3'],
  ])('preserves %s scalar kind and rejects incompatible initialization (rows 364–368)', (kind, valid, invalid) => {
    const result = check(`${kind} value = ${valid}\nplot(1)`);
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type?.kind).toBe(kind);
    expect(errors(`${kind} value = ${invalid}\nplot(1)`)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
    );
  });

  it.each(['simple', 'series', 'const'])('retains explicit %s qualifier (rows 361–363)', (qualifier) => {
    const result = check(`${qualifier} int value = 3\nplot(value)`);
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({ kind: 'int', qualifier });
    if (qualifier !== 'series') {
      expect(errors(`${qualifier} int value = bar_index\nplot(value)`)).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'qualifier-mismatch' })]),
      );
    } else {
      expect(errors('series int value = bar_index\nvalue := bar_index + 1\nplot(value)')).toEqual([]);
    }
  });

  // Plot/hline IDs are inferred, not annotation keywords: type-system/#plot-and-hline.
  it.each(['line', 'label', 'box', 'table', 'linefill', 'polyline'])(
    'retains series reference kind %s (rows 369–373/379)',
    (kind) => {
      const result = check(`${kind} value = na\n${kind} alias = value\nplot(1)`);
      expect(result.diagnostics).toEqual([]);
      expect(result.symbols.find((symbol) => symbol.name === 'alias')?.type).toEqual({ kind, qualifier: 'series' });
      expect(errors(`${kind} value = 3\nplot(1)`)).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
      );
    },
  );

  it.each([
    ['array<int>', { kind: 'array', qualifier: 'series', elementType: { kind: 'int' } }],
    ['matrix<float>', { kind: 'matrix', qualifier: 'series', elementType: { kind: 'float' } }],
    [
      'map<string, float>',
      { kind: 'map', qualifier: 'series', keyType: { kind: 'string' }, valueType: { kind: 'float' } },
    ],
    ['footprint', { kind: 'udt', name: 'footprint', qualifier: 'series' }],
    ['volume_row', { kind: 'udt', name: 'volume_row', qualifier: 'series' }],
  ])('retains reference annotation %s (rows 374–378)', (annotation, expected) => {
    const result = check(`${annotation} value = na\n${annotation} alias = value\nplot(1)`);
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'alias')?.type).toEqual(expected);
    expect(errors(`${annotation} value = 3\nplot(1)`)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
    );
  });

  it('preserves enum identity on explicit and inferred assignment (row 384)', () => {
    const enums = 'enum First\n    same = "Same"\n    other\nenum Second\n    same = "Same"\n';
    expect(
      errors(
        `${enums}First value = First.same\nvalue := First.other\ninferred = First.same\ninferred := First.other\nplot(value == inferred ? 1 : 0)`,
      ),
    ).toEqual([]);
    for (const declaration of [
      'First value = Second.same',
      'value = First.same\nvalue := Second.same',
      'First value = "Same"',
    ]) {
      expect(errors(`${enums}${declaration}\nplot(1)`)).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
      );
    }
  });

  it('infers chart.point.index as series int (row 390)', () => {
    const result = check('point = chart.point.from_index(2, 7)\nindex = point.index\nplot(index)');
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'index')?.type).toEqual({
      kind: 'int',
      qualifier: 'series',
    });
  });

  it.each([
    ['request.footprint(10, 70)', { kind: 'udt', name: 'footprint', qualifier: 'series' }],
    ['footprint.poc(fp)', { kind: 'udt', name: 'volume_row', qualifier: 'series' }],
    ['footprint.vah(fp)', { kind: 'udt', name: 'volume_row', qualifier: 'series' }],
    ['footprint.val(fp)', { kind: 'udt', name: 'volume_row', qualifier: 'series' }],
    ['footprint.get_row_by_price(fp, close)', { kind: 'udt', name: 'volume_row', qualifier: 'series' }],
    [
      'footprint.rows(fp)',
      { kind: 'array', qualifier: 'series', elementType: { kind: 'udt', name: 'volume_row', qualifier: 'series' } },
    ],
  ])('infers builtin reference result %s (rows 376–377)', (expression, expected) => {
    const result = check(`footprint fp = na\nvalue = ${expression}\nplot(1)`);
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual(expected);
  });
});
