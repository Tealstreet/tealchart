import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

describe('semantic checker', () => {
  it('accepts known Pine globals, namespaces, and user declarations', () => {
    const result = checkProgram(parse(`
indicator("Semantic OK")
length = input.int(3)
basis = ta.sma(close, length)
spread(source) => source - basis
plot(spread(high), title="Spread")
plot(not na(time("1", "0930-1600")) ? 1 : 0, title="Session")
plot(time_tradingday, title="Trading Day")
plot(last_bar_time, title="Last Bar Time")
`));

    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.map((symbol) => `${symbol.kind}:${symbol.name}`)).toEqual([
      'variable:length',
      'variable:basis',
      'function:spread',
    ]);
  });

  it('accepts calendar functions with named time and timezone arguments', () => {
    const result = checkProgram(parse(`
indicator("Calendar Functions")
stamp = timestamp("Asia/Singapore", 2024, 1, 6, 0, 5, 7)
prefixStamp = timestamp(timezone="Asia/Singapore", 2024, 1, 6, 0, 5, 7)
plot(year(time=stamp, timezone="Asia/Singapore"))
plot(year(time=prefixStamp, "Asia/Singapore"))
plot(month(time=stamp, timezone="Asia/Singapore"))
plot(weekofyear(time=stamp, timezone="Asia/Singapore"))
plot(dayofmonth(time=stamp, timezone="Asia/Singapore"))
plot(dayofweek(time=stamp, timezone="Asia/Singapore"))
plot(hour(time=stamp, timezone="Asia/Singapore"))
plot(minute(time=stamp, timezone="Asia/Singapore"))
plot(second(time=stamp, timezone="Asia/Singapore"))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('accepts named timestamp and time filter arguments', () => {
    const result = checkProgram(parse(`
indicator("Time Variants")
stamp = timestamp(timezone="America/New_York", year=2024, month=1, day=5, hour=9, minute=30)
prefixStamp = timestamp(timezone="America/New_York", 2024, 1, 5, 9, 30)
dateStamp = timestamp("20 Aug 2024 00:00:00 +0000")
plot(time(timeframe="60", session="0930-1600", timezone="America/New_York"))
plot(time(timeframe="60", "0930-1600", "America/New_York"))
plot(time_close(timeframe="60", session="0930-1600", timezone="America/New_York"))
plot(time_close(timeframe="60", "0930-1600", "America/New_York"))
plot(stamp + prefixStamp + dateStamp)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('accepts session state helpers and session constants', () => {
    const result = checkProgram(parse(`
indicator("Session State")
active = session.ismarket or session.ispremarket or session.ispostmarket
plot(active ? 1 : 0)
plot(na(time("60", session.regular)) ? 0 : 1)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('accepts explicit Pine boolean and na guard idioms', () => {
    const result = checkProgram(parse(`
indicator("Boolean Guards")
isGreen = close > open
gap = close[100]
if isGreen and not na(gap)
    plot(bool(gap), title="Gap")
plot(na(gap) ? 0 : 1, title="Present")
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports direct na comparisons', () => {
    const result = checkProgram(parse(`
indicator("Direct NA")
gap = close[100]
plot(gap == na ? 1 : 0)
plot(na != gap ? 1 : 0)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Do not compare directly to na; use na(value) instead',
      'Do not compare directly to na; use na(value) instead',
    ]);
  });

  it('reports numeric expressions used as booleans', () => {
    const result = checkProgram(parse(`
indicator("Numeric Bool")
if close
    plot(close)
plot(volume ? 1 : 0)
while bar_index
    break
plot((close > open) and volume ? 1 : 0)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Numeric float expression cannot be used as a boolean; compare it explicitly or wrap it in bool(...)',
      'Numeric float expression cannot be used as a boolean; compare it explicitly or wrap it in bool(...)',
      'Numeric int expression cannot be used as a boolean; compare it explicitly or wrap it in bool(...)',
      'Numeric float expression cannot be used as a boolean; compare it explicitly or wrap it in bool(...)',
    ]);
  });

  it('accepts timeframe utility functions with named arguments', () => {
    const result = checkProgram(parse(`
indicator("Timeframe Utilities")
isLower = timeframe.in_seconds(timeframe="15") < timeframe.in_seconds("1D")
rounded = timeframe.from_seconds(seconds=44)
changed = timeframe.change(timeframe="60")
prefixedSeconds = timeframe.in_seconds(timeframe="1D")
prefixedRounded = timeframe.from_seconds(seconds=30)
prefixedChanged = timeframe.change(timeframe="3")
plot(isLower and changed ? 1 : 0)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('infers time and timeframe return types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("Time Return Types")
period = timeframe.period
mainPeriod = timeframe.main_period
multiplier = timeframe.multiplier
intraday = timeframe.isintraday
secondsValue = timeframe.in_seconds()
rounded = timeframe.from_seconds(seconds=60)
changed = timeframe.change(timeframe="1D")
sessionOpen = time(timeframe="60")
sessionClose = time_close(timeframe="60")
stamp = timestamp(timezone="UTC", year=2024, month=1, day=5, hour=9, minute=30)
period := 1
mainPeriod := 2
multiplier := "bad"
intraday := 1
secondsValue := "bad"
rounded := 3
changed := 1
sessionOpen := "bad"
sessionClose := "bad"
stamp := "bad"
plot(multiplier + secondsValue + sessionOpen + sessionClose + stamp + (intraday ? 1 : 0) + (changed ? 1 : 0))
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign int value to string variable period',
      'Cannot assign int value to string variable mainPeriod',
      'Cannot assign string value to int variable multiplier',
      'Cannot assign int value to bool variable intraday',
      'Cannot assign string value to int variable secondsValue',
      'Cannot assign int value to string variable rounded',
      'Cannot assign int value to bool variable changed',
      'Cannot assign string value to int variable sessionOpen',
      'Cannot assign string value to int variable sessionClose',
      'Cannot assign string value to int variable stamp',
    ]);
    expect(types.get('period')).toMatchObject({ kind: 'string', qualifier: 'simple' });
    expect(types.get('mainPeriod')).toMatchObject({ kind: 'string', qualifier: 'simple' });
    expect(types.get('multiplier')).toMatchObject({ kind: 'int', qualifier: 'simple' });
    expect(types.get('intraday')).toMatchObject({ kind: 'bool', qualifier: 'simple' });
    expect(types.get('secondsValue')).toMatchObject({ kind: 'int', qualifier: 'simple' });
    expect(types.get('rounded')).toMatchObject({ kind: 'string', qualifier: 'simple' });
    expect(types.get('changed')).toMatchObject({ kind: 'bool', qualifier: 'series' });
    expect(types.get('sessionOpen')).toMatchObject({ kind: 'int', qualifier: 'series' });
    expect(types.get('sessionClose')).toMatchObject({ kind: 'int', qualifier: 'series' });
    expect(types.get('stamp')).toMatchObject({ kind: 'int', qualifier: 'const' });
  });

  it('infers syminfo member return types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("Syminfo Return Types")
ticker = syminfo.ticker
tickerId = syminfo.tickerid
root = syminfo.root
timezone = syminfo.timezone
currency = syminfo.currency
volumeType = syminfo.volumetype
country = syminfo.country
sector = syminfo.sector
industry = syminfo.industry
isin = syminfo.isin
currentContract = syminfo.current_contract
minMove = syminfo.minmove
priceScale = syminfo.pricescale
employees = syminfo.employees
shareholders = syminfo.shareholders
expirationDate = syminfo.expiration_date
recommendationsDate = syminfo.recommendations_date
targetPriceDate = syminfo.target_price_date
minTick = syminfo.mintick
pointValue = syminfo.pointvalue
minContract = syminfo.mincontract
floatShares = syminfo.shares_outstanding_float
totalShares = syminfo.shares_outstanding_total
targetAverage = syminfo.target_price_average
targetEstimates = syminfo.target_price_estimates
targetHigh = syminfo.target_price_high
targetLow = syminfo.target_price_low
targetMedian = syminfo.target_price_median
ticker := 1
tickerId := 2
root := 3
timezone := 4
currency := 5
volumeType := 6
country := 7
sector := 8
industry := 9
isin := 10
currentContract := 11
minMove := "bad"
priceScale := "bad"
employees := "bad"
shareholders := "bad"
expirationDate := "bad"
recommendationsDate := "bad"
targetPriceDate := "bad"
minTick := "bad"
pointValue := "bad"
minContract := "bad"
floatShares := "bad"
totalShares := "bad"
targetAverage := "bad"
targetEstimates := "bad"
targetHigh := "bad"
targetLow := "bad"
targetMedian := "bad"
plot(minMove + priceScale + employees + shareholders + expirationDate + recommendationsDate + targetPriceDate + minTick + pointValue + minContract + floatShares + totalShares + targetAverage + targetEstimates + targetHigh + targetLow + targetMedian)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign int value to string variable ticker',
      'Cannot assign int value to string variable tickerId',
      'Cannot assign int value to string variable root',
      'Cannot assign int value to string variable timezone',
      'Cannot assign int value to string variable currency',
      'Cannot assign int value to string variable volumeType',
      'Cannot assign int value to string variable country',
      'Cannot assign int value to string variable sector',
      'Cannot assign int value to string variable industry',
      'Cannot assign int value to string variable isin',
      'Cannot assign int value to string variable currentContract',
      'Cannot assign string value to int variable minMove',
      'Cannot assign string value to int variable priceScale',
      'Cannot assign string value to int variable employees',
      'Cannot assign string value to int variable shareholders',
      'Cannot assign string value to int variable expirationDate',
      'Cannot assign string value to int variable recommendationsDate',
      'Cannot assign string value to int variable targetPriceDate',
      'Cannot assign string value to float variable minTick',
      'Cannot assign string value to float variable pointValue',
      'Cannot assign string value to float variable minContract',
      'Cannot assign string value to float variable floatShares',
      'Cannot assign string value to float variable totalShares',
      'Cannot assign string value to float variable targetAverage',
      'Cannot assign string value to float variable targetEstimates',
      'Cannot assign string value to float variable targetHigh',
      'Cannot assign string value to float variable targetLow',
      'Cannot assign string value to float variable targetMedian',
    ]);
    expect(types.get('ticker')).toMatchObject({ kind: 'string', qualifier: 'simple' });
    expect(types.get('tickerId')).toMatchObject({ kind: 'string', qualifier: 'simple' });
    expect(types.get('root')).toMatchObject({ kind: 'string', qualifier: 'simple' });
    expect(types.get('timezone')).toMatchObject({ kind: 'string', qualifier: 'simple' });
    expect(types.get('currency')).toMatchObject({ kind: 'string', qualifier: 'simple' });
    expect(types.get('volumeType')).toMatchObject({ kind: 'string', qualifier: 'simple' });
    expect(types.get('country')).toMatchObject({ kind: 'string', qualifier: 'simple' });
    expect(types.get('sector')).toMatchObject({ kind: 'string', qualifier: 'simple' });
    expect(types.get('industry')).toMatchObject({ kind: 'string', qualifier: 'simple' });
    expect(types.get('isin')).toMatchObject({ kind: 'string', qualifier: 'simple' });
    expect(types.get('currentContract')).toMatchObject({ kind: 'string', qualifier: 'simple' });
    expect(types.get('minMove')).toMatchObject({ kind: 'int', qualifier: 'simple' });
    expect(types.get('priceScale')).toMatchObject({ kind: 'int', qualifier: 'simple' });
    expect(types.get('employees')).toMatchObject({ kind: 'int', qualifier: 'simple' });
    expect(types.get('shareholders')).toMatchObject({ kind: 'int', qualifier: 'simple' });
    expect(types.get('expirationDate')).toMatchObject({ kind: 'int', qualifier: 'simple' });
    expect(types.get('recommendationsDate')).toMatchObject({ kind: 'int', qualifier: 'series' });
    expect(types.get('targetPriceDate')).toMatchObject({ kind: 'int', qualifier: 'series' });
    expect(types.get('minTick')).toMatchObject({ kind: 'float', qualifier: 'simple' });
    expect(types.get('pointValue')).toMatchObject({ kind: 'float', qualifier: 'simple' });
    expect(types.get('minContract')).toMatchObject({ kind: 'float', qualifier: 'simple' });
    expect(types.get('floatShares')).toMatchObject({ kind: 'float', qualifier: 'simple' });
    expect(types.get('totalShares')).toMatchObject({ kind: 'float', qualifier: 'simple' });
    expect(types.get('targetAverage')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('targetEstimates')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('targetHigh')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('targetLow')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('targetMedian')).toMatchObject({ kind: 'float', qualifier: 'series' });
  });

  it('accepts Pine log calls with format arguments', () => {
    const result = checkProgram(parse(`
indicator("Logs")
log.info("close={0}", close)
log.info(message="named close={0}", close)
log.warning("bar {0}", bar_index)
log.warning(message="named bar {0}", bar_index)
log.error("done")
log.error(message="named done {0}", close)
plot(close)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid Pine log call arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Logs")
log.info()
log.warning(text="bad")
log.trace("unsupported")
`));

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'argument-count',
        message: 'log.info() expects at least 1 argument',
      }),
      expect.objectContaining({
        code: 'argument-count',
        message: "log.info() missing required argument 'message'",
      }),
      expect.objectContaining({
        code: 'unknown-argument',
        message: "Unknown argument 'text' for log.warning()",
      }),
      expect.objectContaining({
        code: 'argument-count',
        message: 'log.warning() expects at least 1 argument',
      }),
      expect.objectContaining({
        code: 'argument-count',
        message: "log.warning() missing required argument 'message'",
      }),
      expect.objectContaining({
        code: 'unknown-function',
        message: 'Unknown function: log.trace',
      }),
    ]);
  });

  it('reports unknown calls under signed Pine builtin namespaces', () => {
    const result = checkProgram(parse(`
indicator("Bad Builtin Calls")
request.securty(syminfo.tickerid, "1D", close)
ta.smoothed(close, 14)
array.fro(close)
matrix.rota(matrix.new<float>())
timeframe.to_seconds("1D")
ticker.make("NASDAQ:AAPL")
chart.point.later(close)
plot(close)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Unknown function: request.securty',
      'Unknown function: ta.smoothed',
      'Unknown function: array.fro',
      'Unknown function: matrix.rota',
      'Unknown function: timeframe.to_seconds',
      'Unknown function: ticker.make',
      'Unknown function: chart.point.later',
    ]);
  });

  it('does not report unknown builtin calls for user-defined methods', () => {
    const result = checkProgram(parse(`
indicator("User Methods")
type Pivot
    float price
method smoothed(Pivot this, int length) => this.price
pivot = Pivot.new(close)
plot(pivot.smoothed(14))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid drawing constructor named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Drawing Constructors")
left = chart.point.from_index(bar_index, low)
right = chart.point.from_index(bar_index + 1, high)
line.new(left, right, opacity=80)
box.new(left, right, border_color=color.blue, opacity=80)
plot(close)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'opacity' for line.new()",
      "Unknown argument 'opacity' for box.new()",
    ]);
  });

  it('accepts Pine alert calls and alertcondition declarations', () => {
    const result = checkProgram(parse(`
indicator("Alerts")
isUp = close > open
alertcondition(isUp, title="Green", message="Close {{close}}")
alertcondition(condition=isUp, "Mixed Green", "Mixed close {{close}}")
if isUp
    alert("Green", alert.freq_once_per_bar_close)
    alert(message="Mixed Green", alert.freq_once_per_bar)
plot(close)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid Pine alert arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Alerts")
alert()
alert("ok", alert.freq_all, true)
alertcondition(true, title="A", message="M", freq=alert.freq_all)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'alert() expects at least 1 argument',
      "alert() missing required argument 'message'",
      'alert() expects at most 2 arguments',
      "Unknown argument 'freq' for alertcondition()",
    ]);
  });

  it('reports invalid Pine built-in argument bindings', () => {
    const result = checkProgram(parse(`
indicator("Invalid Built-in Bindings")
plot(close, title="Close", title="Duplicate")
plot(close, series=open)
plot(close, typo=true)
hline(100, price=200)
hline(price=100, style=hline.style_dotted)
fill(plot1=plot(close), hline1=plot(open), plot2=plot(high), color=color.red)
fill(plot1=plot(high), color=color.blue)
plotshape(series=close > open, caption="Bad")
plot(ta.sma(source=close))
plot(strategy.opentrades.entry_price(trade_num=0, 1))
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'title' for plot() was supplied multiple times",
      "Argument 'series' for plot() was supplied multiple times",
      "Unknown argument 'typo' for plot()",
      "Argument 'price' for hline() was supplied multiple times",
      "Unknown argument 'style' for hline()",
      "Argument 'hline1' for fill() was supplied multiple times",
      'fill() expects at least 3 arguments',
      "fill() missing required argument 'plot2'",
      "Unknown argument 'caption' for plotshape()",
      'ta.sma() expects at least 2 arguments',
      "ta.sma() missing required argument 'length'",
      'strategy.opentrades.entry_price() cannot use positional arguments after named arguments',
    ]);
  });

  it('reports invalid OHLC visual output argument bindings', () => {
    const result = checkProgram(parse(`
indicator("Invalid OHLC Visual Bindings")
plotbar(open=open, high=high, low=low)
plotbar(open, high, low, close, candle_color=color.red)
plotbar(open, high, low, close, open=open)
plotcandle(open=open, high=high, low=low)
plotcandle(open, high, low, close, wick_color=color.red)
plotcandle(open, high, low, close, close=close)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'plotbar() expects at least 4 arguments',
      "plotbar() missing required argument 'close'",
      "Unknown argument 'candle_color' for plotbar()",
      "Argument 'open' for plotbar() was supplied multiple times",
      'plotcandle() expects at least 4 arguments',
      "plotcandle() missing required argument 'close'",
      "Unknown argument 'wick_color' for plotcandle()",
      "Argument 'close' for plotcandle() was supplied multiple times",
    ]);
  });

  it('reports invalid marker visual output argument bindings', () => {
    const result = checkProgram(parse(`
indicator("Invalid Marker Visual Bindings")
plotchar()
plotchar(series=close > open, glyph="B")
plotchar(close > open, series=close < open)
plotarrow()
plotarrow(series=close - open, color_up=color.green)
plotarrow(close - open, series=open - close)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'plotchar() expects at least 1 argument',
      "plotchar() missing required argument 'series'",
      "Unknown argument 'glyph' for plotchar()",
      "Argument 'series' for plotchar() was supplied multiple times",
      'plotarrow() expects at least 1 argument',
      "plotarrow() missing required argument 'series'",
      "Unknown argument 'color_up' for plotarrow()",
      "Argument 'series' for plotarrow() was supplied multiple times",
    ]);
  });

  it('reports invalid Pine declaration arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Indicator", initial_capital=1000, typo=true)
strategy("Bad Strategy", initial_capital=1000, typo=true)
library("Bad Library", precision=2, dynamic_requests=true)
export f(float x) => x
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'initial_capital' for indicator()",
      "Unknown argument 'typo' for indicator()",
      "Unknown argument 'typo' for strategy()",
      "Unknown argument 'precision' for library()",
    ]);
  });

  it('accepts Pine library positional dynamic requests declarations', () => {
    const result = checkProgram(parse(`
library("Dynamic Library", true, false)
export f(float x) => x
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('accepts Pine strategy order and trade accessor calls', () => {
    const result = checkProgram(parse(`
strategy("Strategy", initial_capital=1000, pyramiding=1, default_qty_type=strategy.fixed, default_qty_value=1)
strategy.risk.allow_entry_in(strategy.direction.long)
strategy.entry("Long", strategy.long, qty=1, limit=close, oca_type=strategy.oca.cancel, alert_message="entry")
strategy.entry(id="PrefixLong", strategy.long, 1, close, na, "EntryOca", strategy.oca.cancel, "entry comment", "entry alert")
strategy.order(id="Add", direction=strategy.long, qty=1)
strategy.order(id="PrefixAdd", strategy.long, 1, close)
strategy.exit("Exit", from_entry="Long", qty_percent=50, limit=close + 1, stop=close - 1)
strategy.exit(id="PrefixExit", "Long", 1, na, na, close + 1, na, close - 1)
strategy.close("Long", qty=1, alert_message="close")
strategy.close(id="PrefixLong", "close comment", 1)
strategy.close_all(comment="flat")
strategy.close_all(comment="flat prefix", "flat alert")
strategy.cancel("Add")
strategy.cancel_all()
plot(strategy.opentrades.capital_held)
plot(strategy.opentrades.entry_price(0))
plot(str.length(strategy.opentrades.entry_comment(0)))
plot(strategy.opentrades.profit_percent(0))
plot(strategy.opentrades.max_runup(0))
plot(strategy.opentrades.max_drawdown(trade_num=0))
plot(strategy.opentrades.max_runup_percent(0))
plot(strategy.opentrades.max_drawdown_percent(trade_num=0))
plot(strategy.closedtrades.exit_price(trade_num=0))
plot(str.length(strategy.closedtrades.entry_comment(0)))
plot(str.length(strategy.closedtrades.exit_comment(trade_num=0)))
plot(strategy.closedtrades.profit_percent(0))
plot(strategy.closedtrades.max_runup(0))
plot(strategy.closedtrades.max_drawdown(trade_num=0))
plot(strategy.closedtrades.max_runup_percent(0))
plot(strategy.closedtrades.max_drawdown_percent(trade_num=0))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('infers Pine strategy state and trade accessor return types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
strategy("Strategy Return Types", initial_capital=1000)
equity = strategy.equity
positionSize = strategy.position_size
accountCurrency = strategy.account_currency
positionEntryName = strategy.position_entry_name
openTrades = strategy.opentrades
capitalHeld = strategy.opentrades.capital_held
closedTrades = strategy.closedtrades
winTrades = strategy.wintrades
entryId = strategy.opentrades.entry_id(0)
entryComment = strategy.opentrades.entry_comment(0)
entryBar = strategy.opentrades.entry_bar_index(0)
entryTime = strategy.opentrades.entry_time(0)
entryPrice = strategy.opentrades.entry_price(0)
openProfitPercent = strategy.opentrades.profit_percent(0)
openRunup = strategy.opentrades.max_runup(0)
openDrawdown = strategy.opentrades.max_drawdown(0)
openRunupPercent = strategy.opentrades.max_runup_percent(0)
openDrawdownPercent = strategy.opentrades.max_drawdown_percent(0)
exitId = strategy.closedtrades.exit_id(trade_num=0)
closedEntryComment = strategy.closedtrades.entry_comment(0)
exitComment = strategy.closedtrades.exit_comment(trade_num=0)
exitBar = strategy.closedtrades.exit_bar_index(trade_num=0)
exitTime = strategy.closedtrades.exit_time(trade_num=0)
exitPrice = strategy.closedtrades.exit_price(trade_num=0)
closedProfit = strategy.closedtrades.profit(trade_num=0)
closedProfitPercent = strategy.closedtrades.profit_percent(0)
closedRunup = strategy.closedtrades.max_runup(0)
closedDrawdown = strategy.closedtrades.max_drawdown(0)
closedRunupPercent = strategy.closedtrades.max_runup_percent(0)
closedDrawdownPercent = strategy.closedtrades.max_drawdown_percent(0)
equity := "bad"
positionSize := "bad"
accountCurrency := 1
positionEntryName := 1
openTrades := "bad"
capitalHeld := "bad"
closedTrades := "bad"
winTrades := "bad"
entryId := 1
entryComment := 1
entryBar := "bad"
entryTime := "bad"
entryPrice := "bad"
openProfitPercent := "bad"
openRunup := "bad"
openDrawdown := "bad"
openRunupPercent := "bad"
openDrawdownPercent := "bad"
exitId := 2
closedEntryComment := 2
exitComment := 2
exitBar := "bad"
exitTime := "bad"
exitPrice := "bad"
closedProfit := "bad"
closedProfitPercent := "bad"
closedRunup := "bad"
closedDrawdown := "bad"
closedRunupPercent := "bad"
closedDrawdownPercent := "bad"
plot(equity + positionSize + openTrades + capitalHeld + closedTrades + winTrades + entryBar + entryTime + entryPrice + openProfitPercent + openRunup + openDrawdown + openRunupPercent + openDrawdownPercent + exitBar + exitTime + exitPrice + closedProfit + closedProfitPercent + closedRunup + closedDrawdown + closedRunupPercent + closedDrawdownPercent + str.length(accountCurrency) + str.length(positionEntryName) + str.length(entryId) + str.length(entryComment) + str.length(closedEntryComment) + str.length(exitId) + str.length(exitComment))
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to float variable equity',
      'Cannot assign string value to float variable positionSize',
      'Cannot assign int value to string variable accountCurrency',
      'Cannot assign int value to string variable positionEntryName',
      'Cannot assign string value to int variable openTrades',
      'Cannot assign string value to float variable capitalHeld',
      'Cannot assign string value to int variable closedTrades',
      'Cannot assign string value to int variable winTrades',
      'Cannot assign int value to string variable entryId',
      'Cannot assign int value to string variable entryComment',
      'Cannot assign string value to int variable entryBar',
      'Cannot assign string value to int variable entryTime',
      'Cannot assign string value to float variable entryPrice',
      'Cannot assign string value to float variable openProfitPercent',
      'Cannot assign string value to float variable openRunup',
      'Cannot assign string value to float variable openDrawdown',
      'Cannot assign string value to float variable openRunupPercent',
      'Cannot assign string value to float variable openDrawdownPercent',
      'Cannot assign int value to string variable exitId',
      'Cannot assign int value to string variable closedEntryComment',
      'Cannot assign int value to string variable exitComment',
      'Cannot assign string value to int variable exitBar',
      'Cannot assign string value to int variable exitTime',
      'Cannot assign string value to float variable exitPrice',
      'Cannot assign string value to float variable closedProfit',
      'Cannot assign string value to float variable closedProfitPercent',
      'Cannot assign string value to float variable closedRunup',
      'Cannot assign string value to float variable closedDrawdown',
      'Cannot assign string value to float variable closedRunupPercent',
      'Cannot assign string value to float variable closedDrawdownPercent',
    ]);
    expect(types.get('equity')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('positionSize')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('accountCurrency')).toMatchObject({ kind: 'string', qualifier: 'series' });
    expect(types.get('positionEntryName')).toMatchObject({ kind: 'string', qualifier: 'series' });
    expect(types.get('openTrades')).toMatchObject({ kind: 'int', qualifier: 'series' });
    expect(types.get('capitalHeld')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('closedTrades')).toMatchObject({ kind: 'int', qualifier: 'series' });
    expect(types.get('winTrades')).toMatchObject({ kind: 'int', qualifier: 'series' });
    expect(types.get('entryId')).toMatchObject({ kind: 'string', qualifier: 'series' });
    expect(types.get('entryComment')).toMatchObject({ kind: 'string', qualifier: 'series' });
    expect(types.get('entryBar')).toMatchObject({ kind: 'int', qualifier: 'series' });
    expect(types.get('entryTime')).toMatchObject({ kind: 'int', qualifier: 'series' });
    expect(types.get('entryPrice')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('openProfitPercent')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('openRunup')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('openDrawdown')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('openRunupPercent')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('openDrawdownPercent')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('exitId')).toMatchObject({ kind: 'string', qualifier: 'series' });
    expect(types.get('closedEntryComment')).toMatchObject({ kind: 'string', qualifier: 'series' });
    expect(types.get('exitComment')).toMatchObject({ kind: 'string', qualifier: 'series' });
    expect(types.get('exitBar')).toMatchObject({ kind: 'int', qualifier: 'series' });
    expect(types.get('exitTime')).toMatchObject({ kind: 'int', qualifier: 'series' });
    expect(types.get('exitPrice')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('closedProfit')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('closedProfitPercent')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('closedRunup')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('closedDrawdown')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('closedRunupPercent')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('closedDrawdownPercent')).toMatchObject({ kind: 'float', qualifier: 'series' });
  });

  it('reports invalid Pine strategy call arguments', () => {
    const result = checkProgram(parse(`
strategy("Bad Strategy")
strategy.entry("Long")
strategy.cancel_all("unexpected")
strategy.entri("Long", strategy.long)
strategy.opentrades.entry_price()
strategy.exit("Exit", from_entry="Long", unknown=1)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'strategy.entry() expects at least 2 arguments',
      "strategy.entry() missing required argument 'direction'",
      'strategy.cancel_all() expects at most 0 arguments',
      'Unknown function: strategy.entri',
      'strategy.opentrades.entry_price() expects at least 1 argument',
      "strategy.opentrades.entry_price() missing required argument 'trade_num'",
      "Unknown argument 'unknown' for strategy.exit()",
    ]);
  });

  it('reports invalid literal Pine strategy order values', () => {
    const result = checkProgram(parse(`
strategy("Bad Strategy")
strategy.entry("", "up", qty=0, oca_type="bad")
strategy.order(id="Add", direction="down", qty=-1, oca_type=strategy.oca.cancel)
strategy.close("", qty=-1, qty_percent=0)
strategy.exit("", qty=-1, qty_percent=0, profit=0, loss=-1, trail_points=-1, trail_offset=0)
strategy.risk.allow_entry_in("sideways")
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'strategy.entry id must not be empty',
      'Invalid strategy direction for strategy.entry: up',
      'strategy.entry qty must be a positive number',
      'Invalid strategy oca_type for strategy.entry: bad',
      'Invalid strategy direction for strategy.order: down',
      'strategy.order qty must be a positive number',
      'strategy.close id must not be empty',
      'strategy.close qty must be a positive number',
      'strategy.close qty_percent must be a positive number',
      'strategy.exit id must not be empty',
      'strategy.exit qty must be a positive number',
      'strategy.exit qty_percent must be a positive number',
      'strategy.exit profit must be a positive number',
      'strategy.exit loss must be a positive number',
      'strategy.exit trail_points must be a non-negative number',
      'strategy.exit trailing stop offset must be positive',
      'Invalid strategy entry direction: sideways',
    ]);
  });

  it('reports duplicate declarations in the same scope', () => {
    const result = checkProgram(parse(`
indicator("Duplicate")
length = 3
length = 5
`));

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'duplicate-symbol',
        message: 'Duplicate declaration: length',
      }),
    ]);
  });

  it('reports invalid library export declarations', () => {
    const validLibrary = checkProgram(parse(`
library("Valid")
export type Pivot
    float y
export scale(float value, simple float multiplier) => value * multiplier
export method lifted(Pivot this, float amount) => this
export enum Direction
    up = "Up"
    down = "Down"
export pick() => Direction.up
`));
    const emptyLibrary = checkProgram(parse(`
library("Empty")
helper(float value) => value
`));
    const exportedInIndicator = checkProgram(parse(`
indicator("Export Outside Library")
export scale(float value) => value * 2
export type Pivot
    float y
export enum Direction
    up = "Up"
`));
    const untypedExport = checkProgram(parse(`
library("Untyped Export")
export scale(value, float multiplier) => value * multiplier
export method lifted(Pivot this, amount) => this
export type Pivot
    float y
`));

    expect(validLibrary.diagnostics).toEqual([]);
    expect(emptyLibrary.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Library scripts must export at least one function, method, user-defined type, enum, or constant',
    ]);
    expect(exportedInIndicator.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Exported declarations are only allowed in library scripts: scale',
      'Exported declarations are only allowed in library scripts: Pivot',
      'Exported declarations are only allowed in library scripts: Direction',
    ]);
    expect(untypedExport.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Exported function scale parameter value must declare a type',
      'Exported method lifted parameter amount must declare a type',
    ]);
  });

  it('validates exported library constants', () => {
    const valid = checkProgram(parse(`
library("Constants")
export const int length = 14
export color bull = color.green
export float ratio = math.pi
export string period = timeframe.period
export string ticker = syminfo.ticker
export string labelStyle = label.style_label_center
export string lineStyle = line.style_arrow_both
export string labelXloc = xloc.bar_time
export string labelYloc = yloc.abovebar
export string lineExtend = extend.both
export string tablePosition = position.bottom_right
export string textAlignment = text.align_center
export string fontFamily = font.family_monospace
export string labelSize = size.small
export prefix(simple string value) => value
`));

    const outsideLibrary = checkProgram(parse(`
export const int outside = 1
indicator("Outside")
plot(close)
`));

    const invalid = checkProgram(parse(`
library("Bad Constants")
export value = 1
export const float seriesValue = close
export const int functionReference = ta.sma
export const string requestReference = request.security
export [a, b] = array.from(1, 2)
`));

    expect(valid.diagnostics).toEqual([]);
    expect(outsideLibrary.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Exported declarations are only allowed in library scripts: outside',
    ]);
    expect(invalid.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Exported constants must declare a type',
      'Exported constants must be literal values or compatible built-in variables',
      'Exported constants must be literal values or compatible built-in variables',
      'Exported constants must be literal values or compatible built-in variables',
      'Exported constants cannot use tuple declarations',
      'Exported constants must declare a type',
      'Exported constants must be literal values or compatible built-in variables',
      'Cannot assign series value to const float',
    ]);
  });

  it('reports exported library signatures that expose non-exported user-defined types', () => {
    const result = checkProgram(parse(`
library("Exported UDT Contracts")
type Hidden
    float value
export type Visible
    Hidden direct
    array<Hidden> list
    map<string, Hidden> lookup
export consume(Hidden direct, array<Hidden> list, map<string, Hidden> lookup) => direct.value
export method lifted(Hidden this, float amount) => this
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Exported field direct in Visible uses non-exported user-defined type: Hidden',
      'Exported field list in Visible uses non-exported user-defined type: Hidden',
      'Exported field lookup in Visible uses non-exported user-defined type: Hidden',
      'Exported function parameter direct in consume uses non-exported user-defined type: Hidden',
      'Exported function parameter list in consume uses non-exported user-defined type: Hidden',
      'Exported function parameter lookup in consume uses non-exported user-defined type: Hidden',
      'Exported method parameter this in lifted uses non-exported user-defined type: Hidden',
      'Exported method lifted returns non-exported user-defined type: Hidden',
    ]);
  });

  it('reports exported library callables that return non-exported user-defined types', () => {
    const result = checkProgram(parse(`
library("Exported UDT Returns")
type Hidden
    float value
export type Visible
    float value
export makeHidden(float value) => Hidden.new(value)
export makeHiddenList(float value) => array.from(Hidden.new(value))
export makeHiddenMap(float value) => map.new<string, Hidden>()
export makeHiddenFromBlock(float value) =>
    result = Hidden.new(value)
    result
export makeVisible(float value) => Visible.new(value)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Exported function makeHidden returns non-exported user-defined type: Hidden',
      'Exported function makeHiddenList returns non-exported user-defined type: Hidden',
      'Exported function makeHiddenMap returns non-exported user-defined type: Hidden',
      'Exported function makeHiddenFromBlock returns non-exported user-defined type: Hidden',
    ]);
  });

  it('reports invalid exported library function scopes', () => {
    const result = checkProgram(parse(`
library("Export Scope")
const int allowed = 2
scale = input.int(2)
globalPrice = close
export usesGlobals(float value) =>
    localScale = allowed
    value * scale + globalPrice + localScale
export assignsGlobal(float value) =>
    scale := value
    value
export usesInput(float value) =>
    length = input.int(14)
    value + length
export shadowsGlobal(float scale) => scale + allowed
export lateShadow(float value) =>
    before = value + scale
    scale = 1
    before + scale
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Exported function usesGlobals cannot use non-const global variable: scale',
      'Exported function usesGlobals cannot use non-const global variable: globalPrice',
      'Exported function assignsGlobal cannot use non-const global variable: scale',
      'Exported function usesInput cannot call input.*() functions',
      'Exported function lateShadow cannot use non-const global variable: scale',
      'Cannot assign float value to int variable scale',
    ]);
  });

  it('reports exported library request expressions that depend on parameters', () => {
    const result = checkProgram(parse(`
library("Export Request Scope")
export validRequest(float value) => request.security(syminfo.tickerid, "1", close)
export invalidPositional(float value) => request.security(syminfo.tickerid, "1", value)
export invalidNamed(float value) => request.security(syminfo.tickerid, "1", expression=value + close)
export invalidNested(float value) => request.security(syminfo.tickerid, "1", ta.sma(value, 2))
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Exported function invalidPositional request expression cannot depend on exported parameters',
      'Exported function invalidNamed request expression cannot depend on exported parameters',
      'Exported function invalidNested request expression cannot depend on exported parameters',
    ]);
  });

  it('allows nested scopes to shadow outer declarations', () => {
    const result = checkProgram(parse(`
indicator("Shadow")
value = 1
adjust(value) =>
    value + 1
plot(adjust(close))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports duplicate function parameters and tuple names', () => {
    const result = checkProgram(parse(`
indicator("Duplicate Params")
bad(left, left) => left
[a, a] = [1, 2]
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Duplicate declaration: left',
      'Duplicate declaration: a',
    ]);
  });

  it('treats tuple underscore placeholders as discards', () => {
    const result = checkProgram(parse(`
indicator("Tuple Discards")
[_, direction, _] = [1, close, "ignored"]
direction := "bad"
plot(direction)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to float variable direction',
    ]);
    expect(result.symbols.map((symbol) => symbol.name)).not.toContain('_');
  });

  it('infers tuple destructuring element types from literal expressions', () => {
    const result = checkProgram(parse(`
indicator("Tuple Literal Types")
[count, title, marker, price] = [1, "A", label.new(bar_index, close), close]
count := 1.5
title := 2
marker := line.new(bar_index, low, bar_index, high)
price := "bad"
plot(price)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign float value to int variable count',
      'Cannot assign int value to string variable title',
      'Cannot assign line value to label variable marker',
      'Cannot assign string value to float variable price',
    ]);
  });

  it('infers tuple destructuring element types from known TA tuple returns', () => {
    const result = checkProgram(parse(`
indicator("TA Tuple Types")
[macdLine, signalLine, hist] = ta.macd(close, 12, 26, 9)
[basis, upper, lower] = ta.bb(close, 20, 2)
[supertrend, direction] = ta.supertrend(3, 10)
[diPlus, diMinus, adx] = ta.dmi(14, 14)
macdLine := "bad"
basis := "bad"
direction := "up"
adx := "bad"
plot(signalLine + hist + upper + lower + supertrend + diPlus + diMinus)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to float variable macdLine',
      'Cannot assign string value to float variable basis',
      'Cannot assign string value to int variable direction',
      'Cannot assign string value to float variable adx',
    ]);
  });

  it('infers tuple destructuring element types from direct user function tuple returns', () => {
    const result = checkProgram(parse(`
indicator("UDF Tuple Types")
pair(float value, string title) => [value, title]
markerPair(float value) =>
    marker = label.new(bar_index, value)
    [value, marker]
recursiveTuple(float value) => recursiveTuple(value)
[seriesValue, constTitle] = pair(close, "Close")
[markerValue, marker] = markerPair(close)
[unknownValue, unknownTitle] = recursiveTuple(close)
seriesValue := "bad"
constTitle := 1
marker := line.new(bar_index, low, bar_index, high)
unknownValue := "still unknown"
plot(markerValue)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to float variable seriesValue',
      'Cannot assign int value to string variable constTitle',
      'Cannot assign line value to label variable marker',
    ]);
    expect(types.get('seriesValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('constTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('markerValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('marker')).toMatchObject({ kind: 'label' });
    expect(types.get('unknownValue')).toMatchObject({ kind: 'unknown' });
    expect(types.get('unknownTitle')).toMatchObject({ kind: 'unknown' });
  });

  it('infers tuple destructuring element types from compatible user function branch tuple returns', () => {
    const result = checkProgram(parse(`
indicator("Branch Tuple Types")
branchPair(float value, bool enabled) =>
    if enabled
        [value, "up"]
    else
        [value + 1, "down"]
layeredPair(float value, int mode) =>
    if mode == 1
        [value, "one"]
    else if mode == 2
        [value + 1, "two"]
    else
        [value + 2, "other"]
wideningPair(float value, bool enabled) =>
    if enabled
        [1, "one"]
    else
        [value, "float"]
partialPair(float value, bool enabled) =>
    if enabled
        [value, "partial"]
conflictingPair(bool enabled) =>
    if enabled
        [1, "one"]
    else
        ["bad", 2]
[branchValue, branchTitle] = branchPair(close, close > open)
[layeredValue, layeredTitle] = layeredPair(close, 2)
[widenedValue, widenedTitle] = wideningPair(close, close > open)
[partialValue, partialTitle] = partialPair(close, close > open)
[unknownValue, unknownTitle] = conflictingPair(close > open)
branchValue := "bad"
branchTitle := 1
layeredValue := "bad"
layeredTitle := 2
widenedValue := "bad"
widenedTitle := 3
partialValue := "bad"
partialTitle := 4
unknownValue := "still unknown"
unknownTitle := 3
plot(branchValue + layeredValue + widenedValue + partialValue)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to float variable branchValue',
      'Cannot assign int value to string variable branchTitle',
      'Cannot assign string value to float variable layeredValue',
      'Cannot assign int value to string variable layeredTitle',
      'Cannot assign string value to float variable widenedValue',
      'Cannot assign int value to string variable widenedTitle',
      'Cannot assign string value to float variable partialValue',
      'Cannot assign int value to string variable partialTitle',
    ]);
    expect(types.get('branchValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('branchTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('layeredValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('layeredTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('widenedValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('widenedTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('partialValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('partialTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('unknownValue')).toMatchObject({ kind: 'unknown' });
    expect(types.get('unknownTitle')).toMatchObject({ kind: 'unknown' });
  });

  it('infers tuple destructuring element types from if initializer returns', () => {
    const result = checkProgram(parse(`
indicator("If Initializer Tuple Types")
[branchValue, branchTitle] = if close > open
    [close, "up"]
else
    [open, "down"]
[partialValue, partialTitle] = if close > open
    [close, "partial"]
branchValue := "bad"
branchTitle := 1
partialValue := "bad"
partialTitle := 2
plot(branchValue + partialValue)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to float variable branchValue',
      'Cannot assign int value to string variable branchTitle',
      'Cannot assign string value to float variable partialValue',
      'Cannot assign int value to string variable partialTitle',
    ]);
    expect(types.get('branchValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('branchTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('partialValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('partialTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
  });

  it('infers tuple destructuring element types from switch initializer returns', () => {
    const result = checkProgram(parse(`
indicator("Switch Initializer Tuple Types")
mode = "wide"
[keyedValue, keyedTitle] = switch mode
    "price" => [close, "price"]
    "wide" => [1, "wide"]
    => [open, "default"]
[conditionValue, conditionTitle] = switch
    close > open => [close, "up"]
    => [open, "down"]
[blockValue, blockTitle] = switch mode
    "basis" =>
        basis = close + 1
        [basis, "basis"]
    =>
        [open, "fallback"]
[partialValue, partialTitle] = switch mode
    "wide" => [close, "partial"]
keyedValue := "bad"
keyedTitle := 1
conditionValue := "bad"
conditionTitle := 2
blockValue := "bad"
blockTitle := 3
partialValue := "bad"
partialTitle := 4
plot(keyedValue + conditionValue + blockValue + partialValue)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to float variable keyedValue',
      'Cannot assign int value to string variable keyedTitle',
      'Cannot assign string value to float variable conditionValue',
      'Cannot assign int value to string variable conditionTitle',
      'Cannot assign string value to float variable blockValue',
      'Cannot assign int value to string variable blockTitle',
      'Cannot assign string value to float variable partialValue',
      'Cannot assign int value to string variable partialTitle',
    ]);
    expect(types.get('keyedValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('keyedTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('conditionValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('conditionTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('blockValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('blockTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('partialValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('partialTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
  });

  it('infers tuple destructuring element types from direct loop initializer returns', () => {
    const result = checkProgram(parse(`
indicator("Loop Initializer Tuple Types")
[numericValue, numericTitle] = for i = 0 to 2
    [close + i, "numeric"]
values = array.from(close, open)
[collectionValue, collectionTitle] = for [index, item] in values
    [item + index, "collection"]
i = 0
[whileValue, whileTitle] = while i < 2
    i += 1
    [close + i, "while"]
numericValue := "bad"
numericTitle := 1
collectionValue := "bad"
collectionTitle := 2
whileValue := "bad"
whileTitle := 3
plot(numericValue + collectionValue + whileValue)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to float variable numericValue',
      'Cannot assign int value to string variable numericTitle',
      'Cannot assign string value to float variable collectionValue',
      'Cannot assign int value to string variable collectionTitle',
      'Cannot assign string value to float variable whileValue',
      'Cannot assign int value to string variable whileTitle',
    ]);
    expect(types.get('numericValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('numericTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('collectionValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('collectionTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('whileValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('whileTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
  });

  it('infers tuple destructuring element types from user function loop tuple returns', () => {
    const result = checkProgram(parse(`
indicator("Loop Tuple Types")
numericPair(float value, int limit) =>
    for i = 0 to limit
        [value + i, "numeric"]
collectionPair(float value) =>
    values = array.from(value, value + 1)
    for [index, item] in values
        [item + index, "collection"]
whilePair(float value, int limit) =>
    i = 0
    while i < limit
        i += 1
        [value + i, "while"]
[numericValue, numericTitle] = numericPair(close, 2)
[collectionValue, collectionTitle] = collectionPair(close)
[whileValue, whileTitle] = whilePair(close, 2)
numericValue := "bad"
numericTitle := 1
collectionValue := "bad"
collectionTitle := 2
whileValue := "bad"
whileTitle := 3
plot(numericValue + collectionValue + whileValue)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to float variable numericValue',
      'Cannot assign int value to string variable numericTitle',
      'Cannot assign string value to float variable collectionValue',
      'Cannot assign int value to string variable collectionTitle',
      'Cannot assign string value to float variable whileValue',
      'Cannot assign int value to string variable whileTitle',
    ]);
    expect(types.get('numericValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('numericTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('collectionValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('collectionTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('whileValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('whileTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
  });

  it('infers tuple destructuring element types from user function switch tuple returns', () => {
    const result = checkProgram(parse(`
indicator("Switch Tuple Types")
keyedPair(float value, string mode) => switch mode
    "price" => [value, "price"]
    "wide" => [1, "wide"]
    => [value + 1, "default"]
conditionPair(float value) => switch
    value > open => [value, "up"]
    => [value + 1, "down"]
blockPair(float value, string mode) => switch mode
    "basis" =>
        basis = value + 1
        [basis, "basis"]
    =>
        [value, "fallback"]
partialPair(float value, string mode) => switch mode
    "price" => [value, "partial"]
partialBlockPair(float value, string mode) => switch mode
    "basis" =>
        basis = value + 1
        [basis, "partial block"]
mixedShapePair(float value, string mode) => switch mode
    "price" => [value, "price"]
    => value
[keyedValue, keyedTitle] = keyedPair(close, "wide")
[conditionValue, conditionTitle] = conditionPair(close)
[blockValue, blockTitle] = blockPair(close, "basis")
[partialValue, partialTitle] = partialPair(close, "price")
[partialBlockValue, partialBlockTitle] = partialBlockPair(close, "basis")
[unknownValue, unknownTitle] = mixedShapePair(close, "price")
keyedValue := "bad"
keyedTitle := 1
conditionValue := "bad"
conditionTitle := 2
blockValue := "bad"
blockTitle := 3
partialValue := "bad"
partialTitle := 4
partialBlockValue := "bad"
partialBlockTitle := 5
unknownValue := "still unknown"
unknownTitle := 6
plot(keyedValue + conditionValue + blockValue + partialValue + partialBlockValue)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Tuple declaration expects 2 values but initializer arm returns a non-tuple value',
      'Cannot assign string value to float variable keyedValue',
      'Cannot assign int value to string variable keyedTitle',
      'Cannot assign string value to float variable conditionValue',
      'Cannot assign int value to string variable conditionTitle',
      'Cannot assign string value to float variable blockValue',
      'Cannot assign int value to string variable blockTitle',
      'Cannot assign string value to float variable partialValue',
      'Cannot assign int value to string variable partialTitle',
      'Cannot assign string value to float variable partialBlockValue',
      'Cannot assign int value to string variable partialBlockTitle',
    ]);
    expect(types.get('keyedValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('keyedTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('conditionValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('conditionTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('blockValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('blockTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('partialValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('partialTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('partialBlockValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('partialBlockTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('unknownValue')).toMatchObject({ kind: 'unknown' });
    expect(types.get('unknownTitle')).toMatchObject({ kind: 'unknown' });
  });

  it('infers tuple destructuring element types from direct user method tuple returns', () => {
    const result = checkProgram(parse(`
indicator("Method Tuple Types")
type Pivot
    float y
method pair(float this, string title) => [this, title]
method annotate(Pivot this, string title) =>
    [this.y, title]
pivot = Pivot.new(close)
[priceValue, priceTitle] = close.pair("Close")
[pivotValue, pivotTitle] = pivot.annotate("Pivot")
priceValue := "bad"
priceTitle := 1
pivotValue := "bad"
pivotTitle := 2
plot(priceValue + pivotValue)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to float variable priceValue',
      'Cannot assign int value to string variable priceTitle',
      'Cannot assign string value to float variable pivotValue',
      'Cannot assign int value to string variable pivotTitle',
    ]);
    expect(types.get('priceValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('priceTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('pivotValue')).toMatchObject({ kind: 'float' });
    expect(types.get('pivotTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
  });

  it('infers tuple destructuring element types from user method control-flow tuple returns', () => {
    const result = checkProgram(parse(`
indicator("Method Control Tuple Types")
method branchPair(float this, bool enabled) =>
    if enabled
        [this, "up"]
    else
        [this + 1, "down"]
method partialBranchPair(float this, bool enabled) =>
    if enabled
        [this, "partial branch"]
method loopPair(float this, int limit) =>
    for i = 0 to limit
        [this + i, "loop"]
method switchPair(float this, string mode) => switch mode
    "wide" => [1, "wide"]
    => [this, "default"]
method partialSwitchPair(float this, string mode) => switch mode
    "wide" => [this, "partial switch"]
method mixedShapePair(float this, bool enabled) =>
    if enabled
        [this, "mixed"]
    else
        this
[branchValue, branchTitle] = close.branchPair(close > open)
[partialBranchValue, partialBranchTitle] = close.partialBranchPair(close > open)
[loopValue, loopTitle] = close.loopPair(2)
[switchValue, switchTitle] = close.switchPair("wide")
[partialSwitchValue, partialSwitchTitle] = close.partialSwitchPair("wide")
[mixedValue, mixedTitle] = close.mixedShapePair(close > open)
branchValue := "bad"
branchTitle := 1
partialBranchValue := "bad"
partialBranchTitle := 2
loopValue := "bad"
loopTitle := 3
switchValue := "bad"
switchTitle := 4
partialSwitchValue := "bad"
partialSwitchTitle := 5
mixedValue := "still unknown"
mixedTitle := 6
plot(branchValue + partialBranchValue + loopValue + switchValue + partialSwitchValue)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Tuple declaration expects 2 values but initializer arm returns a non-tuple value',
      'Cannot assign string value to float variable branchValue',
      'Cannot assign int value to string variable branchTitle',
      'Cannot assign string value to float variable partialBranchValue',
      'Cannot assign int value to string variable partialBranchTitle',
      'Cannot assign string value to float variable loopValue',
      'Cannot assign int value to string variable loopTitle',
      'Cannot assign string value to float variable switchValue',
      'Cannot assign int value to string variable switchTitle',
      'Cannot assign string value to float variable partialSwitchValue',
      'Cannot assign int value to string variable partialSwitchTitle',
    ]);
    expect(types.get('branchValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('branchTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('partialBranchValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('partialBranchTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('loopValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('loopTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('switchValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('switchTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('partialSwitchValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('partialSwitchTitle')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('mixedValue')).toMatchObject({ kind: 'unknown' });
    expect(types.get('mixedTitle')).toMatchObject({ kind: 'unknown' });
  });

  it('infers user method control-flow expression types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("Method Control Expression Types")
method branchValue(float this, bool enabled) =>
    if enabled
        this
    else
        1
method partialBranchValue(float this, bool enabled) =>
    if enabled
        this
method loopValue(float this, int limit) =>
    for i = 0 to limit
        this + i
method whileValue(float this, bool enabled) =>
    while enabled
        this
method switchValue(float this, string mode) => switch mode
    "wide" => 1
    => this
method partialSwitchValue(float this, string mode) => switch mode
    "wide" => this
branchResult = close.branchValue(close > open)
partialBranchResult = close.partialBranchValue(close > open)
loopResult = close.loopValue(2)
whileResult = close.whileValue(close > open)
switchResult = close.switchValue("wide")
partialSwitchResult = close.partialSwitchValue("wide")
branchResult := "bad"
partialBranchResult := "bad"
loopResult := "bad"
whileResult := "bad"
switchResult := "bad"
partialSwitchResult := "bad"
plot(branchResult + partialBranchResult + loopResult + whileResult + switchResult + partialSwitchResult)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to float variable branchResult',
      'Cannot assign string value to float variable partialBranchResult',
      'Cannot assign string value to float variable loopResult',
      'Cannot assign string value to float variable whileResult',
      'Cannot assign string value to float variable switchResult',
      'Cannot assign string value to float variable partialSwitchResult',
    ]);
    expect(types.get('branchResult')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('partialBranchResult')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('loopResult')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('whileResult')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('switchResult')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('partialSwitchResult')).toMatchObject({ kind: 'float', qualifier: 'series' });
  });

  it('reports annotated mixed conditional initializer arm mismatches', () => {
    const result = checkProgram(parse(`
indicator("Mixed Control Initializer Diagnostics")
mode = "price"
float ternaryValue = close > open ? close : "bad"
float switchValue = switch mode
    "price" => close
    => "bad"
float ifValue = if close > open
    close
else
    "bad"
plot(close)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to float variable',
      'Cannot assign string value to float variable',
      'Cannot assign string value to float variable',
    ]);
  });

  it('reports tuple control initializer shape mismatches', () => {
    const result = checkProgram(parse(`
indicator("Tuple Control Initializer Shape Diagnostics")
method tripleMethod(float this) => [this, this + 1, "method"]
mode = "price"
[ifValue, ifTitle] = if close > open
    [close, "up"]
else
    close
[localMethodValue, localMethodTitle] = if close > open
    localClose = close
    localClose.tripleMethod()
else
    [open, "fallback"]
[switchValue, switchTitle] = switch mode
    "price" => [close, "price", 1]
    => [open, "fallback"]
[loopValue, loopTitle] = for i = 0 to 2
    [close + i, "loop", i]
[emptyValue, emptyTitle] = if close > open
    value = close
else
    [open, "fallback"]
plot(close)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Tuple declaration expects 2 values but initializer arm returns a non-tuple value',
      'Tuple declaration expects 2 values but initializer arm returns 3',
      'Tuple declaration expects 2 values but initializer arm returns 3',
      'Tuple declaration expects 2 values but initializer arm returns 3',
      'Tuple declaration expects 2 values but initializer arm returns a non-tuple value',
    ]);
  });

  it('reports direct tuple initializer shape mismatches', () => {
    const result = checkProgram(parse(`
indicator("Direct Tuple Initializer Shape Diagnostics")
triple(float value) => [value, value + 1, "udf"]
method tripleMethod(float this) => [this, this + 1, "method"]
[literalValue, literalTitle] = [close]
[macdLine, signalLine] = ta.macd(close, 12, 26, 9)
[udfValue, udfTitle] = triple(close)
[methodValue, methodTitle] = close.tripleMethod()
[scalarValue, scalarTitle] = close
plot(close)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Tuple declaration expects 2 values but initializer arm returns 1',
      'Tuple declaration expects 2 values but initializer arm returns 3',
      'Tuple declaration expects 2 values but initializer arm returns 3',
      'Tuple declaration expects 2 values but initializer arm returns 3',
      'Tuple declaration expects 2 values but initializer arm returns a non-tuple value',
    ]);
  });

  it('reports assignments to undeclared identifiers', () => {
    const result = checkProgram(parse(`
indicator("Unknown Assignment")
known = close
missing := known + 1
`));

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'unknown-assignment-target',
        message: 'Cannot assign to undeclared identifier: missing',
      }),
    ]);
  });

  it('reports plain identifier reassignment type mismatches', () => {
    const result = checkProgram(parse(`
indicator("Assignment Type Mismatches")
enum Direction
    up = "Up"
    down = "Down"
enum Mode
    fast = "Fast"
    slow = "Slow"
type Pivot
    float y
type Other
    float y
int total = 1
float price = 1
string name = "fast"
label tag = label.new(bar_index, close)
array<float> values = array.new<float>()
Direction direction = Direction.up
Pivot pivot = Pivot.new(close)
unknown = na
total := 2
price := total
unknown := "later"
name := 1
tag := line.new(bar_index, low, bar_index, high)
values := array.new<string>()
direction := Mode.fast
pivot := Other.new(close)
plot(price)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign int value to string variable name',
      'Cannot assign line value to label variable tag',
      'Cannot assign array<string> value to array<float> variable values',
      'Cannot assign Mode value to Direction variable direction',
      'Cannot assign Other value to Pivot variable pivot',
    ]);
  });

  it('infers compatible switch expression types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("Switch Expression Types")
mode = "wide"
keyedValue = switch mode
    "price" => close
    "wide" => 1
    => open
conditionTitle = switch
    close > open => "up"
    => "down"
blockValue = switch mode
    "basis" =>
        basis = close + 1
        basis
    =>
        open
mixedValue = switch mode
    "price" => close
    => "bad"
partialValue = switch mode
    "price" => close
partialBlockValue = switch mode
    "price" =>
        basis = close + 1
        basis
simple float simpleValue = 1
keyedValue := "bad"
conditionTitle := 1
blockValue := "bad"
mixedValue := "still unknown"
partialValue := "bad"
partialBlockValue := "bad"
simpleValue := partialBlockValue
plot(keyedValue + blockValue)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to float variable keyedValue',
      'Cannot assign int value to string variable conditionTitle',
      'Cannot assign string value to float variable blockValue',
      'Cannot assign string value to float variable partialValue',
      'Cannot assign string value to float variable partialBlockValue',
      'Cannot assign series value to simple float variable simpleValue',
    ]);
    expect(types.get('keyedValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('conditionTitle')).toMatchObject({ kind: 'string', qualifier: 'series' });
    expect(types.get('blockValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('mixedValue')).toMatchObject({ kind: 'unknown' });
    expect(types.get('partialValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('partialBlockValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
  });

  it('infers compatible user function if expression types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("If Expression Types")
branchValue(float value, bool enabled) =>
    if enabled
        value
    else
        1
layeredTitle(bool up, bool down) =>
    if up
        "up"
    else if down
        "down"
    else
        "flat"
blockValue(float value, bool enabled) =>
    if enabled
        basis = value + 1
        basis
    else
        value
mixedValue(float value, bool enabled) =>
    if enabled
        value
    else
        "bad"
partialValue(float value, bool enabled) =>
    if enabled
        value
priceValue = branchValue(close, close > open)
title = layeredTitle(close > open, close < open)
blockResult = blockValue(close, close > open)
mixedResult = mixedValue(close, close > open)
partialResult = partialValue(close, close > open)
simple float simpleValue = 1
priceValue := "bad"
title := 1
blockResult := "bad"
mixedResult := "still unknown"
partialResult := "bad"
simpleValue := partialResult
plot(priceValue + blockResult)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to float variable priceValue',
      'Cannot assign int value to string variable title',
      'Cannot assign string value to float variable blockResult',
      'Cannot assign string value to float variable partialResult',
      'Cannot assign series value to simple float variable simpleValue',
    ]);
    expect(types.get('priceValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('title')).toMatchObject({ kind: 'string', qualifier: 'series' });
    expect(types.get('blockResult')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('mixedResult')).toMatchObject({ kind: 'unknown' });
    expect(types.get('partialResult')).toMatchObject({ kind: 'float', qualifier: 'series' });
  });

  it('infers user function loop expression types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("Loop Expression Types")
numericValue(float value, int limit) =>
    for i = 0 to limit
        value + i
collectionValue(float value) =>
    values = array.from(value, value + 1)
    for [index, item] in values
        item + index
whileValue(float value, int limit) =>
    i = 0
    while i < limit
        i += 1
        value + i
mixedValue(float value, int limit) =>
    for i = 0 to limit
        if i == 0
            value
        else
            "bad"
rangeControl(float limit) =>
    for i = 0 to limit
        1
collectionControl(float value) =>
    values = array.from(value)
    for item in values
        1
whileControl(bool enabled) =>
    while enabled
        1
numericResult = numericValue(close, 2)
collectionResult = collectionValue(close)
whileResult = whileValue(close, 2)
mixedResult = mixedValue(close, 2)
simple int simpleRange = 1
simple int simpleCollection = 1
simple int simpleWhile = 1
numericResult := "bad"
collectionResult := "bad"
whileResult := "bad"
mixedResult := "still unknown"
simpleRange := rangeControl(close)
simpleCollection := collectionControl(close)
simpleWhile := whileControl(close > open)
plot(numericResult + collectionResult + whileResult)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to float variable numericResult',
      'Cannot assign string value to float variable collectionResult',
      'Cannot assign string value to float variable whileResult',
      'Cannot assign series value to simple int variable simpleRange',
      'Cannot assign series value to simple int variable simpleCollection',
      'Cannot assign series value to simple int variable simpleWhile',
    ]);
    expect(types.get('numericResult')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('collectionResult')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('whileResult')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('mixedResult')).toMatchObject({ kind: 'unknown', qualifier: 'series' });
  });

  it('infers direct loop expression types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("Direct Loop Expression Types")
numericResult = for i = 0 to 2
    close + i
i = 0
whileResult = while i < 3
    i += 1
    i
simple int simpleWhile = while bar_index < 3
    1
numericResult := "bad"
whileResult := "bad"
plot(numericResult + whileResult + simpleWhile)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign series value to simple int',
      'Cannot assign string value to float variable numericResult',
      'Cannot assign string value to int variable whileResult',
    ]);
    expect(types.get('numericResult')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('whileResult')).toMatchObject({ kind: 'int', qualifier: 'const' });
    expect(types.get('simpleWhile')).toMatchObject({ kind: 'int', qualifier: 'simple' });
  });

  it('infers direct collection loop expression types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("Direct Collection Loop Expression Types")
values = array.from(close, open)
itemResult = for item in values
    item
indexedResult = for [index, item] in array.from(close, open)
    item + index
simple float simpleItem = for item in values
    1
itemResult := "bad"
indexedResult := "bad"
plot(itemResult + indexedResult + simpleItem)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign series value to simple float',
      'Cannot assign string value to float variable itemResult',
      'Cannot assign string value to float variable indexedResult',
    ]);
    expect(types.get('itemResult')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('indexedResult')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('simpleItem')).toMatchObject({ kind: 'float', qualifier: 'simple' });
  });

  it('infers compatible ternary expression types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("Ternary Expression Types")
priceValue = close > open ? close : 1
title = close > open ? "up" : "down"
constValue = true ? 1 : 2.5
mixedValue = close > open ? close : "bad"
simple float simpleValue = 1
priceValue := "bad"
title := 1
constValue := "bad"
mixedValue := "still unknown"
simpleValue := mixedValue
plot(priceValue + constValue)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to float variable priceValue',
      'Cannot assign int value to string variable title',
      'Cannot assign string value to float variable constValue',
      'Cannot assign series value to simple float variable simpleValue',
    ]);
    expect(types.get('priceValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('title')).toMatchObject({ kind: 'string', qualifier: 'series' });
    expect(types.get('constValue')).toMatchObject({ kind: 'float', qualifier: 'const' });
    expect(types.get('mixedValue')).toMatchObject({ kind: 'unknown', qualifier: 'series' });
  });

  it('reports plain identifier reassignment qualifier mismatches', () => {
    const result = checkProgram(parse(`
indicator("Assignment Qualifier Mismatches")
simple float base = 1
series float tracked = close
base := 2
tracked := base
base := close
plot(tracked)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign series value to simple float variable base',
    ]);
  });

  it('reports plain identifier compound assignment type mismatches', () => {
    const result = checkProgram(parse(`
indicator("Compound Assignment Mismatches")
int count = 1
float total = 1
string labelText = "A"
unknown = na
int badCount = 1
string badText = "A"
label tag = label.new(bar_index, close)
simple int simpleCount = 1
count += 2
total += count
labelText += "B"
unknown += "later"
badCount += 1.5
badText -= "B"
tag += 1
count /= 2
simpleCount += bar_index
plot(total)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign float value to int variable badCount',
      'Compound assignment -= requires numeric operands, got string and string',
      'Compound assignment += requires numeric or string operands, got label and int',
      'Cannot assign float value to int variable count',
      'Cannot assign series value to simple int variable simpleCount',
    ]);
  });

  it('reports unknown identifiers and functions', () => {
    const result = checkProgram(parse(`
indicator("Unknowns")
value = missingSource + 1
plot(customFn(value))
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Unknown identifier: missingSource',
      'Unknown function: customFn',
    ]);
  });

  it('reports positional arguments after named arguments for user callables', () => {
    const result = checkProgram(parse(`
indicator("User Callable Argument Order")
scale(float value, float factor=2) => value * factor
method add(float this, float value, float factor=1) => this + value * factor
badFunction = scale(value=close, 3)
badMethod = close.add(value=1, 2)
plot(badFunction + badMethod)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'function scale cannot use positional arguments after named arguments',
      'method add cannot use positional arguments after named arguments',
    ]);
  });

  it('reports invalid user-callable argument bindings', () => {
    const result = checkProgram(parse(`
indicator("User Callable Argument Bindings")
scale(float value, float factor=2) => value * factor
required(float value, float factor) => value * factor
method add(float this, float value, float factor=1) => this + value * factor
badUnknown = scale(source=close)
badDuplicate = scale(close, value=open)
badTooMany = scale(close, 2, 3)
badMissing = required(close)
badMethodUnknown = close.add(source=1)
badMethodDuplicate = close.add(1, value=2)
badMethodTooMany = close.add(1, 2, 3)
badMethodMissing = close.add()
plot(badUnknown + badDuplicate + badTooMany + badMissing + badMethodUnknown + badMethodDuplicate + badMethodTooMany + badMethodMissing)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'source' for function scale",
      "Argument 'value' for function scale was supplied multiple times",
      'Too many arguments for function scale: expected 2, got 3',
      "function required missing required argument 'factor'",
      "Unknown argument 'source' for method add",
      "Argument 'value' for method add was supplied multiple times",
      'Too many arguments for method add: expected 2, got 3',
      "method add missing required argument 'value'",
    ]);
  });

  it('infers user-defined function call return types', () => {
    const result = checkProgram(parse(`
indicator("User Function Returns")
identity(float value) => value
price(float value) => value + close
marker(float value) => label.new(bar_index, value)
values(float value) => array.from(value)
recursive(float value) => recursive(value)
inputValue = input.float(1)
constIdentity = identity(1)
inputIdentity = identity(inputValue)
seriesIdentity = identity(close)
seriesPrice = price(1)
seriesMarker = marker(close)
seriesValues = values(close)
constRecursive = recursive(1)
seriesRecursive = recursive(close)
plot(seriesPrice + array.size(seriesValues))
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('constIdentity')).toMatchObject({ kind: 'float', qualifier: 'const' });
    expect(types.get('inputIdentity')).toMatchObject({ kind: 'float', qualifier: 'input' });
    expect(types.get('seriesIdentity')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('seriesPrice')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('seriesMarker')).toMatchObject({ kind: 'label' });
    expect(types.get('seriesValues')).toMatchObject({ kind: 'array', elementType: { kind: 'float' } });
    expect(types.get('constRecursive')).toMatchObject({ kind: 'unknown', qualifier: 'const' });
    expect(types.get('seriesRecursive')).toMatchObject({ kind: 'unknown', qualifier: 'series' });
  });

  it('records value and reference types from annotations', () => {
    const result = checkProgram(parse(`
indicator("Typed Symbols")
type pivotPoint
    int x
    float y
int length = 3
float basis = 1.5
bool enabled = true
string labelText = "hi"
color tint = color.red
array<float> values = array.new_float()
genericValues = array.new<float>()
genericGrid = matrix.new<float>(1, 1, 0)
nestedValues = array.new<array<float>>()
nestedGrid = matrix.new<map<string, float>>(1, 1)
nestedLookup = map.new<string, array<float>>()
floatValues = array.new_float()
intValues = array.new_int()
labelValues = array.new_label()
matrix<int> grid = matrix.new<int>(1, 1, 0)
map<string, float> lookup = map.new<string, float>()
pivotPoint pivot = na
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('length')).toMatchObject({ kind: 'int' });
    expect(types.get('basis')).toMatchObject({ kind: 'float' });
    expect(types.get('enabled')).toMatchObject({ kind: 'bool' });
    expect(types.get('labelText')).toMatchObject({ kind: 'string' });
    expect(types.get('tint')).toMatchObject({ kind: 'color' });
    expect(types.get('values')).toMatchObject({ kind: 'array', elementType: { kind: 'float' } });
    expect(types.get('genericValues')).toMatchObject({ kind: 'array', elementType: { kind: 'float' } });
    expect(types.get('genericGrid')).toMatchObject({ kind: 'matrix', elementType: { kind: 'float' } });
    expect(types.get('nestedValues')).toMatchObject({ kind: 'array', elementType: { kind: 'array', elementType: { kind: 'float' } } });
    expect(types.get('nestedGrid')).toMatchObject({
      kind: 'matrix',
      elementType: { kind: 'map', keyType: { kind: 'string' }, valueType: { kind: 'float' } },
    });
    expect(types.get('nestedLookup')).toMatchObject({
      kind: 'map',
      keyType: { kind: 'string' },
      valueType: { kind: 'array', elementType: { kind: 'float' } },
    });
    expect(types.get('floatValues')).toMatchObject({ kind: 'array', elementType: { kind: 'float' } });
    expect(types.get('intValues')).toMatchObject({ kind: 'array', elementType: { kind: 'int' } });
    expect(types.get('labelValues')).toMatchObject({ kind: 'array', elementType: { kind: 'label' } });
    expect(types.get('grid')).toMatchObject({ kind: 'matrix', elementType: { kind: 'int' } });
    expect(types.get('lookup')).toMatchObject({
      kind: 'map',
      keyType: { kind: 'string' },
      valueType: { kind: 'float' },
    });
    expect(types.get('pivot')).toMatchObject({ kind: 'udt', name: 'pivotPoint' });
  });

  it('validates template annotation type arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Templates")
array<series> invalidArray = array.new_float()
invalidArrayCtorElement = array.new<series>()
invalidArrayCtorArity = array.new<float, int>()
array<array> invalidNestedArray = array.new_float()
invalidArrayCtorCollection = array.new<array>()
matrix<input> invalidMatrix = matrix.new_int()
invalidMatrixCtorElement = matrix.new<series>()
invalidMatrixCtorArity = matrix.new<float, int>()
matrix<map> invalidNestedMatrix = matrix.new_float()
invalidMatrixCtorCollection = matrix.new<map>()
map<label, float> invalidKey = map.new<string, float>()
map<array<float>, float> invalidNestedKey = map.new<string, float>()
map<string, series> invalidValue = map.new<string, float>()
map<string, array> invalidCollectionValue = map.new<string, float>()
map<const, float> qualifierKey = map.new<string, float>()
invalidCtorKey = map.new<label, float>()
invalidCtorNestedKey = map.new<array<float>, float>()
invalidCtorValue = map.new<string, series>()
invalidCtorCollectionValue = map.new<string, matrix>()
invalidCtorArity = map.new<string>()
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Invalid array element type 'series'; qualifiers cannot be used as template types",
      "Invalid array element type 'series'; qualifiers cannot be used as template types",
      'array.new() expects exactly 1 type argument',
      "Invalid array element type 'array'; collection template types must include their element templates",
      "Invalid array element type 'array'; collection template types must include their element templates",
      "Invalid matrix element type 'input'; qualifiers cannot be used as template types",
      "Invalid matrix element type 'series'; qualifiers cannot be used as template types",
      'matrix.new() expects exactly 1 type argument',
      "Invalid matrix element type 'map'; collection template types must include their element templates",
      "Invalid matrix element type 'map'; collection template types must include their element templates",
      'Map key type must be int, float, bool, string, or color in variable declaration',
      'Map key type must be int, float, bool, string, or color in variable declaration',
      "Invalid map value type 'series'; qualifiers cannot be used as template types",
      "Invalid map value type 'array'; collection template types must include their element templates",
      "Invalid map key type 'const'; qualifiers cannot be used as template types",
      'Map key type must be int, float, bool, string, or color in map.new',
      'Map key type must be int, float, bool, string, or color in map.new',
      "Invalid map value type 'series'; qualifiers cannot be used as template types",
      "Invalid map value type 'matrix'; collection template types must include their element templates",
      'map.new() expects exactly 2 type arguments',
    ]);
  });

  it('reports map key and value template mismatches', () => {
    const result = checkProgram(parse(`
indicator("Bad Map Types")
map<string, float> prices = map.new<string, float>()
map<string, label> labels = map.new<string, label>()
type Pivot
    float price
type Other
    float price
map<string, Pivot> pivots = map.new<string, Pivot>()
map.put(prices, "BTC", 1)
prices.put("ETH", 2.5)
labels.put("entry", label.new(bar_index, close))
pivots.put("high", Pivot.new(high))
map.get(prices, 1)
prices.contains(true)
prices.remove(2)
map.put(prices, 3, 4)
prices.put("SOL", "bad")
labels.put("bad", line.new(bar_index, low, bar_index, high))
pivots.put("bad", Other.new(low))
string symbol = "DOGE"
float price = 3
prices.put(symbol, price)
inferred = map.new<string, float>()
inferred.put(1, 1)
inferred.put("ADA", "bad")
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot use int value as string map key',
      'Cannot use bool value as string map key',
      'Cannot use int value as string map key',
      'Cannot use int value as string map key',
      'Cannot use string value as float map value',
      'Cannot use line value as label map value',
      'Cannot use Other value as Pivot map value',
      'Cannot use int value as string map key',
      'Cannot use string value as float map value',
    ]);
  });

  it('resolves map helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Map Signatures")
map<string, float> left = map.new<string, float>()
map<string, float> right = map.new<string, float>()
previous = map.put(id=left, key="BTC", value=1.0)
value = map.get(id=left, key="BTC")
exists = map.contains(id=left, key="BTC")
removed = map.remove(id=left, key="BTC")
map.put(id=right, key="ETH", value=2.0)
prefixPrevious = map.put(id=left, "SOL", 3.0)
prefixValue = map.get(id=left, "SOL")
prefixExists = map.contains(id=left, "SOL")
prefixRemoved = map.remove(id=left, "SOL")
map.put(id=right, "XRP", 4.0)
map.put_all(id=left, id2=right)
map.put_all(id=left, right)
copied = map.copy(id=left)
keys = map.keys(id=copied)
values = map.values(id=copied)
size = map.size(id=copied)
map.clear(id=right)
plot(previous + value + removed + prefixPrevious + prefixValue + prefixRemoved + size + array.size(keys) + array.size(values) + (exists ? 1 : 0) + (prefixExists ? 1 : 0))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid map helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Map Signatures")
map<string, float> prices = map.new<string, float>()
duplicateSize = map.size(prices, id=prices)
unknownGet = map.get(id=prices, name="BTC")
missingKey = map.contains(id=prices)
tooManyClear = map.clear(prices, prices)
badNew = map.new<string, float>(1)
badPutAll = map.put_all(id=prices, other=prices)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'id' for map.size() was supplied multiple times",
      "Unknown argument 'name' for map.get()",
      'map.get() expects at least 2 arguments',
      "map.get() missing required argument 'key'",
      'map.contains() expects at least 2 arguments',
      "map.contains() missing required argument 'key'",
      'map.clear() expects at most 1 argument',
      'map.new() expects at most 0 arguments',
      "Unknown argument 'other' for map.put_all()",
      'map.put_all() expects at least 2 arguments',
      "map.put_all() missing required argument 'id2'",
    ]);
  });

  it('resolves core array helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Array Core Signatures")
values = array.new_int(size=2, initial_value=1)
mixed = array.new_float(2, initial_value=2.5)
fromValues = array.from(1, 2, 3)
array.push(id=values, value=3)
array.unshift(id=values, value=0)
array.set(id=values, index=1, value=5)
removed = array.remove(id=values, index=2)
array.insert(id=values, index=2, value=9)
first = array.first(id=values)
last = array.last(id=values)
value = array.get(id=values, index=1)
copied = array.copy(id=values)
popped = array.pop(id=copied)
shifted = array.shift(id=copied)
size = array.size(id=copied)
array.clear(id=copied)
plot(first + last + value + removed + popped + shifted + size + array.size(fromValues) + array.size(mixed))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid core array helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Array Core Signatures")
values = array.new_int(size=2, initial_value=1)
duplicateSize = array.size(values, id=values)
unknownGet = array.get(id=values, item=0)
missingIndex = array.remove(id=values)
tooManyClear = array.clear(values, values)
badNew = array.new_int(size=1, initial_value=0, extra=1)
shortSet = array.set(id=values, index=0)
unknownPush = array.push(id=values, item=1)
badFrom = array.from(value=1)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'id' for array.size() was supplied multiple times",
      "Unknown argument 'item' for array.get()",
      'array.get() expects at least 2 arguments',
      "array.get() missing required argument 'index'",
      'array.remove() expects at least 2 arguments',
      "array.remove() missing required argument 'index'",
      'array.clear() expects at most 1 argument',
      "Unknown argument 'extra' for array.new_int()",
      'array.set() expects at least 3 arguments',
      "array.set() missing required argument 'value'",
      "Unknown argument 'item' for array.push()",
      'array.push() expects at least 2 arguments',
      "array.push() missing required argument 'value'",
      "Unknown argument 'value' for array.from()",
    ]);
  });

  it('resolves extended array helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Array Extended Signatures")
values = array.from(3, 1, 2)
other = array.from(4, 5)
array.fill(id=values, value=7, index_from=0, index_to=1)
window = array.slice(id=values, index_from=0, index_to=2)
array.reverse(id=window)
array.concat(id=values, id2=other)
array.sort(id=values, order=order.ascending)
array.sort(id=values, order=order.descending, sort_field=0)
indices = array.sort_indices(id=values, order=order.descending)
joined = array.join(id=window, separator=",")
plain = array.join(id=window)
plot(array.size(values) + array.size(window) + array.size(indices) + str.length(joined) + str.length(plain))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid extended array helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Array Extended Signatures")
values = array.from(3, 1, 2)
other = array.from(4, 5)
duplicateConcat = array.concat(values, id=other)
unknownFill = array.fill(id=values, item=1)
missingSlice = array.slice(id=values, index_from=0)
tooManyReverse = array.reverse(values, other)
tooManyJoin = array.join(values, ",", ";")
unknownSort = array.sort(id=values, direction=order.ascending)
tooManySortIndices = array.sort_indices(values, order.ascending, 1)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'array.concat() expects at least 2 arguments',
      "array.concat() missing required argument 'id2'",
      "Argument 'id' for array.concat() was supplied multiple times",
      "Unknown argument 'item' for array.fill()",
      'array.fill() expects at least 2 arguments',
      "array.fill() missing required argument 'value'",
      'array.slice() expects at least 3 arguments',
      "array.slice() missing required argument 'index_to'",
      'array.reverse() expects at most 1 argument',
      'array.join() expects at most 2 arguments',
      "Unknown argument 'direction' for array.sort()",
      'array.sort_indices() expects at most 2 arguments',
    ]);
  });

  it('resolves array search helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Array Search Signatures")
values = array.from(1, 2, 3)
flags = array.from(true, true)
hasValue = array.includes(id=values, value=2)
index = array.indexof(id=values, value=2)
lastIndex = array.lastindexof(id=values, value=2)
binary = array.binary_search(id=values, value=2)
left = array.binary_search_leftmost(id=values, value=2)
right = array.binary_search_rightmost(id=values, value=2)
allFlags = array.every(id=flags)
someFlags = array.some(id=flags)
plot(index + lastIndex + binary + left + right + (hasValue ? 1 : 0) + (allFlags ? 1 : 0) + (someFlags ? 1 : 0))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid array search helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Array Search Signatures")
values = array.from(1, 2, 3)
duplicateIndex = array.indexof(values, id=values)
unknownIncludes = array.includes(id=values, item=2)
missingBinary = array.binary_search(id=values)
tooManyEvery = array.every(values, values)
unknownSome = array.some(items=values)
tooManyRight = array.binary_search_rightmost(values, 2, 3)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'array.indexof() expects at least 2 arguments',
      "array.indexof() missing required argument 'value'",
      "Argument 'id' for array.indexof() was supplied multiple times",
      "Unknown argument 'item' for array.includes()",
      'array.includes() expects at least 2 arguments',
      "array.includes() missing required argument 'value'",
      'array.binary_search() expects at least 2 arguments',
      "array.binary_search() missing required argument 'value'",
      'array.every() expects at most 1 argument',
      "Unknown argument 'items' for array.some()",
      'array.some() expects at least 1 argument',
      "array.some() missing required argument 'id'",
      'array.binary_search_rightmost() expects at most 2 arguments',
    ]);
  });

  it('resolves array statistic helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Array Statistic Signatures")
values = array.from(1, 2, 3, 4)
other = array.from(2, 4, 6, 8)
absolute = array.abs(id=values)
standardized = array.standardize(id=values)
total = array.sum(id=values)
average = array.avg(id=values)
minimum = array.min(id=values)
maximum = array.max(id=values)
spread = array.range(id=values)
middle = array.median(id=values)
common = array.mode(id=values)
variance = array.variance(id=values)
deviation = array.stdev(id=values, biased=false)
covariance = array.covariance(id1=values, id2=other, biased=true)
covarianceAlias = array.covariance(id=values, id2=other)
nearest = array.percentile_nearest_rank(id=values, percentage=50)
linear = array.percentile_linear_interpolation(id=values, percentage=50)
rank = array.percentrank(id=values, value=2)
plot(total + average + minimum + maximum + spread + middle + common + variance + deviation + covariance + covarianceAlias + nearest + linear + rank + array.size(absolute) + array.size(standardized))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid array statistic helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Array Statistic Signatures")
values = array.from(1, 2, 3)
other = array.from(2, 4, 6)
unknownSum = array.sum(values=values)
tooManyAbs = array.abs(values, other)
missingPercentile = array.percentile_nearest_rank(id=values)
unknownStdev = array.stdev(id=values, sample=false)
duplicateCovariance = array.covariance(values, id1=other)
missingRank = array.percentrank(id=values)
tooManyVariance = array.variance(values, true, false)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'values' for array.sum()",
      'array.sum() expects at least 1 argument',
      "array.sum() missing required argument 'id'",
      'array.abs() expects at most 1 argument',
      'array.percentile_nearest_rank() expects at least 2 arguments',
      "array.percentile_nearest_rank() missing required argument 'percentage'",
      "Unknown argument 'sample' for array.stdev()",
      'array.covariance() expects at least 2 arguments',
      "array.covariance() missing required argument 'id2'",
      "Argument 'id1' for array.covariance() was supplied multiple times",
      'array.percentrank() expects at least 2 arguments',
      "array.percentrank() missing required argument 'value'",
      'array.variance() expects at most 2 arguments',
    ]);
  });

  it('resolves array named prefix positional tail arguments', () => {
    const result = checkProgram(parse(`
indicator("Array Mixed Tail Signatures")
values = array.new_int(size=2, 6)
array.set(id=values, 0, 7)
value = array.get(id=values, 0)
array.fill(id=values, 4, 0, 1)
window = array.slice(id=values, 0, 2)
array.concat(id=values, array.from(8, 9))
array.sort(id=values, order.descending)
indices = array.sort_indices(id=values, order.ascending)
joined = array.join(id=window, ",")
deviation = array.stdev(id=values, false)
covariance = array.covariance(id1=values, array.from(1, 2), false)
nearest = array.percentile_nearest_rank(id=values, 50)
rank = array.percentrank(id=values, 7)
plot(value + array.size(window) + array.size(indices) + str.length(joined) + deviation + covariance + nearest + rank)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('resolves matrix core helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Matrix Core Signatures")
m = matrix.new_int(rows=2, columns=2, initial_value=1)
generic = matrix.new<float>(rows=1, columns=1, initial_value=0)
flags = matrix.new_bool()
matrix.set(id=m, row=0, column=1, value=4)
rows = matrix.rows(id=m)
columns = matrix.columns(id=m)
elements = matrix.elements_count(id=m)
first = matrix.get(id=m, row=0, column=1)
valid = matrix.is_valid(id=m)
plot(rows + columns + elements + first + matrix.rows(id=generic) + matrix.rows(id=flags) + (valid ? 1 : 0))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid matrix core helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Matrix Core Signatures")
m = matrix.new_int(rows=2, columns=2, initial_value=1)
badNew = matrix.new_int(rows=1, columns=1, initial_value=0, extra=1)
duplicateRows = matrix.rows(m, id=m)
unknownGet = matrix.get(id=m, column=0, item=0)
missingValue = matrix.set(id=m, row=0, column=0)
tooManyRows = matrix.rows(m, m)
tooManyGet = matrix.get(m, 0, 0, 0)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'extra' for matrix.new_int()",
      "Argument 'id' for matrix.rows() was supplied multiple times",
      "Unknown argument 'item' for matrix.get()",
      'matrix.get() expects at least 3 arguments',
      "matrix.get() missing required argument 'row'",
      'matrix.set() expects at least 4 arguments',
      "matrix.set() missing required argument 'value'",
      'matrix.rows() expects at most 1 argument',
      'matrix.get() expects at most 3 arguments',
    ]);
  });

  it('resolves matrix structural helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Matrix Structural Signatures")
m = matrix.new_int(rows=3, columns=2, initial_value=1)
matrix.fill(id=m, value=7, from_row=1, to_row=2, from_column=0, to_column=2)
matrix.reshape(id=m, rows=2, columns=3)
matrix.add_row(id=m, row=1, array_id=array.from(1, 2, 3))
matrix.add_col(id=m, column=1, array_id=array.from(4, 5, 6))
matrix.add_column(id=m, column=2, array_id=array.from(7, 8, 9))
removedRow = matrix.remove_row(id=m, row=0)
removedCol = matrix.remove_col(id=m, column=0)
removedColumn = matrix.remove_column(id=m, column=0)
matrix.swap_rows(id=m, row1=0, row2=1)
matrix.swap_columns(id=m, column1=0, column2=1)
matrix.reverse(id=m)
plot(matrix.rows(id=m) + matrix.columns(id=m) + array.size(removedRow) + array.size(removedCol) + array.size(removedColumn))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid matrix structural helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Matrix Structural Signatures")
m = matrix.new_int(rows=2, columns=2, initial_value=1)
unknownFill = matrix.fill(id=m, item=1)
missingReshape = matrix.reshape(id=m, rows=1)
tooManyReverse = matrix.reverse(m, m)
duplicateAddRow = matrix.add_row(m, id=m)
unknownAddCol = matrix.add_col(id=m, row=0)
missingRemove = matrix.remove_column(id=m)
tooManySwap = matrix.swap_rows(m, 0, 1, 2)
missingSwapColumn = matrix.swap_columns(id=m, column1=0)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'item' for matrix.fill()",
      'matrix.fill() expects at least 2 arguments',
      "matrix.fill() missing required argument 'value'",
      'matrix.reshape() expects at least 3 arguments',
      "matrix.reshape() missing required argument 'columns'",
      'matrix.reverse() expects at most 1 argument',
      "Argument 'id' for matrix.add_row() was supplied multiple times",
      "Unknown argument 'row' for matrix.add_col()",
      'matrix.remove_column() expects at least 2 arguments',
      "matrix.remove_column() missing required argument 'column'",
      'matrix.swap_rows() expects at most 3 arguments',
      'matrix.swap_columns() expects at least 3 arguments',
      "matrix.swap_columns() missing required argument 'column2'",
    ]);
  });

  it('resolves matrix extraction helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Matrix Extraction Signatures")
m = matrix.new_int(rows=2, columns=2, initial_value=1)
tail = matrix.new_int(rows=1, columns=2, initial_value=5)
copy = matrix.copy(id=m)
transposed = matrix.transpose(id=m)
row = matrix.row(id=m, row=1)
col = matrix.col(id=m, column=0)
column = matrix.column(id=m, column=1)
slice = matrix.submatrix(id=m, from_row=0, to_row=2, from_column=0, to_column=1)
whole = matrix.submatrix(id=m)
matrix.concat(id=m, id2=tail)
matrix.concat(id1=copy, id2=tail)
plot(matrix.rows(id=m) + matrix.rows(id=transposed) + matrix.rows(id=slice) + matrix.rows(id=whole) + array.size(row) + array.size(col) + array.size(column))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid matrix extraction helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Matrix Extraction Signatures")
m = matrix.new_int(rows=2, columns=2, initial_value=1)
duplicateConcat = matrix.concat(m, id=m)
missingConcat = matrix.concat(id=m)
unknownSubmatrix = matrix.submatrix(id=m, start_row=0)
tooManySubmatrix = matrix.submatrix(m, 0, 1, 0, 1, 2)
tooManyCopy = matrix.copy(m, m)
missingRow = matrix.row(id=m)
unknownColumn = matrix.column(id=m, row=0)
tooManyCol = matrix.col(m, 0, 1)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'matrix.concat() expects at least 2 arguments',
      "matrix.concat() missing required argument 'id2'",
      "Argument 'id' for matrix.concat() was supplied multiple times",
      'matrix.concat() expects at least 2 arguments',
      "matrix.concat() missing required argument 'id2'",
      "Unknown argument 'start_row' for matrix.submatrix()",
      'matrix.submatrix() expects at most 5 arguments',
      'matrix.copy() expects at most 1 argument',
      'matrix.row() expects at least 2 arguments',
      "matrix.row() missing required argument 'row'",
      "Unknown argument 'row' for matrix.column()",
      'matrix.column() expects at least 2 arguments',
      "matrix.column() missing required argument 'column'",
      'matrix.col() expects at most 2 arguments',
    ]);
  });

  it('resolves matrix unary helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Matrix Unary Signatures")
m = matrix.new_float(rows=2, columns=2, initial_value=1)
average = matrix.avg(id=m)
minimum = matrix.min(id=m)
maximum = matrix.max(id=m)
middle = matrix.median(id=m)
common = matrix.mode(id=m)
trace = matrix.trace(id=m)
det = matrix.det(id=m)
rank = matrix.rank(id=m)
inverse = matrix.inv(id=m)
pinverse = matrix.pinv(id=m)
eigen = matrix.eigenvalues(id=m)
vectors = matrix.eigenvectors(id=m)
plot(average + minimum + maximum + middle + common + trace + det + rank + matrix.rows(id=inverse) + matrix.rows(id=pinverse) + array.size(eigen) + matrix.rows(id=vectors))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid matrix unary helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Matrix Unary Signatures")
m = matrix.new_float(rows=2, columns=2, initial_value=1)
unknownAvg = matrix.avg(value=m)
tooManyTrace = matrix.trace(m, m)
missingDet = matrix.det()
duplicateRank = matrix.rank(m, id=m)
unknownEigen = matrix.eigenvalues(matrix=m)
tooManyInv = matrix.inv(m, m)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'value' for matrix.avg()",
      'matrix.avg() expects at least 1 argument',
      "matrix.avg() missing required argument 'id'",
      'matrix.trace() expects at most 1 argument',
      'matrix.det() expects at least 1 argument',
      "matrix.det() missing required argument 'id'",
      "Argument 'id' for matrix.rank() was supplied multiple times",
      "Unknown argument 'matrix' for matrix.eigenvalues()",
      'matrix.eigenvalues() expects at least 1 argument',
      "matrix.eigenvalues() missing required argument 'id'",
      'matrix.inv() expects at most 1 argument',
    ]);
  });

  it('resolves matrix calculation helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Matrix Calculation Signatures")
a = matrix.new_float(rows=2, columns=2, initial_value=1)
b = matrix.new_float(rows=2, columns=2, initial_value=2)
sumNamed = matrix.sum(id1=a, id2=b)
sumAlias = matrix.sum(id=a, id2=b)
diffNamed = matrix.diff(id1=a, id2=b)
multNamed = matrix.mult(id1=a, id2=b)
kronNamed = matrix.kron(id1=a, id2=b)
powNamed = matrix.pow(id=a, power=2)
matrix.sort(id=a, column=1, order=order.descending, sort_field=0)
plot(matrix.rows(id=sumNamed) + matrix.rows(id=sumAlias) + matrix.rows(id=diffNamed) + matrix.rows(id=multNamed) + matrix.rows(id=kronNamed) + matrix.rows(id=powNamed))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid matrix calculation helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Matrix Calculation Signatures")
a = matrix.new_float(rows=2, columns=2, initial_value=1)
b = matrix.new_float(rows=2, columns=2, initial_value=2)
missingSum = matrix.sum(id1=a)
duplicateDiff = matrix.diff(a, id=a)
unknownMult = matrix.mult(left=a, id2=b)
tooManyKron = matrix.kron(a, b, a)
missingPow = matrix.pow(id=a)
unknownPow = matrix.pow(id=a, exponent=2)
tooManySort = matrix.sort(a, 1, order.ascending, 0, 1)
unknownSort = matrix.sort(id=a, direction=order.ascending)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'matrix.sum() expects at least 2 arguments',
      "matrix.sum() missing required argument 'id2'",
      'matrix.diff() expects at least 2 arguments',
      "matrix.diff() missing required argument 'id2'",
      "Argument 'id' for matrix.diff() was supplied multiple times",
      "Unknown argument 'left' for matrix.mult()",
      'matrix.mult() expects at least 2 arguments',
      "matrix.mult() missing required argument 'id1'",
      'matrix.kron() expects at most 2 arguments',
      'matrix.pow() expects at least 2 arguments',
      "matrix.pow() missing required argument 'power'",
      "Unknown argument 'exponent' for matrix.pow()",
      'matrix.pow() expects at least 2 arguments',
      "matrix.pow() missing required argument 'power'",
      'matrix.sort() expects at most 4 arguments',
      "Unknown argument 'direction' for matrix.sort()",
    ]);
  });

  it('resolves matrix predicate helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Matrix Predicate Signatures")
m = matrix.new_float(rows=2, columns=2, initial_value=1)
square = matrix.is_square(id=m)
zero = matrix.is_zero(id=m)
binary = matrix.is_binary(id=m)
identity = matrix.is_identity(id=m)
diagonal = matrix.is_diagonal(id=m)
antidiagonal = matrix.is_antidiagonal(id=m)
symmetric = matrix.is_symmetric(id=m)
antisymmetric = matrix.is_antisymmetric(id=m)
triangular = matrix.is_triangular(id=m)
stochastic = matrix.is_stochastic(id=m)
plot((square ? 1 : 0) + (zero ? 1 : 0) + (binary ? 1 : 0) + (identity ? 1 : 0) + (diagonal ? 1 : 0) + (antidiagonal ? 1 : 0) + (symmetric ? 1 : 0) + (antisymmetric ? 1 : 0) + (triangular ? 1 : 0) + (stochastic ? 1 : 0))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid matrix predicate helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Matrix Predicate Signatures")
m = matrix.new_float(rows=2, columns=2, initial_value=1)
unknownSquare = matrix.is_square(matrix=m)
tooManyZero = matrix.is_zero(m, m)
missingBinary = matrix.is_binary()
duplicateIdentity = matrix.is_identity(m, id=m)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'matrix' for matrix.is_square()",
      'matrix.is_square() expects at least 1 argument',
      "matrix.is_square() missing required argument 'id'",
      'matrix.is_zero() expects at most 1 argument',
      'matrix.is_binary() expects at least 1 argument',
      "matrix.is_binary() missing required argument 'id'",
      "Argument 'id' for matrix.is_identity() was supplied multiple times",
    ]);
  });

  it('resolves matrix named prefix positional tail arguments', () => {
    const result = checkProgram(parse(`
indicator("Matrix Mixed Tail Signatures")
m = matrix.new_int(rows=2, columns=2, initial_value=0)
tail = matrix.new_int(rows=1, columns=2, initial_value=5)
matrix.set(id=m, 0, 1, 2)
first = matrix.get(id=m, 0, 1)
matrix.fill(id=m, 6, 0, 1, 0, 1)
slice = matrix.submatrix(id=m, 0, 2, 0, 2)
matrix.reshape(id=m, rows=1, 4)
matrix.add_row(id=m, array.from(3, 4))
matrix.concat(id=m, tail)
diff = matrix.diff(id1=m, 1)
matrix.sort(id=m, 1, order.descending)
row = matrix.row(id=m, 0)
column = matrix.column(id=m, 0)
plot(first + matrix.rows(id=slice) + matrix.rows(id=diff) + array.size(row) + array.size(column))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports array element template mismatches for known mutable arrays', () => {
    const result = checkProgram(parse(`
indicator("Bad Array Types")
array<float> prices = array.new_float()
array.push(prices, 1)
prices.push(2.5)
array.push(prices, "bad")
prices.unshift(true)
prices.set(0, "bad")
array.insert(prices, 0, "bad")
array.fill(prices, "bad")
typed = array.new_int()
typed.push(1)
typed.push("bad")
copied = prices.copy()
copied.push("bad")
window = array.slice(prices, 0, 1)
window.push("bad")
indices = prices.sort_indices()
indices.push("bad")
absolute = array.abs(prices)
absolute.push("bad")
ints = array.new_int()
prices.concat(ints)
strings = array.new_string()
prices.concat(strings)
array.concat(prices, strings)
unknown = array.from(1, "mixed")
unknown.push("allowed")
prices.concat(unknown)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot use string value as float array element',
      'Cannot use bool value as float array element',
      'Cannot use string value as float array element',
      'Cannot use string value as float array element',
      'Cannot use string value as float array element',
      'Cannot use string value as int array element',
      'Cannot use string value as float array element',
      'Cannot use string value as float array element',
      'Cannot use string value as int array element',
      'Cannot use string value as float array element',
      'Cannot concatenate string array into float array',
      'Cannot concatenate string array into float array',
    ]);
  });

  it('infers collection and numeric for-loop symbol types', () => {
    const result = checkProgram(parse(`
indicator("Loop Types")
prices = array.new_float()
ints = array.new_int()
strings = array.new_string()
for value in prices
    prices.push(value)
    ints.push(value)
for [index, value] in prices
    ints.push(index)
    strings.push(index)
m = map.new<string, float>()
for [key, value] in m
    strings.push(key)
    ints.push(key)
    prices.push(value)
    ints.push(value)
grid = matrix.new<float>(2, 2, 0)
for [rowIndex, rowValues] in grid
    ints.push(rowIndex)
    strings.push(rowIndex)
    prices.push(rowValues.get(0))
    ints.push(rowValues.get(0))
for i = 0 to 2
    ints.push(i)
    strings.push(i)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot use float value as int array element',
      'Cannot use int value as string array element',
      'Cannot use string value as int array element',
      'Cannot use float value as int array element',
      'Cannot use int value as string array element',
      'Cannot use float value as int array element',
      'Cannot use int value as string array element',
    ]);
  });

  it('infers array element read types', () => {
    const result = checkProgram(parse(`
indicator("Array Read Types")
prices = array.new_float()
ints = array.new_int()
fromIndex = prices[0]
fromGet = prices.get(0)
fromFirst = array.first(prices)
fromLast = prices.last()
fromRemove = prices.remove(0)
ints.push(fromIndex)
ints.push(fromGet)
ints.push(fromFirst)
ints.push(fromLast)
ints.push(fromRemove)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(types.get('fromIndex')).toMatchObject({ kind: 'float' });
    expect(types.get('fromGet')).toMatchObject({ kind: 'float' });
    expect(types.get('fromFirst')).toMatchObject({ kind: 'float' });
    expect(types.get('fromLast')).toMatchObject({ kind: 'float' });
    expect(types.get('fromRemove')).toMatchObject({ kind: 'float' });
    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot use float value as int array element',
      'Cannot use float value as int array element',
      'Cannot use float value as int array element',
      'Cannot use float value as int array element',
      'Cannot use float value as int array element',
    ]);
  });

  it('infers matrix element reads and reports mutable element mismatches', () => {
    const result = checkProgram(parse(`
indicator("Matrix Types")
matrix<float> prices = matrix.new<float>(1, 1, 0)
matrix.set(prices, 0, 0, 1)
prices.set(0, 0, 2.5)
matrix.fill(prices, 3)
prices.fill(4.5)
matrix.set(prices, 0, 0, "bad")
prices.set(0, 0, true)
matrix.fill(prices, "bad")
prices.fill(true)
typed = matrix.new<int>(1, 1, 0)
typed.set(0, 0, 1)
typed.set(0, 0, "bad")
value = prices.get(0, 0)
ints = array.new_int()
ints.push(value)
namespaceValue = matrix.get(typed, 0, 0)
float widened = namespaceValue
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(types.get('value')).toMatchObject({ kind: 'float' });
    expect(types.get('namespaceValue')).toMatchObject({ kind: 'int' });
    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot use string value as float matrix element',
      'Cannot use bool value as float matrix element',
      'Cannot use string value as float matrix element',
      'Cannot use bool value as float matrix element',
      'Cannot use string value as int matrix element',
      'Cannot use float value as int array element',
    ]);
  });

  it('validates matrix sort_field const int and string requirements', () => {
    const result = checkProgram(parse(`
indicator("Matrix Sort Field Types")
type Ranked
    float score
    string name
values = matrix.new<Ranked>()
const string scoreField = "score"
const int nameField = 1
matrix.sort(values, 0, order.ascending, scoreField)
values.sort(0, order.descending, nameField)
values.sort(0, order.ascending, "score")
matrix.sort(values, 0, order.ascending, 1)
inputField = input.string("score")
simple string simpleField = "score"
seriesIndex = bar_index
int unqualifiedField = 1
matrix.sort(values, 0, order.ascending, inputField)
values.sort(0, order.ascending, simpleField)
values.sort(0, order.ascending, seriesIndex)
values.sort(0, order.ascending, unqualifiedField)
values.sort(0, order.ascending, true)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'matrix.sort() sort_field requires const int or const string, got input string',
      'matrix.sort() sort_field requires const int or const string, got simple string',
      'matrix.sort() sort_field requires const int or const string, got series int',
      'matrix.sort() sort_field requires const int or const string, got unqualified int',
      'matrix.sort() sort_field must be a const int or const string, got bool',
    ]);
  });

  it('validates array sort_field const int and string requirements', () => {
    const result = checkProgram(parse(`
indicator("Array Sort Field Types")
type Ranked
    float score
    string name
values = array.new<Ranked>()
const string scoreField = "score"
const int nameField = 1
array.sort(values, order.ascending, scoreField)
values.sort(order.descending, nameField)
values.sort(order.ascending, "score")
array.sort(values, order.ascending, 1)
inputField = input.string("score")
simple string simpleField = "score"
seriesIndex = bar_index
int unqualifiedField = 1
array.sort(values, order.ascending, inputField)
values.sort(order.ascending, simpleField)
values.sort(order.ascending, seriesIndex)
values.sort(order.ascending, unqualifiedField)
values.sort(order.ascending, true)
matrixValues = matrix.new<float>()
matrixValues.sort(0, order.ascending, inputField)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'array.sort() sort_field requires const int or const string, got input string',
      'array.sort() sort_field requires const int or const string, got simple string',
      'array.sort() sort_field requires const int or const string, got series int',
      'array.sort() sort_field requires const int or const string, got unqualified int',
      'array.sort() sort_field must be a const int or const string, got bool',
      'matrix.sort() sort_field requires const int or const string, got input string',
    ]);
  });

  it('resolves chart point helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Chart Point Signatures")
point = chart.point.new(time=time, index=bar_index, price=close)
mixed = chart.point.new(time=time, bar_index, high)
current = chart.point.now(price=close)
fromIndex = chart.point.from_index(index=bar_index, price=close)
fromIndexMixed = chart.point.from_index(index=bar_index, high)
fromTime = chart.point.from_time(time=time, price=close)
copied = chart.point.copy(id=fromIndex)
points = array.from(point, mixed, current, fromIndex, fromIndexMixed, fromTime, copied)
plot(array.size(points))
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('point')).toMatchObject({ kind: 'chart.point' });
    expect(types.get('mixed')).toMatchObject({ kind: 'chart.point' });
    expect(types.get('current')).toMatchObject({ kind: 'chart.point' });
    expect(types.get('fromIndex')).toMatchObject({ kind: 'chart.point' });
    expect(types.get('fromIndexMixed')).toMatchObject({ kind: 'chart.point' });
    expect(types.get('fromTime')).toMatchObject({ kind: 'chart.point' });
    expect(types.get('copied')).toMatchObject({ kind: 'chart.point' });
    expect(types.get('points')).toMatchObject({ kind: 'array', elementType: { kind: 'chart.point' } });
  });

  it('reports invalid chart point helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Chart Point Signatures")
point = chart.point.from_index(bar_index, close)
unknownNew = chart.point.new(timestamp=time, index=bar_index, price=close)
missingPrice = chart.point.from_index(index=bar_index)
tooManyNow = chart.point.now(close, high)
duplicateCopy = chart.point.copy(point, id=point)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'timestamp' for chart.point.new()",
      'chart.point.new() expects at least 3 arguments',
      "chart.point.new() missing required argument 'time'",
      'chart.point.from_index() expects at least 2 arguments',
      "chart.point.from_index() missing required argument 'price'",
      'chart.point.now() expects at most 1 argument',
      "Argument 'id' for chart.point.copy() was supplied multiple times",
    ]);
  });

  it('resolves label.new named arguments and positional tails', () => {
    const result = checkProgram(parse(`
indicator("Label Signatures")
first = label.new(x=bar_index, close, "Entry", xloc.bar_index, yloc.price, color.green, label.style_label_up, color.white, size.small, "center", "tip", "monospace", true, "bold")
second = label.new(bar_index, high, text="High", color=color.orange, style=label.style_label_down)
labelPoint = chart.point.from_index(bar_index, low)
third = label.new(labelPoint, "Point", xloc.bar_index, yloc.price, color.blue)
labels = array.from(first, second, third)
plot(array.size(labels))
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('first')).toMatchObject({ kind: 'label' });
    expect(types.get('second')).toMatchObject({ kind: 'label' });
    expect(types.get('third')).toMatchObject({ kind: 'label' });
    expect(types.get('labels')).toMatchObject({ kind: 'array', elementType: { kind: 'label' } });
  });

  it('reports invalid label.new argument bindings', () => {
    const result = checkProgram(parse(`
indicator("Bad Label Signatures")
unknown = label.new(bar_index, close, caption="Bad")
missing = label.new(text="Only Text")
duplicate = label.new(bar_index, close, x=bar_index)
tooMany = label.new(bar_index, close, "A", xloc.bar_index, yloc.price, color.green, label.style_label_up, color.white, size.small, "center", "tip", "monospace", true, "bold", 1)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'caption' for label.new()",
      'label.new() expects at least 2 arguments',
      "label.new() missing required argument 'x'",
      "label.new() missing required argument 'y'",
      "Argument 'x' for label.new() was supplied multiple times",
      'label.new() expects at most 14 arguments',
    ]);
  });

  it('resolves label method named arguments and positional tails', () => {
    const result = checkProgram(parse(`
indicator("Label Method Signatures")
marker = label.new(bar_index, close)
clone = label.copy(id=marker)
label.set_x(id=marker, bar_index + 1)
label.set_y(marker, y=high)
label.set_xy(id=marker, x=bar_index, y=low)
label.set_text(marker, text="updated")
label.set_xloc(id=marker, bar_index, xloc.bar_index)
label.set_yloc(marker, yloc=yloc.abovebar)
label.set_style(id=marker, label.style_label_down)
label.set_color(marker, color=color.blue)
label.set_textcolor(id=marker, color.white)
label.set_size(marker, size=size.small)
label.set_textalign(id=marker, "right")
label.set_text_font_family(id=marker, "monospace")
label.set_text_formatting(marker, text_formatting="bolditalic")
label.set_tooltip(id=marker, "tip")
x = label.get_x(id=marker)
y = label.get_y(marker)
textValue = label.get_text(id=marker)
xlocValue = label.get_xloc(marker)
ylocValue = label.get_yloc(id=marker)
styleValue = label.get_style(marker)
colorValue = label.get_color(id=marker)
textColorValue = label.get_textcolor(marker)
sizeValue = label.get_size(id=marker)
tooltipValue = label.get_tooltip(marker)
labels = array.from(marker, clone)
label.delete(id=clone)
plot(array.size(labels) + x + y)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('clone')).toMatchObject({ kind: 'label' });
    expect(types.get('labels')).toMatchObject({ kind: 'array', elementType: { kind: 'label' } });
  });

  it('infers label getter return types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("Label Getter Return Types")
marker = label.new(bar_index, close, text="entry")
x = label.get_x(id=marker)
y = label.get_y(marker)
textValue = label.get_text(id=marker)
xlocValue = label.get_xloc(marker)
ylocValue = label.get_yloc(id=marker)
styleValue = label.get_style(marker)
colorValue = label.get_color(id=marker)
textColorValue = label.get_textcolor(marker)
sizeValue = label.get_size(id=marker)
tooltipValue = label.get_tooltip(marker)
x := "bad"
y := "bad"
textValue := 1
xlocValue := 2
ylocValue := 3
styleValue := 4
colorValue := "bad"
textColorValue := "bad"
sizeValue := 5
tooltipValue := 6
plot(x + y + str.length(textValue + xlocValue + ylocValue + styleValue + sizeValue + tooltipValue))
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to int variable x',
      'Cannot assign string value to float variable y',
      'Cannot assign int value to string variable textValue',
      'Cannot assign int value to string variable xlocValue',
      'Cannot assign int value to string variable ylocValue',
      'Cannot assign int value to string variable styleValue',
      'Cannot assign string value to color variable colorValue',
      'Cannot assign string value to color variable textColorValue',
      'Cannot assign int value to string variable sizeValue',
      'Cannot assign int value to string variable tooltipValue',
    ]);
    expect(types.get('x')).toMatchObject({ kind: 'int' });
    expect(types.get('y')).toMatchObject({ kind: 'float' });
    expect(types.get('textValue')).toMatchObject({ kind: 'string' });
    expect(types.get('xlocValue')).toMatchObject({ kind: 'string' });
    expect(types.get('ylocValue')).toMatchObject({ kind: 'string' });
    expect(types.get('styleValue')).toMatchObject({ kind: 'string' });
    expect(types.get('colorValue')).toMatchObject({ kind: 'color' });
    expect(types.get('textColorValue')).toMatchObject({ kind: 'color' });
    expect(types.get('sizeValue')).toMatchObject({ kind: 'string' });
    expect(types.get('tooltipValue')).toMatchObject({ kind: 'string' });
  });

  it('reports invalid label method argument bindings', () => {
    const result = checkProgram(parse(`
indicator("Bad Label Method Signatures")
marker = label.new(bar_index, close)
unknownSetter = label.set_text(marker, text="bad", caption="Bad")
missingSetter = label.set_xy(id=marker, x=bar_index)
duplicateSetter = label.set_color(marker, color.blue, id=marker)
missingTextAlign = label.set_textalign(id=marker)
duplicateTextAlign = label.set_textalign(marker, "right", id=marker)
missingFormatting = label.set_text_formatting(id=marker)
duplicateFormatting = label.set_text_formatting(marker, "bold", id=marker)
unknownFont = label.set_text_font_family(marker, font="monospace")
tooManyGetter = label.get_x(marker, marker)
missingCopy = label.copy()
unknownGetter = label.get_text(marker, format="raw")
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'caption' for label.set_text()",
      'label.set_xy() expects at least 3 arguments',
      "label.set_xy() missing required argument 'y'",
      "Argument 'id' for label.set_color() was supplied multiple times",
      'label.set_textalign() expects at least 2 arguments',
      "label.set_textalign() missing required argument 'textalign'",
      "Argument 'id' for label.set_textalign() was supplied multiple times",
      'label.set_text_formatting() expects at least 2 arguments',
      "label.set_text_formatting() missing required argument 'text_formatting'",
      "Argument 'id' for label.set_text_formatting() was supplied multiple times",
      "Unknown argument 'font' for label.set_text_font_family()",
      'label.set_text_font_family() expects at least 2 arguments',
      "label.set_text_font_family() missing required argument 'text_font_family'",
      'label.get_x() expects at most 1 argument',
      'label.copy() expects at least 1 argument',
      "label.copy() missing required argument 'id'",
      "Unknown argument 'format' for label.get_text()",
    ]);
  });

  it('resolves line setter named arguments and positional tails', () => {
    const result = checkProgram(parse(`
indicator("Line Setter Signatures")
trend = line.new(bar_index, close, bar_index + 1, close)
clone = line.copy(id=trend)
firstPoint = chart.point.from_index(bar_index - 1, high)
secondPoint = chart.point.from_index(bar_index + 2, low)
line.set_x1(id=trend, bar_index)
line.set_x2(trend, x=bar_index + 2)
line.set_y1(id=trend, high)
line.set_y2(trend, y=low)
line.set_xy1(id=trend, x=bar_index, y=high)
line.set_xy2(trend, bar_index + 2, y=low)
line.set_first_point(id=trend, first_point=firstPoint)
line.set_second_point(trend, second_point=secondPoint)
line.set_xloc(id=trend, bar_index, bar_index + 2, xloc.bar_index)
line.set_extend(trend, extend="right")
line.set_color(id=trend, color.blue)
line.set_style(trend, style="dashed")
line.set_width(id=trend, 2)
line.delete(id=clone)
plot(1)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('clone')).toMatchObject({ kind: 'line' });
  });

  it('resolves line.new chart point overload argument bindings', () => {
    const result = checkProgram(parse(`
indicator("Line Constructor Point Signatures")
firstPoint = chart.point.from_index(bar_index - 1, high)
secondPoint = chart.point.from_index(bar_index + 1, low)
first = line.new(firstPoint, secondPoint, xloc.bar_index, extend.none, color.green)
second = line.new(first_point=firstPoint, second_point=secondPoint, color=color.orange)
third = line.new(first_point=firstPoint, secondPoint, color.blue)
lines = array.from(first, second, third)
plot(array.size(lines))
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('first')).toMatchObject({ kind: 'line' });
    expect(types.get('second')).toMatchObject({ kind: 'line' });
    expect(types.get('third')).toMatchObject({ kind: 'line' });
    expect(types.get('lines')).toMatchObject({ kind: 'array', elementType: { kind: 'line' } });
  });

  it('reports invalid line.new overload argument bindings', () => {
    const result = checkProgram(parse(`
indicator("Bad Line Constructor Signatures")
firstPoint = chart.point.from_index(bar_index - 1, high)
secondPoint = chart.point.from_index(bar_index + 1, low)
missingCoordinates = line.new(bar_index, close)
duplicatePoint = line.new(firstPoint, secondPoint, first_point=firstPoint)
tooManyPoint = line.new(firstPoint, secondPoint, xloc.bar_index, extend.none, color.green, line.style_solid, 2, true, color.red)
unknownPoint = line.new(first_point=firstPoint, second_point=secondPoint, x1=bar_index)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'line.new() expects at least 4 arguments',
      "line.new() missing required argument 'x2'",
      "line.new() missing required argument 'y2'",
      "Argument 'first_point' for line.new() was supplied multiple times",
      'line.new() expects at most 8 arguments',
      "Unknown argument 'x1' for line.new()",
    ]);
  });

  it('reports invalid line setter argument bindings', () => {
    const result = checkProgram(parse(`
indicator("Bad Line Setter Signatures")
trend = line.new(bar_index, close, bar_index + 1, close)
firstPoint = chart.point.from_index(bar_index, high)
secondPoint = chart.point.from_index(bar_index + 1, low)
unknown = line.set_color(trend, color.blue, opacity=80)
missing = line.set_xloc(id=trend, x1=bar_index)
duplicate = line.set_xy1(trend, bar_index, high, id=trend)
tooMany = line.set_width(trend, 2, 3)
missingFirstPoint = line.set_first_point(id=trend)
duplicateSecondPoint = line.set_second_point(trend, secondPoint, id=trend)
tooManyFirstPoint = line.set_first_point(trend, firstPoint, secondPoint)
unknownSecondPoint = line.set_second_point(trend, point=secondPoint)
missingCopy = line.copy()
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'opacity' for line.set_color()",
      'line.set_xloc() expects at least 4 arguments',
      "line.set_xloc() missing required argument 'x2'",
      "line.set_xloc() missing required argument 'xloc'",
      "Argument 'id' for line.set_xy1() was supplied multiple times",
      'line.set_width() expects at most 2 arguments',
      'line.set_first_point() expects at least 2 arguments',
      "line.set_first_point() missing required argument 'first_point'",
      "Argument 'id' for line.set_second_point() was supplied multiple times",
      'line.set_first_point() expects at most 2 arguments',
      "Unknown argument 'point' for line.set_second_point()",
      'line.set_second_point() expects at least 2 arguments',
      "line.set_second_point() missing required argument 'second_point'",
      'line.copy() expects at least 1 argument',
      "line.copy() missing required argument 'id'",
    ]);
  });

  it('resolves line getter named arguments and return types', () => {
    const result = checkProgram(parse(`
indicator("Line Getter Signatures")
trend = line.new(bar_index, close, bar_index + 1, close)
x1 = line.get_x1(id=trend)
x2 = line.get_x2(trend)
y1 = line.get_y1(id=trend)
y2 = line.get_y2(trend)
price = line.get_price(id=trend, bar_index)
plot(price + y1 + y2)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('x1')).toMatchObject({ kind: 'int' });
    expect(types.get('x2')).toMatchObject({ kind: 'int' });
    expect(types.get('y1')).toMatchObject({ kind: 'float' });
    expect(types.get('y2')).toMatchObject({ kind: 'float' });
    expect(types.get('price')).toMatchObject({ kind: 'float' });
  });

  it('infers line getter return types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("Line Getter Return Types")
trend = line.new(bar_index, close, bar_index + 1, close)
x1 = line.get_x1(id=trend)
x2 = line.get_x2(trend)
y1 = line.get_y1(id=trend)
y2 = line.get_y2(trend)
price = line.get_price(id=trend, bar_index)
x1 := "bad"
x2 := "bad"
y1 := "bad"
y2 := "bad"
price := "bad"
plot(x1 + x2 + y1 + y2 + price)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to int variable x1',
      'Cannot assign string value to int variable x2',
      'Cannot assign string value to float variable y1',
      'Cannot assign string value to float variable y2',
      'Cannot assign string value to float variable price',
    ]);
    expect(types.get('x1')).toMatchObject({ kind: 'int' });
    expect(types.get('x2')).toMatchObject({ kind: 'int' });
    expect(types.get('y1')).toMatchObject({ kind: 'float' });
    expect(types.get('y2')).toMatchObject({ kind: 'float' });
    expect(types.get('price')).toMatchObject({ kind: 'float' });
  });

  it('reports invalid line getter argument bindings', () => {
    const result = checkProgram(parse(`
indicator("Bad Line Getter Signatures")
trend = line.new(bar_index, close, bar_index + 1, close)
unknown = line.get_x1(trend, format="raw")
missingPrice = line.get_price(id=trend)
duplicatePrice = line.get_price(trend, bar_index, id=trend)
tooMany = line.get_y1(trend, trend)
missingGetter = line.get_x2()
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'format' for line.get_x1()",
      'line.get_price() expects at least 2 arguments',
      "line.get_price() missing required argument 'x'",
      "Argument 'id' for line.get_price() was supplied multiple times",
      'line.get_y1() expects at most 1 argument',
      'line.get_x2() expects at least 1 argument',
      "line.get_x2() missing required argument 'id'",
    ]);
  });

  it('resolves box geometry named arguments and positional tails', () => {
    const result = checkProgram(parse(`
indicator("Box Geometry Signatures")
region = box.new(bar_index, high, bar_index + 1, low)
clone = box.copy(id=region)
topLeft = chart.point.from_index(bar_index - 1, high)
bottomRight = chart.point.from_index(bar_index + 2, low)
box.set_left(id=region, bar_index - 1)
box.set_right(region, right=bar_index + 2)
box.set_top(id=region, high)
box.set_bottom(region, bottom=low)
box.set_lefttop(id=region, left=bar_index, top=high)
box.set_rightbottom(region, bar_index + 2, bottom=low)
box.set_xloc(id=region, bar_index - 1, bar_index + 2, xloc=xloc.bar_index)
box.set_top_left_point(id=region, point=topLeft)
box.set_bottom_right_point(region, point=bottomRight)
box.delete(id=clone)
plot(1)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('clone')).toMatchObject({ kind: 'box' });
  });

  it('resolves box.new chart point overload argument bindings', () => {
    const result = checkProgram(parse(`
indicator("Box Constructor Point Signatures")
topLeft = chart.point.from_index(bar_index - 1, high)
bottomRight = chart.point.from_index(bar_index + 1, low)
first = box.new(topLeft, bottomRight, color.blue, 1, line.style_solid, extend.none, xloc.bar_index, color.new(color.blue, 80), "zone")
second = box.new(top_left=topLeft, bottom_right=bottomRight, bgcolor=color.new(color.orange, 80))
third = box.new(top_left=topLeft, bottomRight, color.green)
boxes = array.from(first, second, third)
plot(array.size(boxes))
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('first')).toMatchObject({ kind: 'box' });
    expect(types.get('second')).toMatchObject({ kind: 'box' });
    expect(types.get('third')).toMatchObject({ kind: 'box' });
    expect(types.get('boxes')).toMatchObject({ kind: 'array', elementType: { kind: 'box' } });
  });

  it('reports invalid box.new overload argument bindings', () => {
    const result = checkProgram(parse(`
indicator("Bad Box Constructor Signatures")
topLeft = chart.point.from_index(bar_index - 1, high)
bottomRight = chart.point.from_index(bar_index + 1, low)
missingCoordinates = box.new(bar_index, high)
duplicatePoint = box.new(topLeft, bottomRight, top_left=topLeft)
tooManyPoint = box.new(topLeft, bottomRight, color.blue, 1, line.style_solid, extend.none, xloc.bar_index, color.new(color.blue, 80), "zone", size.small, color.white, "center", "center", "wrap", "monospace", true, "bold", color.red)
unknownPoint = box.new(top_left=topLeft, bottom_right=bottomRight, left=bar_index)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'box.new() expects at least 4 arguments',
      "box.new() missing required argument 'right'",
      "box.new() missing required argument 'bottom'",
      "Argument 'top_left' for box.new() was supplied multiple times",
      'box.new() expects at most 17 arguments',
      "Unknown argument 'left' for box.new()",
    ]);
  });

  it('reports invalid box geometry argument bindings', () => {
    const result = checkProgram(parse(`
indicator("Bad Box Geometry Signatures")
region = box.new(bar_index, high, bar_index + 1, low)
topLeft = chart.point.from_index(bar_index, high)
bottomRight = chart.point.from_index(bar_index + 1, low)
unknown = box.set_left(region, left=bar_index, x=bar_index)
missing = box.set_lefttop(id=region, left=bar_index)
duplicate = box.set_rightbottom(region, bar_index, low, id=region)
tooMany = box.set_bottom(region, low, low)
missingXloc = box.set_xloc(id=region, left=bar_index)
duplicateXloc = box.set_xloc(region, bar_index, bar_index + 1, xloc.bar_index, id=region)
tooManyXloc = box.set_xloc(region, bar_index, bar_index + 1, xloc.bar_index, xloc.bar_time)
missingPoint = box.set_top_left_point(id=region)
duplicatePoint = box.set_bottom_right_point(region, bottomRight, id=region)
tooManyPoint = box.set_top_left_point(region, topLeft, bottomRight)
unknownPoint = box.set_bottom_right_point(region, top_left=topLeft)
missingCopy = box.copy()
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'x' for box.set_left()",
      'box.set_lefttop() expects at least 3 arguments',
      "box.set_lefttop() missing required argument 'top'",
      "Argument 'id' for box.set_rightbottom() was supplied multiple times",
      'box.set_bottom() expects at most 2 arguments',
      'box.set_xloc() expects at least 4 arguments',
      "box.set_xloc() missing required argument 'right'",
      "box.set_xloc() missing required argument 'xloc'",
      "Argument 'id' for box.set_xloc() was supplied multiple times",
      'box.set_xloc() expects at most 4 arguments',
      'box.set_top_left_point() expects at least 2 arguments',
      "box.set_top_left_point() missing required argument 'point'",
      "Argument 'id' for box.set_bottom_right_point() was supplied multiple times",
      'box.set_top_left_point() expects at most 2 arguments',
      "Unknown argument 'top_left' for box.set_bottom_right_point()",
      'box.set_bottom_right_point() expects at least 2 arguments',
      "box.set_bottom_right_point() missing required argument 'point'",
      'box.copy() expects at least 1 argument',
      "box.copy() missing required argument 'id'",
    ]);
  });

  it('resolves box visual named arguments and positional tails', () => {
    const result = checkProgram(parse(`
indicator("Box Visual Signatures")
region = box.new(bar_index, high, bar_index + 1, low)
box.set_bgcolor(id=region, color.new(color.blue, 80))
box.set_border_color(region, color=color.white)
box.set_border_width(id=region, 2)
box.set_border_style(region, style="dashed")
box.set_extend(id=region, "right")
plot(1)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid box visual argument bindings', () => {
    const result = checkProgram(parse(`
indicator("Bad Box Visual Signatures")
region = box.new(bar_index, high, bar_index + 1, low)
unknown = box.set_bgcolor(region, color.blue, bgcolor=color.red)
missing = box.set_border_color(id=region)
duplicate = box.set_border_width(region, 2, id=region)
tooMany = box.set_extend(region, "right", "left")
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'bgcolor' for box.set_bgcolor()",
      'box.set_border_color() expects at least 2 arguments',
      "box.set_border_color() missing required argument 'color'",
      "Argument 'id' for box.set_border_width() was supplied multiple times",
      'box.set_extend() expects at most 2 arguments',
    ]);
  });

  it('resolves box text named arguments and positional tails', () => {
    const result = checkProgram(parse(`
indicator("Box Text Signatures")
region = box.new(bar_index, high, bar_index + 1, low)
box.set_text(id=region, "Updated")
box.set_text_color(region, text_color=color.white)
box.set_text_size(id=region, size.small)
box.set_text_halign(region, text_halign="left")
box.set_text_valign(id=region, "top")
box.set_text_wrap(region, text_wrap="auto")
box.set_text_font_family(id=region, "monospace")
box.set_text_formatting(region, text_formatting="bolditalic")
plot(1)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid box text argument bindings', () => {
    const result = checkProgram(parse(`
indicator("Bad Box Text Signatures")
region = box.new(bar_index, high, bar_index + 1, low)
unknown = box.set_text(region, "Updated", tooltip="tip")
missing = box.set_text_color(id=region)
duplicate = box.set_text_size(region, size.small, id=region)
tooMany = box.set_text_wrap(region, "auto", "none")
badName = box.set_text_size(region, text_size=size.small)
missingFormatting = box.set_text_formatting(id=region)
duplicateFormatting = box.set_text_formatting(region, "bold", id=region)
unknownFormatting = box.set_text_formatting(region, formatting="italic")
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'tooltip' for box.set_text()",
      'box.set_text_color() expects at least 2 arguments',
      "box.set_text_color() missing required argument 'text_color'",
      "Argument 'id' for box.set_text_size() was supplied multiple times",
      'box.set_text_wrap() expects at most 2 arguments',
      "Unknown argument 'text_size' for box.set_text_size()",
      'box.set_text_size() expects at least 2 arguments',
      "box.set_text_size() missing required argument 'size'",
      'box.set_text_formatting() expects at least 2 arguments',
      "box.set_text_formatting() missing required argument 'text_formatting'",
      "Argument 'id' for box.set_text_formatting() was supplied multiple times",
      "Unknown argument 'formatting' for box.set_text_formatting()",
      'box.set_text_formatting() expects at least 2 arguments',
      "box.set_text_formatting() missing required argument 'text_formatting'",
    ]);
  });

  it('resolves box getter named arguments and return types', () => {
    const result = checkProgram(parse(`
indicator("Box Getter Signatures")
region = box.new(bar_index, high, bar_index + 1, low)
leftValue = box.get_left(id=region)
rightValue = box.get_right(region)
topValue = box.get_top(id=region)
bottomValue = box.get_bottom(region)
bgValue = box.get_bgcolor(id=region)
borderValue = box.get_border_color(region)
textValue = box.get_text(id=region)
halignValue = box.get_text_halign(region)
valignValue = box.get_text_valign(id=region)
plot(leftValue + rightValue + topValue + bottomValue)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('leftValue')).toMatchObject({ kind: 'int' });
    expect(types.get('rightValue')).toMatchObject({ kind: 'int' });
    expect(types.get('topValue')).toMatchObject({ kind: 'float' });
    expect(types.get('bottomValue')).toMatchObject({ kind: 'float' });
    expect(types.get('bgValue')).toMatchObject({ kind: 'color' });
    expect(types.get('borderValue')).toMatchObject({ kind: 'color' });
    expect(types.get('textValue')).toMatchObject({ kind: 'string' });
    expect(types.get('halignValue')).toMatchObject({ kind: 'string' });
    expect(types.get('valignValue')).toMatchObject({ kind: 'string' });
  });

  it('infers box getter return types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("Box Getter Return Types")
region = box.new(bar_index, high, bar_index + 1, low)
leftValue = box.get_left(id=region)
rightValue = box.get_right(region)
topValue = box.get_top(id=region)
bottomValue = box.get_bottom(region)
bgValue = box.get_bgcolor(id=region)
borderValue = box.get_border_color(region)
textValue = box.get_text(id=region)
halignValue = box.get_text_halign(region)
valignValue = box.get_text_valign(id=region)
leftValue := "bad"
rightValue := "bad"
topValue := "bad"
bottomValue := "bad"
bgValue := "bad"
borderValue := "bad"
textValue := 1
halignValue := 2
valignValue := 3
plot(leftValue + rightValue + topValue + bottomValue + str.length(textValue + halignValue + valignValue))
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to int variable leftValue',
      'Cannot assign string value to int variable rightValue',
      'Cannot assign string value to float variable topValue',
      'Cannot assign string value to float variable bottomValue',
      'Cannot assign string value to color variable bgValue',
      'Cannot assign string value to color variable borderValue',
      'Cannot assign int value to string variable textValue',
      'Cannot assign int value to string variable halignValue',
      'Cannot assign int value to string variable valignValue',
    ]);
    expect(types.get('leftValue')).toMatchObject({ kind: 'int' });
    expect(types.get('rightValue')).toMatchObject({ kind: 'int' });
    expect(types.get('topValue')).toMatchObject({ kind: 'float' });
    expect(types.get('bottomValue')).toMatchObject({ kind: 'float' });
    expect(types.get('bgValue')).toMatchObject({ kind: 'color' });
    expect(types.get('borderValue')).toMatchObject({ kind: 'color' });
    expect(types.get('textValue')).toMatchObject({ kind: 'string' });
    expect(types.get('halignValue')).toMatchObject({ kind: 'string' });
    expect(types.get('valignValue')).toMatchObject({ kind: 'string' });
  });

  it('reports invalid box getter argument bindings', () => {
    const result = checkProgram(parse(`
indicator("Bad Box Getter Signatures")
region = box.new(bar_index, high, bar_index + 1, low)
unknown = box.get_left(region, format="raw")
tooMany = box.get_top(region, region)
missing = box.get_text()
duplicate = box.get_bgcolor(region, id=region)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'format' for box.get_left()",
      'box.get_top() expects at most 1 argument',
      'box.get_text() expects at least 1 argument',
      "box.get_text() missing required argument 'id'",
      "Argument 'id' for box.get_bgcolor() was supplied multiple times",
    ]);
  });

  it('resolves polyline named arguments and positional tails', () => {
    const result = checkProgram(parse(`
indicator("Polyline Signatures")
firstPoint = chart.point.from_index(bar_index, high)
secondPoint = chart.point.from_index(bar_index + 1, low)
points = array.from(firstPoint, secondPoint)
shape = polyline.new(points=points, true, false, xloc.bar_index, color.blue, color.new(color.blue, 80), "solid", 2, true)
named = polyline.new(points, curved=true, closed=true, line_color=color.orange)
clone = polyline.copy(id=shape)
polylines = array.from(shape, named, clone)
polyline.delete(id=clone)
plot(array.size(polylines))
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('shape')).toMatchObject({ kind: 'polyline' });
    expect(types.get('named')).toMatchObject({ kind: 'polyline' });
    expect(types.get('clone')).toMatchObject({ kind: 'polyline' });
    expect(types.get('polylines')).toMatchObject({ kind: 'array', elementType: { kind: 'polyline' } });
  });

  it('infers polyline handle return types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("Polyline Handle Return Types")
firstPoint = chart.point.from_index(bar_index, high)
secondPoint = chart.point.from_index(bar_index + 1, low)
points = array.from(firstPoint, secondPoint)
shape = polyline.new(points=points)
clone = polyline.copy(id=shape)
shape := table.new(columns=1, rows=1)
clone := table.new(columns=1, rows=1)
plot(1)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign table value to polyline variable shape',
      'Cannot assign table value to polyline variable clone',
    ]);
    expect(types.get('shape')).toMatchObject({ kind: 'polyline' });
    expect(types.get('clone')).toMatchObject({ kind: 'polyline' });
  });

  it('infers drawing all handle array types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("Drawing All Return Types")
firstPoint = chart.point.from_index(bar_index, high)
secondPoint = chart.point.from_index(bar_index + 1, low)
points = array.from(firstPoint, secondPoint)
labelIds = label.all
lineIds = line.all
linefillIds = linefill.all
boxIds = box.all
polylineIds = polyline.all
tableIds = table.all
firstLabel = array.get(labelIds, 0)
firstLine = array.get(lineIds, 0)
firstLinefill = array.get(linefillIds, 0)
firstBox = array.get(boxIds, 0)
firstPolyline = array.get(polylineIds, 0)
firstTable = array.get(tableIds, 0)
firstLabel := line.new(bar_index, close, bar_index + 1, close)
firstLine := label.new(bar_index, close)
firstLinefill := line.new(bar_index, close, bar_index + 1, close)
firstBox := polyline.new(points)
firstPolyline := box.new(bar_index, high, bar_index + 1, low)
firstTable := label.new(bar_index, close)
plot(1)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign line value to label variable firstLabel',
      'Cannot assign label value to line variable firstLine',
      'Cannot assign line value to linefill variable firstLinefill',
      'Cannot assign polyline value to box variable firstBox',
      'Cannot assign box value to polyline variable firstPolyline',
      'Cannot assign label value to table variable firstTable',
    ]);
    expect(types.get('labelIds')).toMatchObject({ kind: 'array', elementType: { kind: 'label' } });
    expect(types.get('lineIds')).toMatchObject({ kind: 'array', elementType: { kind: 'line' } });
    expect(types.get('linefillIds')).toMatchObject({ kind: 'array', elementType: { kind: 'linefill' } });
    expect(types.get('boxIds')).toMatchObject({ kind: 'array', elementType: { kind: 'box' } });
    expect(types.get('polylineIds')).toMatchObject({ kind: 'array', elementType: { kind: 'polyline' } });
    expect(types.get('tableIds')).toMatchObject({ kind: 'array', elementType: { kind: 'table' } });
    expect(types.get('firstLabel')).toMatchObject({ kind: 'label' });
    expect(types.get('firstLine')).toMatchObject({ kind: 'line' });
    expect(types.get('firstLinefill')).toMatchObject({ kind: 'linefill' });
    expect(types.get('firstBox')).toMatchObject({ kind: 'box' });
    expect(types.get('firstPolyline')).toMatchObject({ kind: 'polyline' });
    expect(types.get('firstTable')).toMatchObject({ kind: 'table' });
  });

  it('reports invalid polyline argument bindings', () => {
    const result = checkProgram(parse(`
indicator("Bad Polyline Signatures")
firstPoint = chart.point.from_index(bar_index, high)
secondPoint = chart.point.from_index(bar_index + 1, low)
points = array.from(firstPoint, secondPoint)
unknown = polyline.new(points, opacity=80)
missing = polyline.new(curved=true)
duplicate = polyline.new(points, points=points)
tooMany = polyline.new(points, true, false, xloc.bar_index, color.blue, color.red, "solid", 2, true, false)
missingCopy = polyline.copy()
unknownDelete = polyline.delete(shape=points)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'opacity' for polyline.new()",
      "polyline.new() missing required argument 'points'",
      "Argument 'points' for polyline.new() was supplied multiple times",
      'polyline.new() expects at most 9 arguments',
      'polyline.copy() expects at least 1 argument',
      "polyline.copy() missing required argument 'id'",
      "Unknown argument 'shape' for polyline.delete()",
      'polyline.delete() expects at least 1 argument',
      "polyline.delete() missing required argument 'id'",
    ]);
  });

  it('resolves linefill.new named arguments and positional tails', () => {
    const result = checkProgram(parse(`
indicator("Linefill Signatures")
upper = line.new(bar_index, high, bar_index + 1, high)
lower = line.new(bar_index, low, bar_index + 1, low)
filled = linefill.new(line1=upper, lower, color.new(color.blue, 80))
named = linefill.new(line1=upper, line2=lower, color=color.orange)
linefills = array.from(filled, named)
plot(array.size(linefills))
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('filled')).toMatchObject({ kind: 'linefill' });
    expect(types.get('named')).toMatchObject({ kind: 'linefill' });
    expect(types.get('linefills')).toMatchObject({ kind: 'array', elementType: { kind: 'linefill' } });
  });

  it('reports invalid linefill.new argument bindings', () => {
    const result = checkProgram(parse(`
indicator("Bad Linefill Signatures")
upper = line.new(bar_index, high, bar_index + 1, high)
lower = line.new(bar_index, low, bar_index + 1, low)
unknown = linefill.new(upper, lower, opacity=80)
missing = linefill.new(line1=upper)
duplicate = linefill.new(upper, lower, line1=upper)
tooMany = linefill.new(upper, lower, color.blue, color.red)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'opacity' for linefill.new()",
      'linefill.new() expects at least 2 arguments',
      "linefill.new() missing required argument 'line2'",
      "Argument 'line1' for linefill.new() was supplied multiple times",
      'linefill.new() expects at most 3 arguments',
    ]);
  });

  it('resolves linefill method named arguments and positional tails', () => {
    const result = checkProgram(parse(`
indicator("Linefill Method Signatures")
upper = line.new(bar_index, high, bar_index + 1, high)
lower = line.new(bar_index, low, bar_index + 1, low)
filled = linefill.new(upper, lower)
linefill.set_color(id=filled, color.orange)
firstLine = linefill.get_line1(id=filled)
secondLine = linefill.get_line2(filled)
linefill.delete(id=filled)
plot(1)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('firstLine')).toMatchObject({ kind: 'line' });
    expect(types.get('secondLine')).toMatchObject({ kind: 'line' });
  });

  it('infers linefill getter return types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("Linefill Getter Return Types")
upper = line.new(bar_index, high, bar_index + 1, high)
lower = line.new(bar_index, low, bar_index + 1, low)
filled = linefill.new(upper, lower)
firstLine = linefill.get_line1(id=filled)
secondLine = linefill.get_line2(filled)
firstLine := filled
secondLine := filled
plot(1)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign linefill value to line variable firstLine',
      'Cannot assign linefill value to line variable secondLine',
    ]);
    expect(types.get('firstLine')).toMatchObject({ kind: 'line' });
    expect(types.get('secondLine')).toMatchObject({ kind: 'line' });
  });

  it('reports invalid linefill method argument bindings', () => {
    const result = checkProgram(parse(`
indicator("Bad Linefill Method Signatures")
upper = line.new(bar_index, high, bar_index + 1, high)
lower = line.new(bar_index, low, bar_index + 1, low)
filled = linefill.new(upper, lower)
unknown = linefill.set_color(filled, color.blue, opacity=80)
missing = linefill.set_color(id=filled)
duplicate = linefill.delete(filled, id=filled)
tooMany = linefill.get_line1(filled, filled)
missingGetter = linefill.get_line2()
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'opacity' for linefill.set_color()",
      'linefill.set_color() expects at least 2 arguments',
      "linefill.set_color() missing required argument 'color'",
      "Argument 'id' for linefill.delete() was supplied multiple times",
      'linefill.get_line1() expects at most 1 argument',
      'linefill.get_line2() expects at least 1 argument',
      "linefill.get_line2() missing required argument 'id'",
    ]);
  });

  it('resolves table.new named arguments and positional tails', () => {
    const result = checkProgram(parse(`
indicator("Table Signatures")
dashboard = table.new(position=position.top_right, 2, 3, color.new(color.black, 80), color.gray, 1, color.white, 1)
compact = table.new(position.bottom_left, columns=1, rows=1, bgcolor=color.blue)
defaulted = table.new(columns=2, rows=2)
tables = array.from(dashboard, compact, defaulted)
plot(array.size(tables))
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('dashboard')).toMatchObject({ kind: 'table' });
    expect(types.get('compact')).toMatchObject({ kind: 'table' });
    expect(types.get('defaulted')).toMatchObject({ kind: 'table' });
    expect(types.get('tables')).toMatchObject({ kind: 'array', elementType: { kind: 'table' } });
  });

  it('infers table handle return types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("Table Handle Return Types")
firstPoint = chart.point.from_index(bar_index, high)
secondPoint = chart.point.from_index(bar_index + 1, low)
points = array.from(firstPoint, secondPoint)
shape = polyline.new(points=points)
dashboard = table.new(columns=2, rows=2)
compact = table.new(position.bottom_left, columns=1, rows=1)
dashboard := shape
compact := shape
plot(1)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign polyline value to table variable dashboard',
      'Cannot assign polyline value to table variable compact',
    ]);
    expect(types.get('dashboard')).toMatchObject({ kind: 'table' });
    expect(types.get('compact')).toMatchObject({ kind: 'table' });
  });

  it('reports invalid table.new argument bindings', () => {
    const result = checkProgram(parse(`
indicator("Bad Table Signatures")
unknown = table.new(position.top_right, 2, 3, frame=1)
missing = table.new(position=position.top_right, columns=2)
duplicate = table.new(position.top_right, 2, 3, position=position.bottom_left)
tooMany = table.new(position.top_right, 2, 3, color.black, color.gray, 1, color.white, 1, 0)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'frame' for table.new()",
      "table.new() missing required argument 'rows'",
      "Argument 'position' for table.new() was supplied multiple times",
      'table.new() expects at most 8 arguments',
    ]);
  });

  it('resolves table management named arguments and positional tails', () => {
    const result = checkProgram(parse(`
indicator("Table Management Signatures")
dashboard = table.new(columns=2, rows=2)
temporary = table.new(columns=1, rows=1)
table.clear(table_id=dashboard, 0, 0)
table.clear(dashboard, start_column=0, start_row=0, end_column=1, end_row=1)
table.merge_cells(table_id=dashboard, start_column=0, start_row=0, end_column=1, end_row=0)
table.merge_cells(dashboard, 0, 1, 1, 1)
table.set_position(table_id=dashboard, position.bottom_left)
table.set_bgcolor(dashboard, bgcolor=color.new(color.black, 80))
table.set_frame_color(table_id=dashboard, color.gray)
table.set_frame_width(dashboard, frame_width=1)
table.set_border_color(table_id=dashboard, border_color=color.white)
table.set_border_width(dashboard, border_width=2)
table.delete(table_id=temporary)
plot(1)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid table management argument bindings', () => {
    const result = checkProgram(parse(`
indicator("Bad Table Management Signatures")
dashboard = table.new(columns=2, rows=2)
unknown = table.clear(dashboard, 0, 0, width=1)
missingClear = table.clear(table_id=dashboard, start_column=0)
duplicateClear = table.clear(dashboard, 0, 0, table_id=dashboard)
tooManyClear = table.clear(dashboard, 0, 0, 1, 1, 2)
missingMerge = table.merge_cells(table_id=dashboard, start_column=0, start_row=0, end_column=1)
duplicateMerge = table.merge_cells(dashboard, 0, 0, 1, 1, table_id=dashboard)
tooManyMerge = table.merge_cells(dashboard, 0, 0, 1, 1, 2)
missingSetter = table.set_position(table_id=dashboard)
unknownSetter = table.set_bgcolor(dashboard, color.black, opacity=80)
duplicateSetter = table.set_frame_color(dashboard, color.gray, table_id=dashboard)
tooManySetter = table.set_border_width(dashboard, 1, 2)
tooManyDelete = table.delete(dashboard, dashboard)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'width' for table.clear()",
      'table.clear() expects at least 3 arguments',
      "table.clear() missing required argument 'start_row'",
      "Argument 'table_id' for table.clear() was supplied multiple times",
      'table.clear() expects at most 5 arguments',
      'table.merge_cells() expects at least 5 arguments',
      "table.merge_cells() missing required argument 'end_row'",
      "Argument 'table_id' for table.merge_cells() was supplied multiple times",
      'table.merge_cells() expects at most 5 arguments',
      'table.set_position() expects at least 2 arguments',
      "table.set_position() missing required argument 'position'",
      "Unknown argument 'opacity' for table.set_bgcolor()",
      "Argument 'table_id' for table.set_frame_color() was supplied multiple times",
      'table.set_border_width() expects at most 2 arguments',
      'table.delete() expects at most 1 argument',
    ]);
  });

  it('resolves table.cell named arguments and positional tails', () => {
    const result = checkProgram(parse(`
indicator("Table Cell Signatures")
dashboard = table.new(columns=2, rows=2)
table.cell(table_id=dashboard, 0, 0, "Entry", 10, 2, color.white, "left", "top", size.small, color.blue)
table.cell(dashboard, column=1, row=0, text="Exit", bgcolor=color.orange, tooltip="Exit details")
plot(1)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid table.cell argument bindings', () => {
    const result = checkProgram(parse(`
indicator("Bad Table Cell Signatures")
dashboard = table.new(columns=2, rows=2)
unknown = table.cell(dashboard, 0, 0, label="Entry")
missing = table.cell(table_id=dashboard, column=1)
duplicate = table.cell(dashboard, 0, 0, table_id=dashboard)
tooMany = table.cell(dashboard, 0, 0, "A", 1, 1, color.white, "left", "top", size.small, color.blue, "mono", "bold", "tip", 1)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'label' for table.cell()",
      'table.cell() expects at least 3 arguments',
      "table.cell() missing required argument 'row'",
      "Argument 'table_id' for table.cell() was supplied multiple times",
      'table.cell() expects at most 14 arguments',
    ]);
  });

  it('resolves table cell setter named arguments and positional tails', () => {
    const result = checkProgram(parse(`
indicator("Table Cell Setter Signatures")
dashboard = table.new(columns=2, rows=2)
table.cell(dashboard, 0, 0)
table.cell_set_text(table_id=dashboard, 0, 0, "Entry")
table.cell_set_bgcolor(dashboard, column=0, row=0, bgcolor=color.blue)
table.cell_set_text_color(table_id=dashboard, column=0, row=0, text_color=color.white)
table.cell_set_text_size(dashboard, 0, row=0, text_size=size.small)
table.cell_set_width(table_id=dashboard, column=0, row=0, width=10)
table.cell_set_height(dashboard, column=0, row=0, height=2)
table.cell_set_text_halign(table_id=dashboard, 0, 0, "left")
table.cell_set_text_valign(dashboard, column=0, row=0, text_valign="top")
table.cell_set_text_font_family(table_id=dashboard, column=0, row=0, text_font_family="monospace")
table.cell_set_text_formatting(dashboard, column=0, row=0, text_formatting="bold")
table.cell_set_tooltip(table_id=dashboard, column=0, row=0, tooltip="Details")
plot(1)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid table cell setter argument bindings', () => {
    const result = checkProgram(parse(`
indicator("Bad Table Cell Setter Signatures")
dashboard = table.new(columns=2, rows=2)
unknown = table.cell_set_text(dashboard, 0, 0, "Entry", tooltip="Details")
missing = table.cell_set_bgcolor(table_id=dashboard, column=0, row=0)
duplicate = table.cell_set_text_color(dashboard, 0, 0, color.white, table_id=dashboard)
tooMany = table.cell_set_width(dashboard, 0, 0, 10, 20)
missingCoordinate = table.cell_set_height(table_id=dashboard, row=0, height=2)
missingTooltip = table.cell_set_tooltip(table_id=dashboard, column=0, row=0)
duplicateTooltip = table.cell_set_tooltip(dashboard, 0, 0, "Tip", table_id=dashboard)
tooManyTooltip = table.cell_set_tooltip(dashboard, 0, 0, "Tip", "Extra")
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown argument 'tooltip' for table.cell_set_text()",
      'table.cell_set_bgcolor() expects at least 4 arguments',
      "table.cell_set_bgcolor() missing required argument 'bgcolor'",
      "Argument 'table_id' for table.cell_set_text_color() was supplied multiple times",
      'table.cell_set_width() expects at most 4 arguments',
      'table.cell_set_height() expects at least 4 arguments',
      "table.cell_set_height() missing required argument 'column'",
      'table.cell_set_tooltip() expects at least 4 arguments',
      "table.cell_set_tooltip() missing required argument 'tooltip'",
      "Argument 'table_id' for table.cell_set_tooltip() was supplied multiple times",
      'table.cell_set_tooltip() expects at most 4 arguments',
    ]);
  });

  it('infers homogeneous array literal and array.from element types', () => {
    const result = checkProgram(parse(`
indicator("Array Literal Types")
literalInts = [1, 2]
literalFloats = [1, 2.5]
fromStrings = array.from("a", "b")
mixed = array.from(1, "b")
label labelId = na
fromLabels = array.from(labelId)
fromConstructedLabels = array.from(label.new(bar_index, close))
literalLabels = [label.new(bar_index, close)]
fromPoints = array.from(chart.point.from_index(bar_index, close))
ints = array.new_int()
strings = array.new_string()
labels = array.new_label()
ints.push(literalInts[0])
ints.push(literalFloats[0])
strings.push(array.get(fromStrings, 0))
labels.push(array.get(fromLabels, 0))
labels.push(array.get(fromConstructedLabels, 0))
labels.push(literalLabels[0])
labels.push("bad")
fromPoints.push(label.new(bar_index, close))
ints.push(array.get(fromStrings, 0))
ints.push(mixed[0])
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(types.get('literalInts')).toMatchObject({ kind: 'array', elementType: { kind: 'int' } });
    expect(types.get('literalFloats')).toMatchObject({ kind: 'array', elementType: { kind: 'float' } });
    expect(types.get('fromStrings')).toMatchObject({ kind: 'array', elementType: { kind: 'string' } });
    expect(types.get('fromLabels')).toMatchObject({ kind: 'array', elementType: { kind: 'label' } });
    expect(types.get('fromConstructedLabels')).toMatchObject({ kind: 'array', elementType: { kind: 'label' } });
    expect(types.get('literalLabels')).toMatchObject({ kind: 'array', elementType: { kind: 'label' } });
    expect(types.get('fromPoints')).toMatchObject({ kind: 'array', elementType: { kind: 'chart.point' } });
    expect(types.get('mixed')).toMatchObject({ kind: 'array', elementType: { kind: 'unknown' } });
    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot use float value as int array element',
      'Cannot use string value as label array element',
      'Cannot use label value as chart.point array element',
      'Cannot use string value as int array element',
    ]);
  });

  it('infers simple literal and array expression types', () => {
    const result = checkProgram(parse(`
indicator("Inferred Symbols")
count = 3
ratio = 1.5
enabled = true
name = "BTC"
tint = #ff00ff
values = [1, 2]
floatValues = array.new_float()
copied = floatValues.copy()
sliced = array.slice(floatValues, 0, 1)
absolute = array.abs(floatValues)
standardized = floatValues.standardize()
indices = floatValues.sort_indices()
sizeValue = floatValues.size()
hasValue = array.includes(floatValues, 1.5)
indexValue = floatValues.indexof(1.5)
averageValue = array.avg(floatValues)
joinedValue = floatValues.join(",")
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('count')).toMatchObject({ kind: 'int' });
    expect(types.get('ratio')).toMatchObject({ kind: 'float' });
    expect(types.get('enabled')).toMatchObject({ kind: 'bool' });
    expect(types.get('name')).toMatchObject({ kind: 'string' });
    expect(types.get('tint')).toMatchObject({ kind: 'color' });
    expect(types.get('values')).toMatchObject({ kind: 'array' });
    expect(types.get('copied')).toMatchObject({ kind: 'array', elementType: { kind: 'float' } });
    expect(types.get('sliced')).toMatchObject({ kind: 'array', elementType: { kind: 'float' } });
    expect(types.get('absolute')).toMatchObject({ kind: 'array', elementType: { kind: 'float' } });
    expect(types.get('standardized')).toMatchObject({ kind: 'array', elementType: { kind: 'float' } });
    expect(types.get('indices')).toMatchObject({ kind: 'array', elementType: { kind: 'int' } });
    expect(types.get('sizeValue')).toMatchObject({ kind: 'int' });
    expect(types.get('hasValue')).toMatchObject({ kind: 'bool' });
    expect(types.get('indexValue')).toMatchObject({ kind: 'int' });
    expect(types.get('averageValue')).toMatchObject({ kind: 'float' });
    expect(types.get('joinedValue')).toMatchObject({ kind: 'string' });
  });

  it('records explicit qualifiers and infers common qualifier sources', () => {
    const result = checkProgram(parse(`
indicator("Qualifiers")
const int literal = 3
input int configured = input.int(14)
simple int promoted = configured
series float price = close
series float average = ta.sma(close, configured)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('literal')).toMatchObject({ kind: 'int', qualifier: 'const' });
    expect(types.get('configured')).toMatchObject({ kind: 'int', qualifier: 'input' });
    expect(types.get('promoted')).toMatchObject({ kind: 'int', qualifier: 'simple' });
    expect(types.get('price')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('average')).toMatchObject({ kind: 'float', qualifier: 'series' });
  });

  it('reports invalid qualifier demotions', () => {
    const result = checkProgram(parse(`
indicator("Bad Qualifier")
simple float badPrice = close
input float badAverage = ta.sma(close, 3)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign series value to simple float',
      'Cannot assign series value to input float',
    ]);
  });

  it('reports invalid built-in argument names, counts, and ordering', () => {
    const result = checkProgram(parse(`
indicator("Bad Builtins")
one = ta.sma(close)
two = ta.rsi(source=close, length=14, bad=14)
three = color.new(color.red, 10, 20)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'ta.sma() expects at least 2 arguments',
      "ta.sma() missing required argument 'length'",
      "Unknown argument 'bad' for ta.rsi()",
      'color.new() expects at most 2 arguments',
    ]);
  });

  it('resolves visual output named-prefix positional tails', () => {
    const result = checkProgram(parse(`
indicator("Visual Output Mixed Args")
upper = plot(series=high, "Upper", color.green)
lower = plot(series=low, "Lower", color.red)
plot(series=close, "Mixed Plot", color.blue, 2, plot.style_columns)
hline(price=100, "Mixed HLine", color.orange, hline.style_dashed, 2)
bgcolor(color=color.blue, 1, false, 3, "Mixed Bg")
barcolor(color=color.red, 1, true, 4, "Mixed Bar")
plotbar(open=open, high, low, close, "Mixed Bars", color.purple, false, 5, display.none)
plotcandle(open=open, high, low, close, "Mixed Candles", color.silver, color.yellow, false, 6, color.black)
plotshape(series=close > open, "Mixed Shape", shape.triangleup, location.belowbar, color.green, 0, "S")
plotchar(series=close < open, "Mixed Char", "C", location.abovebar, color.red, 0, "C")
plotarrow(series=close - open, "Mixed Arrow", color.green, color.red, 0, 5, 15)
fill(plot1=upper, lower, color.new(color.orange, 80), "Mixed Fill", false, 6)
fill(hline1=upper, hline2=lower, color=color.new(color.blue, 90))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports duplicate built-in bindings from positional and named arguments', () => {
    const result = checkProgram(parse(`
indicator("Duplicate Builtin Args")
value = ta.sma(close, source=open, length=14)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'source' for ta.sma() was supplied multiple times",
    ]);
  });

  it('resolves core TA helper named and default-source arguments', () => {
    const result = checkProgram(parse(`
indicator("TA Core Signatures")
condition = close > open
since = ta.barssince(condition=condition)
last = ta.valuewhen(condition=condition, source=close, occurrence=0)
lastMixed = ta.valuewhen(condition=condition, close, 0)
changed = ta.change(source=close, length=2)
changedMixed = ta.change(source=close, 2)
crossed = ta.crossover(source1=close, source2=open) or ta.crossunder(source1=close, source2=open) or ta.cross(source1=close, source2=open)
crossedMixed = ta.crossover(source1=close, open) or ta.crossunder(source1=close, open) or ta.cross(source1=close, open)
highest = ta.highest(length=3)
lowest = ta.lowest(length=3)
highestOffset = ta.highestbars(length=3)
lowestOffset = ta.lowestbars(length=3)
singleLengthHighest = ta.highest(3)
mixedHighest = ta.highest(source=high, 3)
mixedLowest = ta.lowest(source=low, 3)
mixedHighestOffset = ta.highestbars(source=high, 3)
mixedLowestOffset = ta.lowestbars(source=low, 3)
spread = ta.range(source=close, length=3)
trend = ta.rising(source=close, length=2) or ta.falling(source=close, length=2)
plot(since + last + lastMixed + changed + changedMixed + highest + lowest + highestOffset + lowestOffset + singleLengthHighest + mixedHighest + mixedLowest + mixedHighestOffset + mixedLowestOffset + spread + (crossed ? 1 : 0) + (crossedMixed ? 1 : 0) + (trend ? 1 : 0))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('infers core TA helper return types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("TA Return Types")
condition = close > open
since = ta.barssince(condition)
lastText = ta.valuewhen(condition=condition, source="up", occurrence=0)
changedClose = ta.change(source=close, length=2)
changedCondition = ta.change(condition)
crossed = ta.crossover(source1=close, source2=open)
highestOffset = ta.highestbars(source=high, length=3)
highestInt = ta.highest(source=bar_index, length=3)
defaultHighest = ta.highest(3)
average = ta.sma(source=close, length=3)
trend = ta.rising(source=close, length=2)
spread = ta.range(source=close, length=3)
since := "bad"
lastText := 1
changedClose := "bad"
changedCondition := 1
crossed := 1
highestOffset := "bad"
highestInt := "bad"
average := "bad"
trend := 1
spread := "bad"
plot(since + highestOffset + highestInt + defaultHighest + average + spread + (changedCondition ? 1 : 0) + (crossed ? 1 : 0) + (trend ? 1 : 0))
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to int variable since',
      'Cannot assign int value to string variable lastText',
      'Cannot assign string value to float variable changedClose',
      'Cannot assign int value to bool variable changedCondition',
      'Cannot assign int value to bool variable crossed',
      'Cannot assign string value to int variable highestOffset',
      'Cannot assign string value to int variable highestInt',
      'Cannot assign string value to float variable average',
      'Cannot assign int value to bool variable trend',
      'Cannot assign string value to float variable spread',
    ]);
    expect(types.get('since')).toMatchObject({ kind: 'int', qualifier: 'series' });
    expect(types.get('lastText')).toMatchObject({ kind: 'string', qualifier: 'series' });
    expect(types.get('changedClose')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('changedCondition')).toMatchObject({ kind: 'bool', qualifier: 'series' });
    expect(types.get('crossed')).toMatchObject({ kind: 'bool', qualifier: 'series' });
    expect(types.get('highestOffset')).toMatchObject({ kind: 'int', qualifier: 'series' });
    expect(types.get('highestInt')).toMatchObject({ kind: 'int', qualifier: 'series' });
    expect(types.get('defaultHighest')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('average')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('trend')).toMatchObject({ kind: 'bool', qualifier: 'series' });
    expect(types.get('spread')).toMatchObject({ kind: 'float', qualifier: 'series' });
  });

  it('infers TA series variable member return types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("TA Variable Return Types")
iii = ta.iii
nvi = ta.nvi
obv = ta.obv
pvi = ta.pvi
pvt = ta.pvt
tr = ta.tr
wad = ta.wad
wvad = ta.wvad
iii := "bad"
nvi := "bad"
obv := "bad"
pvi := "bad"
pvt := "bad"
tr := "bad"
wad := "bad"
wvad := "bad"
plot(iii + nvi + obv + pvi + pvt + tr + wad + wvad)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to float variable iii',
      'Cannot assign string value to float variable nvi',
      'Cannot assign string value to float variable obv',
      'Cannot assign string value to float variable pvi',
      'Cannot assign string value to float variable pvt',
      'Cannot assign string value to float variable tr',
      'Cannot assign string value to float variable wad',
      'Cannot assign string value to float variable wvad',
    ]);
    for (const name of ['iii', 'nvi', 'obv', 'pvi', 'pvt', 'tr', 'wad', 'wvad']) {
      expect(types.get(name)).toMatchObject({ kind: 'float', qualifier: 'series' });
    }
  });

  it('reports invalid core TA helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad TA Core Signatures")
duplicateValuewhen = ta.valuewhen(close > open, condition=false, source=close, occurrence=0)
unknownCross = ta.cross(source1=close, source2=open, threshold=0)
missingHighestLength = ta.highest(source=high)
badHighestOrder = ta.highest(length=3, high)
shortRange = ta.range(source=close)
tooManyBarsSince = ta.barssince(close > open, true)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'condition' for ta.valuewhen() was supplied multiple times",
      "Unknown argument 'threshold' for ta.cross()",
      "ta.highest() missing required argument 'length'",
      'ta.highest() cannot use positional arguments after named arguments',
      "ta.range() expects at least 2 arguments",
      "ta.range() missing required argument 'length'",
      'ta.barssince() expects at most 1 argument',
    ]);
  });

  it('resolves TA statistics helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("TA Stats Signatures")
variance = ta.variance(source=close, length=3, biased=false)
varianceMixed = ta.variance(source=close, 3, false)
deviation = ta.dev(source=close, length=3)
deviationMixed = ta.dev(source=close, 3)
correlation = ta.correlation(source1=close, source2=open, length=3)
correlationMixed = ta.correlation(source1=close, open, 3)
cog = ta.cog(source=close, length=3)
mixedCog = ta.cog(source=close, 3)
median = ta.median(source=close, length=3)
medianMixed = ta.median(source=close, 3)
mode = ta.mode(source=close, length=3)
modeMixed = ta.mode(source=close, 3)
nearest = ta.percentile_nearest_rank(source=close, length=3, percentage=75)
nearestMixed = ta.percentile_nearest_rank(source=close, 3, 75)
linear = ta.percentile_linear_interpolation(source=close, length=3, percentage=75)
linearMixed = ta.percentile_linear_interpolation(source=close, 3, 75)
rank = ta.percentrank(source=close, length=3)
rankMixed = ta.percentrank(source=close, 3)
total = ta.cum(source=close)
plot(variance + varianceMixed + deviation + deviationMixed + correlation + correlationMixed + cog + mixedCog + median + medianMixed + mode + modeMixed + nearest + nearestMixed + linear + linearMixed + rank + rankMixed + total)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid TA statistics helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad TA Stats Signatures")
duplicateVariance = ta.variance(close, source=open, length=3)
unknownDeviation = ta.dev(source=close, length=3, average=2)
missingCorrelation = ta.correlation(source1=close, source2=open)
shortPercentile = ta.percentile_nearest_rank(source=close, length=3)
tooManyCum = ta.cum(close, open)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'source' for ta.variance() was supplied multiple times",
      "Unknown argument 'average' for ta.dev()",
      'ta.correlation() expects at least 3 arguments',
      "ta.correlation() missing required argument 'length'",
      'ta.percentile_nearest_rank() expects at least 3 arguments',
      "ta.percentile_nearest_rank() missing required argument 'percentage'",
      'ta.cum() expects at most 1 argument',
    ]);
  });

  it('resolves TA moving-average and momentum helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("TA MA Momentum Signatures")
vwma = ta.vwma(source=close, length=3)
vwmaMixed = ta.vwma(source=close, 3)
rma = ta.rma(source=close, length=3)
rmaMixed = ta.rma(source=close, 3)
wma = ta.wma(source=close, length=3)
wmaMixed = ta.wma(source=close, 3)
swma = ta.swma(source=close)
alma = ta.alma(series=close, length=5, offset=0.85, sigma=6, floor=false)
almaMixed = ta.alma(series=close, 5, 0.85, 6, false)
hma = ta.hma(source=close, length=5)
hmaMixed = ta.hma(source=close, 5)
momentum = ta.mom(source=close, length=2)
momentumMixed = ta.mom(source=close, 2)
rate = ta.roc(source=close, length=2)
rateMixed = ta.roc(source=close, 2)
plot(vwma + vwmaMixed + rma + rmaMixed + wma + wmaMixed + swma + alma + almaMixed + hma + hmaMixed + momentum + momentumMixed + rate + rateMixed)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid TA moving-average and momentum helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad TA MA Momentum Signatures")
duplicateVwma = ta.vwma(close, source=open, length=3)
unknownAlma = ta.alma(series=close, length=5, offset=0.85, sigma=6, biased=false)
shortWma = ta.wma(source=close)
tooManySwma = ta.swma(close, open)
tooManyMom = ta.mom(close, 2, 3)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'source' for ta.vwma() was supplied multiple times",
      "Unknown argument 'biased' for ta.alma()",
      'ta.wma() expects at least 2 arguments',
      "ta.wma() missing required argument 'length'",
      'ta.swma() expects at most 1 argument',
      'ta.mom() expects at most 2 arguments',
    ]);
  });

  it('resolves TA channel helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("TA Channel Signatures")
[bbBasis, bbUpper, bbLower] = ta.bb(series=close, length=3, mult=2.0)
[mixedBbBasis, mixedBbUpper, mixedBbLower] = ta.bb(series=close, 3, 2.0)
bbw = ta.bbw(series=close, length=3, mult=2.0)
bbwMixed = ta.bbw(series=close, 3, 2.0)
[kcBasis, kcUpper, kcLower] = ta.kc(series=close, length=3, mult=1.25, useTrueRange=false)
[mixedKcBasis, mixedKcUpper, mixedKcLower] = ta.kc(series=close, 3, 1.25, false)
kcw = ta.kcw(series=close, length=3, mult=1.25, useTrueRange=false)
kcwMixed = ta.kcw(series=close, 3, 1.25, false)
plot(bbBasis + bbUpper + bbLower + mixedBbBasis + mixedBbUpper + mixedBbLower + bbw + bbwMixed + kcBasis + kcUpper + kcLower + mixedKcBasis + mixedKcUpper + mixedKcLower + kcw + kcwMixed)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid TA channel helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad TA Channel Signatures")
duplicateBb = ta.bbw(close, series=open, length=3, mult=2.0)
unknownKc = ta.kc(series=close, length=3, mult=1.25, tr=false)
shortBb = ta.bb(series=close, length=3)
tooManyKcw = ta.kcw(close, 3, 1.25, true, false)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'series' for ta.bbw() was supplied multiple times",
      "Unknown argument 'tr' for ta.kc()",
      'ta.bb() expects at least 3 arguments',
      "ta.bb() missing required argument 'mult'",
      'ta.kcw() expects at most 4 arguments',
    ]);
  });

  it('resolves TA oscillator helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("TA Oscillator Signatures")
stoch = ta.stoch(source=close, high=high, low=low, length=3)
stochMixed = ta.stoch(source=close, high, low, 3)
mfi = ta.mfi(source=hlc3, length=3)
mfiMixed = ta.mfi(source=hlc3, 3)
wpr = ta.wpr(length=3)
cmo = ta.cmo(source=close, length=3)
cmoMixed = ta.cmo(source=close, 3)
rsi = ta.rsi(source=close, length=3)
rsiMixed = ta.rsi(source=close, 3)
tsi = ta.tsi(source=close, short_length=2, long_length=3)
tsiMixed = ta.tsi(source=close, 2, 3)
cci = ta.cci(source=hlc3, length=3)
cciMixed = ta.cci(source=hlc3, 3)
plot(stoch + stochMixed + mfi + mfiMixed + wpr + cmo + cmoMixed + rsi + rsiMixed + tsi + tsiMixed + cci + cciMixed)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid TA oscillator helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad TA Oscillator Signatures")
duplicateStoch = ta.stoch(close, source=open, high=high, low=low, length=3)
unknownMfi = ta.mfi(source=hlc3, length=3, volume=volume)
shortTsi = ta.tsi(source=close, short_length=2)
tooManyWpr = ta.wpr(3, 4)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'source' for ta.stoch() was supplied multiple times",
      "Unknown argument 'volume' for ta.mfi()",
      'ta.tsi() expects at least 3 arguments',
      "ta.tsi() missing required argument 'long_length'",
      'ta.wpr() expects at most 1 argument',
    ]);
  });

  it('resolves TA trend and pivot helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("TA Trend Pivot Signatures")
[trend, direction] = ta.supertrend(factor=2.0, atrPeriod=3)
[mixedTrend, mixedDirection] = ta.supertrend(factor=2.0, 3)
[diPlus, diMinus, adx] = ta.dmi(diLength=3, adxSmoothing=3)
[mixedDiPlus, mixedDiMinus, mixedAdx] = ta.dmi(diLength=3, 3)
sar = ta.sar(start=0.02, inc=0.02, max=0.2)
mixedSar = ta.sar(start=0.02, 0.02, 0.2)
pivotHigh = ta.pivothigh(source=high, leftbars=2, rightbars=2)
pivotLow = ta.pivotlow(source=low, leftbars=2, rightbars=2)
defaultPivotHigh = ta.pivothigh(leftbars=2, rightbars=2)
defaultPivotLow = ta.pivotlow(leftbars=2, rightbars=2)
sourceTailPivotHigh = ta.pivothigh(source=high, 2, 2)
sourceTailPivotLow = ta.pivotlow(source=low, 2, 2)
leftTailPivotHigh = ta.pivothigh(source=high, leftbars=2, 2)
leftTailPivotLow = ta.pivotlow(leftbars=2, 2)
mixedPivotHigh = ta.pivothigh(2, rightbars=2)
mixedPivotLow = ta.pivotlow(2, rightbars=2)
linreg = ta.linreg(source=close, length=3, offset=1)
mixedLinreg = ta.linreg(source=close, 3, 1)
plot(trend + direction + mixedTrend + mixedDirection + diPlus + diMinus + adx + mixedDiPlus + mixedDiMinus + mixedAdx + sar + mixedSar + pivotHigh + pivotLow + defaultPivotHigh + defaultPivotLow + sourceTailPivotHigh + sourceTailPivotLow + leftTailPivotHigh + leftTailPivotLow + mixedPivotHigh + mixedPivotLow + linreg + mixedLinreg)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid TA trend and pivot helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad TA Trend Pivot Signatures")
duplicateDmi = ta.dmi(3, diLength=3, adxSmoothing=3)
unknownSar = ta.sar(start=0.02, inc=0.02, max=0.2, step=0.01)
shortPivot = ta.pivothigh(source=high, leftbars=2)
duplicatePivot = ta.pivotlow(2, leftbars=2, rightbars=2)
badPivotOrder = ta.pivothigh(rightbars=2, high)
shortLinreg = ta.linreg(source=close, length=3)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'diLength' for ta.dmi() was supplied multiple times",
      "Unknown argument 'step' for ta.sar()",
      "ta.pivothigh() missing required argument 'rightbars'",
      "Argument 'leftbars' for ta.pivotlow() was supplied multiple times",
      'ta.pivothigh() cannot use positional arguments after named arguments',
      'ta.linreg() expects at least 3 arguments',
      "ta.linreg() missing required argument 'offset'",
    ]);
  });

  it('resolves remaining TA helper named arguments and series globals', () => {
    const result = checkProgram(parse(`
indicator("Remaining TA Signatures")
[line, signal, hist] = ta.macd(source=close, fastlen=12, slowlen=26, siglen=9)
[mixedLine, mixedSignal, mixedHist] = ta.macd(source=close, 12, 26, 9)
legacyObv = ta.obv(source=close, volume=volume)
mixedObv = ta.obv(source=close, volume)
currentObv = ta.obv
range = ta.tr(handle_na=true)
rawRange = ta.tr
spread = ta.range(source=close, 3)
up = ta.rising(source=close, 2)
down = ta.falling(source=close, 2)
plot(line + signal + hist + mixedLine + mixedSignal + mixedHist + legacyObv + mixedObv + currentObv + range + rawRange + spread)
plotshape(up or down)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports invalid remaining TA helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Remaining TA Signatures")
duplicateMacd = ta.macd(close, source=open, fastlen=12, slowlen=26, siglen=9)
unknownMacd = ta.macd(source=close, fastlen=12, slowlen=26, signal=9)
tooManyObv = ta.obv(close, volume, open)
unknownTr = ta.tr(handle_na=true, fallback=true)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'source' for ta.macd() was supplied multiple times",
      "Unknown argument 'signal' for ta.macd()",
      'ta.macd() expects at least 4 arguments',
      "ta.macd() missing required argument 'siglen'",
      'ta.obv() expects at most 2 arguments',
      "Unknown argument 'fallback' for ta.tr()",
    ]);
  });

  it('resolves color helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Color Signatures")
base = color.rgb(red=1, green=2, blue=3, transp=25)
derived = color.rgb(color.r(color=base), color.g(color=base), color.b(color=base), color.t(color=base))
gradient = color.from_gradient(value=close, bottom_value=0, top_value=100, bottom_color=base, top_color=derived)
prefixBase = color.rgb(red=4, 5, 6)
prefixAlpha = color.rgb(red=7, green=8, 9, 10)
prefixNew = color.new(color=prefixBase, 35)
prefixGradient = color.from_gradient(value=close, 0, 100, prefixNew, prefixAlpha)
plot(close, color=gradient)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('infers color helper return types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("Color Return Types")
base = color.rgb(red=1, green=2, blue=3, transp=25)
inputTint = input.color(color.red)
derived = color.new(color=inputTint, 35)
gradient = color.from_gradient(value=close, bottom_value=0, top_value=100, bottom_color=base, top_color=derived)
redChannel = color.r(color=base)
inputTransparency = color.t(color=derived)
seriesBlue = color.b(color=gradient)
base := 1
derived := 2
gradient := 3
redChannel := "bad"
inputTransparency := "bad"
seriesBlue := "bad"
plot(close, color=gradient)
plot(redChannel + inputTransparency + seriesBlue)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign int value to color variable base',
      'Cannot assign int value to color variable derived',
      'Cannot assign int value to color variable gradient',
      'Cannot assign string value to float variable redChannel',
      'Cannot assign string value to float variable inputTransparency',
      'Cannot assign string value to float variable seriesBlue',
    ]);
    expect(types.get('base')).toMatchObject({ kind: 'color', qualifier: 'const' });
    expect(types.get('derived')).toMatchObject({ kind: 'color', qualifier: 'input' });
    expect(types.get('gradient')).toMatchObject({ kind: 'color', qualifier: 'series' });
    expect(types.get('redChannel')).toMatchObject({ kind: 'float', qualifier: 'const' });
    expect(types.get('inputTransparency')).toMatchObject({ kind: 'float', qualifier: 'input' });
    expect(types.get('seriesBlue')).toMatchObject({ kind: 'float', qualifier: 'series' });
  });

  it('infers chart member return types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("Chart Return Types")
bg = chart.bg_color
fg = chart.fg_color
leftVisible = chart.left_visible_bar_time
rightVisible = chart.right_visible_bar_time
standard = chart.is_standard
renko = chart.is_renko
heikin = chart.is_heikinashi
lineBreak = chart.is_linebreak
bg := 1
fg := 2
leftVisible := "bad"
rightVisible := "bad"
standard := "bad"
renko := "bad"
heikin := "bad"
lineBreak := "bad"
plot(leftVisible + rightVisible + (standard ? 1 : 0) + (renko ? 1 : 0) + (heikin ? 1 : 0) + (lineBreak ? 1 : 0))
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign int value to color variable bg',
      'Cannot assign int value to color variable fg',
      'Cannot assign string value to int variable leftVisible',
      'Cannot assign string value to int variable rightVisible',
      'Cannot assign string value to bool variable standard',
      'Cannot assign string value to bool variable renko',
      'Cannot assign string value to bool variable heikin',
      'Cannot assign string value to bool variable lineBreak',
    ]);
    expect(types.get('bg')).toMatchObject({ kind: 'color', qualifier: 'simple' });
    expect(types.get('fg')).toMatchObject({ kind: 'color', qualifier: 'simple' });
    expect(types.get('leftVisible')).toMatchObject({ kind: 'int', qualifier: 'input' });
    expect(types.get('rightVisible')).toMatchObject({ kind: 'int', qualifier: 'input' });
    expect(types.get('standard')).toMatchObject({ kind: 'bool', qualifier: 'simple' });
    expect(types.get('renko')).toMatchObject({ kind: 'bool', qualifier: 'simple' });
    expect(types.get('heikin')).toMatchObject({ kind: 'bool', qualifier: 'simple' });
    expect(types.get('lineBreak')).toMatchObject({ kind: 'bool', qualifier: 'simple' });
  });

  it('reports invalid color helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Color Signatures")
rgbDuplicate = color.rgb(1, 2, 3, red=4)
rgbUnknown = color.rgb(1, 2, 3, alpha=25)
channelUnknown = color.r(color.red, source=color.blue)
gradientShort = color.from_gradient(close, 0, 100, color.red)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'red' for color.rgb() was supplied multiple times",
      "Unknown argument 'alpha' for color.rgb()",
      "Unknown argument 'source' for color.r()",
      'color.from_gradient() expects at least 5 arguments',
      "color.from_gradient() missing required argument 'top_color'",
    ]);
  });

  it('resolves string helper named arguments and aliases', () => {
    const result = checkProgram(parse(`
indicator("String Signatures")
text = "BTC-USDT-USDT"
formatted = str.tostring(value=close, format="#.0")
prefixFormatted = str.tostring(value=close, "#.00")
parsed = str.tonumber(string="42.5")
timeText = str.format_time(time=time, format="yyyy-MM-dd", timezone=syminfo.timezone)
prefixTimeText = str.format_time(time=time, "yyyy-MM-dd", syminfo.timezone)
message = str.format(format="close={0}", close)
hasUsdt = str.contains(string=text, substring="USDT")
prefixHasUsdt = str.contains(source=text, "USDT")
starts = str.startswith(source=text, target="BTC")
prefixStarts = str.startswith(string=text, "BTC")
ends = str.endswith(source=text, str="USDT")
position = str.pos(source=text, str="USDT")
prefixPosition = str.pos(string=text, "USDT")
prefix = str.substring(string=text, begin_pos=0, end_pos=3)
prefixSlice = str.substring(source=text, 0, 3)
match = str.match(source="Trade NASDAQ:AAPL", pattern="[A-Z]+:[A-Z]+")
prefixMatch = str.match(string="Trade NASDAQ:AAPL", "[A-Z]+:[A-Z]+")
repeated = str.repeat(string="?", repeat_count=3, separator=",")
officialRepeated = str.repeat(source="?", repeat=3, separator=",")
prefixRepeated = str.repeat(source="?", 3, ",")
parts = str.split(string=text, separator="-")
prefixParts = str.split(source=text, "-")
upper = str.upper(string=text)
lower = str.lower(string=text)
trimmed = str.trim(string=" BTC ")
replaceOne = str.replace(string=text, substring="USDT", replacement="PERP", occurrence=1)
prefixReplaceOne = str.replace(source=text, "USDT", "PERP", 1)
replaceAll = str.replace_all(source=text, str="USDT", replacement="PERP")
prefixReplaceAll = str.replace_all(string=text, "USDT", "PERP")
plot(parsed + position + prefixPosition + str.length(string=formatted + prefixFormatted + timeText + prefixTimeText + message + prefix + prefixSlice + match + prefixMatch + repeated + officialRepeated + prefixRepeated + upper + lower + trimmed + replaceOne + prefixReplaceOne + replaceAll + prefixReplaceAll))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('infers string helper return types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("String Return Types")
text = "BTC-USDT"
seriesText = str.tostring(close)
formatted = str.format(format="close={0}", close)
timeText = str.format_time(time=time)
parsed = str.tonumber("42.5")
length = str.length(text)
position = str.pos(source=text, str="USDT")
hasUsdt = str.contains(source=text, str="USDT")
starts = str.startswith(source=text, str="BTC")
prefix = str.substring(source=text, begin_pos=0, end_pos=3)
matched = str.match(source="Trade NASDAQ:AAPL", regex="[A-Z]+:[A-Z]+")
repeated = str.repeat(source="?", repeat_count=3, separator=",")
upper = str.upper(text)
parts = str.split(source=text, separator="-")
seriesText := 1
formatted := 2
timeText := 3
parsed := "bad"
length := "bad"
position := "bad"
hasUsdt := 1
starts := 2
prefix := 4
matched := 5
repeated := 6
upper := 7
plot(parsed + length + position + array.size(parts))
plot(hasUsdt and starts ? 1 : 0)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign int value to string variable seriesText',
      'Cannot assign int value to string variable formatted',
      'Cannot assign int value to string variable timeText',
      'Cannot assign string value to float variable parsed',
      'Cannot assign string value to int variable length',
      'Cannot assign string value to int variable position',
      'Cannot assign int value to bool variable hasUsdt',
      'Cannot assign int value to bool variable starts',
      'Cannot assign int value to string variable prefix',
      'Cannot assign int value to string variable matched',
      'Cannot assign int value to string variable repeated',
      'Cannot assign int value to string variable upper',
    ]);
    expect(types.get('seriesText')).toMatchObject({ kind: 'string', qualifier: 'series' });
    expect(types.get('formatted')).toMatchObject({ kind: 'string', qualifier: 'series' });
    expect(types.get('timeText')).toMatchObject({ kind: 'string', qualifier: 'series' });
    expect(types.get('parsed')).toMatchObject({ kind: 'float', qualifier: 'const' });
    expect(types.get('length')).toMatchObject({ kind: 'int', qualifier: 'const' });
    expect(types.get('position')).toMatchObject({ kind: 'int', qualifier: 'const' });
    expect(types.get('hasUsdt')).toMatchObject({ kind: 'bool', qualifier: 'const' });
    expect(types.get('starts')).toMatchObject({ kind: 'bool', qualifier: 'const' });
    expect(types.get('prefix')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('matched')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('repeated')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('upper')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('parts')).toMatchObject({ kind: 'array', qualifier: 'const', elementType: { kind: 'string' } });
  });

  it('reports invalid string helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad String Signatures")
duplicateSource = str.contains("BTC", source="ETH", str="T")
duplicateAlias = str.replace(source="BTC", target="T", substring="B", replacement="X")
unknownArg = str.substring(source="BTC", start=0)
shortReplace = str.replace(source="BTC", target="B")
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'source' for str.contains() was supplied multiple times",
      "Argument 'substring' for str.replace() was supplied multiple times",
      "Unknown argument 'start' for str.substring()",
      "str.substring() expects at least 2 arguments",
      "str.substring() missing required argument 'begin_pos'",
      "str.replace() expects at least 3 arguments",
      "str.replace() missing required argument 'replacement'",
    ]);
  });

  it('resolves math helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Math Signatures")
rounded = math.round(number=math.pi, precision=3)
prefixRounded = math.round(number=math.pi, 3)
powered = math.pow(base=2, exponent=3)
prefixPowered = math.pow(base=2, 3)
root = math.sqrt(number=16)
logged = math.log(number=math.e) + math.log10(number=100) + math.exp(number=1)
trig = math.sin(number=0) + math.cos(number=0) + math.tan(number=0) + math.asin(number=0) + math.acos(number=1) + math.atan(number=1)
converted = math.toradians(number=180) + math.todegrees(number=math.pi)
unary = math.abs(number=-5) + math.trunc(number=-1.9) + math.floor(number=-1.2) + math.ceil(number=1.2) + math.sign(number=-5)
namedMax = math.max(number0=1, number1=2, number2=3)
namedMin = math.min(number0=1, number1=2, number2=3)
namedAvg = math.avg(number0=1, number1=2, number2=3)
prefixAvg = math.avg(number0=1, 2, 3)
seriesSum = math.sum(source=close, length=3)
prefixSeriesSum = math.sum(source=close, 3)
tick = math.round_to_mintick(number=1.005)
rand = math.random(min=10, max=20, seed=7)
prefixRand = math.random(min=10, 20, 7)
plot(rounded + prefixRounded + powered + prefixPowered + root + logged + trig + converted + unary + namedMax + namedMin + namedAvg + prefixAvg + seriesSum + prefixSeriesSum + tick + rand + prefixRand)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('infers math helper return types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("Math Return Types")
piValue = math.pi
absInt = math.abs(bar_index)
absFloat = math.abs(close)
maxInt = math.max(1, 2, 3)
maxFloat = math.max(1, close)
avgSimple = math.avg(1, 2, 3)
roundedInt = math.round(close)
roundedFloat = math.round(number=close, precision=2)
mintickSimple = math.round_to_mintick(math.pi)
floored = math.floor(close)
powered = math.pow(base=2, exponent=3)
runningSum = math.sum(source=close, length=3)
randomValue = math.random(min=0, max=1, seed=7)
degrees = math.todegrees(math.pi)
piValue := "bad"
absInt := "bad"
roundedInt := 1.5
floored := "bad"
powered := "bad"
runningSum := "bad"
plot(absFloat + maxInt + maxFloat + avgSimple + roundedFloat + mintickSimple + randomValue + degrees)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to float variable piValue',
      'Cannot assign string value to int variable absInt',
      'Cannot assign float value to int variable roundedInt',
      'Cannot assign string value to int variable floored',
      'Cannot assign string value to float variable powered',
      'Cannot assign string value to float variable runningSum',
    ]);
    expect(types.get('piValue')).toMatchObject({ kind: 'float', qualifier: 'const' });
    expect(types.get('absInt')).toMatchObject({ kind: 'int', qualifier: 'series' });
    expect(types.get('absFloat')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('maxInt')).toMatchObject({ kind: 'int', qualifier: 'const' });
    expect(types.get('maxFloat')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('avgSimple')).toMatchObject({ kind: 'float', qualifier: 'simple' });
    expect(types.get('roundedInt')).toMatchObject({ kind: 'int', qualifier: 'series' });
    expect(types.get('roundedFloat')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('mintickSimple')).toMatchObject({ kind: 'float', qualifier: 'simple' });
    expect(types.get('floored')).toMatchObject({ kind: 'int', qualifier: 'series' });
    expect(types.get('powered')).toMatchObject({ kind: 'float', qualifier: 'const' });
    expect(types.get('runningSum')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('randomValue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('degrees')).toMatchObject({ kind: 'float', qualifier: 'series' });
  });

  it('reports invalid math helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Math Signatures")
duplicateRound = math.round(math.pi, number=1, precision=2)
unknownPow = math.pow(base=2, power=3)
shortAvg = math.avg(number0=1)
duplicateMax = math.max(1, 2, number0=3)
unknownMin = math.min(number0=1, value=2)
hugeAvg = math.avg(number0=1, number1=2, number1001=3)
shortSum = math.sum(source=close)
tooManyMintick = math.round_to_mintick(1.0, 2)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'number' for math.round() was supplied multiple times",
      "Unknown argument 'power' for math.pow()",
      "math.pow() expects at least 2 arguments",
      "math.pow() missing required argument 'exponent'",
      'math.avg() expects at least 2 arguments',
      "math.avg() missing required argument 'number1'",
      "Argument 'number0' for math.max() was supplied multiple times",
      "Unknown argument 'value' for math.min()",
      'math.min() expects at least 2 arguments',
      "math.min() missing required argument 'number1'",
      "Unknown argument 'number1001' for math.avg()",
      "math.sum() expects at least 2 arguments",
      "math.sum() missing required argument 'length'",
      'math.round_to_mintick() expects at most 1 argument',
    ]);
  });

  it('resolves global helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Global Helper Signatures")
source = bar_index % 3 == 0 ? na : close
filled = nz(source=source, open)
fixed = fixnan(source=source)
asFloat = float(x="4.5")
asInt = int(x=4.9)
asBool = bool(x=1)
asString = string(x=12.5)
isMissing = na(x=source)
plot(filled + fixed + asFloat + asInt + (asBool ? 1 : 0) + str.length(asString) + (isMissing ? 1 : 0))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('infers global helper return types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("Global Helper Return Types")
floatSource = close
intSource = bar_index
stringSource = "ready"
filledFloat = nz(floatSource, open)
fixedFloat = fixnan(floatSource)
filledInt = nz(intSource, 0)
filledString = nz(stringSource, "fallback")
namedPrefixFloat = nz(source=floatSource, open)
mixed = nz(floatSource, stringSource)
filledFloat := "bad"
fixedFloat := "bad"
filledInt := "bad"
filledString := 1
namedPrefixFloat := "bad"
mixed := "still unknown"
plot(filledFloat + fixedFloat + filledInt)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to float variable filledFloat',
      'Cannot assign string value to float variable fixedFloat',
      'Cannot assign string value to int variable filledInt',
      'Cannot assign int value to string variable filledString',
      'Cannot assign string value to float variable namedPrefixFloat',
    ]);
    expect(types.get('filledFloat')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('fixedFloat')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('filledInt')).toMatchObject({ kind: 'int', qualifier: 'series' });
    expect(types.get('filledString')).toMatchObject({ kind: 'string', qualifier: 'const' });
    expect(types.get('namedPrefixFloat')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('mixed')).toMatchObject({ kind: 'unknown' });
  });

  it('resolves ticker helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Ticker Signatures")
base = ticker.new(prefix="NASDAQ", ticker="AAPL", session=session.extended, adjustment=adjustment.splits, backadjustment=backadjustment.on, settlement_as_close=settlement_as_close.off)
prefixBase = ticker.new(prefix="NASDAQ", "AAPL", session.extended, adjustment.splits, backadjustment.on, settlement_as_close.off)
modified = ticker.modify(tickerid=base, session=session.regular, adjustment=adjustment.dividends, backadjustment=backadjustment.inherit, settlement_as_close=settlement_as_close.inherit)
prefixModified = ticker.modify(tickerid=prefixBase, session.regular, adjustment.dividends, backadjustment.inherit, settlement_as_close.inherit)
standard = ticker.standard(symbol=modified)
inherited = ticker.inherit(from_tickerid=ticker.heikinashi(symbol=modified), symbol="NASDAQ:MSFT")
prefixInherited = ticker.inherit(from_tickerid=ticker.heikinashi(symbol=prefixModified), "NASDAQ:MSFT")
renko = ticker.renko(symbol="NASDAQ:AAPL", style="ATR", param=10, request_wicks=true, source="Close")
prefixRenko = ticker.renko(symbol="NASDAQ:AAPL", "ATR", 10, true, "Close")
lineBreak = ticker.linebreak(symbol="NASDAQ:AAPL", number_of_lines=3)
prefixLineBreak = ticker.linebreak(symbol="NASDAQ:AAPL", 3)
kagi = ticker.kagi(symbol="NASDAQ:AAPL", style="ATR", param=10)
prefixKagi = ticker.kagi(symbol="NASDAQ:AAPL", "ATR", 10)
pointFigure = ticker.pointfigure(symbol="NASDAQ:AAPL", source="hl", style="ATR", param=14, reversal=3)
prefixPointFigure = ticker.pointfigure(symbol="NASDAQ:AAPL", "hl", "ATR", 14, 3)
plot(str.length(standard + inherited + prefixInherited + renko + prefixRenko + lineBreak + prefixLineBreak + kagi + prefixKagi + pointFigure + prefixPointFigure))
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('infers ticker helper return types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("Ticker Return Types")
base = ticker.new(prefix="NASDAQ", ticker="AAPL")
modified = ticker.modify(tickerid=base, session=session.extended)
standard = ticker.standard(symbol=modified)
inherited = ticker.inherit(from_tickerid=ticker.heikinashi(symbol=modified), symbol="NASDAQ:MSFT")
heikinashi = ticker.heikinashi(symbol=modified)
renko = ticker.renko(symbol="NASDAQ:AAPL", style="ATR", param=10)
lineBreak = ticker.linebreak(symbol="NASDAQ:AAPL", number_of_lines=3)
kagi = ticker.kagi(symbol="NASDAQ:AAPL", style="ATR", param=10)
pointFigure = ticker.pointfigure(symbol="NASDAQ:AAPL", source="hl", style="ATR", param=14, reversal=3)
base := 1
modified := 2
standard := 3
inherited := 4
heikinashi := 5
renko := 6
lineBreak := 7
kagi := 8
pointFigure := 9
plot(str.length(base + modified + standard + inherited + heikinashi + renko + lineBreak + kagi + pointFigure))
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign int value to string variable base',
      'Cannot assign int value to string variable modified',
      'Cannot assign int value to string variable standard',
      'Cannot assign int value to string variable inherited',
      'Cannot assign int value to string variable heikinashi',
      'Cannot assign int value to string variable renko',
      'Cannot assign int value to string variable lineBreak',
      'Cannot assign int value to string variable kagi',
      'Cannot assign int value to string variable pointFigure',
    ]);
    expect(types.get('base')).toMatchObject({ kind: 'string', qualifier: 'simple' });
    expect(types.get('modified')).toMatchObject({ kind: 'string', qualifier: 'simple' });
    expect(types.get('standard')).toMatchObject({ kind: 'string', qualifier: 'simple' });
    expect(types.get('inherited')).toMatchObject({ kind: 'string', qualifier: 'simple' });
    expect(types.get('heikinashi')).toMatchObject({ kind: 'string', qualifier: 'simple' });
    expect(types.get('renko')).toMatchObject({ kind: 'string', qualifier: 'simple' });
    expect(types.get('lineBreak')).toMatchObject({ kind: 'string', qualifier: 'simple' });
    expect(types.get('kagi')).toMatchObject({ kind: 'string', qualifier: 'simple' });
    expect(types.get('pointFigure')).toMatchObject({ kind: 'string', qualifier: 'simple' });
  });

  it('reports invalid ticker helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Ticker Signatures")
duplicatePrefix = ticker.new("NASDAQ", "AAPL", prefix="NYSE")
unknownModifier = ticker.modify("NASDAQ:AAPL", bad=session.extended)
shortRenko = ticker.renko("NASDAQ:AAPL", "ATR")
unknownChart = ticker.pointfigure("NASDAQ:AAPL", "hl", "ATR", 14, 3, request_wicks=true)
missingNewPrefix = ticker.new(ticker="AAPL", session=session.extended)
missingModifyTicker = ticker.modify(session=session.extended)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'prefix' for ticker.new() was supplied multiple times",
      "Unknown argument 'bad' for ticker.modify()",
      'ticker.renko() expects at least 3 arguments',
      "ticker.renko() missing required argument 'param'",
      "Unknown argument 'request_wicks' for ticker.pointfigure()",
      "ticker.new() missing required argument 'prefix'",
      "ticker.modify() missing required argument 'tickerid'",
    ]);
  });

  it('resolves request helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Request Signatures")
htf = request.security(symbol=syminfo.tickerid, "2", close, barmerge.gaps_on, barmerge.lookahead_on)
ltf = request.security_lower_tf(symbol=syminfo.tickerid, "1", close, false, na, false, 2)
rate = request.currency_rate(currency.USD, "GBP", ignore_invalid_currency=true)
prefixRate = request.currency_rate(from=currency.USD, "GBP", true)
dividend = request.dividends("NASDAQ:AAPL", dividends.gross, barmerge.gaps_on, lookahead=barmerge.lookahead_off, ignore_invalid_symbol=false, currency=currency.USD)
prefixDividend = request.dividends(ticker="NASDAQ:AAPL", dividends.gross, barmerge.gaps_on, barmerge.lookahead_off, false, currency.USD)
earning = request.earnings("NASDAQ:AAPL", earnings.actual, barmerge.gaps_off, lookahead=barmerge.lookahead_off, ignore_invalid_symbol=false, currency="USD")
prefixEarning = request.earnings(ticker="NASDAQ:AAPL", earnings.actual, barmerge.gaps_off, barmerge.lookahead_off, false, "USD")
split = request.splits("NASDAQ:AAPL", splits.denominator, barmerge.gaps_off, lookahead=barmerge.lookahead_off, ignore_invalid_symbol=false)
prefixSplit = request.splits(ticker="NASDAQ:AAPL", splits.denominator, barmerge.gaps_off, barmerge.lookahead_off, false)
revenue = request.financial("NASDAQ:AAPL", "TOTAL_REVENUE", "FQ", gaps=barmerge.gaps_off, ignore_invalid_symbol=false, currency="USD")
prefixRevenue = request.financial(symbol="NASDAQ:AAPL", "TOTAL_REVENUE", "FQ", barmerge.gaps_off, false, "USD")
econ = request.economic("US", "GDP", gaps=barmerge.gaps_off, ignore_invalid_symbol=false)
prefixEcon = request.economic(country_code="US", "GDP", barmerge.gaps_off, false)
seeded = request.seed("seed", "SYM", close, ignore_invalid_symbol=false, calc_bars_count=2)
prefixSeeded = request.seed(source="seed", "SYM", close, false, 2)
plot(rate + dividend + earning + split + revenue + econ + seeded)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('infers request helper return types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("Request Return Types")
htfFloat = request.security(symbol=syminfo.tickerid, "2", close)
htfString = request.security(symbol=syminfo.tickerid, "2", syminfo.ticker)
ltf = request.security_lower_tf(symbol=syminfo.tickerid, "1", close)
ltfFirst = array.get(ltf, 0)
seeded = request.seed("seed", "SYM", str.length(syminfo.tickerid))
rate = request.currency_rate(currency.USD, "GBP", ignore_invalid_currency=true)
dividend = request.dividends("NASDAQ:AAPL", dividends.gross, currency=currency.USD)
earning = request.earnings("NASDAQ:AAPL", earnings.actual, currency="USD")
split = request.splits("NASDAQ:AAPL", splits.denominator)
revenue = request.financial("NASDAQ:AAPL", "TOTAL_REVENUE", "FQ", currency="USD")
econ = request.economic("US", "GDP")
htfFloat := "bad"
htfString := 1
ltfFirst := "bad"
seeded := "bad"
rate := "bad"
dividend := "bad"
earning := "bad"
split := "bad"
revenue := "bad"
econ := "bad"
plot(htfFloat + ltfFirst + seeded + rate + dividend + earning + split + revenue + econ + str.length(htfString))
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to float variable htfFloat',
      'Cannot assign int value to string variable htfString',
      'Cannot assign string value to float variable ltfFirst',
      'Cannot assign string value to int variable seeded',
      'Cannot assign string value to float variable rate',
      'Cannot assign string value to float variable dividend',
      'Cannot assign string value to float variable earning',
      'Cannot assign string value to float variable split',
      'Cannot assign string value to float variable revenue',
      'Cannot assign string value to float variable econ',
    ]);
    expect(types.get('htfFloat')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('htfString')).toMatchObject({ kind: 'string', qualifier: 'series' });
    expect(types.get('ltf')).toMatchObject({ kind: 'array', qualifier: 'series', elementType: { kind: 'float' } });
    expect(types.get('ltfFirst')).toMatchObject({ kind: 'float' });
    expect(types.get('seeded')).toMatchObject({ kind: 'int', qualifier: 'series' });
    expect(types.get('rate')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('dividend')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('earning')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('split')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('revenue')).toMatchObject({ kind: 'float', qualifier: 'series' });
    expect(types.get('econ')).toMatchObject({ kind: 'float', qualifier: 'series' });
  });

  it('reports invalid request helper named arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad Request Signatures")
rate = request.currency_rate("USD", "GBP", from="EUR")
split = request.splits("NASDAQ:AAPL", splits.denominator, currency="USD")
econ = request.economic("US", "GDP", unexpected=1)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'from' for request.currency_rate() was supplied multiple times",
      "Unknown argument 'currency' for request.splits()",
      "Unknown argument 'unexpected' for request.economic()",
    ]);
  });

  it('resolves Pine input overload bindings for range and options calls', () => {
    const result = checkProgram(parse(`
indicator("Input Overloads")
rangeLength = input.int(14, "Length", 1, 50, 1, "Range tooltip")
mixedRangeLength = input.int(defval=14, "Mixed Length", 1, 50, 1, "Mixed range tooltip")
optionLength = input.int(14, "Length", [7, 14, 21], "Options tooltip")
mixedOptionLength = input.int(defval=14, "Mixed Length", [7, 14, 21], "Mixed options tooltip")
rangeFloat = input.float(2.0, "Multiplier", minval=1.0, maxval=4.0)
mixedRangeFloat = input.float(defval=2.0, "Mixed Multiplier", minval=1.0, maxval=4.0)
optionFloat = input.float(2.0, "Multiplier", options=[1.0, 2.0, 3.0])
mixedOptionFloat = input.float(defval=2.0, "Mixed Multiplier", [1.0, 2.0, 3.0], "Mixed options tooltip")
tf = input.timeframe("60", "Timeframe", ["15", "60"], "TF tooltip")
mixedTf = input.timeframe(defval="60", "Mixed Timeframe", ["15", "60"], "Mixed TF tooltip")
enabled = input.bool(defval=true, "Mixed Enabled", "Enabled tooltip")
mode = input.string(defval="EMA", "Mixed Mode", ["SMA", "EMA"], "Mode tooltip")
colorInput = input.color(defval=color.red, "Mixed Color", "Color tooltip")
start = input.time(defval=1700000000000, "Mixed Start", "Start tooltip")
symbol = input.symbol(defval="BINANCE:BTCUSDT", "Mixed Symbol", "Symbol tooltip")
session = input.session(defval="0930-1600", "Mixed Session", "Session tooltip")
memo = input.text_area(defval="notes", "Mixed Notes", "Notes tooltip")
source = input.source(defval=close, "Source", "Source tooltip", "src", "Data", true)
price = input.price(101.25, "Level", "Drag level")
mixedPrice = input.price(defval=101.25, "Mixed Level", "Drag mixed level")
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('infers Pine input helper return types for downstream diagnostics', () => {
    const result = checkProgram(parse(`
indicator("Input Return Types")
length = input.int(14)
multiplier = input.float(2.0)
enabled = input.bool(true)
mode = input.string("EMA")
tint = input.color(color.red)
start = input.time(1700000000000)
tf = input.timeframe("60")
symbol = input.symbol("BINANCE:BTCUSDT")
session = input.session("0930-1600")
memo = input.text_area("notes")
level = input.price(101.25)
source = input.source(defval=close, "Source")
length := "bad"
multiplier := "bad"
enabled := 1
mode := 1
tint := "bad"
start := "bad"
tf := 1
symbol := 2
session := 3
memo := 4
level := "bad"
source := "bad"
plot(source + level + multiplier + length)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to int variable length',
      'Cannot assign string value to float variable multiplier',
      'Cannot assign int value to bool variable enabled',
      'Cannot assign int value to string variable mode',
      'Cannot assign string value to color variable tint',
      'Cannot assign string value to int variable start',
      'Cannot assign int value to string variable tf',
      'Cannot assign int value to string variable symbol',
      'Cannot assign int value to string variable session',
      'Cannot assign int value to string variable memo',
      'Cannot assign string value to float variable level',
      'Cannot assign string value to float variable source',
    ]);
    expect(types.get('length')).toMatchObject({ kind: 'int', qualifier: 'input' });
    expect(types.get('multiplier')).toMatchObject({ kind: 'float', qualifier: 'input' });
    expect(types.get('enabled')).toMatchObject({ kind: 'bool', qualifier: 'input' });
    expect(types.get('mode')).toMatchObject({ kind: 'string', qualifier: 'input' });
    expect(types.get('tint')).toMatchObject({ kind: 'color', qualifier: 'input' });
    expect(types.get('start')).toMatchObject({ kind: 'int', qualifier: 'input' });
    expect(types.get('tf')).toMatchObject({ kind: 'string', qualifier: 'input' });
    expect(types.get('symbol')).toMatchObject({ kind: 'string', qualifier: 'input' });
    expect(types.get('session')).toMatchObject({ kind: 'string', qualifier: 'input' });
    expect(types.get('memo')).toMatchObject({ kind: 'string', qualifier: 'input' });
    expect(types.get('level')).toMatchObject({ kind: 'float', qualifier: 'input' });
    expect(types.get('source')).toMatchObject({ kind: 'float', qualifier: 'series' });
  });

  it('reports invalid Pine input default value types', () => {
    const result = checkProgram(parse(`
indicator("Bad Input Defaults")
length = input.int(3.5)
count = input.int("3")
multiplier = input.float("2")
enabled = input.bool(1)
mode = input.string(1)
start = input.time("1700000000000")
tf = input.timeframe(60)
symbol = input.symbol(1)
session = input.session(930)
memo = input.text_area(1)
level = input.price("101.25")
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'input.int defval must be an integer',
      'input.int defval must be a number',
      'input.float defval must be a number',
      'input.bool defval must be a boolean',
      'input.string defval must be a string',
      'input.time defval must be a number',
      'input.timeframe defval must be a string',
      'input.symbol defval must be a string',
      'input.session defval must be a string',
      'input.text_area defval must be a string',
      'input.price defval must be a number',
    ]);
  });

  it('reports invalid Pine input default range and options constraints', () => {
    const result = checkProgram(parse(`
indicator("Bad Input Constraints")
shortLength = input.int(0, "Short", minval=1)
longLength = input.int(100, "Long", maxval=50)
multiplier = input.float(5.5, "Multiplier", maxval=5.0)
optionLength = input.int(14, "Length", options=[7, 21])
optionFloat = input.float(2.5, "Multiplier", options=[1.0, 2.0])
mode = input.string("VWAP", "Mode", options=["SMA", "EMA"])
tf = input.timeframe("240", "Timeframe", ["15", "60"])
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'input.int defval must be greater than or equal to minval',
      'input.int defval must be less than or equal to maxval',
      'input.float defval must be less than or equal to maxval',
      'input.int defval must be one of options',
      'input.float defval must be one of options',
      'input.string defval must be one of options',
      'input.timeframe defval must be one of options',
    ]);
  });

  it('reports duplicate Pine input bindings against the selected overload', () => {
    const result = checkProgram(parse(`
indicator("Duplicate Input Args")
rangeLength = input.int(14, "Length", 1, 50, 1, minval=2)
optionLength = input.int(14, "Length", [7, 14, 21], options=[14, 21])
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Argument 'minval' for input.int() was supplied multiple times",
      "Argument 'options' for input.int() was supplied multiple times",
    ]);
  });

  it('reports invalid user-defined type constructor arguments', () => {
    const result = checkProgram(parse(`
indicator("Bad UDT Constructor")
type Pivot
    int x
    float y
tooMany = Pivot.new(1, 2.0, 3.0)
unknown = Pivot.new(z=1)
duplicate = Pivot.new(1, x=2)
duplicateNamed = Pivot.new(y=1, y=2)
badOrder = Pivot.new(x=1, "bad")
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Pivot.new() expects at most 2 arguments',
      "Unknown field 'z' for Pivot.new()",
      "Field 'x' for Pivot.new() was supplied multiple times",
      "Field 'y' for Pivot.new() was supplied multiple times",
      'Pivot.new() cannot use positional arguments after named arguments',
    ]);
  });

  it('reports unknown user-defined type fields on reads and assignments', () => {
    const result = checkProgram(parse(`
indicator("Bad UDT Fields")
type Pivot
    int x
    float y
pivot = Pivot.new(1, close)
valid = pivot.x
missing = pivot.z
pivot.other := 1
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown field 'z' on type Pivot",
      "Unknown field 'other' on type Pivot",
    ]);
    expect(result.symbols.find((symbol) => symbol.name === 'valid')?.type).toMatchObject({ kind: 'int' });
  });

  it('does not treat user-defined method calls as field reads', () => {
    const result = checkProgram(parse(`
indicator("UDT Methods")
type Pivot
    float y
method lift(Pivot this, float amount) =>
    this.y += amount
    this
pivot = Pivot.new(close)
lifted = pivot.lift(1)
plot(lifted.y)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('reports user-defined method receiver mismatches', () => {
    const result = checkProgram(parse(`
indicator("Bad Method Receivers")
type Pivot
    float y
type Other
    float y
method lift(Pivot this, float amount) =>
    this.y += amount
    this
method scale(float this, float amount) => this * amount
pivot = Pivot.new(close)
other = Other.new(close)
count = 1
validPivot = pivot.lift(1)
validFloat = close.scale(2)
badUdt = other.lift(1)
badPrimitive = count.lift(1)
badScale = pivot.scale(2)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'No method lift() overload accepts Other receiver',
      'No method lift() overload accepts const int receiver',
      'No method scale() overload accepts Pivot receiver',
    ]);
  });

  it('selects user-defined method overloads by argument signatures', () => {
    const result = checkProgram(parse(`
indicator("Method Signature Overloads")
type Pivot
    float y
method value(Pivot this, float amount) => amount + this.y
method value(Pivot this, string label) => label
method value(Pivot this, bool enabled, float fallback = 1) => fallback
method rank(Pivot this, float amount) => "float"
method rank(Pivot this, int amount) => amount
pivot = Pivot.new(close)
numberValue = pivot.value(1)
textValue = pivot.value("fast")
namedText = pivot.value(label="slow")
defaulted = pivot.value(true)
ranked = pivot.rank(1)
plot(numberValue + str.length(textValue) + str.length(namedText) + defaulted + ranked)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('numberValue')).toMatchObject({ kind: 'float' });
    expect(types.get('textValue')).toMatchObject({ kind: 'string' });
    expect(types.get('namedText')).toMatchObject({ kind: 'string' });
    expect(types.get('defaulted')).toMatchObject({ kind: 'float' });
    expect(types.get('ranked')).toMatchObject({ kind: 'int' });
  });

  it('selects user-defined enum receiver methods', () => {
    const result = checkProgram(parse(`
indicator("Enum Method Receivers")
enum Direction
    up = "Up"
    down = "Down"
method label(Direction this) => "enum"
method label(float this) => "float"
method score(Direction this, int weight) => weight
directionLabel = Direction.up.label()
priceLabel = close.label()
directionScore = Direction.down.score(2)
plot(str.length(directionLabel) + str.length(priceLabel) + directionScore)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('directionLabel')).toMatchObject({ kind: 'string' });
    expect(types.get('priceLabel')).toMatchObject({ kind: 'string' });
    expect(types.get('directionScore')).toMatchObject({ kind: 'int' });
  });

  it('reports unknown local enum members', () => {
    const result = checkProgram(parse(`
indicator("Bad Enum Member")
enum Direction
    up = "Up"
    down = "Down"
valid = Direction.up
missing = Direction.sideways
plot(valid == Direction.up ? 1 : 0)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "Unknown enum member 'sideways' on enum Direction",
    ]);
  });

  it('reports annotated enum and UDT variable type mismatches', () => {
    const result = checkProgram(parse(`
indicator("Annotated UDT Mismatches")
enum Direction
    up = "Up"
    down = "Down"
enum Mode
    fast = "Fast"
    slow = "Slow"
type Pivot
    float y
type Other
    float y
Direction validDirection = Direction.up
Direction badDirection = Mode.fast
Pivot validPivot = Pivot.new(close)
Pivot badPivot = Other.new(close)
plot(validPivot.y)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign Mode value to Direction variable',
      'Cannot assign Other value to Pivot variable',
    ]);
  });

  it('reports annotated primitive, reference, and collection variable type mismatches', () => {
    const result = checkProgram(parse(`
indicator("Annotated Variable Mismatches")
float validFloat = 1
array<float> validValues = array.new<int>()
string badString = 1
bool badBool = 1
label badLabel = line.new(bar_index, low, bar_index, high)
array<float> badValues = array.new<string>()
matrix<int> badGrid = matrix.new<float>()
map<string, float> badPrices = map.new<int, float>()
plot(validFloat)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign int value to string variable',
      'Cannot assign int value to bool variable',
      'Cannot assign line value to label variable',
      'Cannot assign array<string> value to array<float> variable',
      'Cannot assign matrix<float> value to matrix<int> variable',
      'Cannot assign map<int, float> value to map<string, float> variable',
    ]);
  });

  it('selects user-defined method overloads by receiver specificity', () => {
    const result = checkProgram(parse(`
indicator("Method Receiver Specificity")
method kind(float this) => "float"
method kind(int this) => 1
count = 1
intKind = count.kind()
floatKind = close.kind()
plot(intKind + str.length(floatKind))
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('intKind')).toMatchObject({ kind: 'int' });
    expect(types.get('floatKind')).toMatchObject({ kind: 'string' });
  });

  it('selects user-defined imported enum receiver methods', () => {
    const result = checkProgram(parse(`
indicator("Imported Enum Method Receivers")
import TestUser/Signal/1 as sig
method label(sig.State this) => "enum"
method label(float this) => "float"
method shadowLabel(int this) => 1
shadow(int sig) => sig.State.long.shadowLabel()
sig.State selected = sig.State.long
stateLabel = sig.State.short.label()
priceLabel = close.label()
shadowValue = shadow(1)
plot(str.length(stateLabel) + str.length(priceLabel) + shadowValue)
`));

    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));

    expect(result.diagnostics).toEqual([]);
    expect(types.get('selected')).toMatchObject({ kind: 'udt', name: 'sig.State' });
    expect(types.get('stateLabel')).toMatchObject({ kind: 'string' });
    expect(types.get('priceLabel')).toMatchObject({ kind: 'string' });
    expect(types.get('shadowValue')).toMatchObject({ kind: 'int' });
  });

  it('does not report user method receiver mismatches for builtin collection member calls', () => {
    const result = checkProgram(parse(`
indicator("Builtin Method Names")
method size(float this) => this
values = array.new_float()
count = values.size()
plot(count)
`));

    expect(result.diagnostics).toEqual([]);
  });

  it('honors qualifiers for user-defined method receiver diagnostics', () => {
    const result = checkProgram(parse(`
indicator("Qualified Method Receivers")
method smooth(simple float this) => this
literal = 1.0
valid = literal.smooth()
invalid = close.smooth()
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'No method smooth() overload accepts series float receiver',
    ]);
  });

  it('reports conservative user-defined type field value mismatches', () => {
    const result = checkProgram(parse(`
indicator("Bad UDT Field Types")
type Pivot
    int x
    float y
    bool active
    string name
    color tint
    label tag
valid = Pivot.new(1, 2, true, "pivot", #ff00ff, na)
badCtor = Pivot.new("bad", "also bad", "yes", 3, "not color", "not checked")
pivot = Pivot.new(1, 2.0, true, "pivot", #00ffff, na)
pivot.x := "bad"
pivot.y := "bad"
pivot.active := 1
pivot.name := 3
pivot.tint := "not color"
pivot.tag := "not checked"
pivot.y += 1
pivot.name += " name"
pivot.x += 1.5
pivot.name -= "bad"
pivot.tag += 1
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to int field Pivot.x',
      'Cannot assign string value to float field Pivot.y',
      'Cannot assign string value to bool field Pivot.active',
      'Cannot assign int value to string field Pivot.name',
      'Cannot assign string value to color field Pivot.tint',
      'Cannot assign string value to label field Pivot.tag',
      'Cannot assign string value to int field Pivot.x',
      'Cannot assign string value to float field Pivot.y',
      'Cannot assign int value to bool field Pivot.active',
      'Cannot assign int value to string field Pivot.name',
      'Cannot assign string value to color field Pivot.tint',
      'Cannot assign string value to label field Pivot.tag',
      'Cannot assign float value to int field Pivot.x',
      'Compound assignment -= requires numeric operands, got string and string for field Pivot.name',
      'Compound assignment += requires numeric or string operands, got label and int for field Pivot.tag',
    ]);
  });

  it('reports user-defined type field assignment qualifier mismatches', () => {
    const result = checkProgram(parse(`
indicator("UDT Field Qualifier Mismatches")
type Pivot
    simple float base
    series float tracked
simple float literal = 1
series float price = close
pivot = Pivot.new(1, close)
pivot.base := literal
pivot.tracked := literal
pivot.base := price
pivot.base += price
plot(pivot.tracked)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign series value to simple float field Pivot.base',
      'Cannot assign series value to simple float field Pivot.base',
    ]);
  });

  it('reports user-defined type field default value mismatches', () => {
    const result = checkProgram(parse(`
indicator("Bad UDT Field Defaults")
type Pivot
    int x = "bad"
    float y = "also bad"
    bool active = 1
    string name = 3
    color tint = "not color"
    label tag = "not checked"
    array<float> values = array.new<string>()
    map<string, float> prices = map.new<int, float>()
    matrix<int> grid = matrix.new<float>()
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign string value to int field Pivot.x',
      'Cannot assign string value to float field Pivot.y',
      'Cannot assign int value to bool field Pivot.active',
      'Cannot assign int value to string field Pivot.name',
      'Cannot assign string value to color field Pivot.tint',
      'Cannot assign string value to label field Pivot.tag',
      'Default value for field Pivot.values must be a literal value or compatible built-in variable',
      'Default value for field Pivot.prices must be a literal value or compatible built-in variable',
      'Default value for field Pivot.grid must be a literal value or compatible built-in variable',
    ]);
  });

  it('reports computed user-defined type field defaults', () => {
    const result = checkProgram(parse(`
indicator("Bad UDT Default Expressions")
period = 3
type Pivot
    int validNegative = -1
    float validSource = close
    string validBuiltin = xloc.bar_time
    int fromUser = period
    float fromCall = math.max(open, close)
    float fromBinary = close + 1
    bool fromCondition = close > open ? true : false
    array<float> values = array.new<float>()
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Default value for field Pivot.fromUser must be a literal value or compatible built-in variable',
      'Default value for field Pivot.fromCall must be a literal value or compatible built-in variable',
      'Default value for field Pivot.fromBinary must be a literal value or compatible built-in variable',
      'Default value for field Pivot.fromCondition must be a literal value or compatible built-in variable',
      'Default value for field Pivot.values must be a literal value or compatible built-in variable',
    ]);
  });

  it('validates user-defined type collection field references', () => {
    const valid = checkProgram(parse(`
indicator("UDT Collection Fields")
type Cache
    array<float> values
    map<string, float> prices
    matrix<int> grid
cache = Cache.new(array.new<float>(), map.new<string, float>(), matrix.new<int>())
cache.values := array.new<float>()
cache.prices := map.new<string, float>()
cache.grid := matrix.new<int>()
value = cache.values.get(0)
price = cache.prices.get("BTC")
cell = cache.grid.get(0, 0)
`));

    const invalid = checkProgram(parse(`
indicator("Bad UDT Collection Fields")
type Cache
    array<float> values
    map<string, float> prices
    matrix<int> grid
type Pivot
    float price
type Other
    float price
type HasPivot
    Pivot pivot
badCtor = Cache.new(array.new<string>(), map.new<int, float>(), matrix.new<float>())
cache = Cache.new(array.new<float>(), map.new<string, float>(), matrix.new<int>())
cache.values := array.new<string>()
cache.values := map.new<string, float>()
cache.prices := map.new<string, string>()
cache.prices := array.new<float>()
cache.grid := matrix.new<float>()
pivotHolder = HasPivot.new(Other.new(close))
`));

    expect(valid.diagnostics).toEqual([]);
    expect(valid.symbols.find((symbol) => symbol.name === 'value')?.type).toMatchObject({ kind: 'float' });
    expect(valid.symbols.find((symbol) => symbol.name === 'price')?.type).toMatchObject({ kind: 'float' });
    expect(valid.symbols.find((symbol) => symbol.name === 'cell')?.type).toMatchObject({ kind: 'int' });
    expect(invalid.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Cannot assign array<string> value to array<float> field Cache.values',
      'Cannot assign map<int, float> value to map<string, float> field Cache.prices',
      'Cannot assign matrix<float> value to matrix<int> field Cache.grid',
      'Cannot assign array<string> value to array<float> field Cache.values',
      'Cannot assign map<string, float> value to array<float> field Cache.values',
      'Cannot assign map<string, string> value to map<string, float> field Cache.prices',
      'Cannot assign array<float> value to map<string, float> field Cache.prices',
      'Cannot assign matrix<float> value to matrix<int> field Cache.grid',
      'Cannot assign Other value to Pivot field HasPivot.pivot',
    ]);
  });

  it('validates array index assignment targets and values', () => {
    const valid = checkProgram(parse(`
indicator("Index Assignment")
values = array.new<float>()
texts = array.new<string>()
values[0] := close
values[1] += 2
texts[0] += "ok"
`));

    const invalid = checkProgram(parse(`
indicator("Bad Index Assignment")
values = array.new<int>()
texts = array.new<string>()
tags = array.new<label>()
values["first"] := 1
values[0] := "bad"
close[0] := 1
values[1] += 1.5
texts[0] -= "bad"
tags[0] += 1
`));

    expect(valid.diagnostics).toEqual([]);
    expect(invalid.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Array assignment index must be numeric, got string',
      'Cannot assign string value to int array element',
      'Index assignment target must be an array, got float',
      'Cannot assign float value to int array element',
      'Compound assignment -= requires numeric operands, got string and string for array element',
      'Compound assignment += requires numeric or string operands, got label and int for array element',
    ]);
  });

  it('rejects mixed Pine input range and options overload arguments', () => {
    const result = checkProgram(parse(`
indicator("Mixed Input Overloads")
length = input.int(14, "Length", options=[7, 14, 21], minval=1)
capped = input.int(14, "Length", options=[7, 14, 21], maxval=50)
multiplier = input.float(2.0, "Multiplier", options=[1.0, 2.0], step=0.5)
`));

    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'input.int() cannot use options together with minval/maxval/step',
      'input.int() cannot use options together with minval/maxval/step',
      'input.float() cannot use options together with minval/maxval/step',
    ]);
  });
});
