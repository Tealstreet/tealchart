import type { Bar } from '../context';

import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';
import { InMemoryRequestDatafeed } from '../requestDatafeed';

const bars: Bar[] = Array.from({ length: 6 }, (_, index) => ({
  time: Date.UTC(2026, 9, 1) + index * 120_000,
  open: 100,
  high: 102,
  low: 98,
  close: 101,
  volume: 10,
}));
const runtime = { syminfo: { tickerid: 'BINANCE:BTCUSDT' }, timeframe: { period: '2' } };
function run(body: string, datafeed?: InMemoryRequestDatafeed) {
  const ast = parse(`//@version=6\nindicator("Native missing footprint IDs")\n${body}`);
  expect(checkProgram(ast).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
  return executeScript(ast, bars, undefined, { runtime, requestDatafeed: datafeed });
}

// Native v9/v19 v7:102 observes RE10029 rows and RE10145 up_price.
// Isolates schedule calls at captured bars; provider availability is not replayed.
describe('captured missing footprint and volume-row IDs', () => {
  it.each(['footprint.rows(fp)', 'footprint.rows(id=fp)', 'fp.rows()'])(
    'halts %s at bar3 with the captured rows error',
    (call) => {
      const result = run(
        `footprint fp = na\ncount = 0\nif bar_index == 3\n    count := array.size(${call})\nplot(count)`,
      );
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        message: 'Error on bar 3: The `footprint` ID used in the `rows()` call cannot be `na`.',
        code: 'RE10029',
        barIndex: 3,
        runtimeError: { code: 'RE10029', barIndex: 3 },
      });
      expect(result.plots[0].values).toEqual([0, 0, 0]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    },
  );

  it.each(['volume_row.up_price(row)', 'volume_row.up_price(id=row)', 'row.up_price()'])(
    'halts %s at bar2 with the captured row error',
    (call) => {
      const result = run(`volume_row row = na\nvalue = 0.0\nif bar_index == 2\n    value := ${call}\nplot(value)`);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        message: 'Error on bar 2: The `volume_row` ID used in the `up_price()` call cannot be `na`.',
        code: 'RE10145',
        barIndex: 2,
        runtimeError: { code: 'RE10145', barIndex: 2 },
      });
      expect(result.plots[0].values).toEqual([0, 0]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    },
  );

  it('does not execute lazy missing-ID accessors', () => {
    const result = run(
      'footprint fp = na\nvolume_row row = na\nplot(na(fp) ? 99 : array.size(fp.rows()))\nplot(na(row) ? 88 : row.up_price())',
    );
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([Array(6).fill(99), Array(6).fill(88)]);
  });

  it.each([
    ['footprint', 'array.size(id.rows())', 'RE10029'],
    ['volume_row', 'id.up_price()', 'RE10145'],
  ])('retains the %s receiver type through a UDF', (type, expression, code) => {
    const result = run(`read(${type} id) =>\n    ${expression}\n${type} id = na\nplot(read(id))`);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ code, barIndex: 0 });
    expect(result.plots.flatMap((plot) => plot.values)).toEqual([]);
  });

  it('preserves missing requests and valid-footprint row lookup misses', () => {
    const missing = run('fp = request.footprint(10)\nplot(na(fp) ? 1 : 0)');
    expect(missing.errors).toEqual([]);
    expect(missing.plots[0].values).toEqual(Array(6).fill(1));
    const datafeed = new InMemoryRequestDatafeed();
    datafeed.setFootprintContext({
      symbol: 'BINANCE:BTCUSDT',
      timeframe: '2',
      ticksPerRow: 10,
      valueAreaPercent: 70,
      imbalancePercent: 300,
      footprints: bars.map((bar) => ({ time: bar.time, rows: [{ downPrice: 100, upPrice: 101, totalVolume: 10 }] })),
    });
    const result = run(
      'fp = request.footprint(10)\nrow = footprint.get_row_by_price(fp, 900)\nplot(na(row) ? 1 : 0)\nrows = fp.rows()\nplot(array.size(rows))\nplot(array.get(rows, 0).up_price())',
      datafeed,
    );
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([Array(6).fill(1), Array(6).fill(1), Array(6).fill(101)]);
  });

  it('preserves matrix rows and local method binding', () => {
    const matrix = run('m = matrix.new<float>(2, 1, 0)\nplot(m.rows())');
    expect(matrix.errors).toEqual([]);
    expect(matrix.plots[0].values).toEqual(Array(6).fill(2));
    const local = run('method rows(footprint fp) =>\n    7\nfootprint fp = na\nplot(fp.rows())');
    expect(local.errors).toEqual([]);
    expect(local.plots[0].values).toEqual(Array(6).fill(7));
  });
});
