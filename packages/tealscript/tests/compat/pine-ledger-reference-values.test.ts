import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// series-history-na-v3#53/#58/#59/#60/#61/#304: typed missing values are distinct
// from defined enum members and allocated objects, including empty collections.
// https://www.tradingview.com/pine-script-docs/language/type-system/#na-value
// https://www.tradingview.com/pine-script-docs/language/enums/#using-enums
// The Maps manual's history example explicitly calls na(previous) on a map ID,
// settling predicate support despite the reference allowedTypeIDs omission:
// https://www.tradingview.com/pine-script-docs/language/maps/#history-referencing
describe('ledger: typed missing reference and enum values', () => {
  it.each([
    ['array', '', 'array<float>', 'array.new<float>()'],
    ['matrix', '', 'matrix<float>', 'matrix.new<float>()'],
    ['map', '', 'map<string, float>', 'map.new<string, float>()'],
    ['UDT', 'type Holder\n    float value', 'Holder', 'Holder.new(na)'],
  ])('keeps missing %s values distinct from defined controls and reassignment', (_name, header, type, defined) => {
    const source = `//@version=6
indicator("Missing reference values")
${header}
${type} absent = na
present = ${defined}
plot(na(absent) ? 1 : 0, title="Missing")
plot(na(present) ? 1 : 0, title="Defined")
absent := present
plot(na(absent) ? 1 : 0, title="Reassigned")
`;
    expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Missing').values).toEqual([1, 1, 1]);
    expect(getPlot(result, 'Defined').values).toEqual([0, 0, 0]);
    expect(getPlot(result, 'Reassigned').values).toEqual([0, 0, 0]);
  });

  it('an unavailable enum matches neither member and can be reassigned to each member', () => {
    const source = `//@version=6
indicator("Missing enum value")
enum Selection
    up
    down
classify(Selection value) =>
    switch value
        Selection.up => 11
        Selection.down => 22
        => 0
Selection absent = na
plot(classify(absent), title="Missing")
absent := Selection.up
plot(classify(absent), title="Up")
absent := Selection.down
plot(classify(absent), title="Down")
`;
    expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Missing').values).toEqual([0, 0, 0]);
    expect(getPlot(result, 'Up').values).toEqual([11, 11, 11]);
    expect(getPlot(result, 'Down').values).toEqual([22, 22, 22]);
  });
});
