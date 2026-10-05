import type { Bar } from '../../runtime';

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../../runtime';

const source = readFileSync(
  new URL('../../../oracle-probes/v4/native-float-comparison-boundary-v1.pine', import.meta.url),
  'utf8',
);
// Native v4 native-float-comparison-boundary-v1-attempt1.csv, phases0..11.
// CSV SHA256: 72c6d99b4da780a206470426d09f4ec7b82bc9cce457c48dc05f633135214212.
const phaseMasks = [49, 49, 42, 42, 49, 22, 49, 42, 42, 42, 49, 49];
const bars: Bar[] = Array.from({ length: 24 }, (_, index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: 10,
  high: 11,
  low: 9,
  close: 10,
  volume: 1,
}));
const nativeMasks = bars.map((_, index) => phaseMasks[index % 12]);
const prefix = source.slice(0, source.indexOf('outcome ='));

function values(script: string) {
  const result = executeScript(parse(script), bars);
  expect(result.errors).toEqual([]);
  return result.plots.find((plot) => plot.title === 'OUTCOME')!.values;
}

describe('native v4 float comparison boundary', () => {
  it('matches every captured phase with all six operators', () => {
    expect(values(source)).toEqual(nativeMasks);
  });

  it.each([
    ['==', 1],
    ['!=', 2],
    ['<', 4],
    ['>', 8],
    ['<=', 16],
    ['>=', 32],
  ] as const)('matches captured %s for signed zero, nonzero bases and large values', (operator, bit) => {
    expect(values(`${prefix}\nplot(x ${operator} base ? 1 : 0, "OUTCOME")`)).toEqual(
      nativeMasks.map((mask) => ((mask & bit) === 0 ? 0 : 1)),
    );
  });

  it('keeps every unavailable comparison false', () => {
    const unavailable = `//@version=6
indicator("Missing comparison")
x = close[100]
mask = (x == 0 ? 1 : 0) + (x != 0 ? 2 : 0) + (x < 0 ? 4 : 0) + (x > 0 ? 8 : 0) + (x <= 0 ? 16 : 0) + (x >= 0 ? 32 : 0)
plot(mask, "OUTCOME")`;
    expect(values(unavailable)).toEqual(bars.map(() => 0));
  });
});
