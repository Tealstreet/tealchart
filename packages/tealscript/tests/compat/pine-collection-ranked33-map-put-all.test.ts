import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Collection ranks 1281–1285: functions[696], methods[230] in the pinned
// Pine v6 reference. Map pair/order/storage policies have separate owners.
const header = '//@version=6\nindicator("put_all contracts")\n';
const declarations = 'left = map.new<string, int>()\nright = map.new<string, int>()\n';
const calls = [
  'map.put_all(left, right)',
  'map.put_all(id=left, id2=right)',
  'left.put_all(right)',
  'left.put_all(id2=right)',
] as const;

function errors(body: string) {
  return checkProgram(parse(header + body)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
}

describe('collection-ranked33 map.put_all reference clauses', () => {
  it('preserves a user method with the same spelling and a scalar argument', () => {
    expect(
      errors(`method put_all(map<string, int> self, int value) => value + 4
${declarations}left.put_all(17)
`),
    ).toEqual([]);
  });

  it('preserves unresolved UDF source arguments', () => {
    expect(
      errors(`mergeInto(map<string, int> target, source) => target.put_all(source)
${declarations}mergeInto(left, right)
`),
    ).toEqual([]);
  });

  for (const call of ['map.put_all(left, na)', 'left.put_all(id2=na)']) {
    it(`preserves missing-reference admission: ${call}`, () => {
      expect(errors(declarations + call)).toEqual([]);
    });
  }

  for (const call of calls) {
    it(`accepts both map arguments and mutates the destination: ${call}`, () => {
      const source = `${header}${declarations}
left.put("keep", 7)
right.put("new", 29)
right.put("other", 43)
${call}
plot(left.get("keep"), "Keep")
plot(left.get("new"), "New")
plot(left.get("other"), "Other")
plot(right.get("new"), "Source")
plot(right.get("other"), "SourceOther")
plot(left.size(), "Size")
`;
      expect(errors(source.slice(header.length))).toEqual([]);
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Keep').values).toEqual([7, 7, 7]);
      expect(getPlot(result, 'New').values).toEqual([29, 29, 29]);
      expect(getPlot(result, 'Other').values).toEqual([43, 43, 43]);
      expect(getPlot(result, 'Source').values).toEqual([29, 29, 29]);
      expect(getPlot(result, 'SourceOther').values).toEqual([43, 43, 43]);
      expect(getPlot(result, 'Size').values).toEqual([3, 3, 3]);
    });

    it(`refuses assignment of the void result: ${call}`, () => {
      expect(
        errors(`${declarations}result = ${call}\n`).some((diagnostic) => /void|no value/i.test(diagnostic.message)),
      ).toBe(true);
    });
  }

  for (const [kind, value, expected] of [
    ['int', '17', '17'],
    ['float', '2.5', '2.5'],
    ['bool', 'true', 'true'],
    ['string', '"value"', '"value"'],
  ] as const) {
    it(`accepts ${kind}-valued maps as receiver and source`, () => {
      const body = `left = map.new<string, ${kind}>()
right = map.new<string, ${kind}>()
right.put("key", ${value})
left.put_all(id2=right)
plot(left.get("key") == ${expected} ? 1 : 0, "Result")
`;
      expect(errors(body)).toEqual([]);
      const result = runCompatScript(header + body, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Result').values).toEqual([1]);
    });
  }

  const nonMaps = ['3', '1.5', 'true', '"scalar"', 'array.new<int>()', 'matrix.new<int>(1, 1, 0)'] as const;
  for (const value of nonMaps) {
    for (const call of [
      `map.put_all(left, ${value})`,
      `map.put_all(id=left, id2=${value})`,
      `left.put_all(${value})`,
      `left.put_all(id2=${value})`,
    ]) {
      it(`refuses a non-map source: ${call}`, () => {
        expect(errors(declarations + call).some((diagnostic) => /map|id2/i.test(diagnostic.message))).toBe(true);
      });
    }
    for (const call of [`map.put_all(${value}, right)`, `map.put_all(id=${value}, id2=right)`]) {
      it(`refuses a non-map destination: ${call}`, () => {
        expect(errors(declarations + call).some((diagnostic) => /map|id/i.test(diagnostic.message))).toBe(true);
      });
    }
  }

  for (const call of ['map.put_all()', 'map.put_all(left)', 'map.put_all(id2=right)', 'left.put_all()']) {
    it(`requires both map IDs: ${call}`, () => {
      expect(
        errors(declarations + call).some((diagnostic) => /required|expects at least/i.test(diagnostic.message)),
      ).toBe(true);
    });
  }
});
