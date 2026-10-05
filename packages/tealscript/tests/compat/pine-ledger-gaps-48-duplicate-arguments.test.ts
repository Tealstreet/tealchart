import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';

// V5 warns and keeps the first value; v6 refuses repeated parameters.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-6/#cannot-repeat-parameters
const cases = [
  { name: 'plot named', body: 'plot(close, "Value", color=color.blue, linewidth=2, color=color.red)\nplot(close, "Reference", color=color.blue)', values: [11, 17, 13], color: true },
  { name: 'numeric named', body: 'plot(math.pow(base=2, exponent=3, exponent=4), "Value")', values: [8, 8, 8] },
  { name: 'function named', body: 'f(x) => x\nplot(f(x=7, x=9), "Value")', values: [7, 7, 7] },
  { name: 'method named', body: 'method plus(float receiver, float x) => receiver + x\nfloat value = close\nplot(value.plus(x=7, x=9), "Value")', values: [18, 24, 20] },
  { name: 'constructor named', body: 'type Point\n    float value\np = Point.new(value=7, value=9)\nplot(p.value, "Value")', values: [7, 7, 7] },
  { name: 'plot positional', body: 'plot(7, "Value", series=9)', values: [7, 7, 7] },
  { name: 'numeric positional', body: 'plot(math.pow(2, 3, exponent=4), "Value")', values: [8, 8, 8] },
  { name: 'function positional', body: 'f(x) => x\nplot(f(7, x=9), "Value")', values: [7, 7, 7] },
  { name: 'method positional', body: 'method plus(float receiver, float x) => receiver + x\nfloat value = close\nplot(value.plus(7, x=9), "Value")', values: [18, 24, 20] },
  { name: 'constructor positional', body: 'type Point\n    float value\np = Point.new(7, value=9)\nplot(p.value, "Value")', values: [7, 7, 7] },
];
const bars = [11, 17, 13].map((close, index) => ({
  time: (index + 1) * 60_000, open: close, high: close + 1, low: close - 1, close, volume: 100,
}));
const source = (version: number, body: string) => `//@version=${version}\nindicator("Duplicate argument boundary")\n${body}`;

describe('ledger gaps 48: duplicate argument version boundary', () => {
  it.each(cases)('warns for v5 $name', ({ body }) => {
    expect(checkProgram(parse(source(5, body))).diagnostics).toEqual([
      expect.objectContaining({ code: 'duplicate-argument', severity: 'warning' }),
    ]);
  });

  it.each(cases)('refuses v6 $name', ({ body }) => {
    expect(checkProgram(parse(source(6, body))).diagnostics).toEqual([
      expect.objectContaining({ code: 'duplicate-argument', severity: 'error' }),
    ]);
  });

  it.each(cases)('uses the first supplied value for v5 $name', ({ body, values, color }) => {
    const program = parse(source(5, body));
    const original = structuredClone(program);
    const result = executeScript(program, bars);
    expect(result.errors).toEqual([]);
    const plot = result.plots.find((item) => item.title === 'Value');
    expect(plot?.values).toEqual(values);
    if (color) expect(plot?.color).toEqual(result.plots.find((item) => item.title === 'Reference')?.color);
    expect(program).toEqual(original);
  });

  it.each(cases.filter((item) => item.name.endsWith('named')))('retains unchecked v6 $name runtime refusal', ({ body }) => {
    expect(executeScript(parse(source(6, body)), bars).errors).toEqual([
      expect.objectContaining({ message: expect.stringContaining('Duplicate named argument:') }),
    ]);
  });
});
