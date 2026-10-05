import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const source = (body: string) => `//@version=6\nindicator("Map nesting")\n${body}`;
const errors = (body: string) => checkProgram(parse(source(body))).diagnostics.filter((d) => d.severity === 'error');

// https://www.tradingview.com/pine-script-docs/language/maps/#maps-of-other-collections
// Rank 756 permits collection fields on a UDT value, but rejects direct map values.
describe('worklist 756 map collection values', () => {
  for (const valueType of ['array<float>', 'matrix<float>', 'map<string, float>']) {
    it(`refuses inferred map.new<string, ${valueType}>`, () => {
      expect(errors(`values = map.new<string, ${valueType}>()`)).toEqual([
        expect.objectContaining({
          code: 'invalid-type-template',
          message: expect.stringContaining('Invalid map value type'),
        }),
      ]);
    });
    it(`refuses an annotated map with ${valueType} values`, () => {
      expect(errors(`map<string, ${valueType}> values = na`)).toEqual([
        expect.objectContaining({
          code: 'invalid-type-template',
          message: expect.stringContaining('Invalid map value type'),
        }),
      ]);
    });
  }

  it('retains a UDT wrapper containing all three collection families', () => {
    const script = source(`type Values
    array<float> samples
    matrix<float> cells
    map<string, float> keyed
samples = array.from(close)
cells = matrix.new<float>(1, 1, close + 1)
keyed = map.new<string, float>()
keyed.put("price", close + 2)
wrapped = Values.new(samples, cells, keyed)
values = map.new<string, Values>()
values.put("bar", wrapped)
selected = values.get("bar")
plot(selected.samples.get(0), title="Array")
plot(selected.cells.get(0, 0), title="Matrix")
plot(selected.keyed.get("price"), title="Map")`);
    expect(checkProgram(parse(script)).diagnostics).toEqual([]);
    const result = runCompatScript(script);
    expect(result.errors).toEqual([]);
    for (const [title, offset] of [
      ['Array', 0],
      ['Matrix', 1],
      ['Map', 2],
    ] as const) {
      expect(getPlot(result, title).values).toEqual(compatibilityBars.map((bar) => bar.close + offset));
    }
  });

  it('retains ordinary scalar map values', () => {
    expect(errors('values = map.new<string, float>()\nvalues.put("price", close)')).toEqual([]);
  });
});
