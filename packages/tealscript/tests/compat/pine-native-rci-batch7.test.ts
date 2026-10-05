import type { Bar } from '../../src/runtime/context';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';

// Native v2 coverage-ta-2-v1: original probe SHA2017cf3e1d0f48d81856ba6d6a32b978f63a2a305f754b1912e94a8b60e26120.
// Use confirmed rows0..599; the original RCI fixes remain attributed to J.
const capture = readFileSync(new URL('../../oracle-probes/v2/captures/v2/coverage-ta-2-v1.csv', import.meta.url));
if (
  createHash('sha256').update(capture).digest('hex') !==
  '63d6162eeca68ad27852c1de1ccf7c512f3fea7c3cad13b5c760e33ec36a9b8d'
) {
  throw new Error('Instrument: native RCI capture changed');
}
const lines = capture.toString('utf8').split('\n');
const headers = lines[0].split(',');
const rows = lines.slice(1, 601).map((line) => line.split(','));
if (rows.length !== 600 || rows.some((row) => row.length !== headers.length)) {
  throw new Error('Instrument: incomplete native RCI rows');
}
const bars: Bar[] = rows.map((row) => ({
  time: Number(row[0]) * 1000,
  open: Number(row[1]),
  high: Number(row[2]),
  low: Number(row[3]),
  close: Number(row[4]),
  volume: 10,
}));

function witness(column: string, expression: string, indices = rows.map((_row, index) => index)) {
  const columnIndex = headers.indexOf(column);
  expect(columnIndex).toBeGreaterThan(-1);
  const program = parse(`//@version=6
indicator("Native batch7 RCI")
source = ${expression}
plot(ta.rci(source, 14), title="rci")`);
  expect(checkProgram(program).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  const result = executeScript(program, bars);
  expect(result.errors).toEqual([]);
  expect(result.profile.swallowedErrors ?? []).toEqual([]);
  expect(result.plots).toHaveLength(1);
  expect(result.plots[0].values).toHaveLength(600);
  for (const index of indices) {
    const native = rows[index][columnIndex];
    const actual = result.plots[0].values[index];
    if (native === '') expect(actual, `${column} native bar ${index}`).toBeNull();
    else {
      expect(actual, `${column} native bar ${index}`).not.toBeNull();
      // Accept decimal-export noise; the full replay separately scores NA/SEMANTIC.
      expect(Math.abs(Number(actual) - Number(native)), `${column} native bar ${index}`).toBeLessThanOrEqual(5e-12);
    }
  }
}

describe('native batch7 RCI residuals', () => {
  it('matches the clean startup and complete confirmed prefix', () => {
    witness('rci_len14_clean', 'close');
  });
  it('matches the captured tied ranks independently of startup', () => {
    witness(
      'rci_len14_clean',
      'close',
      Array.from({ length: 15 }, (_unused, index) => index + 55),
    );
  });
  it('matches current holes, retained slots, and recovery', () => {
    witness('rci_len14_hole40_41', 'bar_index == 40 or bar_index == 41 ? na : close');
  });
  it('matches the captured current-source hold independently of startup', () => {
    witness('rci_len14_hole40_41', 'bar_index == 40 or bar_index == 41 ? na : close', [40, 41]);
  });
  it('matches the captured missing-slot recovery independently of startup', () => {
    witness(
      'rci_len14_hole40_41',
      'bar_index == 40 or bar_index == 41 ? na : close',
      Array.from({ length: 13 }, (_unused, index) => index + 42),
    );
  });
  it('matches leading missing slots and subsequent values', () => {
    witness('rci_len14_lead0_4', 'bar_index < 5 ? na : close');
  });
});
