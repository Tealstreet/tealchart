import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { MFI } from './ta-classes';

const records = readFileSync(new URL('../../../oracle-probes/captures/v1/volume-vwap-v1.csv', import.meta.url), 'utf8')
  .trim()
  .split('\n')
  .map((line) => line.split(','));
const headers = records.shift()!;
const rows = records.slice(0, -1);
const cell = (bar: number, name: string) =>
  rows[bar][headers.indexOf(name)] === '' ? NaN : Number(rows[bar][headers.indexOf(name)]);

function replay(length: number, end: number, source: (bar: number) => number) {
  const mfi = new MFI(length);
  let value = NaN;
  for (let bar = 0; bar <= end; bar++) value = mfi.compute(source(bar), cell(bar, 'input_volume'));
  return { mfi, value };
}

const close = (bar: number) => cell(bar, 'input_close');

describe('native MFI endpoint precision', () => {
  it.each([864, 1385, 2086])('matches the captured endpoint at bar %i', (bar) => {
    expect(replay(2, bar, close).value).toBe(cell(bar, 'mfi_builtin_len2_close_clean'));
  });

  it('retains endpoint precision after a missing source', () => {
    expect(replay(2, 2086, (bar) => (bar === 40 ? NaN : close(bar))).value).toBe(
      cell(2086, 'mfi_builtin_len2_close_hole40'),
    );
  });

  it('preserves a native nonzero carry at a two-bar zero-flow window', () => {
    expect(replay(2, 6, close).value).toBe(cell(6, 'mfi_builtin_len2_close_clean'));
    expect(cell(6, 'mfi_builtin_len2_close_clean')).not.toBe(100);
  });

  it('preserves the native carry of a longer window', () => {
    const hlc3 = (bar: number) => (cell(bar, 'input_high') + cell(bar, 'input_low') + close(bar)) / 3;
    expect(replay(14, 5284, hlc3).value).toBe(cell(5284, 'mfi_builtin_len14_hlc3_clean'));
    expect(cell(5284, 'mfi_builtin_len14_hlc3_clean')).not.toBe(100);
  });

  it('preserves the captured carry above the private zero boundary', () => {
    expect(replay(2, 9378, close).value).toBe(cell(9378, 'mfi_builtin_len2_close_clean'));
    expect(cell(9378, 'mfi_builtin_len2_close_clean')).not.toBe(100);
  });

  it('matches native handling of genuine tiny flows', () => {
    const mfi = new MFI(2);
    mfi.compute(77674.04 / 2 ** 60, 51.86295);
    expect(mfi.compute(77758.24 / 2 ** 60, 33.50717)).toBe(100);
  });

  it('restores endpoint arithmetic on same-bar replacement', () => {
    const { mfi } = replay(2, 2085, close);
    const saved = mfi.save();
    mfi.compute(close(2086) + 100, cell(2086, 'input_volume'));
    expect(mfi.recompute(close(2086), cell(2086, 'input_volume'))).toBe(cell(2086, 'mfi_builtin_len2_close_clean'));
    mfi.restore(saved);
    expect(mfi.compute(close(2086), cell(2086, 'input_volume'))).toBe(cell(2086, 'mfi_builtin_len2_close_clean'));
  });
});
