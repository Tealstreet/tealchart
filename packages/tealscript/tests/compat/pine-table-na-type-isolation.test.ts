import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const cases = [
  {
    name: 'literal and named operand',
    setup: '',
    declarations: '',
    reads: ['"table_table.new_0_0"', 'x="table_table.new_0_0"'],
  },
  {
    name: 'scalar aliases and history',
    declarations: '',
    setup: 'var string text = "table_table.new_0_0"\nalias = text',
    reads: ['text', 'alias', 'alias[0]'],
  },
  {
    name: 'array and map string values',
    declarations: '',
    setup:
      'texts = array.from("table_table.new_0_0")\nrefs = map.new<string, string>()\nmap.put(refs, "key", "table_table.new_0_0")',
    reads: ['array.get(texts, 0)', 'map.get(refs, "key")'],
  },
  {
    name: 'object string fields',
    declarations: 'type Holder\n    string value',
    setup: 'holder = Holder.new("table_table.new_0_0")',
    reads: ['holder.value'],
  },
  {
    name: 'typed and generic string returns',
    declarations: 'typed(string value) => value\ngeneric(value) => value',
    setup: '',
    reads: ['typed("table_table.new_0_0")', 'generic("table_table.new_0_0")'],
  },
] as const;

describe('table na type isolation', () => {
  for (const method of [false, true]) {
    for (const test of cases) {
      it(`${method ? 'method' : 'namespace'} deletion preserves ${test.name}`, () => {
        const result = runCompatScript(
          `//@version=6
indicator("Table string isolation")
${test.declarations}
var t = table.new(position.top_left, 1, 1)
${test.setup}
if bar_index == 1
    ${method ? 't.delete()' : 'table.delete(t)'}
plot(na(t) ? 1 : 0, "table")
${test.reads.map((read, index) => `plot(na(${read}) ? 1 : 0, "text${index}")`).join('\n')}
plot(na("unrelated") ? 1 : 0, "control")`,
          { bars: compatibilityBars.slice(0, 3) },
        );
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'table').values).toEqual([0, 1, 1]);
        for (let index = 0; index < test.reads.length; index++) {
          expect(getPlot(result, `text${index}`).values).toEqual([0, 0, 0]);
        }
        expect(getPlot(result, 'control').values).toEqual([0, 0, 0]);
      });
    }
    it(`${method ? 'method' : 'namespace'} deletion preserves custom-method table returns`, () => {
      const result = runCompatScript(
        `//@version=6
indicator("Method table isolation")
method tableIdentity(table value) => value
method textIdentity(string value) => value
var t = table.new(position.top_left, 1, 1)
stringValue = "table_table.new_0_0"
if bar_index == 1
    ${method ? 't.delete()' : 'table.delete(t)'}
plot(na(t.tableIdentity()) ? 1 : 0, "table")
plot(na(stringValue.textIdentity()) ? 1 : 0, "text")`,
        { bars: compatibilityBars.slice(0, 3) },
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'table').values).toEqual([0, 1, 1]);
      expect(getPlot(result, 'text').values).toEqual([0, 0, 0]);
    });
    it(`${method ? 'method' : 'namespace'} deletion preserves polymorphic na operands`, () => {
      const result = runCompatScript(
        `//@version=6
indicator("Polymorphic table isolation")
missing(value) => na(value)
aliasMissing(value) =>
    alias = value
    missing(alias)
elementMissing(values) => na(array.get(values, 0))
fieldMissing(holder) => na(holder.value)
pair(value) => [value, "table_table.new_0_0"]
type Holder
    table value
type TextHolder
    string value
var t = table.new(position.top_left, 1, 1)
if bar_index == 1
    ${method ? 't.delete()' : 'table.delete(t)'}
[tupleTable, tupleText] = pair(t)
conditionalTable = if bar_index >= 0
    t
else
    t
plot(na(tupleTable) ? 1 : 0, "tupleTable")
plot(na(tupleText) ? 1 : 0, "tupleText")
plot(na(conditionalTable) ? 1 : 0, "conditionalTable")
plot(missing(t) ? 1 : 0, "table")
plot(aliasMissing(t) ? 1 : 0, "aliasTable")
plot(elementMissing(array.from(t)) ? 1 : 0, "arrayTable")
plot(fieldMissing(Holder.new(t)) ? 1 : 0, "fieldTable")
plot(missing("table_table.new_0_0") ? 1 : 0, "text")
plot(aliasMissing("table_table.new_0_0") ? 1 : 0, "aliasText")
plot(elementMissing(array.from("table_table.new_0_0")) ? 1 : 0, "arrayText")
plot(fieldMissing(TextHolder.new("table_table.new_0_0")) ? 1 : 0, "fieldText")
plot(missing(7) ? 1 : 0, "number")
plot(missing(float(na)) ? 1 : 0, "missingNumber")`,
        { bars: compatibilityBars.slice(0, 3) },
      );
      expect(result.errors).toEqual([]);
      for (const title of ['table', 'aliasTable', 'arrayTable', 'fieldTable', 'tupleTable', 'conditionalTable']) {
        expect(getPlot(result, title).values).toEqual([0, 1, 1]);
      }
      for (const title of ['text', 'aliasText', 'arrayText', 'fieldText', 'number', 'tupleText']) {
        expect(getPlot(result, title).values).toEqual([0, 0, 0]);
      }
      expect(getPlot(result, 'missingNumber').values).toEqual([1, 1, 1]);
    });
  }
});
