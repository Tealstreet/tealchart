import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const nativeSource = `//@version=6
indicator("V7 table-dimension-negative-v6-v1")
n = bar_index % 2 == 0 ? -1 : 1
var t = table.new(position.top_right,n,1)
plot(n,"DIMENSION")
`;
const failure = (barIndex: number) => ({
  code: 'RE10001',
  barIndex,
  message: `Error on bar ${barIndex}: Invalid value of the 'columns' argument (-1) in the 'table.new' function. It must be >= 0.`,
});

// V7 outcomes-v7.json attempts173/174; source0229052b, runtime RE10001 at bar0.
// Zero columns remain accepted; rows/nonfinite/fractional policies are not inferred.
describe('native negative table columns', () => {
  it('refuses the unchanged captured source before allocation', () => {
    expect(createHash('sha256').update(nativeSource).digest('hex')).toBe(
      '0229052bcb424f1eaccb2e90eb3169014613ede366ce20b3603680dad3dfd51a',
    );
    const result = runCompatScript(nativeSource);
    expect(result.errors).toEqual([expect.objectContaining(failure(0))]);
    expect(result.drawings).toEqual([]);
    expect(result.plots).toEqual([]);
  });

  it('keeps the same refusal through named column binding', () => {
    const result = runCompatScript(`//@version=6
indicator("Named columns")
n = bar_index % 2 == 0 ? -1 : 1
var t = table.new(rows=1, columns=n, position=position.top_right)
plot(n)`);
    expect(result.errors).toEqual([expect.objectContaining(failure(0))]);
    expect(result.drawings).toEqual([]);
  });

  it('validates at the reached call without deleting the previous valid table', () => {
    const result = runCompatScript(`//@version=6
indicator("Delayed columns")
var t = table.new(position.top_right, 1, 1)
plot(close, "Before")
if bar_index == 3
    n = bar_index - 4
    t := table.new(position.top_right, n, 1)
plot(close, "After")`);
    expect(result.errors).toEqual([expect.objectContaining(failure(3))]);
    expect(getPlot(result, 'Before').values).toEqual(compatibilityBars.slice(0, 4).map((bar) => bar.close));
    expect(getPlot(result, 'After').values).toEqual(compatibilityBars.slice(0, 3).map((bar) => bar.close));
    expect(result.drawings).toEqual([expect.objectContaining({ type: 'table', columns: 1, rows: 1 })]);
  });

  it.each([0, 1])('retains captured zero and positive columns: %s', (columns) => {
    const result = runCompatScript(`//@version=6
indicator("Valid columns")
n = bar_index % 2 == 0 ? ${columns} : 1
var t = table.new(position.top_right, n, 1)
plot(n, "Dimension")`);
    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([expect.objectContaining({ type: 'table', columns, rows: 1 })]);
    expect(getPlot(result, 'Dimension').values[0]).toBe(columns);
  });

  it('does not reject an unreached constructor', () => {
    const result = runCompatScript(`//@version=6
indicator("Unreached columns")
n = bar_index - 100
if bar_index < 0
    t = table.new(position.top_right, n, 1)
plot(close, "Control")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Control').values).toEqual(compatibilityBars.map((bar) => bar.close));
  });

  it('retains the captured series-float compile refusal', () => {
    const diagnostics = checkProgram(
      parse(`//@version=6
indicator("V7 table-dimension-float-v6-v1")
n = bar_index % 2 == 0 ? 1.5 : 1
var t = table.new(position.top_right,n,1)
plot(n,"DIMENSION")
`),
    ).diagnostics;
    expect(diagnostics.some((diagnostic) => diagnostic.severity === 'error')).toBe(true);
  });
});
