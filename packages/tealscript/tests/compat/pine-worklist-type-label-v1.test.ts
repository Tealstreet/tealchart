import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, runCompatScript } from './fixtures';

const source = (body: string) => `//@version=6\nindicator("label reference type")\n${body}`;
const check = (body: string) => checkProgram(parse(source(body)));
const errors = (body: string) => check(body).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');

// Documented type-system reference-ID contract; no native geometry or const-syntax claim.
describe('worklist label reference type', () => {
  it('infers constructor and assigned aliases as series label IDs', () => {
    const result = check('id = label.new(7, 13, "before")\nalias = id');
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    for (const name of ['id', 'alias']) {
      expect(result.symbols.find((symbol) => symbol.name === name)?.type).toEqual({
        kind: 'label',
        qualifier: 'series',
      });
    }
  });

  it('admits typed ID assignment and refuses another reference family', () => {
    expect(errors('label id = label.new(7, 13, "before")\nlabel alias = id')).toEqual([]);
    expect(errors('label id = box.new(1, 3, 2, 0)')).toContainEqual(expect.objectContaining({ code: 'type-mismatch' }));
  });

  it('an alias mutates the referenced object while another ID remains independent', () => {
    const result = runCompatScript(
      source(
        'id = label.new(7, 13, "before")\nalias = id\nother = label.new(8, 14, "other")\nlabel.set_text(alias, "after")',
      ),
      { bars: compatibilityBars.slice(0, 1) },
    );
    expect(result.errors).toEqual([]);
    expect(result.drawings?.filter((drawing) => drawing.type === 'label').map((drawing) => drawing.text)).toEqual([
      'after',
      'other',
    ]);
  });
});
