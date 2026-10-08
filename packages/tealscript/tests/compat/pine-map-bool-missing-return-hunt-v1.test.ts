import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('bool map missing returns hunt', () => {
  for (const version of [5, 6]) for (const op of ['get', 'put', 'remove']) {
    it(`v${version} ${op}`, () => {
      const call = op === 'put' ? 'm.put("missing", true)' : `m.${op}("missing")`;
      const observe = version === 5 ? 'na(x)' : 'str.tostring(x) == "false"';
      const result = runCompatScript(`//@version=${version}
indicator("Bool map missing returns")
m = map.new<string, bool>()
m.put("known", true)
x = ${call}
plot(${observe} ? 1 : 0, "Result")
plot(m.get("known") ? 1 : 0, "Known")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Result').values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Known').values).toEqual([1, 1, 1]);
    });
  }
});

describe('map bool missing return controls', () => {
  for (const method of [false, true]) for (const kind of ['bool', 'int', 'float', 'string']) for (const op of ['get', 'put', 'remove']) {
    it(`method=${method} ${kind} ${op}`, () => {
      const seed = kind === 'bool' ? 'false' : kind === 'string' ? '"value"' : '7';
      const extra = op === 'put' ? `, ${seed}` : '';
      const call = method ? `m.${op}("target"${extra})` : `map.${op}(m, "target"${extra})`;
      const setup = kind === 'bool' ? 'm.put("target", false)' : '';
      const observe = kind === 'bool' ? 'str.tostring(x) == "false"' : 'na(x)';
      const result = runCompatScript(`//@version=6
indicator("Map return controls")
m = map.new<string, ${kind}>()
${setup}
x = ${call}
plot(${observe} ? 1 : 0, "Result")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Result').values).toEqual([1, 1, 1]);
    });
  }
});
