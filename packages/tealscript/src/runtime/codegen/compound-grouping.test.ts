import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

// Native v5 bundle captures distinguish series additive operands from constants.
// Parentheses alone do not force binary64 association for series operands.
const bars = [-1e16, -1e16 + 4].map((close, index) => ({
  time: index * 120000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));

describe('Compound assignment grouping controls', () => {
  it.each(['root', 'UDF', 'field'])('%s preserves explicitly grouped RHS subtraction', (form) => {
    const declarations = {
      root: `float plain = 1e16
plain += close - removed
float grouped = 1e16
grouped += (close - removed)`,
      UDF: `ungrouped(s, r) =>
    float total = 1e16
    total += s - r
    total
grouped_rhs(s, r) =>
    float total = 1e16
    total += (s - r)
    total
plain = ungrouped(close, removed)
grouped = grouped_rhs(close, removed)`,
      field: `type Accumulator
    float total
plain_acc = Accumulator.new(1e16)
plain_acc.total += close - removed
grouped_acc = Accumulator.new(1e16)
grouped_acc.total += (close - removed)
plain = plain_acc.total
grouped = grouped_acc.total`,
    };
    const result = executeScript(
      parse(`//@version=6
indicator("Compound grouping")
removed = -1.0
${declarations[form as keyof typeof declarations]}
plot(plain, "plain")
plot(grouped, "grouped")`),
      bars,
    );
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([1, 5]);
    expect(result.plots[1].values).toEqual([1, 5]);
  });

  it('preserves a grouped left child and the existing -= order', () => {
    const result = executeScript(
      parse(`//@version=6
indicator("Compound order controls")
float grouped_child = 1e16
grouped_child += (close + 1.0) - (-1.0)
float subtract = 1.0
subtract -= -close - -close
plot(grouped_child, "grouped child")
plot(subtract, "subtract")`),
      bars,
    );
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([1, 5]);
    expect(result.plots[1].values).toEqual([1, 1]);
  });
});

// Native rolling flows pin association; cancellation controls retain the
// distinct root-series and constant-argument UDF contexts.
const nativeCapture = readFileSync(
  new URL('../../../oracle-probes/v2/captures/v2/mfi-flat-flows-v2.csv', import.meta.url),
  'utf8',
)
  .trim()
  .split(/\r?\n/);
const nativeHeaders = nativeCapture[0].split(',');
const nativeRows = nativeCapture.slice(1, 129).map((row) => row.split(','));
const nativeCell = (row: string[], name: string) => row[nativeHeaders.indexOf(name)];
const nativeBars = nativeRows.map((row) => ({
  time: Number(nativeCell(row, 'input_time')),
  open: Number(nativeCell(row, 'input_open')),
  high: Number(nativeCell(row, 'input_high')),
  low: Number(nativeCell(row, 'input_low')),
  close: Number(nativeCell(row, 'input_close')),
  volume: Number(nativeCell(row, 'input_volume')),
}));

describe('One compound lowering covers native association and explicit grouping', () => {
  it.each(['root', 'UDF'])('%s covers both witnesses in the same execution', (scope) => {
    const flowBody = (source: string, prefix: string, indent = '') => `
${indent}var float ${prefix}Older = na
${indent}var float ${prefix}Newest = na
${indent}var float ${prefix}Total = 0.0
${indent}var int ${prefix}Count = 0
${indent}if not na(${source})
${indent}    removed = ${prefix}Count >= 2 ? ${prefix}Older : 0.0
${indent}    ${prefix}Total += ${source} - removed
${indent}    ${prefix}Older := ${prefix}Newest
${indent}    ${prefix}Newest := ${source}
${indent}    ${prefix}Count += 1
`;
    const rootFlows = ['up', 'down']
      .map(
        (flow) => `${flowBody(flow, flow)}
plot(${flow}Count >= 2 ? ${flow}Total : na, "${flow}")`,
      )
      .join('\n');
    const udfFlows = `rolling(source) =>${flowBody('source', 'flow', '    ')}
    flowCount >= 2 ? flowTotal : na
plot(rolling(up), "up")
plot(rolling(down), "down")`;
    const groupBody = `float associated = 1e16
associated += source - removed
float grouped = 1e16
grouped += (source - removed)`;
    const grouping =
      scope === 'root'
        ? `source = -1e16 + close * 0.0
removed = -1.0
${groupBody}`
        : `pair(source, removed) =>
${groupBody
  .split('\n')
  .map((line) => '    ' + line)
  .join('\n')}
    [associated, grouped]
[associated, grouped] = pair(-1e16 + close * 0.0, -1.0)`;
    const result = executeScript(
      parse(`//@version=6
indicator("Single compound lowering")
change = ta.change(close)
up = volume * (change <= 0.0 ? 0.0 : close)
down = volume * (change >= 0.0 ? 0.0 : close)
${scope === 'root' ? rootFlows : udfFlows}
${grouping}
plot(associated, "associated")
plot(grouped, "grouped")`),
      nativeBars,
    );
    expect(result.errors).toEqual([]);
    expect(nativeRows).toHaveLength(128);
    for (const flow of ['up', 'down']) {
      const expected = nativeRows.map((row) => {
        const value = nativeCell(row, `rolling_difference_${flow}`);
        return value === '' ? null : Number(value);
      });
      expect(result.plots.find((plot) => plot.title === flow)?.values, `native ${flow}`).toEqual(expected);
    }
    expect(result.plots.find((plot) => plot.title === 'associated')?.values).toEqual(Array(128).fill(1));
    expect(result.plots.find((plot) => plot.title === 'grouped')?.values).toEqual(Array(128).fill(scope === 'root' ? 1 : 0));
  });
});
