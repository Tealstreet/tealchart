import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

const source = (body: string) => `//@version=6\nindicator("table reference type")\n${body}`;
const check = (body: string) => checkProgram(parse(source(body)));
const errors = (body: string) => check(body).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');

// Documented type-system reference-ID contract; no native geometry or const-syntax claim.
describe('worklist table reference type', () => {
  it('infers constructor and assigned aliases as series table IDs', () => {
    const result = check('id = table.new("top_left", 1, 1)\nalias = id');
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    for (const name of ['id', 'alias']) {
      expect(result.symbols.find((symbol) => symbol.name === name)?.type).toEqual({
        kind: 'table',
        qualifier: 'series',
      });
    }
  });

  it('admits typed ID assignment and refuses another reference family', () => {
    expect(errors('table id = table.new(position.top_left, 1, 1)\ntable alias = id')).toEqual([]);
    expect(errors('table id = label.new(1, 2)')).toContainEqual(expect.objectContaining({ code: 'type-mismatch' }));
  });

  it('an alias mutates the referenced object while another ID remains independent', () => {
    const result = runCompatScript(
      source(
        'id = table.new(position.top_left, 1, 1)\nalias = id\nother = table.new(position.bottom_right, 1, 1)\ntable.cell(id, 0, 0, "before")\ntable.cell(other, 0, 0, "other")\ntable.cell(alias, 0, 0, "after")',
      ),
      { bars: compatibilityBars.slice(0, 1) },
    );
    expect(result.errors).toEqual([]);
    expect(
      result.drawings
        ?.filter((drawing) => drawing.type === 'table')
        .map((drawing) => drawing.cells.map((cell) => cell.text)),
    ).toEqual([['after'], ['other']]);
  });
});
