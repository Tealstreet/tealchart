import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SMA, Sum } from './ta-classes';

function capture(name: string) {
  const text = readFileSync(new URL(`../../../oracle-probes/v2/captures/v2/${name}.csv`, import.meta.url), 'utf8');
  const [header, ...records] = text.trim().split('\n');
  const columns = header.split(',');
  return records.slice(0, -1).map((record) => {
    const cells = record.split(',');
    return (title: string) => cells[columns.indexOf(title)] === '' ? NaN : Number(cells[columns.indexOf(title)]);
  });
}

const flows = capture('mfi-flat-flows-v2');
const prices = capture('primitives-sma-stdev-v1-attempt2');

describe('native compensated sum state', () => {
  it.each(['up', 'down'])('preserves every captured %s flow carry', (direction) => {
    const sum = new Sum(2);
    for (const row of flows) {
      expect(sum.compute(row(`clean_${direction}_flow`))).toBe(row(`clean_${direction}_sum2`));
    }
  });

  it.each([2, 3, 7, 14, 31])('matches native Sum and SMA at length %i', (length) => {
    const sum = new Sum(length);
    const sma = new SMA(length);
    for (const row of prices) {
      expect(sum.compute(row('close'))).toBe(row(`sum_len${length}_close_clean`));
      expect(sma.compute(row('close'))).toBe(row(`sma_len${length}_close_clean`));
    }
  });

  it('restores compensation and realized eviction entries on re-entry', () => {
    const sum = new Sum(2);
    for (const row of flows.slice(0, 8749)) sum.compute(row('clean_down_flow'));
    const snapshot = sum.save();
    const expected = flows[8749]('clean_down_sum2');
    sum.compute(1234567.89);
    expect(sum.recompute(flows[8749]('clean_down_flow'))).toBe(expected);
    sum.restore(snapshot);
    expect(sum.compute(flows[8749]('clean_down_flow'))).toBe(expected);
    expect(sum.recompute(flows[8749]('clean_down_flow'))).toBe(expected);
  });
});
