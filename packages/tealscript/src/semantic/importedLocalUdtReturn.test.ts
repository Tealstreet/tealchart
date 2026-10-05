import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from '../../tests/compat/fixtures';
import { parse } from '../parser';
import { checkProgram } from './checker';

const authority = 'https://www.tradingview.com/pine-script-docs/v5/concepts/libraries/#user-defined-types-and-objects';
const libraryBody = `library("Themes")
export type Theme
    float n
export direct() => Theme.new(7)
export local() =>
    Theme value = Theme.new(7)
    value
export conditional(bool choose) =>
    Theme value = Theme.new(choose ? 7 : 9)
    if choose
        value
    else
        value
export arrayLocal() =>
    array<Theme> items = array.new<Theme>(1, Theme.new(7))
    items
export matrixLocal() =>
    matrix<Theme> items = matrix.new<Theme>(1, 1, Theme.new(7))
    items
export mapLocal() =>
    map<string, Theme> items = map.new<string, Theme>()
    items.put("main", Theme.new(7))
    items
export method duplicate(Theme this) =>
    Theme value = Theme.new(this.n)
    value
`;

function check(body: string, version = 5) {
  const library = parse(`//@version=${version}\n${libraryBody}`);
  return checkProgram(parse(`//@version=${version}\nindicator("Imported return identity")\nimport Example/Themes/1 as viz\n${body}\n`), {
    libraries: new Map([['Example/Themes/1', library], ['Example/Other/1', library]]),
  }).diagnostics.filter(diagnostic => diagnostic.severity === 'error');
}

describe(`imported local UDT return identity [${authority}]`, () => {
  it.each([5, 6])('qualifies a returned local Theme in v%s', version => {
    expect(check('viz.Theme value = viz.local()\nplot(value.n)', version)).toEqual([]);
  });

  it.each([
    ['conditional tail', 'viz.Theme value = viz.conditional(true)\nplot(value.n)'],
    ['array', 'array<viz.Theme> items = viz.arrayLocal()\nplot(items.get(0).n)'],
    ['matrix', 'matrix<viz.Theme> items = viz.matrixLocal()\nplot(items.get(0, 0).n)'],
    ['map', 'map<string, viz.Theme> items = viz.mapLocal()\nplot(items.get("main").n)'],
    ['method', 'viz.Theme original = viz.Theme.new(7)\nviz.Theme value = original.duplicate()\nplot(value.n)'],
  ])('qualifies the local UDT identity in a %s result', (_name, body) => {
    expect(check(body)).toEqual([]);
  });

  it('preserves a direct imported constructor return', () => {
    expect(check('viz.Theme value = viz.direct()\nplot(value.n)')).toEqual([]);
  });

  it('preserves a caller-side imported constructor', () => {
    expect(check('viz.Theme value = viz.Theme.new(7)\nplot(value.n)')).toEqual([]);
  });

  it('keeps a same-named caller type distinct', () => {
    expect(check('type Theme\n    float n\nTheme value = viz.Theme.new(7)\nplot(value.n)'))
      .toContainEqual(expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('viz.Theme') }));
  });

  it('keeps primitive result assignments incompatible', () => {
    expect(check('float value = viz.Theme.new(7)\nplot(value)'))
      .toContainEqual(expect.objectContaining({ code: 'type-mismatch' }));
  });

  it('keeps same-named exported types from different libraries distinct', () => {
    expect(check('import Example/Other/1 as peer\nviz.Theme value = peer.Theme.new(7)\nplot(value.n)'))
      .toContainEqual(expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('peer.Theme') }));
  });

  it.each([5, 6])('executes an imported local UDT return in v%s', version => {
    const library = parse(`//@version=${version}\n${libraryBody}`);
    const libraries = new Map([['Example/Themes/1', library]]);
    const source = `//@version=${version}\nindicator("Imported local result")\nimport Example/Themes/1 as viz\nviz.Theme value = viz.local()\nplot(value.n, title="Value")\n`;
    expect(checkProgram(parse(source), { libraries }).diagnostics.filter(diagnostic => diagnostic.severity === 'error')).toEqual([]);
    const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3), engineOptions: { libraries } });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Value').values).toEqual([7, 7, 7]);
  });

  it('retains the non-exported UDT return guard', () => {
    const library = parse('//@version=5\nlibrary("Hidden")\ntype Theme\n    float n\nexport local() =>\n    Theme value = Theme.new(7)\n    value\n');
    expect(checkProgram(library).diagnostics).toContainEqual(expect.objectContaining({
      code: 'library-export',
      message: expect.stringContaining('non-exported user-defined type: Theme'),
    }));
  });
});
