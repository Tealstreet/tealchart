import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

// Reference casts accept a handle of their own family and return series handles.
// Mutation through the cast must affect the original object, without a copy.
// Table ledger317-319; sibling families delegated by the drawing owner.
const families = [
  { kind: 'table', setup: '', create: 'table.new(position.top_right, 1, 1)', mutate: 'table.cell(cast, 0, 0, "changed")', property: { cells: [expect.objectContaining({ text: 'changed' })] }, count: 1 },
  { kind: 'line', setup: '', create: 'line.new(0, 1, 1, 2)', mutate: 'line.set_y1(cast, 17)', property: { y1: 17 }, count: 1 },
  { kind: 'label', setup: '', create: 'label.new(0, 1, "before")', mutate: 'label.set_text(cast, "changed")', property: { text: 'changed' }, count: 1 },
  { kind: 'box', setup: '', create: 'box.new(0, 2, 1, 1)', mutate: 'box.set_top(cast, 17)', property: { top: 17 }, count: 1 },
  { kind: 'linefill', setup: 'var first = line.new(0, 1, 1, 2)\nvar secondHandle = line.new(0, 3, 1, 4)\n', create: 'linefill.new(first, secondHandle, color.red)', mutate: 'linefill.set_color(cast, #123456)', property: { color: '#123456' }, count: 3 },
];
const cases = families.flatMap((family) => [false, true].map((named) => ({ ...family, named, title: `${family.kind}, ${named ? 'named x' : 'positional'}` })));

function source(kind: string, setup: string, create: string, named: boolean, mutate: string) {
  return `//@version=6
indicator("Reference cast identity")
${setup}var created = ${create}
cast = ${kind}(${named ? 'x=' : ''}created)
alias = cast
${kind} typed = cast
if barstate.islast
    ${mutate}
plot(na(cast) or na(alias) or na(typed) ? 0 : 1, title="present")`;
}

describe('ledger gaps 8: valid drawing handle casts', () => {
  it.each(cases)('retains the family and series qualifier: $title', ({ kind, setup, create, named, mutate }) => {
    const checked = checkProgram(parse(source(kind, setup, create, named, mutate)));
    expect(checked.diagnostics).toEqual([]);
    for (const name of ['cast', 'alias', 'typed']) {
      expect(checked.symbols.find((symbol) => symbol.name === name)?.type).toEqual({ kind, qualifier: 'series' });
    }
  });

  it.each(cases)('preserves identity through mutation: $title', ({ kind, setup, create, named, mutate, property, count }) => {
    const result = runCompatScript(source(kind, setup, create, named, mutate));
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'present').values).toEqual(Array(12).fill(1));
    expect(result.drawings).toHaveLength(count);
    const objects = result.drawings.filter((drawing) => drawing.type === kind);
    expect(objects).toHaveLength(1);
    expect(objects[0]).toMatchObject(property);
  });
});
