import { readFileSync } from 'node:fs';

import { expect, it } from 'vitest';

import { CCI } from '../../src/runtime/codegen/ta-classes';

const [header, ...lines] = readFileSync(
  new URL('../../oracle-probes/captures/v1/na-holes-oscillators-v1.csv', import.meta.url),
  'utf8',
)
  .trimEnd()
  .split('\n');
const columns = header.split(',');
const rows = lines.map((line) => line.split(','));
const cell = (index: number, column: string): number => Number(rows[index][columns.indexOf(column)]);
const phases = [
  { name: 'clean', targets: [22257], missing: (_index: number) => false },
  { name: 'nahole_bar40_41', targets: [8926, 9481, 18715], missing: (index: number) => index === 40 || index === 41 },
  {
    name: 'nastart_bar0_2',
    targets: [8665, 8926, 8960, 9130, 9149, 9253, 9257, 9481, 9511, 9603, 9869, 9931, 10007, 11837, 12831, 18715],
    missing: (index: number) => index < 3,
  },
];

it.each(phases)('retains the captured rolling-mean arithmetic for $name', ({ name, targets, missing }) => {
  const cci = new CCI(14);
  const selected = new Set(targets);
  for (let index = 0; index <= targets.at(-1)!; index++) {
    const actual = cci.compute(missing(index) ? NaN : cell(index, 'input_close'));
    if (selected.has(index)) expect.soft(actual, `${name} bar${index}`).toBe(cell(index, `cci_len14_${name}`));
  }
});

it('replaces speculative mean updates and restores the published mean with the raw window', () => {
  const cci = new CCI(3);
  const source = [1000000000.1, 1000000000.2, 1000000000.3, 1000000000.6];
  for (const value of source.slice(0, 3)) cci.compute(value);
  const snapshot = cci.save();
  cci.compute(1000000001.5);
  cci.recompute(1000000002.4);
  const replaced = cci.recompute(source[3]);
  const fresh = new CCI(3);
  let expected = NaN;
  for (const value of source) expected = fresh.compute(value);
  expect(replaced).toBe(expected);
  cci.restore(snapshot);
  expect(cci.compute(source[3])).toBe(expected);
});
