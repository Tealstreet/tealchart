import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Rank375: collection variables store reference IDs; assignment does not copy.
// https://www.tradingview.com/pine-script-docs/language/type-system/#reference-types
describe('Pine matrix reference identity', () => {
  it('typed alias shares both mutation directions while a new container stays independent', () => {
    const source = `//@version=6
indicator("matrix reference IDs")
original = matrix.new<int>(1, 2, 17)
matrix<int> alias = original
independent = matrix.new<int>(1, 2, 17)
alias.set(0, 0, 29)
original.set(0, 1, 43)
plot(original.get(0, 0), "P0")
plot(alias.get(0, 1), "P1")
plot(independent.get(0, 0), "P2")
plot(independent.get(0, 1), "P3")`;
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'P0').values).toEqual(Array(compatibilityBars.length).fill(29));
    expect(getPlot(result, 'P1').values).toEqual(Array(compatibilityBars.length).fill(43));
    expect(getPlot(result, 'P2').values).toEqual(Array(compatibilityBars.length).fill(17));
    expect(getPlot(result, 'P3').values).toEqual(Array(compatibilityBars.length).fill(17));
  });

  it('UDF parameter retains the reference through a local alias', () => {
    const source = `//@version=6
indicator("matrix reference IDs")
mutate(matrix<int> target) =>
    matrix<int> alias = target
    alias.set(0, 0, 29)
    target.get(0, 0)
original = matrix.new<int>(1, 2, 17)
result = mutate(original)
plot(original.get(0, 0), "P0")
plot(result, "P1")`;
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'P0').values).toEqual(Array(compatibilityBars.length).fill(29));
    expect(getPlot(result, 'P1').values).toEqual(Array(compatibilityBars.length).fill(29));
  });

  it('UDF return transports the original reference', () => {
    const source = `//@version=6
indicator("matrix reference IDs")
forward(matrix<int> target) =>
    matrix<int> alias = target
    alias
original = matrix.new<int>(1, 2, 17)
matrix<int> alias = forward(original)
alias.set(0, 0, 29)
plot(original.get(0, 0), "P0")
plot(alias.get(0, 0), "P1")`;
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'P0').values).toEqual(Array(compatibilityBars.length).fill(29));
    expect(getPlot(result, 'P1').values).toEqual(Array(compatibilityBars.length).fill(29));
  });
});
