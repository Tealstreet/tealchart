import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Expected values follow the frozen reference clauses: zero-based indexing,
// empty median = na, and half-open fill bounds. Numeric truthiness is only a
// v5 migration control: native v6 CF003 conflicts with the frozen reference
// prose for ranks 963/964; its v6 refusal guard belongs to codex-776dnu.
function run(body: string, version = 6) {
  const source = `//@version=${version}\nindicator("Ledger 25 collections")\n${body}`;
  expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const result = runCompatScript(source, { bars: [compatibilityBars[0]!] });
  expect(result.errors).toEqual([]);
  return result;
}

describe('ledger gaps 25 collection contracts', () => {
  it('rank 962: linefill array index zero selects the first independently stored ID', () => {
    const result = run(`
a = line.new(0, 11, 1, 12)
b = line.new(0, 13, 1, 14)
c = line.new(0, 21, 1, 22)
d = line.new(0, 23, 1, 24)
first = linefill.new(a, b, color.red)
second = linefill.new(c, d, color.blue)
ids = array.new_linefill(2, first)
array.set(ids, 1, second)
plot(line.get_y1(linefill.get_line1(array.get(ids, 0))), "First")
plot(line.get_y1(linefill.get_line1(array.get(ids, 1))), "Second")
plot(array.size(ids), "Size")
`);
    expect(getPlot(result, 'First').values).toEqual([11]);
    expect(getPlot(result, 'Second').values).toEqual([21]);
    expect(getPlot(result, 'Size').values).toEqual([2]);
  });

  it('rank 967: color array index zero remains the first element after changing index one', () => {
    const result = run(`
colors = array.new_color(2, color.rgb(17, 31, 47))
array.set(colors, 1, color.rgb(53, 71, 89))
plot(color.r(array.get(colors, 0)), "First")
plot(color.r(array.get(colors, 1)), "Second")
`);
    expect(getPlot(result, 'First').values).toEqual([17]);
    expect(getPlot(result, 'Second').values).toEqual([53]);
  });

  for (const method of [false, true]) {
    it(`rank ${method ? 964 : 963} partial: v6 boolean every admits both forms`, () => {
      const call = (id: string) => (method ? `${id}.every()` : `array.every(${id})`);
      const result = run(`
allTrue = array.from(true, true)
withFalse = array.from(true, false)
plot(${call('allTrue')} ? 1 : 0, "All True")
plot(${call('withFalse')} ? 1 : 0, "With False")
`);
      expect(getPlot(result, 'All True').values).toEqual([1]);
      expect(getPlot(result, 'With False').values).toEqual([0]);
    });
  }

  for (const method of [false, true]) {
    for (const kind of ['int', 'float']) {
      it(`rank ${method ? 964 : 963}: ${kind} v5 migration control ${method ? 'receiver' : 'namespace'} every treats zero as false and negative values as true`, () => {
        const values = kind === 'int' ? '-3, 4' : '-0.5, 0.25';
        const withZero = kind === 'int' ? '-3, 0' : '-0.5, 0.0';
        const call = (id: string) => (method ? `${id}.every()` : `array.every(${id})`);
        const result = run(
          `
nonzero = array.from(${values})
withZero = array.from(${withZero})
plot(${call('nonzero')} ? 1 : 0, "Nonzero")
plot(${call('withZero')} ? 1 : 0, "Zero")
`,
          5,
        );
        expect(getPlot(result, 'Nonzero').values).toEqual([1]);
        expect(getPlot(result, 'Zero').values).toEqual([0]);
      });
    }
  }

  for (const method of [false, true]) {
    for (const kind of ['int', 'float']) {
      const rank = (method ? 996 : 994) + (kind === 'float' ? 1 : 0);
      it(`rank ${rank}: empty ${kind} median is missing through ${method ? 'receiver' : 'namespace'} form`, () => {
        const call = method ? 'values.median()' : 'array.median(values)';
        const result = run(`
values = array.new_${kind}()
plot(${call}, "Median")
plot(na(${call}) ? 1 : 0, "Missing")
`);
        expect(getPlot(result, 'Median').values).toEqual([null]);
        expect(getPlot(result, 'Missing').values).toEqual([1]);
      });
    }
  }

  for (const method of [false, true]) {
    it(`rank 1000: ${method ? 'receiver' : 'namespace'} fill includes the lower bound and excludes the upper`, () => {
      const call = method ? 'values.fill(7, 1, 3)' : 'array.fill(values, 7, 1, 3)';
      const result = run(`
values = array.from(10, 20, 30, 40)
${call}
plot(values.get(0), "Before")
plot(values.get(1), "Lower")
plot(values.get(2), "Inside")
plot(values.get(3), "Upper")
`);
      expect(['Before', 'Lower', 'Inside', 'Upper'].map((name) => getPlot(result, name).values[0])).toEqual([
        10, 7, 7, 40,
      ]);
    });
  }
});
