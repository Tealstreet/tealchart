import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('selected missing standardize shape reuses native policy', () => {
  for (const method of [false, true]) {
    it(`method=${method}`, () => {
      const call = method ? 's.standardize()' : 'array.standardize(id=s)';
      const result = runCompatScript(`//@version=6
indicator("Missing slice standardize")
a = array.from(101.0, float(na), float(na), float(na), -103.0)
s = a.slice(1, 4)
b = ${call}
plot(b.size(), "BeforeSize")
${Array.from({ length: 3 }, (_, i) => `plot(na(b.get(${i})) ? 1 : 0, "Missing${i}")`).join('\n')}
b.set(1, 71.0)
b.push(97.0)
plot(b.get(1), "Replacement")
plot(b.get(3), "Tail")
plot(b.size(), "ResultSize")
plot(a.get(0), "Left")
plot(a.get(4), "Right")
${Array.from({ length: 3 }, (_, i) => `plot(na(a.get(${i + 1})) ? 1 : 0, "SourceMissing${i}")`).join('\n')}
plot(a.size(), "ParentSize")
plot(s.size(), "SliceSize")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const name of ['Missing0', 'Missing1', 'Missing2', 'SourceMissing0', 'SourceMissing1', 'SourceMissing2']) {
        expect(getPlot(result, name).values).toEqual([1, 1, 1]);
      }
      for (const [name, value] of [['BeforeSize', 3], ['Replacement', 71], ['Tail', 97], ['ResultSize', 4], ['Left', 101], ['Right', -103], ['ParentSize', 5], ['SliceSize', 3]] as const) {
        expect(getPlot(result, name).values).toEqual([value, value, value]);
      }
    });
  }
});
