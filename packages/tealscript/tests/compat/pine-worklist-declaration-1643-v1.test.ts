import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import { compatibilityBars, getPlot } from './fixtures';

const bars = compatibilityBars.slice(0, 4);

function run(body: string) {
  const program = parse(`//@version=6\nindicator("Declaration clause")\n${body}`);
  const execution = executeCompiledScript(program, bars);
  expect(execution.status).toBe('success');
  if (execution.status !== 'success') throw new Error(execution.reason);
  expect(execution.result.errors).toEqual([]);
  return { program, result: execution.result };
}

// Operators manual: = declares and initializes; := reassigns an existing variable.
// Reference entry29's := signature is ARCHIVE-SIGNATURE-ERROR by overseer ruling.
// https://www.tradingview.com/pine-script-docs/language/operators/#-assignment-operator
describe('worklist1643 initial declaration', () => {
  it('declares a scalar from its initializer before a separate reassignment', () => {
    const { program, result } = run(`value = bar_index + 7
plot(value, "Initial")
value := value + 2
plot(value, "Reassigned")`);
    expect(program.body.map((statement) => statement.type)).toEqual([
      'IndicatorDeclaration',
      'VariableDeclaration',
      'ExpressionStatement',
      'AssignmentStatement',
      'ExpressionStatement',
    ]);
    expect(getPlot(result, 'Initial').values).toEqual([7, 8, 9, 10]);
    expect(getPlot(result, 'Reassigned').values).toEqual([9, 10, 11, 12]);
  });

  it('initializes a new reference binding with the existing array identity', () => {
    const { result } = run(`original = array.from(4, 9)
alias = original
array.set(alias, 0, 13)
plot(array.get(original, 0), "Shared")
plot(array.get(alias, 1), "Second")`);
    expect(getPlot(result, 'Shared').values).toEqual([13, 13, 13, 13]);
    expect(getPlot(result, 'Second').values).toEqual([9, 9, 9, 9]);
  });

  it('creates a block-local declaration without reassigning its outer namesake', () => {
    const { result } = run(`value = 7
observed = 0
if bar_index >= 0
    value = 13
    observed := value
plot(value, "Outer")
plot(observed, "Local")`);
    expect(getPlot(result, 'Outer').values).toEqual([7, 7, 7, 7]);
    expect(getPlot(result, 'Local').values).toEqual([13, 13, 13, 13]);
  });
});
