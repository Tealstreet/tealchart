import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

const source = (body: string) => `//@version=6\nindicator("box reference type")\n${body}`;
const check = (body: string) => checkProgram(parse(source(body)));
const errors = (body: string) => check(body).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');

// Documented type-system reference-ID contract; no native geometry or const-syntax claim.
describe('worklist box reference type', () => {
  it('infers constructor and assigned aliases as series box IDs', () => {
    const result = check('id = box.new(7, 13, 9, 3)\nalias = id');
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    for (const name of ['id', 'alias']) {
      expect(result.symbols.find((symbol) => symbol.name === name)?.type).toEqual({ kind: 'box', qualifier: 'series' });
    }
  });

  it('admits typed ID assignment and refuses another reference family', () => {
    expect(errors('box id = box.new(7, 13, 9, 3)\nbox alias = id')).toEqual([]);
    expect(errors('box id = label.new(1, 2)')).toContainEqual(expect.objectContaining({ code: 'type-mismatch' }));
  });

  it('an alias mutates the referenced object while another ID remains independent', () => {
    const result = runCompatScript(
      source('id = box.new(7, 13, 9, 3)\nalias = id\nother = box.new(8, 14, 10, 4)\nbox.set_left(alias, 5)'),
      { bars: compatibilityBars.slice(0, 1) },
    );
    expect(result.errors).toEqual([]);
    expect(result.drawings?.filter((drawing) => drawing.type === 'box').map((drawing) => drawing.left)).toEqual([5, 8]);
  });
});
