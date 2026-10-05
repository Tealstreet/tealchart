import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import { compatibilityBars, getPlot } from './fixtures';

const bars = compatibilityBars.slice(0, 4);

function values(body: string) {
  const program = parse(`//@version=6\nindicator("Arrow delimiter clause")\n${body}`);
  const execution = executeCompiledScript(program, bars);
  expect(execution.status).toBe('success');
  if (execution.status !== 'success') throw new Error(execution.reason);
  expect(execution.result.errors).toEqual([]);
  return getPlot(execution.result, 'Result').values;
}

// Reference entry45: => introduces user-function bodies and switch arms.
// https://www.tradingview.com/pine-script-docs/language/user-defined-functions/
// https://www.tradingview.com/pine-script-docs/language/conditional-structures/#switch-structure
describe('worklist1645 arrow delimiter', () => {
  it('introduces a single-expression user-function body', () => {
    expect(
      values(`transform(int value) => value * 3 + 1
plot(transform(bar_index + 4), "Result")`),
    ).toEqual([13, 16, 19, 22]);
  });

  it('introduces a multiline user-function body with its final expression result', () => {
    expect(
      values(`transform(int value) =>
    shifted = value + 2
    shifted * 5
plot(transform(bar_index + 4), "Result")`),
    ).toEqual([30, 35, 40, 45]);
  });

  it('introduces selector switch arms and their fallback', () => {
    expect(
      values(`selected = switch bar_index
    0 => -7
    1 => 11
    => 23
plot(selected, "Result")`),
    ).toEqual([-7, 11, 23, 23]);
  });

  it('introduces condition switch arms and their fallback', () => {
    expect(
      values(`selected = switch
    bar_index == 0 => 3
    bar_index < 3 => 5
    => 9
plot(selected, "Result")`),
    ).toEqual([3, 5, 5, 9]);
  });
});
