import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { tryCompile } from '../../src/runtime/codegen/execute';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const invalidMessage = (value: string) => `Invalid argument '${value}' for 'type' in the 'ta.pivot_point_levels' function. Possible values: ['Camarilla', 'Traditional', 'DM', 'Classic', 'Fibonacci', 'Woodie']`;

describe('native bounds07 invalid pivot type runtime phase', () => {
  it.each(['INVALID', 'Unknown'])('compiles then refuses %s on the first bar', (value) => {
    // Native v3 bounds07 captures INVALID as a runtime error on bar0, not a compile refusal.
    const source = `//@version=6
indicator("Invalid pivot type")
plot(array.size(ta.pivot_point_levels("${value}", true, false)), "OUTCOME")`;
    expect(tryCompile(parse(source)).success).toBe(true);
    const result = runCompatScript(source);
    expect(result.errors.map((error) => error.message)).toEqual([invalidMessage(value)]);
    expect(result.profile.bars).toBe(1);
    expect(result.profile.swallowedErrors).toBeUndefined();
  });

  it('checks a series type when it becomes invalid', () => {
    const result = runCompatScript(`//@version=6
indicator("Series pivot type")
kind = bar_index == 1 ? "INVALID" : "Traditional"
plot(array.size(ta.pivot_point_levels(type=kind, anchor=true)), "OUTCOME")`);
    expect(result.errors.map((error) => error.message)).toEqual([invalidMessage('INVALID')]);
    expect(result.profile.bars).toBe(2);
    expect(getPlot(result, 'OUTCOME').values[0]).toBe(11);
  });

  it.each(['Camarilla', 'Traditional', 'DM', 'Classic', 'Fibonacci', 'Woodie'])('retains %s domain admission', (value) => {
    const result = runCompatScript(`//@version=6
indicator("Valid pivot type")
plot(array.size(ta.pivot_point_levels(type="${value}", anchor=true)), "OUTCOME")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'OUTCOME').values).toEqual(Array(compatibilityBars.length).fill(11));
  });
});
