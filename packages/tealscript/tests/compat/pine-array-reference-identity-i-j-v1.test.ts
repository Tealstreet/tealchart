import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Rank374: collection variables store reference IDs; assignment does not copy.
// https://www.tradingview.com/pine-script-docs/language/type-system/#reference-types
describe('Pine array reference identity', () => {
  it('typed alias shares both mutation directions while a new container stays independent', () => {
    const source = `//@version=6
indicator("array reference IDs")
original = array.from(17, -8)
array<int> alias = original
independent = array.from(17, -8)
alias.set(0, 29)
original.set(1, 43)
plot(original.get(0), "P0")
plot(alias.get(1), "P1")
plot(independent.get(0), "P2")
plot(independent.get(1), "P3")`;
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'P0').values).toEqual(Array(compatibilityBars.length).fill(29));
    expect(getPlot(result, 'P1').values).toEqual(Array(compatibilityBars.length).fill(43));
    expect(getPlot(result, 'P2').values).toEqual(Array(compatibilityBars.length).fill(17));
    expect(getPlot(result, 'P3').values).toEqual(Array(compatibilityBars.length).fill(-8));
  });

  it('UDF parameter retains the reference through a local alias', () => {
    const source = `//@version=6
indicator("array reference IDs")
mutate(array<int> target) =>
    array<int> alias = target
    alias.set(0, 29)
    target.get(0)
original = array.from(17, -8)
result = mutate(original)
plot(original.get(0), "P0")
plot(result, "P1")`;
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'P0').values).toEqual(Array(compatibilityBars.length).fill(29));
    expect(getPlot(result, 'P1').values).toEqual(Array(compatibilityBars.length).fill(29));
  });

  it('UDF return transports the original reference', () => {
    const source = `//@version=6
indicator("array reference IDs")
forward(array<int> target) =>
    array<int> alias = target
    alias
original = array.from(17, -8)
array<int> alias = forward(original)
alias.set(0, 29)
plot(original.get(0), "P0")
plot(alias.get(0), "P1")`;
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = runCompatScript(source);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'P0').values).toEqual(Array(compatibilityBars.length).fill(29));
    expect(getPlot(result, 'P1').values).toEqual(Array(compatibilityBars.length).fill(29));
  });
});
