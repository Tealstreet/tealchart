import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Tables manual: collections referencing deleted tables store na.
// Maps manual: map.values retains the original reference-type elements.
describe('deleted table references in map.values arrays', () => {
  it('retains the independent verifier namespace reproducer', () => {
    const source = `//@version=6
indicator("Map values table identity")
var t = table.new(position.top_left, 1, 1)
refs = map.new<string, table>()
map.put(refs, "key", t)
values = map.values(refs)
if bar_index == 1
    table.delete(t)
plot(na(t) ? 1 : 0, "direct")
plot(na(map.get(refs, "key")) ? 1 : 0, "map")
plot(na(array.get(values, 0)) ? 1 : 0, "values")`;
    expect(checkProgram(parse(source)).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
    expect(result.errors).toEqual([]);
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
    for (const title of ['direct', 'map', 'values']) {
      expect(getPlot(result, title).values).toEqual([0, 1, 1]);
    }
  });

  for (const method of [false, true]) {
    for (const route of ['direct', 'typed return', 'generic return'] as const) {
      it(`${method ? 'method' : 'namespace'} values preserve ${route} references and ordinary strings`, () => {
        const tablesRead = method ? 'refs.values()' : 'map.values(refs)';
        const textsRead = method ? 'texts.values()' : 'map.values(texts)';
        const keysRead = method ? 'refs.keys()' : 'map.keys(refs)';
        const value = route === 'direct' ? tablesRead : 'tableValues(refs)';
        const declaration =
          route === 'typed return'
            ? `tableValues(map<string, table> source) => ${method ? 'source.values()' : 'map.values(source)'}`
            : route === 'generic return'
              ? 'tableValues(source) => map.values(source)'
              : '';
        const source = `//@version=6
indicator("Map value reference isolation")
${declaration}
missing(value) => na(value)
var t = table.new(position.top_left, 1, 1)
refs = map.new<string, table>()
map.put(refs, "table_table.new_0_0", t)
texts = map.new<string, string>()
map.put(texts, "key", "table_table.new_0_0")
values = ${value}
alias = values
copy = array.copy(values)
textValues = ${textsRead}
keys = ${keysRead}
if bar_index == 1
    table.delete(t)
plot(na(t) ? 1 : 0, "direct")
plot(na(array.get(values, 0)) ? 1 : 0, "values")
plot(na(array.get(alias, 0)) ? 1 : 0, "alias")
plot(na(array.get(copy, 0)) ? 1 : 0, "copy")
plot(missing(array.get(values, 0)) ? 1 : 0, "generic reference")
plot(na(array.get(textValues, 0)) ? 1 : 0, "text")
plot(missing(array.get(textValues, 0)) ? 1 : 0, "generic text")
plot(na(array.get(keys, 0)) ? 1 : 0, "key")
plot(missing(array.get(keys, 0)) ? 1 : 0, "generic key")`;
        expect(checkProgram(parse(source)).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
        const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
        expect(result.errors).toEqual([]);
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        for (const title of ['direct', 'values', 'alias', 'copy', 'generic reference']) {
          expect(getPlot(result, title).values).toEqual([0, 1, 1]);
        }
        for (const title of ['text', 'generic text', 'key', 'generic key']) {
          expect(getPlot(result, title).values).toEqual([0, 0, 0]);
        }
      });
    }
  }

  for (const method of [false, true]) {
    it(`${method ? 'method' : 'namespace'} deletion preserves map values through nested generic calls`, () => {
      const source = `//@version=6
indicator("Nested map value reference isolation")
elementMissing(values) => na(array.get(values, 0))
mapMissing(source) => elementMissing(map.values(source))
var t = table.new(position.top_left, 1, 1)
refs = map.new<string, table>()
map.put(refs, "key", t)
texts = map.new<string, string>()
map.put(texts, "key", "table_table.new_0_0")
if bar_index == 1
    ${method ? 't.delete()' : 'table.delete(t)'}
plot(na(t) ? 1 : 0, "direct")
plot(mapMissing(refs) ? 1 : 0, "reference")
plot(mapMissing(texts) ? 1 : 0, "text")`;
      expect(checkProgram(parse(source)).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'direct').values).toEqual([0, 1, 1]);
      expect(getPlot(result, 'reference').values).toEqual([0, 1, 1]);
      expect(getPlot(result, 'text').values).toEqual([0, 0, 0]);
    });
  }

  // Existing custom-method binding stays separate from the namespace builtin.
  for (const method of [false, true]) {
    it(`${method ? 'method' : 'namespace'} delete preserves map values overload binding`, () => {
      const source = `//@version=6
indicator("Map values overload")
method values(map<string, table> data) => array.from("table_table.new_0_0")
var t = table.new(position.top_left, 1, 1)
refs = map.new<string, table>()
map.put(refs, "key", t)
if bar_index == 1
    ${method ? 't.delete()' : 'table.delete(t)'}
plot(na(array.get(refs.values(), 0)) ? 1 : 0, "custom text")
plot(na(array.get(map.values(refs), 0)) ? 1 : 0, "builtin table")`;
      expect(checkProgram(parse(source)).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      expect(getPlot(result, 'custom text').values).toEqual([0, 0, 0]);
      expect(getPlot(result, 'builtin table').values).toEqual([0, 1, 1]);
    });
  }
});
