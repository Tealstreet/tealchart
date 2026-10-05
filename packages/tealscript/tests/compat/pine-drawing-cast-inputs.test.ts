import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

const families = ['box', 'label', 'line', 'linefill', 'table'];
const scalars = [
  { value: '7', kind: 'int' }, { value: '"invalid"', kind: 'string' },
  { value: 'true', kind: 'bool' }, { value: '#ff0000', kind: 'color' },
];
const invalid = families.flatMap((family) => scalars.map((scalar) => ({ family, ...scalar, setup: '' })))
  .concat(families.map((family) => ({ family, value: `"${family}_forged_0"`, kind: 'string', setup: '' })))
  .concat(families.filter((family) => family !== 'line').map((family) => ({ family, value: 'foreign', kind: 'line', setup: 'var foreign = line.new(0, 1, 1, 2)\n' })));
const cases = invalid.flatMap((item) => [false, true].map((named) => ({ ...item, named, title: `${item.family} from ${item.kind} ${item.value}, ${named ? 'named x' : 'positional'}` })));

function source(setup: string, family: string, value: string, named: boolean) {
  return `//@version=6\nindicator("Drawing cast input family")\n${setup}cast = ${family}(${named ? 'x=' : ''}${value})\nplot(na(cast) ? 0 : 1)`;
}

describe('drawing casts require their own reference family', () => {
  it.each(cases)('refuses false static family certification: $title', ({ family, setup, value, named }) => {
    const checked = checkProgram(parse(source(setup, family, value, named)));
    expect(checked.diagnostics).toEqual([
      expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining(`${family} x requires ${family}`), severity: 'error' }),
    ]);
    expect(checked.symbols.find((symbol) => symbol.name === 'cast')?.type?.kind).toBe('unknown');
  });

  it.each(cases)('refuses runtime scalar and foreign-handle passthrough: $title', ({ family, setup, value, named }) => {
    const result = runCompatScript(source(setup, family, value, named));
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.every((error) => error.message.includes(`${family} x requires ${family}`))).toBe(true);
  });

  it('preserves a local function shadow named line', () => {
    const source = `//@version=6
indicator("Cast name shadow")
line(float x) => x + 1
value = line(7)
plot(value, title="value")`;
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'value').values).toEqual(Array(12).fill(8));
  });

  it.each(families.flatMap((family) => [false, true].map((named) => ({ family, named }))))('retains cast identity and family-specific deleted availability for $family, named=$named', ({ family, named }) => {
    const creates: Record<string, string> = {
      table: 'table.new(position.top_right, 1, 1)',
      line: 'line.new(0, 1, 1, 2)',
      label: 'label.new(0, 1, "before")',
      box: 'box.new(0, 2, 1, 1)',
      linefill: 'linefill.new(first, secondHandle, color.red)',
    };
    const setup = family === 'linefill' ? 'var first = line.new(0, 1, 1, 2)\nvar secondHandle = line.new(0, 3, 1, 4)\n' : '';
    const source = `//@version=6
indicator("Deleted cast handle identity")
${setup}var created = ${creates[family]}
${family}.delete(created)
cast = ${family}(${named ? 'x=' : ''}created)
plot(array.indexof(array.from(created), cast), title="identity")
plot(na(cast) ? 0 : 1, title="present")`;
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'identity').values).toEqual(Array(12).fill(0));
    // https://www.tradingview.com/pine-script-docs/visuals/tables/#deleting-and-replacing-tables
    expect(getPlot(result, 'present').values).toEqual(Array(12).fill(family === 'table' ? 0 : 1));
    expect(result.drawings.filter((drawing) => drawing.type === family)).toEqual([]);
  });
});
