import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { MFI } from './ta-classes';

function capture() {
  const file = new URL('../../../oracle-probes/v2/captures/v2/mfi-flat-flows-v2.csv', import.meta.url);
  const [header, ...records] = readFileSync(file, 'utf8').trim().split('\n');
  const columns = header.split(',');
  return records.slice(0, -1).map((record) => {
    const cells = record.split(',');
    return (title: string) => {
      const index = columns.indexOf(title);
      if (index < 0) throw new Error(`Missing native column ${title}`);
      return cells[index] === '' ? NaN : Number(cells[index]);
    };
  });
}

describe('native MFI flat-flow precision', () => {
  it.each(['clean', 'hole40'])('matches every historical %s value', (stream) => {
    const rows = capture();
    expect(rows).toHaveLength(24133);
    const mfi = new MFI(2);
    const source = stream === 'clean' ? 'input_close' : 'input_one_hole';
    for (const row of rows) {
      expect(mfi.compute(row(source), row('input_volume'))).toBe(row(`${stream}_mfi_builtin`));
    }
  });
});
