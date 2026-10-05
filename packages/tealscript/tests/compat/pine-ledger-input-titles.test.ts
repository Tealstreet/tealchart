import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript, type Bar } from '../../src/runtime';
import { checkProgram } from '../../src/semantic/checker';

// Inputs manual, omitted title uses the variable name; ledger rank 56.
const bars: Bar[] = [{ time: 1_700_000_000_000, open: 10, high: 12, low: 9, close: 11, volume: 100 }];

function run(body: string, inputs?: Map<string, unknown>) {
  const program = parse(`//@version=6\nindicator("Input titles")\n${body}`);
  expect(checkProgram(program).diagnostics).toEqual([]);
  const result = executeScript(program, bars, inputs);
  expect(result.errors).toEqual([]);
  return result;
}

describe('omitted input.int titles', () => {
  for (const declaration of ['length = input.int(3)', 'length = input.int(defval=3)', 'var int length = input.int(3)']) {
    it(`uses the variable name for ${declaration}`, () => {
      const result = run(`${declaration}\nplot(length)`);
      expect(result.inputs).toEqual([expect.objectContaining({ id: 'input_length', title: 'length', type: 'int', defval: 3 })]);
      expect(result.plots[0]?.values).toEqual([3]);
    });
  }
  it('uses the local variable name within a function', () => {
    const result = run('value() =>\n    length = input.int(3)\n    length\nplot(value())');
    expect(result.inputs).toEqual([expect.objectContaining({ id: 'input_length', title: 'length' })]);
    expect(result.plots[0]?.values).toEqual([3]);
  });
  it('keeps omitted titles distinct and applies overrides by the variable title', () => {
    const result = run('fast = input.int(3)\nslow = input.int(5)\nplot(fast)\nplot(slow)', new Map([['input_fast', 7], ['input_slow', 9]]));
    expect(result.inputs.map((input) => [input.id, input.title])).toEqual([['input_fast', 'fast'], ['input_slow', 'slow']]);
    expect(result.plots.map((plot) => plot.values)).toEqual([[7], [9]]);
  });
  it('preserves an explicit title and its override ID', () => {
    const result = run('length = input.int(3, "Chosen")\nplot(length)', new Map([['input_Chosen', 7]]));
    expect(result.inputs).toEqual([expect.objectContaining({ id: 'input_Chosen', title: 'Chosen' })]);
    expect(result.plots[0]?.values).toEqual([7]);
  });
  it('preserves an explicitly empty title', () => {
    const result = run('length = input.int(3, "")\nplot(length)');
    expect(result.inputs).toEqual([expect.objectContaining({ title: '' })]);
    expect(result.plots[0]?.values).toEqual([3]);
  });
});
