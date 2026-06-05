import { describe, expect, it, vi } from 'vitest';

import { compatibilityBars, getPlot, roundSeries, runCompatScript } from './fixtures';

describe('Pine compatibility golden harness', () => {
  it('matches documented Pine switch selection idioms', () => {
    const result = runCompatScript(`
indicator("Switch docs smoke")
maType = input.string("EMA", "MA Type", options=["EMA", "SMA", "Close"])
selected = switch maType
    "EMA" => ta.ema(close, 3)
    "SMA" => ta.sma(close, 3)
    => close
blockSelected = switch maType
    "EMA" =>
        basis = close + 1
        basis
    "SMA" =>
        basis = close - 1
        basis
    =>
        close
direction = switch
    close > open => 1
    close < open => -1
    => 0
plot(selected, title="Selected MA")
plot(blockSelected, title="Block Selected MA")
plot(direction, title="Direction")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Selected MA').values)).toEqual([
      102,
      103.5,
      105.25,
      104.125,
      101.5625,
      100.78125,
      102.390625,
      105.695313,
      106.847656,
      108.923828,
      109.461914,
      110.730957,
    ]);
    expect(roundSeries(getPlot(result, 'Block Selected MA').values)).toEqual([
      103,
      106,
      108,
      104,
      100,
      101,
      105,
      110,
      109,
      112,
      111,
      113,
    ]);
    expect(getPlot(result, 'Direction').values).toEqual([1, 1, 1, -1, -1, 1, 1, 1, -1, 1, -1, 1]);
  });

  it('matches common Pine loop control idioms', () => {
    const result = runCompatScript(`
indicator("Loop control docs smoke")
sumOdds = 0
for i = 1 to 7
    if i % 2 == 0
        continue
    if i > 5
        break
    sumOdds += i

descending = 0
for j = 5 to 1 by -2
    descending += j

values = array.from(1, 2, 3, 4)
selected = 0
for value in values
    if value == 2
        continue
    if value == 4
        break
    selected += value

indexed = 0
for [index, value] in values
    indexed += index * value

plot(sumOdds, title="Odd Sum")
plot(descending, title="Descending Sum")
plot(selected, title="Selected Sum")
plot(indexed, title="Indexed Sum")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Odd Sum').values).toEqual([9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9]);
    expect(getPlot(result, 'Descending Sum').values).toEqual([9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9]);
    expect(getPlot(result, 'Selected Sum').values).toEqual([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
    expect(getPlot(result, 'Indexed Sum').values).toEqual([20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20]);
  });

  it('matches common Pine barstate guard idioms', () => {
    const result = runCompatScript(`
indicator("Barstate docs smoke")
lastOnly = barstate.islast ? close : na
confirmed = barstate.isconfirmed ? 1 : 0
lastConfirmedHistory = barstate.islastconfirmedhistory ? 1 : 0
history = barstate.ishistory ? 1 : 0

plot(lastOnly, title="Last Only")
plot(confirmed, title="Confirmed")
plot(lastConfirmedHistory, title="Last Confirmed History")
plot(history, title="History")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Last Only').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, 112]);
    expect(getPlot(result, 'Confirmed').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(result, 'Last Confirmed History').values).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
    expect(getPlot(result, 'History').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('matches common Pine chart info idioms', () => {
    const result = runCompatScript(`
indicator("Chart info docs smoke")
tickerLen = str.length(syminfo.tickerid)
rootLen = str.length(syminfo.root)
periodLen = str.length(timeframe.period)
intraday = timeframe.isintraday ? 1 : 0
dwm = timeframe.isdwm ? 1 : 0

plot(tickerLen, title="Ticker ID Length")
plot(rootLen, title="Root Length")
plot(periodLen, title="Period Length")
plot(timeframe.multiplier, title="Multiplier")
plot(timeframe.in_seconds(), title="Current Seconds")
plot(timeframe.in_seconds("1D"), title="Daily Seconds")
plot(timeframe.from_seconds(30) == "30S" ? 1 : 0, title="From Seconds")
plot(timeframe.from_seconds(3600) == "60" ? 1 : 0, title="From Hour")
plot(timeframe.from_seconds(86400) == "1D" ? 1 : 0, title="From Day")
plot(timeframe.change("3") ? 1 : 0, title="Three Minute Change")
plot(timeframe.change("1D") ? 1 : 0, title="Daily Change")
plot(intraday, title="Intraday")
plot(dwm, title="DWM")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Ticker ID Length').values).toEqual([7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7]);
    expect(getPlot(result, 'Root Length').values).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(getPlot(result, 'Period Length').values).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(getPlot(result, 'Multiplier').values).toEqual([60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60]);
    expect(getPlot(result, 'Current Seconds').values).toEqual([3600, 3600, 3600, 3600, 3600, 3600, 3600, 3600, 3600, 3600, 3600, 3600]);
    expect(getPlot(result, 'Daily Seconds').values).toEqual([86400, 86400, 86400, 86400, 86400, 86400, 86400, 86400, 86400, 86400, 86400, 86400]);
    expect(getPlot(result, 'From Seconds').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(result, 'From Hour').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(result, 'From Day').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(result, 'Three Minute Change').values).toEqual([1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]);
    expect(getPlot(result, 'Daily Change').values).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(getPlot(result, 'Intraday').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(result, 'DWM').values).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('exposes Pine chart context colors and type flags', () => {
    const result = runCompatScript(`
indicator("Chart Context")
plot(color.r(chart.bg_color), title="Bg R")
plot(color.g(chart.bg_color), title="Bg G")
plot(color.b(chart.fg_color), title="Fg B")
plot(chart.is_renko ? 1 : 0, title="Renko")
plot(chart.is_heikinashi ? 1 : 0, title="Heikin Ashi")
plot(chart.is_linebreak ? 1 : 0, title="Line Break")
plot(chart.is_kagi ? 1 : 0, title="Kagi")
plot(chart.is_pnf ? 1 : 0, title="Point Figure")
plot(chart.is_range ? 1 : 0, title="Range")
`, {
      engineOptions: {
        runtime: {
          chart: {
            bgColor: '#102030',
            fgColor: '#ABCDEF',
            type: 'renko',
          },
        },
      },
    });

    const allBars = (value: number) => Array(compatibilityBars.length).fill(value);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Bg R').values).toEqual(allBars(16));
    expect(getPlot(result, 'Bg G').values).toEqual(allBars(32));
    expect(getPlot(result, 'Fg B').values).toEqual(allBars(239));
    expect(getPlot(result, 'Renko').values).toEqual(allBars(1));
    expect(getPlot(result, 'Heikin Ashi').values).toEqual(allBars(0));
    expect(getPlot(result, 'Line Break').values).toEqual(allBars(0));
    expect(getPlot(result, 'Kagi').values).toEqual(allBars(0));
    expect(getPlot(result, 'Point Figure').values).toEqual(allBars(0));
    expect(getPlot(result, 'Range').values).toEqual(allBars(0));
  });

  it('matches indicator timeframe metadata idioms', () => {
    const secondsResult = runCompatScript(`
indicator("Seconds metadata", timeframe="30S")
plot(timeframe.isseconds ? 1 : 0, title="Seconds")
plot(timeframe.isminutes ? 1 : 0, title="Minutes")
plot(timeframe.isintraday ? 1 : 0, title="Intraday")
plot(timeframe.multiplier, title="Multiplier")
plot(timeframe.in_seconds(), title="Seconds Value")
plot(str.length(timeframe.period), title="Period Length")
`);
    const dailyResult = runCompatScript(`
indicator("Daily metadata", timeframe="1D")
plot(timeframe.isdaily ? 1 : 0, title="Daily")
plot(timeframe.isdwm ? 1 : 0, title="DWM")
plot(timeframe.isintraday ? 1 : 0, title="Intraday")
plot(timeframe.multiplier, title="Multiplier")
plot(timeframe.in_seconds(), title="Seconds Value")
`);
    const tickResult = runCompatScript(`
indicator("Tick metadata", timeframe="10T")
plot(timeframe.isticks ? 1 : 0, title="Ticks")
plot(timeframe.isintraday ? 1 : 0, title="Intraday")
plot(timeframe.multiplier, title="Multiplier")
plot(str.length(timeframe.period), title="Period Length")
`);

    expect(secondsResult.errors).toEqual([]);
    expect(getPlot(secondsResult, 'Seconds').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(secondsResult, 'Minutes').values).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(getPlot(secondsResult, 'Intraday').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(secondsResult, 'Multiplier').values).toEqual([30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]);
    expect(getPlot(secondsResult, 'Seconds Value').values).toEqual([30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]);
    expect(getPlot(secondsResult, 'Period Length').values).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);

    expect(dailyResult.errors).toEqual([]);
    expect(getPlot(dailyResult, 'Daily').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(dailyResult, 'DWM').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(dailyResult, 'Intraday').values).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(getPlot(dailyResult, 'Multiplier').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(dailyResult, 'Seconds Value').values).toEqual([86400, 86400, 86400, 86400, 86400, 86400, 86400, 86400, 86400, 86400, 86400, 86400]);

    expect(tickResult.errors).toEqual([]);
    expect(getPlot(tickResult, 'Ticks').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(tickResult, 'Intraday').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(tickResult, 'Multiplier').values).toEqual([10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
    expect(getPlot(tickResult, 'Period Length').values).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
  });

  it('matches common Pine calendar filter idioms', () => {
    const result = runCompatScript(`
indicator("Calendar docs smoke")
afterStart = time >= timestamp(2023, 11, 14, 22, 20)
sameDay = year == 2023 and month == 11 and dayofmonth == 14
isTuesday = dayofweek == dayofweek.tuesday
minuteGate = minute >= 20

plot(afterStart ? 1 : 0, title="After Start")
plot(sameDay ? 1 : 0, title="Same Day")
plot(isTuesday ? 1 : 0, title="Tuesday")
plot(hour, title="Hour")
plot(minuteGate ? 1 : 0, title="Minute Gate")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'After Start').values).toEqual([0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1]);
    expect(getPlot(result, 'Same Day').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(result, 'Tuesday').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(result, 'Hour').values).toEqual([22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22]);
    expect(getPlot(result, 'Minute Gate').values).toEqual([0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1]);
  });

  it('matches common Pine named timezone idioms', () => {
    const result = runCompatScript(`
indicator("Named timezone docs smoke")
nyHour = hour(time, "America/New_York")
nyOpen = timestamp("America/New_York", 2023, 11, 14, 17, 20, 20)
prefixNyHour = hour(time=nyOpen, "America/New_York")
prefixNyOpen = timestamp(timezone="America/New_York", 2023, 11, 14, 17, 20, 20)
formatted = str.format_time(nyOpen, "yyyy-MM-dd HH:mm", "America/New_York")
inNySession = not na(time(timeframe.period, "1718-1724", "America/New_York"))
prefixInNySession = not na(time(timeframe=timeframe.period, "1718-1724", "America/New_York"))

plot(nyHour, title="NY Hour")
plot(nyOpen == time ? 1 : 0, title="NY Timestamp Match")
plot(prefixNyHour, title="Prefix NY Hour")
plot(prefixNyOpen == nyOpen ? 1 : 0, title="Prefix Timestamp Match")
plot(formatted == "2023-11-14 17:20" ? 1 : 0, title="NY Formatted")
plot(inNySession ? 1 : 0, title="NY Session")
plot(prefixInNySession ? 1 : 0, title="Prefix NY Session")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'NY Hour').values).toEqual([17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17]);
    expect(getPlot(result, 'NY Timestamp Match').values).toEqual([0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0]);
    expect(getPlot(result, 'Prefix NY Hour').values).toEqual([17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17]);
    expect(getPlot(result, 'Prefix Timestamp Match').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(result, 'NY Formatted').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(result, 'NY Session').values).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0]);
    expect(getPlot(result, 'Prefix NY Session').values).toEqual(getPlot(result, 'NY Session').values);
  });

  it('matches common Pine session filter idioms', () => {
    const result = runCompatScript(`
indicator("Session docs smoke")
regular = not na(time(timeframe.period, "2218-2224"))
sessionClose = time_close("1", "2218-2224")
prefixRegular = not na(time(timeframe=timeframe.period, "2218-2224"))
prefixSessionClose = time_close(timeframe="1", "2218-2224")

plot(regular ? 1 : 0, title="Regular Session")
plot(na(sessionClose) ? 0 : 1, title="Session Close")
plot(prefixRegular ? 1 : 0, title="Prefix Regular Session")
plot(na(prefixSessionClose) ? 0 : 1, title="Prefix Session Close")
plot(time_close - time, title="Bar Duration")
plot(last_bar_time, title="Last Bar Time")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Regular Session').values).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0]);
    expect(getPlot(result, 'Session Close').values).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0]);
    expect(getPlot(result, 'Prefix Regular Session').values).toEqual(getPlot(result, 'Regular Session').values);
    expect(getPlot(result, 'Prefix Session Close').values).toEqual(getPlot(result, 'Session Close').values);
    expect(getPlot(result, 'Bar Duration').values).toEqual([
      3_600_000,
      3_600_000,
      3_600_000,
      3_600_000,
      3_600_000,
      3_600_000,
      3_600_000,
      3_600_000,
      3_600_000,
      3_600_000,
      3_600_000,
      3_600_000,
    ]);
    expect(getPlot(result, 'Last Bar Time').values).toEqual([
      1_700_000_660_000,
      1_700_000_660_000,
      1_700_000_660_000,
      1_700_000_660_000,
      1_700_000_660_000,
      1_700_000_660_000,
      1_700_000_660_000,
      1_700_000_660_000,
      1_700_000_660_000,
      1_700_000_660_000,
      1_700_000_660_000,
      1_700_000_660_000,
    ]);
  });

  it('matches documented Pine dynamic session string idioms', () => {
    const result = runCompatScript(`
indicator("Dynamic session docs smoke")
// Reduced from TradingView's dynamic session and session input examples.
weekdaySessionInput = input.session("2218-2224", "Weekday Session")
weekendSessionInput = input.session("0000-0001", "Weekend Session")
daysInput = input.string("23456", "Weekdays")
weekdaySession = weekdaySessionInput + ":" + daysInput
weekendSession = weekendSessionInput + ":17"
dynamicSession = dayofweek >= dayofweek.monday and dayofweek <= dayofweek.friday ? weekdaySession : weekendSession
inDynamicSession = not na(time(timeframe.period, dynamicSession))

plot(inDynamicSession ? 1 : 0, title="Dynamic Session")
plot(str.length(dynamicSession), title="Session Length")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Dynamic Session').values).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0]);
    expect(getPlot(result, 'Session Length').values).toEqual([15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
  });

  it('matches common Pine timenow idioms', () => {
    const now = Date.UTC(2024, 0, 5, 8, 15);
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(now);
    try {
      const result = runCompatScript(`
indicator("Time now docs smoke")
plot(timenow >= time ? 1 : 0, title="Now After Bar")
plot(timenow[1] == timenow ? 1 : 0, title="Stable Historical Now")
`);

      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Now After Bar').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
      expect(getPlot(result, 'Stable Historical Now').values).toEqual([0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    } finally {
      nowSpy.mockRestore();
    }
  });
});
