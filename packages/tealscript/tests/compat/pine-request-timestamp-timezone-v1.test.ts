import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import { InMemoryRequestDatafeed } from '../../src/runtime/requestDatafeed';

// Official Time manual: numeric timestamp defaults to the dataset exchange zone.
// Other timeframes and data: request expressions run in the requested context.
// Expected epochs below are derived from the stated UTC offsets, not local output.
const bars = [0, 1, 2].map((index) => ({
  time: Date.UTC(2024, 0, 2, 12, index),
  open: 10,
  high: 11,
  low: 9,
  close: 10,
  volume: 100,
}));

function run(expression: string, zone = 'America/New_York', chartZone = 'Asia/Tokyo', nested = false) {
  const requested = `request.security("TARGET", "1", ${expression}, lookahead=barmerge.lookahead_on)`;
  const source = `//@version=6
indicator("Requested timestamp zone")
plot(${nested ? `request.security("OUTER", "1", ${requested}, lookahead=barmerge.lookahead_on)` : requested})`;
  const result = executeCompiledScript(parse(source), bars, undefined, {
    runtime: { syminfo: { tickerid: 'CHART', timezone: chartZone }, timeframe: { period: '1' } },
    requestDatafeed: new InMemoryRequestDatafeed([
      { symbol: 'TARGET', timeframe: '1', bars, syminfo: { timezone: zone } },
      { symbol: 'OUTER', timeframe: '1', bars, syminfo: { timezone: 'Europe/London' } },
    ]),
  });
  expect(result.status).toBe('success');
  if (result.status !== 'success') throw new Error(result.reason);
  expect(result.result.errors).toEqual([]);
  return result.result.plots[0]!.values;
}

describe('requested numeric timestamp exchange timezone', () => {
  it.each([
    ['America/New_York', 1, Date.UTC(2024, 0, 2, 8, 4, 5)],
    ['America/New_York', 7, Date.UTC(2024, 6, 2, 7, 4, 5)],
    ['Asia/Tokyo', 1, Date.UTC(2024, 0, 1, 18, 4, 5)],
    ['Asia/Kolkata', 1, Date.UTC(2024, 0, 1, 21, 34, 5)],
  ] as const)('uses %s for month %s', (zone, month, expected) => {
    expect(run(`timestamp(2024, ${month}, 2, 3, 4, 5)`, zone)).toEqual(bars.map(() => expected));
  });

  it('uses the requested zone for named components and omitted clock fields', () => {
    expect(run('timestamp(year=2024, month=1, day=2)')).toEqual(bars.map(() => Date.UTC(2024, 0, 2, 5)));
  });

  it('keeps series components evaluated on each requested bar', () => {
    expect(run('timestamp(2024, 1, 2, bar_index, 0)')).toEqual(bars.map((_, index) => Date.UTC(2024, 0, 2, index + 5)));
  });

  it('uses the inner requested zone in a nested request', () => {
    expect(run('timestamp(2024, 1, 2, 3, 4, 5)', 'Asia/Kolkata', 'America/New_York', true)).toEqual(
      bars.map(() => Date.UTC(2024, 0, 1, 21, 34, 5)),
    );
  });

  it('retains an explicit positional timezone', () => {
    expect(run('timestamp("GMT+2", 2024, 1, 2, 3, 4, 5)')).toEqual(bars.map(() => Date.UTC(2024, 0, 2, 1, 4, 5)));
  });

  it('retains an explicit named timezone', () => {
    expect(run('timestamp(timezone="UTC", year=2024, month=1, day=2, hour=3, minute=4, second=5)')).toEqual(
      bars.map(() => Date.UTC(2024, 0, 2, 3, 4, 5)),
    );
  });

  it('retains the date-string overload UTC default', () => {
    expect(run('timestamp("02 Jan 2024 03:04:05")')).toEqual(bars.map(() => Date.UTC(2024, 0, 2, 3, 4, 5)));
  });

  it('retains UTC requested metadata', () => {
    expect(run('timestamp(2024, 1, 2, 3, 4, 5)', 'Etc/UTC')).toEqual(bars.map(() => Date.UTC(2024, 0, 2, 3, 4, 5)));
  });

  it('retains missing calendar components', () => {
    expect(run('timestamp(int(na), 1, 2, 3, 4, 5)')).toEqual(bars.map(() => null));
  });
});
