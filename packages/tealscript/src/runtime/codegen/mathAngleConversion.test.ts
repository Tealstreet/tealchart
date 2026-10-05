import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeCompiledScript } from './execute';

function angleValue(expression: string, version = 6, prefix = '') {
  const declaration = version === 4 ? 'study' : 'indicator';
  const ast = parse(`//@version=${version}\n${declaration}("angles")\n${prefix}plot(${expression}, title="angle")`);
  expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  const result = executeCompiledScript(ast, [{ time: 1700000040000, open: 1, high: 2, low: 0, close: 1, volume: 100 }]);
  if (result.status !== 'success') throw new Error(JSON.stringify(result));
  expect(result.result.errors).toEqual([]);
  return result.result.plots[0]!.values[0];
}

describe('angle conversion scalar values', () => {
  it.each([
    [1.5, 0.02617993877991494],
    [-1.5, -0.02617993877991494],
    [0.75, 0.01308996938995747],
    [-0.75, -0.01308996938995747],
  ])('converts %s degrees with the full scalar precision', (degrees, expected) => {
    expect(angleValue(`math.toradians(${degrees})`)).toBe(expected);
  });

  it('binds the named number parameter', () => {
    expect(angleValue('math.toradians(number=1.5)')).toBe(0.02617993877991494);
  });

  it('dispatches the legacy global call', () => {
    expect(angleValue('toradians(1.5)', 4)).toBe(0.02617993877991494);
  });

  it('keeps zero', () => {
    expect(angleValue('math.toradians(0)')).toBe(0);
  });

  it('keeps a missing input missing', () => {
    expect(angleValue('math.toradians(float(na))')).toBeNull();
  });

  it('preserves the degree conversion', () => {
    expect(angleValue('math.todegrees(1.5)')).toBe(85.94366926962348);
  });

  it('preserves a local function with the same spelling', () => {
    expect(angleValue('toradians(1.5)', 6, 'toradians(number) => number + 1\n')).toBe(2.5);
  });
});
