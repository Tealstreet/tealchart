import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Maps manual: key templates accept value types; value templates constrain values.
describe('Map declaration templates and value-type keys', () => {
  const keys = [
    { kind: 'int', value: '-7' },
    { kind: 'float', value: '-1.25' },
    { kind: 'bool', value: 'false' },
    { kind: 'string', value: '"signed"' },
    { kind: 'color', value: 'color.red' },
    { kind: 'Direction', value: 'Direction.down' },
  ];

  for (const version of [5, 6]) {
    const source = (body: string) => `//@version=${version}
indicator("Map declaration types")
enum Direction
    up
    down
${body}`;

    for (const key of keys) {
      it(`v${version} executes map<${key.kind}, float> with one replaced pair`, () => {
        const script = source(`map<${key.kind}, float> prices = map.new<${key.kind}, float>()
prices.put(${key.value}, 17.25)
displaced = prices.put(${key.value}, -5.5)
plot(displaced, "Displaced")
plot(prices.get(${key.value}), "Stored")
plot(prices.size(), "Size")`);
        expect(checkProgram(parse(script)).diagnostics).toEqual([]);
        const result = runCompatScript(script, { bars: compatibilityBars.slice(0, 2) });
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        expect(getPlot(result, 'Displaced').values).toEqual([17.25, 17.25]);
        expect(getPlot(result, 'Stored').values).toEqual([-5.5, -5.5]);
        expect(getPlot(result, 'Size').values).toEqual([1, 1]);
      });
    }

    it(`v${version} refuses a conflicting initializer key template`, () => {
      const result = checkProgram(parse(source('map<string, float> prices = map.new<int, float>()')));
      expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([
        expect.objectContaining({ code: 'type-mismatch' }),
      ]);
    });

    for (const kind of ['label', 'line', 'Cell']) {
      it(`v${version} refuses reference key type ${kind}`, () => {
        const result = checkProgram(parse(source(`type Cell
    int value
map<${kind}, float> prices = na`)));
        expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([
          expect.objectContaining({ code: 'invalid-type-template' }),
        ]);
      });
    }
  }
});
