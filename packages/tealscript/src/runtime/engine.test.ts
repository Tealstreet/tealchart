import { describe, it, expect } from 'vitest';
import { TealscriptEngine, executeScript } from './engine';
import { parse } from '../parser/parser';
import type { Bar } from './context';

// Helper to create test bars
function createBars(count: number, startPrice = 100): Bar[] {
  const bars: Bar[] = [];
  const baseTime = Date.now() - count * 60000;

  for (let i = 0; i < count; i++) {
    const price = startPrice + i * 0.5;
    bars.push({
      time: baseTime + i * 60000,
      open: price,
      high: price + 0.5,
      low: price - 0.3,
      close: price + 0.2,
      volume: 1000 + i * 10,
    });
  }

  return bars;
}

function roundSeries(values: Array<number | null>, digits: number = 6): Array<number | null> {
  const factor = 10 ** digits;
  return values.map((value) => (value === null ? null : Math.round(value * factor) / factor));
}

describe('TealscriptEngine', () => {
  describe('unsupported Pine strategy diagnostics', () => {
    it('records an explicit strategy declaration diagnostic', () => {
      const script = `//@version=6
strategy("Test strategy", overlay=true)
plot(close)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors[0]?.message).toBe('strategy() declarations are not supported yet');
    });

    it('records an explicit strategy namespace diagnostic', () => {
      const script = `//@version=6
indicator("Strategy call")
strategy.entry("Long", strategy.long)
plot(close)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors[0]?.message).toBe('strategy.* functions are not supported yet: strategy.entry');
    });
  });

  describe('basic execution', () => {
    it('executes a simple script', () => {
      const script = `//@version=6
indicator("Test")
plot(close)`;

      const ast = parse(script);
      const bars = createBars(10);
      const result = executeScript(ast, bars);

      expect(result.indicatorTitle).toBe('Test');
      expect(result.errors).toHaveLength(0);
    });

    it('returns plot outputs', () => {
      const script = `//@version=6
indicator("Test")
plot(close, title="Close Price")`;

      const ast = parse(script);
      const bars = createBars(10);
      const result = executeScript(ast, bars);

      expect(result.plots.length).toBeGreaterThan(0);
      const closePlot = result.plots.find((p) => p.title === 'Close Price');
      expect(closePlot).toBeDefined();
      expect(closePlot!.values.length).toBe(10);
    });

    it('records indicator max_bars_back metadata', () => {
      const script = `//@version=6
indicator("Buffered", max_bars_back=500)
plot(close[3])`;

      const ast = parse(script);
      const bars = createBars(5);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.indicatorMaxBarsBack).toBe(500);
      expect(result.plots[0].values).toEqual([null, null, null, 100.2, 100.7]);
    });

    it('reports invalid indicator max_bars_back values', () => {
      const script = `//@version=6
indicator("Buffered", max_bars_back=-1)
plot(close)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors[0]?.message).toBe('indicator max_bars_back must be a non-negative integer');
    });

    it('exposes Pine barstate booleans through member access', () => {
      const script = `//@version=6
indicator("Barstate")
plot(barstate.isfirst ? 1 : 0, title="First")
plot(barstate.islast ? 1 : 0, title="Last")
plot(barstate.ishistory ? 1 : 0, title="History")
plot(barstate.isrealtime ? 1 : 0, title="Realtime")
plot(barstate.isnew ? 1 : 0, title="New")
plot(barstate.isconfirmed ? 1 : 0, title="Confirmed")
plot(barstate.islastconfirmedhistory ? 1 : 0, title="Last Confirmed History")`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'First')?.values).toEqual([1, 0, 0]);
      expect(result.plots.find((plot) => plot.title === 'Last')?.values).toEqual([0, 0, 1]);
      expect(result.plots.find((plot) => plot.title === 'History')?.values).toEqual([1, 1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Realtime')?.values).toEqual([0, 0, 0]);
      expect(result.plots.find((plot) => plot.title === 'New')?.values).toEqual([1, 1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Confirmed')?.values).toEqual([1, 1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Last Confirmed History')?.values).toEqual([0, 0, 1]);
    });

    it('exposes Pine calendar variables and timestamp helpers', () => {
      const script = `//@version=6
indicator("Calendar")
plot(year, title="Year")
plot(month, title="Month")
plot(dayofmonth, title="Day")
plot(dayofweek == dayofweek.friday ? 1 : 0, title="Friday")
plot(hour, title="Hour")
plot(minute, title="Minute")
plot(second, title="Second")
plot(timestamp("GMT+2", 2024, 1, 5, 9, 30), title="Timestamp")
plot(hour(timestamp("GMT+2", 2024, 1, 5, 9, 30), "GMT+2"), title="Timestamp Hour")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: Date.UTC(2024, 0, 5, 7, 30, 15), open: 1, high: 2, low: 1, close: 2, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Year')?.values).toEqual([2024]);
      expect(result.plots.find((plot) => plot.title === 'Month')?.values).toEqual([1]);
      expect(result.plots.find((plot) => plot.title === 'Day')?.values).toEqual([5]);
      expect(result.plots.find((plot) => plot.title === 'Friday')?.values).toEqual([1]);
      expect(result.plots.find((plot) => plot.title === 'Hour')?.values).toEqual([7]);
      expect(result.plots.find((plot) => plot.title === 'Minute')?.values).toEqual([30]);
      expect(result.plots.find((plot) => plot.title === 'Second')?.values).toEqual([15]);
      expect(result.plots.find((plot) => plot.title === 'Timestamp')?.values).toEqual([Date.UTC(2024, 0, 5, 7, 30)]);
      expect(result.plots.find((plot) => plot.title === 'Timestamp Hour')?.values).toEqual([9]);
    });

    it('evaluates Pine time and time_close session filters', () => {
      const script = `//@version=6
indicator("Sessions")
plot(time, title="Open Time")
plot(time_close, title="Close Time")
plot(last_bar_time, title="Last Bar Time")
plot(time_close[1], title="Previous Close Time")
plot(time("60", "1430-1600") == time ? 1 : 0, title="In Session")
plot(na(time("60", "1600-1700")) ? 1 : 0, title="Out Session")
plot(time_close("30", "1430-1600"), title="Filtered Close")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: Date.UTC(2024, 0, 5, 14, 0), open: 1, high: 2, low: 1, close: 2, volume: 100 },
        { time: Date.UTC(2024, 0, 5, 14, 30), open: 2, high: 3, low: 2, close: 3, volume: 100 },
        { time: Date.UTC(2024, 0, 5, 16, 0), open: 3, high: 4, low: 3, close: 4, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Open Time')?.values).toEqual([
        Date.UTC(2024, 0, 5, 14, 0),
        Date.UTC(2024, 0, 5, 14, 30),
        Date.UTC(2024, 0, 5, 16, 0),
      ]);
      expect(result.plots.find((plot) => plot.title === 'Close Time')?.values).toEqual([
        Date.UTC(2024, 0, 5, 15, 0),
        Date.UTC(2024, 0, 5, 15, 30),
        Date.UTC(2024, 0, 5, 17, 0),
      ]);
      expect(result.plots.find((plot) => plot.title === 'Last Bar Time')?.values).toEqual([
        Date.UTC(2024, 0, 5, 16, 0),
        Date.UTC(2024, 0, 5, 16, 0),
        Date.UTC(2024, 0, 5, 16, 0),
      ]);
      expect(result.plots.find((plot) => plot.title === 'Previous Close Time')?.values).toEqual([
        null,
        Date.UTC(2024, 0, 5, 15, 0),
        Date.UTC(2024, 0, 5, 15, 30),
      ]);
      expect(result.plots.find((plot) => plot.title === 'In Session')?.values).toEqual([0, 1, 0]);
      expect(result.plots.find((plot) => plot.title === 'Out Session')?.values).toEqual([1, 1, 0]);
      expect(result.plots.find((plot) => plot.title === 'Filtered Close')?.values).toEqual([null, Date.UTC(2024, 0, 5, 15, 0), null]);
    });

    it('exposes Pine syminfo and timeframe values through member access', () => {
      const script = `//@version=6
indicator("Chart Info")
plot(str.length(syminfo.ticker), title="Ticker Length")
plot(str.length(syminfo.tickerid), title="Ticker ID Length")
plot(str.length(syminfo.root), title="Root Length")
plot(syminfo.mintick, title="Min Tick")
plot(syminfo.minmove, title="Min Move")
plot(timeframe.multiplier, title="Timeframe Multiplier")
plot(str.length(timeframe.period), title="Timeframe Period Length")
plot(timeframe.isintraday ? 1 : 0, title="Intraday")
plot(timeframe.isdwm ? 1 : 0, title="DWM")
plot(str.length(timeframe.main_period), title="Main Period Length")
plot(timeframe.in_seconds(), title="Current Seconds")
plot(timeframe.in_seconds("1D"), title="Daily Seconds")
plot(timeframe.in_seconds("15"), title="Minute Seconds")
plot(timeframe.in_seconds("bad"), title="Invalid Seconds")`;

      const ast = parse(script);
      const bars = createBars(2);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Ticker Length')?.values).toEqual([7, 7]);
      expect(result.plots.find((plot) => plot.title === 'Ticker ID Length')?.values).toEqual([7, 7]);
      expect(result.plots.find((plot) => plot.title === 'Root Length')?.values).toEqual([3, 3]);
      expect(result.plots.find((plot) => plot.title === 'Min Tick')?.values).toEqual([0.01, 0.01]);
      expect(result.plots.find((plot) => plot.title === 'Min Move')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Timeframe Multiplier')?.values).toEqual([60, 60]);
      expect(result.plots.find((plot) => plot.title === 'Timeframe Period Length')?.values).toEqual([2, 2]);
      expect(result.plots.find((plot) => plot.title === 'Intraday')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'DWM')?.values).toEqual([0, 0]);
      expect(result.plots.find((plot) => plot.title === 'Main Period Length')?.values).toEqual([2, 2]);
      expect(result.plots.find((plot) => plot.title === 'Current Seconds')?.values).toEqual([3600, 3600]);
      expect(result.plots.find((plot) => plot.title === 'Daily Seconds')?.values).toEqual([86400, 86400]);
      expect(result.plots.find((plot) => plot.title === 'Minute Seconds')?.values).toEqual([900, 900]);
      expect(result.plots.find((plot) => plot.title === 'Invalid Seconds')?.values).toEqual([null, null]);
    });

    it('keeps multiple untitled plots as separate series', () => {
      const script = `//@version=6
indicator("Test")
plot(open, color=color.blue)
plot(high, color=color.green)
plot(low, color=color.red)`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots).toHaveLength(3);
      expect(result.plots.map((plot) => plot.id)).toEqual([
        'plot_untitled_0',
        'plot_untitled_1',
        'plot_untitled_2',
      ]);
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [100, 100.5, 101],
        [100.5, 101, 101.5],
        [99.7, 100.2, 100.7],
      ]);
    });

    it('does not collide untitled plot ids with explicit numeric titles', () => {
      const script = `//@version=6
indicator("Test")
plot(open)
plot(high, title="0")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.map((plot) => plot.id)).toEqual(['plot_untitled_0', 'plot_0']);
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [100, 100.5],
        [100.5, 101],
      ]);
    });

    it('collects alertcondition output values', () => {
      const script = `//@version=6
indicator("Alerts")
isUp = close > open
alertcondition(isUp, title="Green bar", message="Close is above open")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0]).toMatchObject({
        id: 'alertcondition_Green bar',
        type: 'alertcondition',
        title: 'Green bar',
        message: 'Close is above open',
      });
      expect(result.alerts[0].values).toEqual([true, true, true]);
      expect(result.alerts[0].events).toEqual([]);
    });

    it('aligns conditional alertcondition output to bar indexes', () => {
      const script = `//@version=6
indicator("Alerts")
if bar_index >= 2
    alertcondition(true, title="Late", message="late condition")`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].values).toEqual([null, null, true, true, true]);
    });

    it('collects direct alert events with frequency constants', () => {
      const script = `//@version=6
indicator("Alerts")
if close > open
    alert("Green bar", alert.freq_once_per_bar_close)`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0]).toMatchObject({
        id: 'alert_alert_0',
        type: 'alert',
        title: 'alert',
        message: 'Green bar',
        frequency: 'once_per_bar_close',
      });
      expect(result.alerts[0].values).toEqual([true, true, true]);
      expect(result.alerts[0].events.map((event) => ({
        barIndex: event.barIndex,
        message: event.message,
        frequency: event.frequency,
      }))).toEqual([
        { barIndex: 0, message: 'Green bar', frequency: 'once_per_bar_close' },
        { barIndex: 1, message: 'Green bar', frequency: 'once_per_bar_close' },
        { barIndex: 2, message: 'Green bar', frequency: 'once_per_bar_close' },
      ]);
    });

    it('dispatches array method calls to array builtins', () => {
      const script = `//@version=6
indicator("Array Methods")
var array<float> values = array.new_float()
values.push(close)
values.unshift(open)
first = values.shift()
lastIndex = values.size() - 1
last = values.get(lastIndex)
values.set(0, 42)
plot(first, title="First")
plot(last, title="Last")
plot(values.get(0), title="Head")
plot(values.size(), title="Size")
values.clear()`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'First')?.values).toEqual([100, 100.5, 101]);
      expect(result.plots.find((plot) => plot.title === 'Last')?.values).toEqual([100.2, 100.7, 101.2]);
      expect(result.plots.find((plot) => plot.title === 'Head')?.values).toEqual([42, 42, 42]);
      expect(result.plots.find((plot) => plot.title === 'Size')?.values).toEqual([1, 1, 1]);
    });

    it('executes extended array helpers and methods', () => {
      const script = `//@version=6
indicator("Array Extras")
values = array.from(3, 5, 3)
copy = values.copy()
copy.insert(1, 4)
removed = copy.remove(2)
plot(values.first(), title="First")
plot(values.last(), title="Last")
plot(values.includes(5) ? 1 : 0, title="Includes")
plot(values.indexof(3), title="Index")
plot(values.lastindexof(3), title="Last Index")
plot(copy.sum(), title="Sum")
plot(copy.avg(), title="Avg")
plot(copy.min(), title="Min")
plot(copy.max(), title="Max")
plot(removed, title="Removed")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'First')?.values).toEqual([3, 3]);
      expect(result.plots.find((plot) => plot.title === 'Last')?.values).toEqual([3, 3]);
      expect(result.plots.find((plot) => plot.title === 'Includes')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Index')?.values).toEqual([0, 0]);
      expect(result.plots.find((plot) => plot.title === 'Last Index')?.values).toEqual([2, 2]);
      expect(result.plots.find((plot) => plot.title === 'Sum')?.values).toEqual([10, 10]);
      expect(result.plots.find((plot) => plot.title === 'Avg')?.values).toEqual([10 / 3, 10 / 3]);
      expect(result.plots.find((plot) => plot.title === 'Min')?.values).toEqual([3, 3]);
      expect(result.plots.find((plot) => plot.title === 'Max')?.values).toEqual([4, 4]);
      expect(result.plots.find((plot) => plot.title === 'Removed')?.values).toEqual([5, 5]);
    });

    it('executes array ordering helpers and methods', () => {
      const script = `//@version=6
indicator("Array Ordering")
values = array.from(3, 1, 2)
values.sort(order.descending)
top = values.get(0)
values.reverse()
bottom = values.get(0)
more = array.from(4, 5)
values.concat(more)
joined = values.join("|")
plot(top, title="Top")
plot(bottom, title="Bottom")
plot(joined == "1|2|3|4|5" ? 1 : 0, title="Joined")
plot(values.size(), title="Size")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Top')?.values).toEqual([3, 3]);
      expect(result.plots.find((plot) => plot.title === 'Bottom')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Joined')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Size')?.values).toEqual([5, 5]);
    });

    it('executes array slice windows', () => {
      const script = `//@version=6
indicator("Array Slice")
values = array.from(0, 1, 2, 3)
window = values.slice(0, 3)
removed = values.remove(0)
window.push(4)
window.set(1, 20)
plot(window.get(0), title="Window First")
plot(window.get(1), title="Window Second")
plot(values.size(), title="Parent Size")
plot(values.get(3), title="Parent Tail")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Window First')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Window Second')?.values).toEqual([20, 20]);
      expect(result.plots.find((plot) => plot.title === 'Parent Size')?.values).toEqual([4, 4]);
      expect(result.plots.find((plot) => plot.title === 'Parent Tail')?.values).toEqual([4, 4]);
    });

    it('executes array index reads and assignments', () => {
      const script = `//@version=6
indicator("Array Index Assignment")
values = array.from(1, 2, 3)
values[0] := 10
values[1] += 5
literal = [4, 5, 6]
literal[2] *= 2
plot(values[0], title="First")
plot(values[1], title="Second")
plot(literal[2], title="Literal")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'First')?.values).toEqual([10, 10]);
      expect(result.plots.find((plot) => plot.title === 'Second')?.values).toEqual([7, 7]);
      expect(result.plots.find((plot) => plot.title === 'Literal')?.values).toEqual([12, 12]);
    });

    it('executes array slice index assignment against the parent array', () => {
      const script = `//@version=6
indicator("Array Slice Index Assignment")
values = array.from(1, 2, 3, 4)
window = values.slice(1, 3)
window[0] := 20
window[1] += 7
plot(values[1], title="Parent First")
plot(values[2], title="Parent Second")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Parent First')?.values).toEqual([20, 20]);
      expect(result.plots.find((plot) => plot.title === 'Parent Second')?.values).toEqual([10, 10]);
    });

    it('keeps array index access distinct from series history access', () => {
      const script = `//@version=6
indicator("Array Index History")
values = array.from(10, 20)
spread = close - open
plot(values[0], title="Array First")
plot(close[1], title="Previous Close")
plot(spread[1], title="Previous Spread")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Array First')?.values).toEqual([10, 10, 10]);
      expect(result.plots.find((plot) => plot.title === 'Previous Close')?.values).toEqual([null, 100.2, 100.7]);
      expect(roundSeries(result.plots.find((plot) => plot.title === 'Previous Spread')?.values ?? [])).toEqual([null, 0.2, 0.2]);
    });

    it('rejects invalid array index assignments', () => {
      const nonArrayScript = `//@version=6
indicator("Non Array Assignment")
close[0] := 1
plot(close)`;
      const nonArrayResult = executeScript(parse(nonArrayScript), createBars(1, 100));
      expect(nonArrayResult.errors[0]?.message).toBe('Index assignment expects an array');

      const nonFiniteScript = `//@version=6
indicator("Non Finite Index Assignment")
values = array.from(1, 2)
values[na] := 1
plot(values[0])`;
      const nonFiniteResult = executeScript(parse(nonFiniteScript), createBars(1, 100));
      expect(nonFiniteResult.errors[0]?.message).toBe('Array assignment index must be a finite non-negative number');

      const outOfBoundsScript = `//@version=6
indicator("Out Of Bounds Assignment")
values = array.from(1, 2)
values[9] := 1
plot(values[0])`;
      const outOfBoundsResult = executeScript(parse(outOfBoundsScript), createBars(1, 100));
      expect(outOfBoundsResult.errors[0]?.message).toBe('Array index 9 is out of bounds. Array size is 2');
    });

    it('iterates array slice windows', () => {
      const script = `//@version=6
indicator("Array Slice Loop")
values = array.from(1, 2, 3, 4)
window = values.slice(1, 3)
total = 0
for value in window
    total += value
indexed = 0
for [index, value] in window
    indexed += index + value
plot(total, title="Total")
plot(indexed, title="Indexed")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Total')?.values).toEqual([5, 5]);
      expect(result.plots.find((plot) => plot.title === 'Indexed')?.values).toEqual([6, 6]);
    });

    it('returns expression results from user function if branches', () => {
      const script = `//@version=6
indicator("Function If")
positive(value) =>
    if value > 0
        1
negative(value) =>
    if value < 0
        -1
plot(positive(close - open), title="Positive")
plot(negative(close - open), title="Negative")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Positive')?.values).toEqual([1, 1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Negative')?.values).toEqual([null, null, null]);
    });

    it('returns expression results from user function else branches', () => {
      const script = `//@version=6
indicator("Function If Else")
classify(value) =>
    if value > 0
        1
    else if value < 0
        -1
    else
        0
plot(classify(bar_index - 1), title="Classified")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Classified')?.values).toEqual([-1, 0, 1]);
    });

    it('reports direct recursive user function calls', () => {
      const script = `//@version=6
indicator("Direct Recursive Function")
countdown(value) => value <= 0 ? 0 : countdown(value - 1)
plot(countdown(2), title="Countdown")`;

      const ast = parse(script);
      const bars = createBars(1, 100);
      const result = executeScript(ast, bars);

      expect(result.errors[0]?.message).toBe('Recursive user function calls are not supported: countdown -> countdown');
    });

    it('reports mutual recursive user function calls', () => {
      const script = `//@version=6
indicator("Mutual Recursive Function")
even(value) => value <= 0 ? 1 : odd(value - 1)
odd(value) => value <= 0 ? 0 : even(value - 1)
plot(even(2), title="Even")`;

      const ast = parse(script);
      const bars = createBars(1, 100);
      const result = executeScript(ast, bars);

      expect(result.errors[0]?.message).toBe('Recursive user function calls are not supported: even -> odd -> even');
    });

    it('halts execution on runtime.error with a message', () => {
      const script = `//@version=6
indicator("Runtime Error")
plot(close, title="Before")
runtime.error("stop here")
plot(open, title="After")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors[0]?.message).toBe('stop here');
      expect(result.plots.find((plot) => plot.title === 'Before')?.values).toEqual([100.2]);
      expect(result.plots.find((plot) => plot.title === 'After')).toBeUndefined();
    });

    it('accepts runtime.error named message arguments', () => {
      const script = `//@version=6
indicator("Runtime Error Named")
runtime.error(message="named stop")
plot(close)`;

      const ast = parse(script);
      const bars = createBars(1, 100);
      const result = executeScript(ast, bars);

      expect(result.errors[0]?.message).toBe('named stop');
      expect(result.plots).toHaveLength(0);
    });

    it('fills gaps with fixnan and casts primitive values explicitly', () => {
      const script = `//@version=6
indicator("Global Helpers")
source = bar_index == 0 or bar_index == 2 ? na : close
plot(nz(source), title="NZ Default")
plot(nz(source, open), title="NZ Replacement")
plot(fixnan(source), title="Fixed")
plot(float("4.5"), title="Float")
plot(int(4.9), title="Int")
plot(bool(1), title="Bool True")
plot(bool(0), title="Bool False")
plot(string(12.5) == "12.5", title="String Cast")`;

      const ast = parse(script);
      const bars = createBars(4, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'NZ Default')?.values).toEqual([0, 100.7, 0, 101.7]);
      expect(result.plots.find((plot) => plot.title === 'NZ Replacement')?.values).toEqual([100, 100.7, 101, 101.7]);
      expect(result.plots.find((plot) => plot.title === 'Fixed')?.values).toEqual([null, 100.7, 100.7, 101.7]);
      expect(result.plots.find((plot) => plot.title === 'Float')?.values).toEqual([4.5, 4.5, 4.5, 4.5]);
      expect(result.plots.find((plot) => plot.title === 'Int')?.values).toEqual([4, 4, 4, 4]);
      expect(result.plots.find((plot) => plot.title === 'Bool True')?.values).toEqual([true, true, true, true]);
      expect(result.plots.find((plot) => plot.title === 'Bool False')?.values).toEqual([false, false, false, false]);
      expect(result.plots.find((plot) => plot.title === 'String Cast')?.values).toEqual([true, true, true, true]);
    });

    it('rejects bool arguments for v6 na replacement helpers', () => {
      const nzScript = `//@version=6
indicator("NZ Bool")
plot(nz(close > open) ? 1 : 0)`;
      const fixnanScript = `//@version=6
indicator("Fixnan Bool")
plot(fixnan(close > open) ? 1 : 0)`;

      const nzResult = executeScript(parse(nzScript), createBars(1));
      const fixnanResult = executeScript(parse(fixnanScript), createBars(1));

      expect(nzResult.errors[0]?.message).toBe('nz() does not accept bool arguments in Pine v6');
      expect(fixnanResult.errors[0]?.message).toBe('fixnan() does not accept bool arguments in Pine v6');
    });

    it('parses numeric strings with str.tonumber', () => {
      const script = `//@version=6
indicator("String To Number")
plot(str.tonumber("42.5"), title="Decimal")
plot(str.tonumber("  -3e2  "), title="Scientific")
plot(str.tonumber("bad"), title="Invalid")
plot(na(str.tonumber("")) ? 1 : 0, title="Empty Is NA")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Decimal')?.values).toEqual([42.5, 42.5]);
      expect(result.plots.find((plot) => plot.title === 'Scientific')?.values).toEqual([-300, -300]);
      expect(result.plots.find((plot) => plot.title === 'Invalid')?.values).toEqual([null, null]);
      expect(result.plots.find((plot) => plot.title === 'Empty Is NA')?.values).toEqual([1, 1]);
    });

    it('formats timestamps with str.format_time', () => {
      const script = `//@version=6
indicator("String Format Time")
stamp = timestamp("GMT+2", 2024, 1, 5, 9, 30, 15)
plot(str.format_time(stamp, "yyyy-MM-dd HH:mm:ss", "GMT+2") == "2024-01-05 09:30:15", title="Offset")
plot(str.format_time(stamp, "yy/MM/dd HH:mm", "UTC") == "24/01/05 07:30", title="UTC")
plot(str.format_time(na, "yyyy-MM-dd", "UTC") == "NaN", title="Missing")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Offset')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'UTC')?.values).toEqual([true, true]);
      expect(result.plots.find((plot) => plot.title === 'Missing')?.values).toEqual([true, true]);
    });

    it('rounds values to syminfo.mintick', () => {
      const script = `//@version=6
indicator("Round To Min Tick")
plot(math.round_to_mintick(1.234), title="Down")
plot(math.round_to_mintick(1.235), title="Up")
plot(math.round_to_mintick(na), title="Missing")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Down')?.values).toEqual([1.23, 1.23]);
      expect(result.plots.find((plot) => plot.title === 'Up')?.values).toEqual([1.24, 1.24]);
      expect(result.plots.find((plot) => plot.title === 'Missing')?.values).toEqual([null, null]);
    });

    it('halts realtime updateBar execution on runtime.error', () => {
      const script = `//@version=6
indicator("Realtime Runtime Error")
if barstate.isrealtime
    runtime.error("realtime stop")
plot(close, title="Close")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const engine = new TealscriptEngine();
      const result = engine.execute(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(() => engine.updateBar(ast, { ...bars[1], close: 101.5 })).toThrow('realtime stop');
    });

    it('evaluates keyed switch expressions', () => {
      const script = `//@version=6
indicator("Switch Test")
mode = "EMA"
selected = switch mode
    "SMA" => open
    "EMA" => close
    => high
plot(selected, title="Selected")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Selected')?.values).toEqual([100.2, 100.7, 101.2]);
    });

    it('evaluates condition-only switch expressions', () => {
      const script = `//@version=6
indicator("Switch Conditions")
direction = switch
    close > open => 1
    close < open => -1
    => 0
plot(direction, title="Direction")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Direction')?.values).toEqual([1, 1, 1]);
    });

    it('evaluates switch expression block arms', () => {
      const script = `//@version=6
indicator("Switch Block")
mode = "EMA"
selected = switch mode
    "SMA" =>
        basis = open + 1
        basis
    "EMA" =>
        basis = close + 1
        basis
    =>
        high
plot(selected, title="Selected")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Selected')?.values).toEqual([101.2, 101.7, 102.2]);
    });

    it('returns na for switch block arms without an expression result', () => {
      const script = `//@version=6
indicator("Switch Block NA")
selected = switch
    close > open =>
        temp = close + 1
plot(selected, title="Selected")`;

      const ast = parse(script);
      const bars = createBars(1, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Selected')?.values[0]).toBeNull();
    });

    it('returns plotcandle OHLC and color outputs with na gaps', () => {
      const script = `//@version=6
indicator("Synthetic candles", overlay=true)
o = bar_index == 1 ? na : open
h = bar_index == 1 ? na : high
l = bar_index == 1 ? na : low
c = bar_index == 1 ? na : close
body = c >= o ? color.green : color.red
plotcandle(o, h, l, c, title="Synthetic", color=body, wickcolor=color.blue, bordercolor=color.orange)`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      const candles = result.plots.find((plot) => plot.type === 'plotcandle');
      expect(candles).toBeDefined();
      expect(candles?.openValues).toEqual([100, null, 101]);
      expect(candles?.highValues).toEqual([100.5, null, 101.5]);
      expect(candles?.lowValues).toEqual([99.7, null, 100.7]);
      expect(candles?.closeValues).toEqual([100.2, null, 101.2]);
      expect(candles?.values).toEqual([100.2, null, 101.2]);
      expect(candles?.color).toEqual(['#4CAF50', null, '#4CAF50']);
      expect(candles?.wickColor).toEqual(['#2196F3', null, '#2196F3']);
      expect(candles?.borderColor).toEqual(['#FF9800', null, '#FF9800']);
    });

    it('returns plotbar OHLC outputs with directional colors', () => {
      const script = `//@version=6
indicator("Synthetic bars", overlay=true)
barColor = close >= open ? color.green : color.red
plotbar(open, high, low, close, title="Bars", color=barColor)`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      const plotBars = result.plots.find((plot) => plot.type === 'plotbar');
      expect(plotBars).toBeDefined();
      expect(plotBars?.openValues).toEqual([100, 100.5]);
      expect(plotBars?.highValues).toEqual([100.5, 101]);
      expect(plotBars?.lowValues).toEqual([99.7, 100.2]);
      expect(plotBars?.closeValues).toEqual([100.2, 100.7]);
      expect(plotBars?.values).toEqual([100.2, 100.7]);
      expect(plotBars?.color).toEqual(['#4CAF50', '#4CAF50']);
    });

    it('aligns conditionally executed plotcandle outputs to bar indexes', () => {
      const script = `//@version=6
indicator("Conditional candles", overlay=true)
if bar_index > 0
    plotcandle(open, high, low, close, title="Late", color=color.green)`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      const candles = result.plots.find((plot) => plot.type === 'plotcandle');
      expect(candles).toBeDefined();
      expect(candles?.openValues).toEqual([null, 100.5, 101]);
      expect(candles?.values).toEqual([null, 100.7, 101.2]);
      expect(candles?.color).toEqual([null, '#4CAF50', '#4CAF50']);
    });

    it('handles empty bar data', () => {
      const script = `//@version=6
indicator("Test")
plot(close)`;

      const ast = parse(script);
      const result = executeScript(ast, []);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.length).toBe(0);
    });
  });

  describe('built-in series', () => {
    it('provides access to close prices', () => {
      const script = `//@version=6
indicator("Test")
plot(close)`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const result = executeScript(ast, bars);

      const plot = result.plots[0];
      expect(plot.values.length).toBe(5);
      expect(plot.values[0]).toBeCloseTo(100.2, 1);
    });

    it('provides access to OHLCV', () => {
      const script = `//@version=6
indicator("Test")
plot(open, title="O")
plot(high, title="H")
plot(low, title="L")
plot(close, title="C")
plot(volume, title="V")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.plots).toHaveLength(5);
    });

    it('provides bar_index', () => {
      const script = `//@version=6
indicator("Test")
plot(bar_index)`;

      const ast = parse(script);
      const bars = createBars(5);
      const result = executeScript(ast, bars);

      const plot = result.plots[0];
      expect(plot.values).toEqual([0, 1, 2, 3, 4]);
    });
  });

  describe('variable declarations', () => {
    it('handles simple variable declaration', () => {
      const script = `//@version=6
indicator("Test")
x = 42
plot(x)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      const plot = result.plots[0];
      expect(plot.values).toEqual([42, 42, 42]);
    });

    it('handles var keyword for persistence', () => {
      const script = `//@version=6
indicator("Test")
var counter = 0
counter := counter + 1
plot(counter)`;

      const ast = parse(script);
      const bars = createBars(5);
      const result = executeScript(ast, bars);

      const plot = result.plots[0];
      expect(plot.values).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('arithmetic expressions', () => {
    it('evaluates addition', () => {
      const script = `//@version=6
indicator("Test")
x = 1 + 2
plot(x)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(3);
    });

    it('evaluates complex expressions', () => {
      const script = `//@version=6
indicator("Test")
x = (1 + 2) * 3 - 1
plot(x)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(8);
    });

    it('respects operator precedence', () => {
      const script = `//@version=6
indicator("Test")
x = 2 + 3 * 4
plot(x)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(14);
    });
  });

  describe('comparison and logical operations', () => {
    it('evaluates comparisons', () => {
      const script = `//@version=6
indicator("Test")
x = close > open ? 1 : 0
plot(x)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(1);
    });

    it('evaluates logical operators', () => {
      const script = `//@version=6
indicator("Test")
a = true
b = false
x = a and b ? 1 : 0
y = a or b ? 1 : 0
plot(x, title="And")
plot(y, title="Or")`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      const andPlot = result.plots.find((p) => p.title === 'And');
      const orPlot = result.plots.find((p) => p.title === 'Or');

      expect(andPlot!.values[0]).toBe(0);
      expect(orPlot!.values[0]).toBe(1);
    });
  });

  describe('conditional expressions', () => {
    it('evaluates ternary expression', () => {
      const script = `//@version=6
indicator("Test")
x = bar_index == 0 ? 100 : 200
plot(x)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values).toEqual([100, 200, 200]);
    });
  });

  describe('if statements', () => {
    it('executes if branch', () => {
      const script = `//@version=6
indicator("Test")
var x = 0
if bar_index == 0
    x := 100
plot(x)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values).toEqual([100, 100, 100]);
    });
  });

  describe('for loops', () => {
    it('executes for loop', () => {
      const script = `//@version=6
indicator("Test")
sum = 0
for i = 1 to 5
    sum := sum + i
plot(sum)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(15);
    });

    it('executes for loop with step', () => {
      const script = `//@version=6
indicator("Test")
sum = 0
for i = 0 to 10 by 2
    sum := sum + i
plot(sum)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(30);
    });

    it('executes descending for loop with negative step', () => {
      const script = `//@version=6
indicator("Test")
sum = 0
for i = 5 to 1 by -2
    sum := sum + i
plot(sum)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].values[0]).toBe(9);
    });

    it('rejects zero-step for loops', () => {
      const script = `//@version=6
indicator("Test")
sum = 0
for i = 1 to 3 by 0
    sum := sum + i
plot(sum)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors[0]?.message).toBe('For loop step cannot be zero');
    });

    it('caps numeric for loop iterations', () => {
      const script = `//@version=6
indicator("Test")
sum = 0
for i = 1 to 10001
    sum := sum + i
plot(sum)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors[0]?.message).toBe('Maximum loop iterations exceeded');
    });

    it('evaluates numeric for loop expressions to the last body expression', () => {
      const script = `//@version=6
indicator("Test")
value = for i = 0 to 3
    i * 2
plot(value)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].values[0]).toBe(6);
    });

    it('evaluates while loop expressions to the last body expression', () => {
      const script = `//@version=6
indicator("Test")
i = 0
value = while i < 3
    i += 1
    i * 2
plot(value)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].values[0]).toBe(6);
    });

    it('executes collection for loop over Pine arrays', () => {
      const script = `//@version=6
indicator("Test")
values = array.from(1, 2, 3)
sum = 0
for value in values
    sum := sum + value
plot(sum)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].values[0]).toBe(6);
    });

    it('executes collection for loop with Pine index and value tuple', () => {
      const script = `//@version=6
indicator("Test")
values = array.from(10, 20, 30)
sum = 0
for [index, value] in values
    sum := sum + index + value
plot(sum)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].values[0]).toBe(63);
    });

    it('evaluates collection for loop expressions to the last body expression', () => {
      const script = `//@version=6
indicator("Test")
values = array.from(10, 20, 30)
value = for [index, item] in values
    index + item
plot(value)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].values[0]).toBe(32);
    });

    it('preserves the last collection loop expression value across break and continue', () => {
      const script = `//@version=6
indicator("Test")
values = array.from(1, 2, 3, 4)
value = for item in values
    if item == 2
        continue
    if item == 4
        break
    item * 10
plot(value)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].values[0]).toBe(30);
    });

    it('honors break and continue inside collection for loop', () => {
      const script = `//@version=6
indicator("Test")
values = array.from(1, 2, 3, 4)
sum = 0
for value in values
    if value == 2
        continue
    if value == 4
        break
    sum := sum + value
plot(sum)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].values[0]).toBe(4);
    });

    it('caps collection for loop iterations', () => {
      const script = `//@version=6
indicator("Test")
values = array.new_float(10001, 1)
sum = 0
for value in values
    sum := sum + value
plot(sum)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors[0]?.message).toBe('Maximum loop iterations exceeded');
    });
  });

  describe('math functions', () => {
    it('evaluates math.abs', () => {
      const script = `//@version=6
indicator("Test")
x = math.abs(-5)
plot(x)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(5);
    });

    it('evaluates math.max', () => {
      const script = `//@version=6
indicator("Test")
x = math.max(1, 5, 3)
plot(x)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(5);
    });

    it('evaluates math.sqrt', () => {
      const script = `//@version=6
indicator("Test")
x = math.sqrt(16)
plot(x)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(4);
    });
  });

  describe('TA functions', () => {
    it('calculates ta.sma', () => {
      const script = `//@version=6
indicator("Test")
x = ta.sma(close, 3)
plot(x)`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const result = executeScript(ast, bars);

      const plot = result.plots[0];
      expect(plot.values.length).toBe(5);
      expect(plot.values[2]).not.toBeNull();
      expect(plot.values[3]).not.toBeNull();
      expect(plot.values[4]).not.toBeNull();
    });

    it('calculates ta.highest', () => {
      const script = `//@version=6
indicator("Test")
x = ta.highest(high, 3)
plot(x)`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[4]).not.toBeNaN();
    });

    it('calculates ta.lowest', () => {
      const script = `//@version=6
indicator("Test")
x = ta.lowest(low, 3)
plot(x)`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[4]).not.toBeNaN();
    });

    it('calculates cumulative and window statistic TA helpers', () => {
      const script = `//@version=6
indicator("TA stats")
plot(ta.cum(close), title="Cum")
plot(ta.variance(close, 3), title="Variance")
plot(ta.dev(close, 3), title="Deviation")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Cum')?.values).toEqual([100.2, 200.9, 302.1]);
      expect(result.plots.find((plot) => plot.title === 'Variance')?.values).toEqual([null, null, 1 / 6]);
      expect(result.plots.find((plot) => plot.title === 'Deviation')?.values).toEqual([null, null, 1 / 3]);
    });

    it('calculates median, mode, and percentile TA helpers', () => {
      const script = `//@version=6
indicator("TA percentiles")
plot(ta.median(close, 3), title="Median")
plot(ta.mode(close, 3), title="Mode")
plot(ta.percentile_nearest_rank(close, 3, 75), title="Nearest")
plot(ta.percentile_linear_interpolation(close, 3, 75), title="Linear")
plot(ta.percentrank(close, 3), title="Percent Rank")
plot(ta.median(close - open, 3), title="Derived Median")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: 1, open: 0, high: 1, low: 0, close: 1, volume: 100 },
        { time: 2, open: 0, high: 3, low: 0, close: 3, volume: 100 },
        { time: 3, open: 1, high: 2, low: 0, close: 2, volume: 100 },
        { time: 4, open: 4, high: 5, low: 0, close: 5, volume: 100 },
        { time: 5, open: 5, high: 4, low: 0, close: 4, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Median')?.values).toEqual([null, null, 2, 3, 4]);
      expect(result.plots.find((plot) => plot.title === 'Mode')?.values).toEqual([null, null, 1, 2, 2]);
      expect(result.plots.find((plot) => plot.title === 'Nearest')?.values).toEqual([null, null, 3, 5, 5]);
      expect(result.plots.find((plot) => plot.title === 'Linear')?.values).toEqual([null, null, 2.5, 4, 4.5]);
      expect(result.plots.find((plot) => plot.title === 'Percent Rank')?.values).toEqual([null, null, (2 / 3) * 100, 100, (2 / 3) * 100]);
      expect(result.plots.find((plot) => plot.title === 'Derived Median')?.values).toEqual([null, null, 1, 1, 1]);
    });

    it('calculates ALMA and SWMA helpers', () => {
      const script = `//@version=6
indicator("TA averages")
plot(ta.swma(close), title="SWMA")
plot(ta.alma(close, 3, 0.5, 6), title="ALMA")
plot(ta.swma(close - open), title="Derived SWMA")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: 1, open: 0, high: 1, low: 0, close: 1, volume: 100 },
        { time: 2, open: 0, high: 3, low: 0, close: 3, volume: 100 },
        { time: 3, open: 1, high: 2, low: 0, close: 2, volume: 100 },
        { time: 4, open: 4, high: 5, low: 0, close: 5, volume: 100 },
        { time: 5, open: 5, high: 4, low: 0, close: 4, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'SWMA')?.values).toEqual([null, null, null, 8 / 3, 3.5]);
      expect(roundSeries(result.plots.find((plot) => plot.title === 'ALMA')?.values ?? [])).toEqual([null, null, 2.680479, 2.426028, 4.573972]);
      expect(result.plots.find((plot) => plot.title === 'Derived SWMA')?.values).toEqual([null, null, null, 5 / 3, 1]);
    });

    it('calculates rising and falling TA helpers', () => {
      const script = `//@version=6
indicator("TA direction")
plot(ta.rising(close, 2), title="Rising")
plot(ta.falling(close, 2), title="Falling")
plot(ta.falling(close - open, 2), title="Derived Falling")
plot(ta.rising(close), title="Missing Length")`;

      const ast = parse(script);
      const bars: Bar[] = [
        { time: 1, open: 9, high: 11, low: 9, close: 10, volume: 100 },
        { time: 2, open: 9, high: 12, low: 10, close: 11, volume: 100 },
        { time: 3, open: 10, high: 13, low: 11, close: 12, volume: 100 },
        { time: 4, open: 12, high: 12, low: 9, close: 9, volume: 100 },
        { time: 5, open: 9, high: 10, low: 8, close: 8, volume: 100 },
        { time: 6, open: 8, high: 9, low: 7, close: 7, volume: 100 },
      ];
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Rising')?.values).toEqual([false, false, true, false, false, false]);
      expect(result.plots.find((plot) => plot.title === 'Falling')?.values).toEqual([false, false, false, true, true, true]);
      expect(result.plots.find((plot) => plot.title === 'Derived Falling')?.values).toEqual([false, false, false, true, false, false]);
      expect(result.plots.find((plot) => plot.title === 'Missing Length')?.values).toEqual([false, false, false, false, false, false]);
    });
  });

  describe('history access', () => {
    it('accesses previous bar values', () => {
      const script = `//@version=6
indicator("Test")
x = close[1]
plot(x)`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const result = executeScript(ast, bars);

      const plot = result.plots[0];
      expect(plot.values[1]).toBeCloseTo(bars[0].close, 1);
    });

    it('supports dynamic history offsets', () => {
      const script = `//@version=6
indicator("Dynamic History")
length = input.int(2, title="Length")
x = close[length]
plot(x)`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].values).toEqual([null, null, 100.2, 100.7, 101.2]);
    });

    it('truncates fractional dynamic history offsets', () => {
      const script = `//@version=6
indicator("Fractional History")
offset = bar_index > 1 ? 1.9 : 0
x = close[offset]
plot(x)`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].values).toEqual([100.2, 100.7, 100.7]);
    });

    it('returns na for future or unavailable history offsets', () => {
      const script = `//@version=6
indicator("Invalid History")
future = close[-1]
tooFar = close[100]
plot(future, title="Future")
plot(tooFar, title="Too Far")
plot(na(future) ? 1 : 0, title="Future Is NA")
plot(na(tooFar) ? 1 : 0, title="Too Far Is NA")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toEqual([]);
      expect(result.plots.find((plot) => plot.title === 'Future')?.values).toEqual([null, null, null]);
      expect(result.plots.find((plot) => plot.title === 'Too Far')?.values).toEqual([null, null, null]);
      expect(result.plots.find((plot) => plot.title === 'Future Is NA')?.values).toEqual([1, 1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Too Far Is NA')?.values).toEqual([1, 1, 1]);
    });
  });

  describe('inputs', () => {
    it('registers input definitions', () => {
      const script = `//@version=6
indicator("Test")
length = input.int(14, title="Length")
plot(length)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.inputs.length).toBe(1);
      expect(result.inputs[0].title).toBe('Length');
      expect(result.inputs[0].defval).toBe(14);
    });

    it('uses default input value', () => {
      const script = `//@version=6
indicator("Test")
length = input.int(14, title="Length")
plot(length)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values).toEqual([14, 14, 14]);
    });

    it('accepts custom input values', () => {
      const script = `//@version=6
indicator("Test")
length = input.int(14, title="Length")
plot(length)`;

      const ast = parse(script);
      const bars = createBars(3);
      const inputs = new Map([['input_Length', 20]]);
      const result = executeScript(ast, bars, inputs);

      expect(result.plots[0].values).toEqual([20, 20, 20]);
    });
  });

  describe('color functions', () => {
    it('provides color constants', () => {
      const script = `//@version=6
indicator("Test")
plot(close, color=color.red)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      // Color can be a string or an array of colors per bar
      const color = result.plots[0].color;
      const firstColor = Array.isArray(color) ? color[0] : color;
      expect(firstColor).toBe('#F44336');
    });
  });

  describe('error handling', () => {
    it('records errors without crashing', () => {
      const script = `//@version=6
indicator("Test")
x = undefined_var
plot(x)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('updateBar (incremental execution)', () => {
    it('updates plot values on same-timestamp bar', () => {
      const script = `//@version=6
indicator("Test")
plot(close, title="Close")`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const engine = new TealscriptEngine();

      // Full execute
      const result = engine.execute(ast, bars);
      const lastPlotValue = result.plots[0].values[4];
      expect(lastPlotValue).toBeCloseTo(bars[4].close, 5);

      // Update last bar with a different close price
      const updatedBar = { ...bars[4], close: 999 };
      const plots = engine.updateBar(ast, updatedBar);

      const closePlot = plots.find((p) => p.title === 'Close');
      expect(closePlot).toBeDefined();
      // Plot array length must match bar count (no duplicates from re-execution)
      expect(closePlot!.values.length).toBe(bars.length);
      // The last value should reflect the updated close
      expect(closePlot!.values[closePlot!.values.length - 1]).toBe(999);
    });

    it('rollback works correctly between updateBar calls', () => {
      const script = `//@version=6
indicator("Test")
plot(close, title="Close")`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const engine = new TealscriptEngine();

      // Full execute
      const result = engine.execute(ast, bars);
      const closePlot = result.plots.find((p) => p.title === 'Close')!;
      const originalLastValue = closePlot.values[4];
      expect(originalLastValue).toBeCloseTo(bars[4].close, 5);

      // First updateBar with new close
      const updatedBar1 = { ...bars[4], close: 200 };
      const plots1 = engine.updateBar(ast, updatedBar1);
      const close1 = plots1.find((p) => p.title === 'Close')!;
      expect(close1.values.length).toBe(bars.length);
      expect(close1.values[close1.values.length - 1]).toBe(200);

      // Second updateBar — rollback should restore to committed state,
      // so the new close value replaces the previous updateBar's value
      const updatedBar2 = { ...bars[4], close: 300 };
      const plots2 = engine.updateBar(ast, updatedBar2);
      const close2 = plots2.find((p) => p.title === 'Close')!;
      expect(close2.values.length).toBe(bars.length);
      expect(close2.values[close2.values.length - 1]).toBe(300);
    });

    it('snapshot is only taken on the last bar', () => {
      const script = `//@version=6
indicator("Test")
plot(close)`;

      const ast = parse(script);
      const bars = createBars(10, 100);
      const engine = new TealscriptEngine();

      // Full execute
      engine.execute(ast, bars);

      // Verify updateBar works (which requires a snapshot from the last bar)
      const updatedBar = { ...bars[9], close: 555 };
      const plots = engine.updateBar(ast, updatedBar);

      // If snapshot wasn't taken on last bar, rollback would fail
      // and values would be wrong. The fact that we get correct plots
      // means the snapshot was taken on the last bar.
      expect(plots.length).toBeGreaterThan(0);
      expect(plots[0].values.length).toBe(bars.length);
      expect(plots[0].values[plots[0].values.length - 1]).toBe(555);
    });

    it('truncates OHLC plot arrays before same-timestamp re-execution', () => {
      const script = `//@version=6
indicator("Conditional OHLC", overlay=true)
if close > open
    plotcandle(open, high, low, close, title="Conditional", color=color.green)`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const engine = new TealscriptEngine();

      const result = engine.execute(ast, bars);
      const initialPlot = result.plots.find((plot) => plot.type === 'plotcandle');
      expect(initialPlot?.closeValues?.[2]).toBe(101.2);

      const updatedBar = { ...bars[2], close: bars[2].open - 1 };
      const plots = engine.updateBar(ast, updatedBar);
      const updatedPlot = plots.find((plot) => plot.type === 'plotcandle');

      expect(updatedPlot?.values).toEqual([100.2, 100.7]);
      expect(updatedPlot?.openValues).toEqual([100, 100.5]);
      expect(updatedPlot?.closeValues).toEqual([100.2, 100.7]);
      expect(updatedPlot?.color).toEqual(['#4CAF50', '#4CAF50']);
    });

    it('truncates alerts before same-timestamp re-execution', () => {
      const script = `//@version=6
indicator("Alerts")
isUp = close > open
alertcondition(isUp, title="Green", message="green condition")
if isUp
    alert("Green event", alert.freq_once_per_bar)`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const engine = new TealscriptEngine();

      const result = engine.execute(ast, bars);
      expect(result.alerts.find((alert) => alert.type === 'alertcondition')?.values).toEqual([true, true, true]);
      expect(result.alerts.find((alert) => alert.type === 'alert')?.events).toHaveLength(3);

      const updatedBar = { ...bars[2], close: bars[2].open - 1 };
      engine.updateBar(ast, updatedBar);
      const alerts = engine.getAlerts();

      expect(alerts.find((alert) => alert.type === 'alertcondition')?.values).toEqual([true, true, null]);
      expect(alerts.find((alert) => alert.type === 'alert')?.values).toEqual([true, true]);
      expect(alerts.find((alert) => alert.type === 'alert')?.events.map((event) => event.barIndex)).toEqual([0, 1]);
    });
  });
});
