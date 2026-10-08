import type { Bar } from '../../src/runtime/context';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import { InMemoryRequestDatafeed } from '../../src/runtime/requestDatafeed';
import { checkProgram } from '../../src/semantic/checker';

function tradingDays(version: number, times: number[], session: string, timezone: string, period = '2') {
  const source = `//@version=${version}
indicator("Session trading day")
plot(time_tradingday, "Day")
plot(time_tradingday[1], "Previous day")
plot(time, "Open")
plot(close, "Close")`;
  const ast = parse(source);
  expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  const bars: Bar[] = times.map((time, index) => ({
    time,
    open: 10,
    high: 12,
    low: 9,
    close: 10 + index,
    volume: 100,
  }));
  const execution = executeCompiledScript(ast, bars, new Map(), {
    runtime: {
      syminfo: { ticker: 'SESSION', tickerid: 'TEST:SESSION', timezone },
      timeframe: { period },
      session: { regular: session, timezone },
    },
  });
  expect(execution.status).toBe('success');
  if (execution.status !== 'success') throw new Error(execution.reason);
  expect(execution.result.errors).toEqual([]);
  expect(execution.result.profile.swallowedErrors).toBeUndefined();
  const values = (title: string) => execution.result.plots.find((plot) => plot.title === title)!.values;
  expect(values('Open')).toEqual(times);
  expect(values('Close')).toEqual(times.map((_, index) => 10 + index));
  return { current: values('Day'), previous: values('Previous day') };
}

describe.each([5, 6])('v%s time_tradingday session boundary', (version) => {
  it.each([
    ['DXY', 1791348840000, 1791331200000, '1900-1900:3456'],
    ['SPX', 1791313560000, 1791244800000, '0930-1600:23456'],
  ])('matches the captured %s session date in UTC', (_, time, day, session) => {
    const result = tradingDays(version, [time, time + 120000], session, 'America/New_York');
    expect(result.current).toEqual([day, day]);
    expect(result.previous).toEqual([null, day]);
  });

  it.each([
    ['DXY first', 1791348840000, 1791331200000, '1900-1900:3456|1700F-1900:2'],
    ['DXY second', 1791346440000, 1791331200000, '1900-1900:3456|1700F-1900:2'],
    ['SPX', 1791313560000, 1791244800000, '0930-1610'],
  ])('pins all 32 observed %s session-day cells', (_, time, day, session) => {
    const times = Array.from({ length: 32 }, (_, index) => time + index * 120000);
    expect(tradingDays(version, times, session, 'America/New_York').current).toEqual(times.map(() => day));
  });

  it('uses the Monday schedule override in captured exchange metadata', () => {
    const times = [Date.UTC(2024, 6, 7, 21), Date.UTC(2024, 6, 8, 22, 58), Date.UTC(2024, 6, 8, 23)];
    expect(tradingDays(version, times, '1900-1900:3456|1700F-1900:2', 'America/New_York').current).toEqual([
      Date.UTC(2024, 6, 8),
      Date.UTC(2024, 6, 8),
      Date.UTC(2024, 6, 9),
    ]);
  });

  it('labels an early segment by the final segment of its session', () => {
    const times = [Date.UTC(2024, 6, 7, 21), Date.UTC(2024, 6, 8, 13), Date.UTC(2024, 6, 8, 20, 58)];
    expect(tradingDays(version, times, '1700F-1800F,0900-1700:2', 'America/New_York').current).toEqual([
      Date.UTC(2024, 6, 8),
      Date.UTC(2024, 6, 8),
      Date.UTC(2024, 6, 8),
    ]);
  });

  it('changes at the overnight session opening while the UTC date is unchanged', () => {
    const times = [
      Date.UTC(2024, 6, 7, 21),
      Date.UTC(2024, 6, 8, 3),
      Date.UTC(2024, 6, 8, 20, 58),
      Date.UTC(2024, 6, 8, 21),
    ];
    const monday = Date.UTC(2024, 6, 8);
    const tuesday = Date.UTC(2024, 6, 9);
    const result = tradingDays(version, times, '1700-1700:23456', 'America/New_York');
    expect(result.current).toEqual([monday, monday, monday, tuesday]);
    expect(result.previous).toEqual([null, monday, monday, monday]);
  });

  it('uses exchange-local overnight boundaries across DST changes', () => {
    const times = [Date.UTC(2024, 2, 3, 22), Date.UTC(2024, 2, 10, 21), Date.UTC(2024, 10, 3, 22)];
    const days = [Date.UTC(2024, 2, 4), Date.UTC(2024, 2, 11), Date.UTC(2024, 10, 4)];
    expect(tradingDays(version, times, '1700-1700:23456', 'America/New_York').current).toEqual(days);
  });

  it('preserves the UTC calendar boundary on continuous UTC feeds', () => {
    const times = [Date.UTC(2024, 6, 7, 23, 58), Date.UTC(2024, 6, 8)];
    const result = tradingDays(version, times, '24x7', 'Etc/UTC');
    expect(result.current).toEqual([Date.UTC(2024, 6, 7), Date.UTC(2024, 6, 8)]);
    expect(result.previous).toEqual([null, Date.UTC(2024, 6, 7)]);
  });

  it('uses the requested session without changing the chart clock', () => {
    const times = [Date.UTC(2024, 6, 7, 21), Date.UTC(2024, 6, 7, 21, 2), Date.UTC(2024, 6, 7, 21, 4)];
    const bars: Bar[] = times.map((time) => ({ time, open: 10, high: 12, low: 9, close: 11, volume: 100 }));
    const ast = parse(`//@version=${version}
indicator("Requested session trading day")
plot(time_tradingday, "Chart day")
plot(request.security("UTC", "2", time_tradingday, lookahead=barmerge.lookahead_on), "Requested day")
plot(time_close, "Close time")`);
    const execution = executeCompiledScript(ast, bars, new Map(), {
      runtime: {
        syminfo: { timezone: 'America/New_York' },
        timeframe: { period: '2' },
        session: { regular: '1700-1700:23456', timezone: 'America/New_York' },
      },
      requestDatafeed: new InMemoryRequestDatafeed([
        {
          symbol: 'UTC',
          timeframe: '2',
          bars,
          syminfo: { timezone: 'Etc/UTC' },
          session: { regular: '24x7', timezone: 'Etc/UTC' },
        },
      ]),
    });
    expect(execution.status).toBe('success');
    if (execution.status !== 'success') throw new Error(execution.reason);
    expect(execution.result.errors).toEqual([]);
    expect(execution.result.profile.swallowedErrors).toBeUndefined();
    expect(execution.result.plots.map((plot) => plot.values)).toEqual([
      times.map(() => Date.UTC(2024, 6, 8)),
      times.map(() => Date.UTC(2024, 6, 7)),
      times.map((time) => time + 120000),
    ]);
  });

  it('labels the final trading session on a weekly forex bar', () => {
    const result = tradingDays(version, [Date.UTC(2024, 6, 7, 21)], '1700-1700:23456', 'America/New_York', '1W');
    expect(result.current).toEqual([Date.UTC(2024, 6, 12)]);
    expect(result.previous).toEqual([null]);
  });
});
