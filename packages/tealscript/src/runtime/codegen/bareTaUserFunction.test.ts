import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeCompiled, tryCompile } from './execute';
import { createSyntheticBars } from '../../../scripts/run-external-pine-corpus';
const bars = createSyntheticBars(32);
function values(source: string) {
  const ast = parse(source);
  expect(checkProgram(ast).diagnostics.filter(d => d.severity === 'error')).toEqual([]);
  const compiled = tryCompile(ast);
  expect(compiled.unsupported).toEqual([]);
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, bars)!;
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.firstMessage).toBeUndefined();
  return result.plots.map(plot => plot.values);
}
describe('bare namespace-named user functions', () => {
  for (const version of [5, 6]) {
    for (const name of ['ta', 'array', 'map', 'matrix', 'line', 'box', 'label', 'table', 'math']) {
      for (const body of ['x + 1', 'ta.sma(x, 3)']) {
        it(`v${version} ${name} returns ${body}`, () => {
          const script = (identifier: string) => `//@version=${version}\nindicator("bare UDF")\n${identifier}(x) => ${body}\nplot(${identifier}(close))`;
          const expected = values(script('fresh'));
          expect(values(script(name))).toEqual(expected);
          if (body === 'x + 1') expect(expected[0]).toEqual(bars.map(bar => bar.close + 1));
          else expect(expected[0].slice(2).every(value => typeof value === 'number' && Number.isFinite(value))).toBe(true);
        });
      }
    }
  }
});
