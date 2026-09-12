import type { Program } from './parser/ast';
import { parse } from './parser/parser';
import {
  TRADINGVIEW_LIBRARY_COT_V5_SOURCE,
  TRADINGVIEW_RELATIVE_VALUE_V3_SOURCE,
  TRADINGVIEW_TA_V10_SOURCE,
  TRADINGVIEW_TECHNICAL_RATING_V1_SOURCE,
} from './officialTradingViewLibrarySources';

export type OfficialTradingViewReturnKind = 'array' | 'bool' | 'color' | 'float' | 'int' | 'matrix' | 'string' | 'tuple' | 'unknown';

export interface OfficialTradingViewLibraryFunction {
  name: string;
  runtimeName?: string;
  params: string[];
  minArgs: number;
  maxArgs: number;
  returnKind: OfficialTradingViewReturnKind;
  returnTypeName?: string;
  tupleArity?: number;
  docsUrl: string;
}

export interface OfficialTradingViewLibrary {
  owner: 'TradingView';
  library: 'Color' | 'LibraryCOT' | 'RelativeValue' | 'TechnicalRating' | 'ta' | 'ValueAtTime' | 'ZigZag';
  version: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '12' | '14';
  functions: Map<string, OfficialTradingViewLibraryFunction>;
  program?: Program;
}

export interface ParsedTradingViewImportPath {
  owner: string;
  library: string;
  version: string;
}

const TRADINGVIEW_TA_DOCS_URL = 'https://www.tradingview.com/script/BICzyhq0-ta/';
const TRADINGVIEW_ZIGZAG_DOCS_URL = 'https://www.tradingview.com/script/bzIRuGXC-ZigZag/';
const TRADINGVIEW_COLOR_DOCS_URL = 'https://www.tradingview.com/script/Fa4lStNd-Color/';
const TRADINGVIEW_VALUE_AT_TIME_DOCS_URL = 'https://www.tradingview.com/script/FjIfbP3i-ValueAtTime/';

const TRADINGVIEW_VALUE_AT_TIME_V2_SOURCE = `//@version=6
library("ValueAtTime")

export type Data
    array<int> times = na
    array<float> values = na

newData() =>
    Data.new(array.new_int(), array.new_float())

ensureData(Data data) =>
    if na(data.times)
        data.times := array.new_int()
    if na(data.values)
        data.values := array.new_float()
    data

export getArrayFromString(str) =>
    array<string> result = array.new_string()
    array<string> parts = str.split(str, ",")
    for i = 0 to array.size(parts) - 1
        string part = str.trim(array.get(parts, i))
        if str.length(part) > 0
            array.push(result, part)
    result

periodAmount(string period) =>
    string upper = str.upper(str.trim(period))
    upper == "YTD" ? 1 : int(str.tonumber(str.substring(upper, 0, str.length(upper) - 1)))

periodUnit(string period) =>
    string upper = str.upper(str.trim(period))
    upper == "YTD" ? "YTD" : str.substring(upper, str.length(upper) - 1, str.length(upper))

export periodToTimestamp(period, referenceTime) =>
    string unit = periodUnit(period)
    int amount = periodAmount(period)
    int result = int(referenceTime)
    if unit == "D"
        result := int(referenceTime) - amount * 86400000
    else if unit == "W"
        result := int(referenceTime) - amount * 7 * 86400000
    else if unit == "M"
        result := timestamp(syminfo.timezone, year(referenceTime), month(referenceTime) - amount, dayofmonth(referenceTime), hour(referenceTime), minute(referenceTime), second(referenceTime))
    else if unit == "Y"
        result := timestamp(syminfo.timezone, year(referenceTime) - amount, month(referenceTime), dayofmonth(referenceTime), hour(referenceTime), minute(referenceTime), second(referenceTime))
    else if unit == "YTD"
        result := timestamp(syminfo.timezone, year(referenceTime), 1, 1, 0, 0, 0)
    result

limitMillis(timeOffsetLimit, timeframeLimit) =>
    float offset = na(timeOffsetLimit) ? na : float(timeOffsetLimit)
    float timeframeMs = str.length(str.trim(str.tostring(timeframeLimit))) > 0 ? timeframe.in_seconds(str.tostring(timeframeLimit)) * 1000.0 : na
    na(offset) ? timeframeMs : na(timeframeMs) ? offset : math.max(offset, timeframeMs)

trimData(Data data, timeOffsetLimit, timeframeLimit) =>
    float limit = limitMillis(timeOffsetLimit, timeframeLimit)
    if not na(limit)
        int minTime = time - int(limit)
        while array.size(data.times) > 1 and array.get(data.times, 0) < minTime
            array.shift(data.times)
            array.shift(data.values)
    data

export collectData(source, timeOffsetLimit = na, timeframeLimit = "") =>
    var Data collected = newData()
    ensureData(collected)
    array.push(collected.times, time)
    array.push(collected.values, source)
    trimData(collected, timeOffsetLimit, timeframeLimit)

nearestIndex(Data data, timestamp) =>
    ensureData(data)
    int size = array.size(data.times)
    int index = array.binary_search_leftmost(data.times, int(timestamp))
    index < 0 ? 0 : index >= size ? size - 1 : index

valueAtTimestamp(Data data, timestamp) =>
    ensureData(data)
    int index = nearestIndex(data, timestamp)
    [array.get(data.values, index), array.get(data.times, index)]

export method valueAtTime(Data data, timestamp) =>
    valueAtTimestamp(data, timestamp)

export valueAtTime(source, timestamp, timeOffsetLimit = na, timeframeLimit = "") =>
    Data collected = collectData(source, timeOffsetLimit, timeframeLimit)
    [value, valueTime] = valueAtTimestamp(collected, timestamp)
    [value, valueTime, source]

export method valueAtTimeOffset(Data data, timeOffset) =>
    valueAtTimestamp(data, time - int(timeOffset))

export valueAtTimeOffset(source, timeOffset, timeOffsetLimit = na, timeframeLimit = "") =>
    Data collected = collectData(source, timeOffsetLimit, timeframeLimit)
    [value, valueTime] = valueAtTimestamp(collected, time - int(timeOffset))
    [value, valueTime, source]

export method valueAtPeriodOffset(Data data, period) =>
    valueAtTimestamp(data, periodToTimestamp(period, time))

export valueAtPeriodOffset(source, period, timeOffsetLimit = na, timeframeLimit = "") =>
    Data collected = collectData(source, timeOffsetLimit, timeframeLimit)
    [value, valueTime] = valueAtTimestamp(collected, periodToTimestamp(period, time))
    [value, valueTime, source]

valuesAtTimestamps(Data data, array<int> timestamps) =>
    array<float> values = array.new_float()
    array<int> times = array.new_int()
    for i = 0 to array.size(timestamps) - 1
        [value, valueTime] = valueAtTimestamp(data, array.get(timestamps, i))
        array.push(values, value)
        array.push(times, valueTime)
    [values, times]

export getDataAtTimes(timestamps, source, timeOffsetLimit = na, timeframeLimit = "") =>
    Data collected = collectData(source, timeOffsetLimit, timeframeLimit)
    [values, times] = valuesAtTimestamps(collected, timestamps)
    [values, times, source, syminfo.description]

export getDataAtTimeOffsets(timeOffsets, source, timeOffsetLimit = na, timeframeLimit = "") =>
    array<int> timestamps = array.new_int()
    for i = 0 to array.size(timeOffsets) - 1
        array.push(timestamps, time - int(array.get(timeOffsets, i)))
    getDataAtTimes(timestamps, source, timeOffsetLimit, timeframeLimit)

export getDataAtPeriodOffsets(periods, source, timeOffsetLimit = na, timeframeLimit = "") =>
    array<int> timestamps = array.new_int()
    for i = 0 to array.size(periods) - 1
        array.push(timestamps, periodToTimestamp(array.get(periods, i), time))
    getDataAtTimes(timestamps, source, timeOffsetLimit, timeframeLimit)
`;

const TRADINGVIEW_VALUE_AT_TIME_V2_PROGRAM = parse(TRADINGVIEW_VALUE_AT_TIME_V2_SOURCE, {
  grammarSource: TRADINGVIEW_VALUE_AT_TIME_DOCS_URL,
});

const TRADINGVIEW_ZIGZAG_V8_SOURCE = `//@version=6
library("ZigZag")

export type Settings
    float devThreshold = 5.0
    int depth = 10
    color lineColor = color.blue
    bool extendLast = false
    bool displayReversalPrice = false
    bool displayCumulativeVolume = false
    bool displayReversalPriceChange = false
    string differencePriceMode = "Absolute"
    bool draw = true
    bool allowZigZagOnOneBar = false

export type Pivot
    line ln = na
    label lb = na
    bool isHigh = false
    float vol = 0.0
    chart.point start = chart.point.now(close)
    chart.point end = chart.point.now(close)

export type ZigZag
    Settings settings = Settings.new()
    array<Pivot> pivots = array.new<Pivot>()
    float sumVol = 0.0
    Pivot extend = na

calcDev(float basePrice, float price) =>
    float divisor = math.abs(basePrice)
    divisor == 0 ? 0 : math.abs(100 * (price - basePrice) / divisor)

safeDepth(ZigZag this) =>
    math.max(2, math.floor(this.settings.depth / 2))

export lastPivot(ZigZag this) =>
    array.size(this.pivots) > 0 ? array.get(this.pivots, array.size(this.pivots) - 1) : na

priceChangeText(Pivot pivot, chart.point point, Settings settings) =>
    string result = ""
    if settings.displayReversalPriceChange and not na(pivot)
        float change = point.price - pivot.end.price
        result := settings.differencePriceMode == "Percent" ? str.tostring(calcDev(pivot.end.price, point.price), "#.##") + "%" : str.tostring(change, "#.##")
    result

pivotLabel(Pivot pivot, chart.point point, float vol, Settings settings) =>
    string text = ""
    if settings.displayReversalPrice
        text += str.tostring(point.price, format.mintick)
    string change = priceChangeText(pivot, point, settings)
    if str.length(change) > 0
        text += (str.length(text) > 0 ? "\\n" : "") + change
    if settings.displayCumulativeVolume
        text += (str.length(text) > 0 ? "\\n" : "") + str.tostring(vol, format.volume)
    text

makePivot(chart.point start, chart.point end, float vol, bool isHigh, Settings settings, Pivot previous = na) =>
    line ln = na
    label lb = na
    if settings.draw
        ln := line.new(start, end, color=settings.lineColor)
        lb := label.new(end, pivotLabel(previous, end, vol, settings), style=isHigh ? label.style_label_down : label.style_label_up)
    Pivot.new(ln, lb, isHigh, vol, start, end)

deletePivot(Pivot pivot) =>
    if not na(pivot)
        line.delete(pivot.ln)
        label.delete(pivot.lb)

updatePivot(Pivot pivot, chart.point end, float vol, Settings settings, Pivot previous = na) =>
    pivot.end := end
    pivot.vol := vol
    if settings.draw
        line.set_second_point(pivot.ln, end)
        label.set_point(pivot.lb, end)
        label.set_text(pivot.lb, pivotLabel(previous, end, vol, settings))

isMorePrice(Pivot pivot, chart.point point) =>
    pivot.isHigh ? point.price > pivot.end.price : point.price < pivot.end.price

findPivotPoint(float src, bool isHigh, int depth) =>
    float pivot = isHigh ? ta.pivothigh(src, depth, depth) : ta.pivotlow(src, depth, depth)
    na(pivot) ? na : chart.point.from_index(bar_index - depth, pivot)

newPivotFound(ZigZag this, Pivot pivot) =>
    array.push(this.pivots, pivot)
    this.sumVol := 0.0

newPivotPointFound(ZigZag this, bool isHigh, chart.point point) =>
    bool result = false
    Pivot last = lastPivot(this)
    if not na(last)
        if last.isHigh == isHigh
            if isMorePrice(last, point)
                Pivot previous = array.size(this.pivots) > 1 ? array.get(this.pivots, array.size(this.pivots) - 2) : na
                updatePivot(last, point, this.sumVol, this.settings, previous)
                result := true
        else
            if calcDev(last.end.price, point.price) >= this.settings.devThreshold
                newPivotFound(this, makePivot(last.end, point, this.sumVol, isHigh, this.settings, last))
                result := true
    else
        newPivotFound(this, makePivot(point, point, this.sumVol, isHigh, this.settings))
        result := true
    result

tryFindPivot(ZigZag this, float src, bool isHigh, int depth) =>
    chart.point point = findPivotPoint(src, isHigh, depth)
    not na(point) ? newPivotPointFound(this, isHigh, point) : false

export update(ZigZag this) =>
    int depth = safeDepth(this)
    this.sumVol += nz(volume[depth])
    bool highChanged = tryFindPivot(this, high, true, depth)
    bool lowChanged = tryFindPivot(this, low, false, depth)
    bool changed = highChanged or (this.settings.allowZigZagOnOneBar ? lowChanged : not highChanged and lowChanged)
    Pivot last = lastPivot(this)
    if this.settings.extendLast and barstate.islast and not na(last)
        chart.point end = chart.point.now(last.isHigh ? low : high)
        if na(this.extend) or changed
            deletePivot(this.extend)
            this.extend := makePivot(last.end, end, this.sumVol, not last.isHigh, this.settings, last)
        else
            updatePivot(this.extend, end, this.sumVol, this.settings, last)
    changed

export newInstance(Settings settings = Settings.new()) =>
    ZigZag.new(settings, array.new<Pivot>(), 0.0, na)

export method lastPivot(ZigZag this) =>
    lastPivot(this)

export method update(ZigZag this) =>
    update(this)
`;

const TRADINGVIEW_ZIGZAG_V8_PROGRAM = parse(TRADINGVIEW_ZIGZAG_V8_SOURCE, {
  grammarSource: TRADINGVIEW_ZIGZAG_DOCS_URL,
});

const TRADINGVIEW_ZIGZAG_V6_SOURCE = `//@version=6
library("ZigZag")

export type Settings
    float devThreshold = 5.0
    int depth = 10
    color lineColor = color.blue
    bool extendLast = false
    bool displayReversalPrice = false
    bool displayCumulativeVolume = false
    bool displayReversalPriceChange = false
    string differencePriceMode = "Absolute"
    bool draw = true
    bool allowZigZagOnOneBar = false

export type Point
    int tm = time
    float price = close
    int barIndex = bar_index

export type Pivot
    line ln = na
    label lb = na
    bool isHigh = false
    float vol = 0.0
    Point start = na
    Point end = na

export type ZigZag
    Settings settings = Settings.new()
    array<Pivot> pivots = array.new<Pivot>()
    float sumVol = 0.0
    Pivot extend = na

calcDev(float basePrice, float price) =>
    float divisor = math.abs(basePrice)
    divisor == 0 ? 0 : math.abs(100 * (price - basePrice) / divisor)

safeDepth(ZigZag this) =>
    math.max(2, math.floor(this.settings.depth / 2))

export lastPivot(ZigZag this) =>
    array.size(this.pivots) > 0 ? array.get(this.pivots, array.size(this.pivots) - 1) : na

priceChangeText(Pivot pivot, Point point, Settings settings) =>
    string result = ""
    if settings.displayReversalPriceChange and not na(pivot)
        float change = point.price - pivot.end.price
        result := settings.differencePriceMode == "Percent" ? str.tostring(calcDev(pivot.end.price, point.price), "#.##") + "%" : str.tostring(change, "#.##")
    result

pivotLabel(Pivot pivot, Point point, float vol, Settings settings) =>
    string text = ""
    if settings.displayReversalPrice
        text += str.tostring(point.price, format.mintick)
    string change = priceChangeText(pivot, point, settings)
    if str.length(change) > 0
        text += (str.length(text) > 0 ? "\\n" : "") + change
    if settings.displayCumulativeVolume
        text += (str.length(text) > 0 ? "\\n" : "") + str.tostring(vol, format.volume)
    text

makePivot(Point start, Point end, float vol, bool isHigh, Settings settings, Pivot previous = na) =>
    line ln = na
    label lb = na
    if settings.draw
        ln := line.new(start.barIndex, start.price, end.barIndex, end.price, color=settings.lineColor)
        lb := label.new(end.barIndex, end.price, pivotLabel(previous, end, vol, settings), style=isHigh ? label.style_label_down : label.style_label_up)
    Pivot.new(ln, lb, isHigh, vol, start, end)

deletePivot(Pivot pivot) =>
    if not na(pivot)
        line.delete(pivot.ln)
        label.delete(pivot.lb)

updatePivot(Pivot pivot, Point end, float vol, Settings settings, Pivot previous = na) =>
    pivot.end := end
    pivot.vol := vol
    if settings.draw
        line.set_xy2(pivot.ln, end.barIndex, end.price)
        label.set_xy(pivot.lb, end.barIndex, end.price)
        label.set_text(pivot.lb, pivotLabel(previous, end, vol, settings))

isMorePrice(Pivot pivot, Point point) =>
    pivot.isHigh ? point.price > pivot.end.price : point.price < pivot.end.price

findPivotPoint(float src, bool isHigh, int depth) =>
    float pivot = isHigh ? ta.pivothigh(src, depth, depth) : ta.pivotlow(src, depth, depth)
    na(pivot) ? na : Point.new(time[depth], pivot, bar_index - depth)

newPivotFound(ZigZag this, Pivot pivot) =>
    array.push(this.pivots, pivot)
    this.sumVol := 0.0

newPivotPointFound(ZigZag this, bool isHigh, Point point) =>
    bool result = false
    Pivot last = lastPivot(this)
    if not na(last)
        if last.isHigh == isHigh
            if isMorePrice(last, point)
                Pivot previous = array.size(this.pivots) > 1 ? array.get(this.pivots, array.size(this.pivots) - 2) : na
                updatePivot(last, point, this.sumVol, this.settings, previous)
                result := true
        else
            if calcDev(last.end.price, point.price) >= this.settings.devThreshold
                newPivotFound(this, makePivot(last.end, point, this.sumVol, isHigh, this.settings, last))
                result := true
    else
        newPivotFound(this, makePivot(point, point, this.sumVol, isHigh, this.settings))
        result := true
    result

tryFindPivot(ZigZag this, float src, bool isHigh, int depth) =>
    Point point = findPivotPoint(src, isHigh, depth)
    not na(point) ? newPivotPointFound(this, isHigh, point) : false

export update(ZigZag this) =>
    int depth = safeDepth(this)
    this.sumVol += nz(volume[depth])
    bool highChanged = tryFindPivot(this, high, true, depth)
    bool lowChanged = tryFindPivot(this, low, false, depth)
    bool changed = highChanged or (this.settings.allowZigZagOnOneBar ? lowChanged : not highChanged and lowChanged)
    Pivot last = lastPivot(this)
    if this.settings.extendLast and barstate.islast and not na(last)
        Point end = Point.new(time, last.isHigh ? low : high, bar_index)
        if na(this.extend) or changed
            deletePivot(this.extend)
            this.extend := makePivot(last.end, end, this.sumVol, not last.isHigh, this.settings, last)
        else
            updatePivot(this.extend, end, this.sumVol, this.settings, last)
    changed

export newInstance(Settings settings = Settings.new()) =>
    ZigZag.new(settings, array.new<Pivot>(), 0.0, na)

export method lastPivot(ZigZag this) =>
    lastPivot(this)

export method update(ZigZag this) =>
    update(this)
`;

const TRADINGVIEW_ZIGZAG_V6_PROGRAM = parse(TRADINGVIEW_ZIGZAG_V6_SOURCE, {
  grammarSource: TRADINGVIEW_ZIGZAG_DOCS_URL,
});

const normalizeOfficialLibrarySource = (source: string): string => source.replace(/\u00a0/g, ' ');
const librarySourceWithoutExampleCode = (source: string): string => source.split(/\/\/#region[^\n]*Example Code/)[0]!;

const TRADINGVIEW_LIBRARY_COT_V5_PROGRAM = parse(normalizeOfficialLibrarySource(TRADINGVIEW_LIBRARY_COT_V5_SOURCE), {
  grammarSource: 'https://www.tradingview.com/script/ysFf2OTq-LibraryCOT/',
});

const TRADINGVIEW_RELATIVE_VALUE_V3_PROGRAM = parse(librarySourceWithoutExampleCode(normalizeOfficialLibrarySource(TRADINGVIEW_RELATIVE_VALUE_V3_SOURCE)), {
  grammarSource: 'https://www.tradingview.com/script/cZnSLls2-RelativeValue/',
});

const TRADINGVIEW_TECHNICAL_RATING_V1_PROGRAM = parse(normalizeOfficialLibrarySource(TRADINGVIEW_TECHNICAL_RATING_V1_SOURCE), {
  grammarSource: 'https://www.tradingview.com/script/jDWyb5PG-TechnicalRating/',
});

const TRADINGVIEW_TA_V10_PROGRAM = parse(normalizeOfficialLibrarySource(TRADINGVIEW_TA_V10_SOURCE), {
  grammarSource: TRADINGVIEW_TA_DOCS_URL,
});

const TRADINGVIEW_TA_V1_SOURCE = `//@version=6
library("ta")

export cagr(entryTime, entryPrice, exitTime, exitPrice) =>
    float elapsed = exitTime - entryTime
    elapsed >= 86400000 and entryPrice > 0 and exitPrice > 0 ? (math.pow(exitPrice / entryPrice, 31557600000 / elapsed) - 1) * 100 : na
`;

const TRADINGVIEW_TA_V7_SOURCE = `//@version=6
library("ta", dynamic_requests=true)

_safeLen(length) =>
    math.max(1, int(length))

_mid(highValue, lowValue) =>
    (highValue + lowValue) / 2.0

_nzDiv(num, den) =>
    den == 0 or na(den) ? na : num / den

export ao(src = hl2, shortLength = 5, longLength = 34) =>
    ta.sma(src, _safeLen(shortLength)) - ta.sma(src, _safeLen(longLength))

export aroon(length) =>
    int len = _safeLen(length)
    float up = 100 * (ta.highestbars(high, len + 1) + len) / len
    float down = 100 * (ta.lowestbars(low, len + 1) + len) / len
    [up, down]

export atr2(length) =>
    ta.rma(ta.tr(true), _safeLen(length))

export cagr(entryTime, entryPrice, exitTime, exitPrice) =>
    float elapsed = exitTime - entryTime
    elapsed >= 86400000 and entryPrice > 0 and exitPrice > 0 ? (math.pow(exitPrice / entryPrice, 31557600000 / elapsed) - 1) * 100 : na

export changePercent(newValue, oldValue) =>
    oldValue == 0 or na(oldValue) ? na : (newValue - oldValue) / oldValue * 100

export coppock(source, longLength, shortLength, smoothLength) =>
    ta.wma(ta.roc(source, _safeLen(longLength)) + ta.roc(source, _safeLen(shortLength)), _safeLen(smoothLength))

export dema(source, length) =>
    ta.dema(source, _safeLen(length))

export dema2(src, length) =>
    float ema1 = ta.ema(src, _safeLen(length))
    float ema2 = ta.ema(ema1, _safeLen(length))
    2 * ema1 - ema2

export dm(length) =>
    float demax = high > high[1] ? high - high[1] : 0
    float demin = low < low[1] ? low[1] - low : 0
    float maxSum = ta.sma(demax, _safeLen(length))
    float minSum = ta.sma(demin, _safeLen(length))
    _nzDiv(maxSum, maxSum + minSum)

export donchian(length) =>
    float hi = ta.highest(high, _safeLen(length))
    float lo = ta.lowest(low, _safeLen(length))
    [hi, lo, _mid(hi, lo)]

export ema2(src, length) =>
    ta.ema(src, _safeLen(length))

export eom(length, div = 10000) =>
    float distance = _mid(high, low) - _mid(high[1], low[1])
    float boxRatio = volume == 0 ? na : volume / div / (high - low)
    ta.sma(_nzDiv(distance, boxRatio), _safeLen(length))

export frama(source, length) =>
    int len = _safeLen(length)
    int half = math.max(1, int(len / 2))
    float n1 = (ta.highest(high, half) - ta.lowest(low, half)) / half
    float n2 = (ta.highest(high[half], half) - ta.lowest(low[half], half)) / half
    float n3 = (ta.highest(high, len) - ta.lowest(low, len)) / len
    float dim = n1 > 0 and n2 > 0 and n3 > 0 ? (math.log(n1 + n2) - math.log(n3)) / math.log(2) : 1
    float alpha = math.exp(-4.6 * (dim - 1))
    alpha := math.max(math.min(alpha, 1), 0.01)
    var float value = na
    value := na(value[1]) ? source : alpha * source + (1 - alpha) * value[1]
    value

export ft(source, length) =>
    float highest = ta.highest(source, _safeLen(length))
    float lowest = ta.lowest(source, _safeLen(length))
    float value = highest == lowest ? 0 : 0.66 * ((source - lowest) / (highest - lowest) - 0.5) + 0.67 * nz(value[1])
    value := math.max(math.min(value, 0.999), -0.999)
    0.5 * math.log((1 + value) / (1 - value))

export highestSince(cond, source = high) =>
    var float value = na
    value := cond or na(value[1]) ? source : math.max(source, value[1])
    value

export ht(source) =>
    0.0962 * source + 0.5769 * nz(source[2]) - 0.5769 * nz(source[4]) - 0.0962 * nz(source[6])

export ichimoku(conLength, baseLength, senkouLength) =>
    float tenkanHi = ta.highest(high, _safeLen(conLength))
    float tenkanLo = ta.lowest(low, _safeLen(conLength))
    float kijunHi = ta.highest(high, _safeLen(baseLength))
    float kijunLo = ta.lowest(low, _safeLen(baseLength))
    float spanHi = ta.highest(high, _safeLen(senkouLength))
    float spanLo = ta.lowest(low, _safeLen(senkouLength))
    float tenkan = _mid(tenkanHi, tenkanLo)
    float kijun = _mid(kijunHi, kijunLo)
    [tenkan, kijun, _mid(tenkan, kijun), _mid(spanHi, spanLo), close]

export ift(source) =>
    (math.exp(2 * source) - 1) / (math.exp(2 * source) + 1)

export kvo(fastLen, slowLen, trigLen) =>
    float trend = high + low + close > high[1] + low[1] + close[1] ? 1 : -1
    float vf = trend * volume * math.abs(2 * ((high - low) / (high + low)) - 1)
    float kvoValue = ta.ema(vf, _safeLen(fastLen)) - ta.ema(vf, _safeLen(slowLen))
    [kvoValue, ta.ema(kvoValue, _safeLen(trigLen))]

export lowestSince(cond, source = low) =>
    var float value = na
    value := cond or na(value[1]) ? source : math.min(source, value[1])
    value

export pzo(length) =>
    float signedClose = close > close[1] ? close : close < close[1] ? -close : 0
    100 * _nzDiv(ta.ema(signedClose, _safeLen(length)), ta.ema(close, _safeLen(length)))

export relativeVolume(length, anchorTimeframe = "D", isCumulative = true, adjustRealtime = false) =>
    bool anchor = timeframe.change(anchorTimeframe)
    float current = isCumulative ? ta.cum(anchor ? volume : volume) - nz(ta.valuewhen(anchor, ta.cum(volume), 1), 0) : volume
    float average = ta.sma(current, _safeLen(length))
    [current, average, _nzDiv(current, average)]

export rma2(source, length) =>
    ta.rma(source, _safeLen(length))

export rms(source, length) =>
    math.sqrt(math.sum(source * source, _safeLen(length)) / _safeLen(length))

export rwi(length) =>
    float atr = ta.atr(_safeLen(length))
    float rwiHigh = (high - low[length]) / (atr * math.sqrt(length))
    float rwiLow = (high[length] - low) / (atr * math.sqrt(length))
    [rwiHigh, rwiLow]

export stc(source, fast, slow, cycle, d1, d2) =>
    float macd = ta.ema(source, _safeLen(fast)) - ta.ema(source, _safeLen(slow))
    float k = ta.stoch(macd, macd, macd, _safeLen(cycle))
    ta.ema(ta.ema(k, _safeLen(d1)), _safeLen(d2))

export stochFull(periodK, smoothK, periodD) =>
    float k = ta.sma(ta.stoch(close, high, low, _safeLen(periodK)), _safeLen(smoothK))
    [k, ta.sma(k, _safeLen(periodD))]

export stochRsi(lengthRsi, periodK, smoothK, periodD, source = close) =>
    float rsi = ta.rsi(source, _safeLen(lengthRsi))
    float k = ta.sma(ta.stoch(rsi, rsi, rsi, _safeLen(periodK)), _safeLen(smoothK))
    [k, ta.sma(k, _safeLen(periodD))]

export supertrend(factor, atrLength, wicks = false) =>
    ta.supertrend(factor, _safeLen(atrLength))

export supertrend2(factor, atrLength, wicks = false) =>
    ta.supertrend(factor, _safeLen(atrLength))

export szo(source, length) =>
    float signed = source > source[1] ? 1 : source < source[1] ? -1 : 0
    100 * ta.ema(signed, _safeLen(length))

export t3(source, length, vf) =>
    float e1 = ta.ema(source, _safeLen(length))
    float e2 = ta.ema(e1, _safeLen(length))
    float e3 = ta.ema(e2, _safeLen(length))
    float e4 = ta.ema(e3, _safeLen(length))
    float e5 = ta.ema(e4, _safeLen(length))
    float e6 = ta.ema(e5, _safeLen(length))
    float c1 = -vf * vf * vf
    float c2 = 3 * vf * vf + 3 * vf * vf * vf
    float c3 = -6 * vf * vf - 3 * vf - 3 * vf * vf * vf
    float c4 = 1 + 3 * vf + vf * vf * vf + 3 * vf * vf
    c1 * e6 + c2 * e5 + c3 * e4 + c4 * e3

export t3Alt(source, length, vf) =>
    t3(source, _safeLen(length), vf)

export tema(source, length) =>
    ta.tema(source, _safeLen(length))

export tema2(source, length) =>
    float ema1 = ta.ema(source, _safeLen(length))
    float ema2 = ta.ema(ema1, _safeLen(length))
    float ema3 = ta.ema(ema2, _safeLen(length))
    3 * (ema1 - ema2) + ema3

export trima(source, length) =>
    ta.sma(ta.sma(source, math.ceil(_safeLen(length) / 2)), math.floor(_safeLen(length) / 2) + 1)

export trix(source, length, signalLength, exponential = true) =>
    float ema1 = ta.ema(source, _safeLen(length))
    float ema2 = ta.ema(ema1, _safeLen(length))
    float ema3 = ta.ema(ema2, _safeLen(length))
    float trixValue = ta.roc(ema3, 1)
    float signal = exponential ? ta.ema(trixValue, _safeLen(signalLength)) : ta.sma(trixValue, _safeLen(signalLength))
    [trixValue, signal, trixValue - signal]

export uo(fastLen = 7, midLen = 14, slowLen = 28) =>
    float bp = close - math.min(low, close[1])
    float tr = math.max(high, close[1]) - math.min(low, close[1])
    float fast = _nzDiv(math.sum(bp, _safeLen(fastLen)), math.sum(tr, _safeLen(fastLen)))
    float mid = _nzDiv(math.sum(bp, _safeLen(midLen)), math.sum(tr, _safeLen(midLen)))
    float slow = _nzDiv(math.sum(bp, _safeLen(slowLen)), math.sum(tr, _safeLen(slowLen)))
    100 * (4 * fast + 2 * mid + slow) / 7

export vhf(source, length) =>
    _nzDiv(ta.highest(source, _safeLen(length)) - ta.lowest(source, _safeLen(length)), math.sum(math.abs(source - source[1]), _safeLen(length)))

export vi(length) =>
    float trSum = math.sum(ta.tr(true), _safeLen(length))
    float plus = math.sum(math.abs(high - low[1]), _safeLen(length))
    float minus = math.sum(math.abs(low - high[1]), _safeLen(length))
    [_nzDiv(plus, trSum), _nzDiv(minus, trSum)]

export vStop(source, atrLength, atrFactor = 1) =>
    float atr = ta.atr(_safeLen(atrLength)) * atrFactor
    var bool uptrend = true
    var float stop = na
    float upper = source - atr
    float lower = source + atr
    uptrend := na(stop[1]) ? true : source >= stop[1] ? true : source <= stop[1] ? false : uptrend[1]
    stop := uptrend ? math.max(upper, nz(stop[1], upper)) : math.min(lower, nz(stop[1], lower))
    [stop, uptrend]

export vStop2(source, atrLength, atrFactor = 1) =>
    vStop(source, _safeLen(atrLength), atrFactor)

export vzo(length) =>
    float signedVolume = close > close[1] ? volume : close < close[1] ? -volume : 0
    100 * _nzDiv(ta.ema(signedVolume, _safeLen(length)), ta.ema(volume, _safeLen(length)))

export williamsFractal(period) =>
    int p = _safeLen(period)
    [not na(ta.pivothigh(high, p, p)), not na(ta.pivotlow(low, p, p))]

export wpo(length) =>
    float wave = ta.ema(close - close[1], _safeLen(length))
    100 * _nzDiv(wave, ta.ema(math.abs(close - close[1]), _safeLen(length)))
`;

const TRADINGVIEW_TA_V9_BASE_SOURCE = TRADINGVIEW_TA_V7_SOURCE.replace(
  'export ichimoku(conLength, baseLength, senkouLength) =>',
  'export ichimoku(conLength = 9, baseLength = 26, senkouLength = 52) =>',
);

const TRADINGVIEW_TA_V9_SOURCE = `${TRADINGVIEW_TA_V9_BASE_SOURCE}

export requestUpAndDownVolume(lowerTimeframe) =>
    array<float> values = request.security_lower_tf(syminfo.tickerid, lowerTimeframe, close >= open ? volume : -volume)
    float upVolume = 0.0
    float downVolume = 0.0
    for i = 0 to array.size(values) - 1
        float value = array.get(values, i)
        if value >= 0
            upVolume += value
        else
            downVolume += value
    [upVolume, downVolume, upVolume + downVolume]

export requestVolumeDelta(lowerTimeframe, cumulativePeriod = timeframe.period) =>
    [upVolume, downVolume, delta] = requestUpAndDownVolume(lowerTimeframe)
    bool reset = timeframe.change(cumulativePeriod)
    var float cvd = 0.0
    cvd := reset ? delta : nz(cvd[1]) + delta
    [reset ? 0.0 : nz(cvd[1]), math.max(cvd, nz(cvd[1], cvd)), math.min(cvd, nz(cvd[1], cvd)), cvd]
`;

const TRADINGVIEW_TA_V12_SOURCE = `${TRADINGVIEW_TA_V9_SOURCE}

export chandelier(length, atrLength, mult) =>
    float atr = ta.atr(_safeLen(atrLength)) * mult
    [ta.highest(high, _safeLen(length)) - atr, ta.lowest(low, _safeLen(length)) + atr]

export chandelier2(length, atrLength, mult) =>
    float atr = atr2(atrLength) * mult
    [ta.highest(high, _safeLen(length)) - atr, ta.lowest(low, _safeLen(length)) + atr]

export er(source, length) =>
    int len = _safeLen(length)
    float netChange = math.abs(source - source[len])
    float volatility = math.sum(math.abs(source - source[1]), len)
    _nzDiv(netChange, volatility)

export kama(source, erLen, fastLen, slowLen) =>
    float fastAlpha = 2.0 / (_safeLen(fastLen) + 1)
    float slowAlpha = 2.0 / (_safeLen(slowLen) + 1)
    float smoothing = math.pow(nz(er(source, erLen), 0) * (fastAlpha - slowAlpha) + slowAlpha, 2)
    var float value = na
    value := na(value[1]) ? source : value[1] + smoothing * (source - value[1])
    value

export macd2(source, fastLen, slowLen, sigLen) =>
    float macd = ema2(source, fastLen) - ema2(source, slowLen)
    float signal = ema2(macd, sigLen)
    [macd, signal, macd - signal]

export pmo(source, length1, length2, sigLen) =>
    float pmoValue = ta.ema(10 * ta.roc(source, 1), _safeLen(length1))
    pmoValue := ta.ema(pmoValue, _safeLen(length2))
    [pmoValue, ta.ema(pmoValue, _safeLen(sigLen))]

export ppo(source, fastLen, slowLen, sigLen) =>
    float slow = ta.ema(source, _safeLen(slowLen))
    float value = _nzDiv(ta.ema(source, _safeLen(fastLen)) - slow, slow) * 100
    float signal = ta.ema(value, _safeLen(sigLen))
    [value, signal, value - signal]

export ppo2(source, fastLen, slowLen, sigLen) =>
    float slow = ema2(source, slowLen)
    float value = _nzDiv(ema2(source, fastLen) - slow, slow) * 100
    float signal = ema2(value, sigLen)
    [value, signal, value - signal]

export specialK(source, sigLen1, sigLen2) =>
    float value = ta.roc(source, 10) + ta.roc(source, 15) * 2 + ta.roc(source, 20) * 3 + ta.roc(source, 30) * 4
    float signal = ta.ema(ta.ema(value, _safeLen(sigLen1)), _safeLen(sigLen2))
    [value, signal]

export ulcerIndex(source, length) =>
    int len = _safeLen(length)
    float peak = ta.highest(source, len)
    float drawdown = _nzDiv(source - peak, peak) * 100
    math.sqrt(math.sum(drawdown * drawdown, len) / len)
`;

const TRADINGVIEW_TA_V14_SOURCE = `${TRADINGVIEW_TA_V12_SOURCE}

export allTimeHigh(src) =>
    na

export allTimeLow(src) =>
    na

export trima2(src, length) =>
    trima(src, _safeLen(length))
`;

const TRADINGVIEW_TA_V1_PROGRAM = parse(TRADINGVIEW_TA_V1_SOURCE, {
  grammarSource: TRADINGVIEW_TA_DOCS_URL,
});

// v4 is the v3 export surface; its release note only changes aroon's calculation.
const TRADINGVIEW_TA_V4_SOURCE = `${TRADINGVIEW_TA_V7_SOURCE.replace(
  /^export (atr2|changePercent|highestSince|lowestSince|relativeVolume|rma2|supertrend2|vStop2)\(/gm,
  '/* v7-only */ $1(',
)}

export trima2(src, length) =>
    trima(src, _safeLen(length))
`;

const TRADINGVIEW_TA_V4_PROGRAM = parse(TRADINGVIEW_TA_V4_SOURCE, {
  grammarSource: TRADINGVIEW_TA_DOCS_URL,
});

const TRADINGVIEW_TA_V7_PROGRAM = parse(TRADINGVIEW_TA_V7_SOURCE, {
  grammarSource: TRADINGVIEW_TA_DOCS_URL,
});

const TRADINGVIEW_TA_V9_PROGRAM = parse(TRADINGVIEW_TA_V9_SOURCE, {
  grammarSource: TRADINGVIEW_TA_DOCS_URL,
});

const TRADINGVIEW_TA_V12_PROGRAM = parse(TRADINGVIEW_TA_V12_SOURCE, {
  grammarSource: TRADINGVIEW_TA_DOCS_URL,
});

const TRADINGVIEW_TA_V14_PROGRAM = parse(TRADINGVIEW_TA_V14_SOURCE, {
  grammarSource: TRADINGVIEW_TA_DOCS_URL,
});

const taFunction = (
  name: string,
  params: string[],
  minArgs: number,
  maxArgs: number,
  returnKind: OfficialTradingViewReturnKind = 'float',
  runtimeName?: string,
  tupleArity?: number,
): OfficialTradingViewLibraryFunction => ({
  name,
  runtimeName,
  params,
  minArgs,
  maxArgs,
  returnKind,
  tupleArity,
  docsUrl: TRADINGVIEW_TA_DOCS_URL,
});

const colorFunction = (
  name: string,
  params: string[],
  minArgs: number,
  maxArgs: number,
  returnKind: OfficialTradingViewReturnKind = 'color',
  tupleArity?: number,
): OfficialTradingViewLibraryFunction => ({
  name,
  runtimeName: `TradingView.Color.${name}`,
  params,
  minArgs,
  maxArgs,
  returnKind,
  tupleArity,
  docsUrl: TRADINGVIEW_COLOR_DOCS_URL,
});

const valueAtTimeFunction = (
  name: string,
  params: string[],
  minArgs: number,
  maxArgs: number,
  returnKind: OfficialTradingViewReturnKind,
  tupleArity?: number,
  returnTypeName?: string,
): OfficialTradingViewLibraryFunction => ({
  name,
  runtimeName: `TradingView.ValueAtTime.${name}`,
  params,
  minArgs,
  maxArgs,
  returnKind,
  returnTypeName,
  tupleArity,
  docsUrl: TRADINGVIEW_VALUE_AT_TIME_DOCS_URL,
});

const TRADINGVIEW_COLOR_V2_FUNCTIONS: OfficialTradingViewLibraryFunction[] = [
  colorFunction('getRGB', ['source'], 1, 1, 'tuple', 4),
  colorFunction('getHexString', ['r', 'g', 'b', 't'], 1, 4, 'string'),
  colorFunction('hexStringToRGB', ['source'], 1, 1, 'tuple', 4),
  colorFunction('hexStringToColor', ['source'], 1, 1, 'color'),
  colorFunction('getLRGB', ['r', 'g', 'b', 't'], 1, 4, 'tuple', 4),
  colorFunction('lrgbToRGB', ['lr', 'lg', 'lb', 't'], 4, 4, 'tuple', 4),
  colorFunction('lrgbToColor', ['lr', 'lg', 'lb', 't'], 4, 4, 'color'),
  colorFunction('getHSL', ['r', 'g', 'b', 't'], 1, 4, 'tuple', 4),
  colorFunction('hslToRGB', ['h', 's', 'l', 't'], 4, 4, 'tuple', 4),
  colorFunction('hslToColor', ['h', 's', 'l', 't'], 4, 4, 'color'),
  colorFunction('getHSV', ['r', 'g', 'b', 't'], 1, 4, 'tuple', 4),
  colorFunction('hsvToRGB', ['h', 's', 'v', 't'], 4, 4, 'tuple', 4),
  colorFunction('hsvToColor', ['h', 's', 'v', 't'], 4, 4, 'color'),
  colorFunction('getHWB', ['r', 'g', 'b', 't'], 1, 4, 'tuple', 4),
  colorFunction('hwbToRGB', ['h', 'w', 'b', 't'], 4, 4, 'tuple', 4),
  colorFunction('hwbToColor', ['h', 'w', 'b', 't'], 4, 4, 'color'),
  colorFunction('getXYZ', ['r', 'g', 'b', 't'], 1, 4, 'tuple', 4),
  colorFunction('xyzToRGB', ['x', 'y', 'z', 't'], 4, 4, 'tuple', 4),
  colorFunction('xyzToColor', ['x', 'y', 'z', 't'], 4, 4, 'color'),
  colorFunction('getXYY', ['r', 'g', 'b', 't'], 1, 4, 'tuple', 4),
  colorFunction('xyyToRGB', ['xc', 'yc', 'y', 't'], 4, 4, 'tuple', 4),
  colorFunction('xyyToColor', ['xc', 'yc', 'y', 't'], 4, 4, 'color'),
  colorFunction('getLAB', ['r', 'g', 'b', 't'], 1, 4, 'tuple', 4),
  colorFunction('labToRGB', ['l', 'a', 'b', 't'], 4, 4, 'tuple', 4),
  colorFunction('labToColor', ['l', 'a', 'b', 't'], 4, 4, 'color'),
  colorFunction('getOKLAB', ['r', 'g', 'b', 't'], 1, 4, 'tuple', 4),
  colorFunction('oklabToRGB', ['l', 'a', 'b', 't'], 4, 4, 'tuple', 4),
  colorFunction('oklabToColor', ['l', 'a', 'b', 't'], 4, 4, 'color'),
  colorFunction('getLCH', ['r', 'g', 'b', 't'], 1, 4, 'tuple', 4),
  colorFunction('lchToRGB', ['l', 'c', 'h', 't'], 4, 4, 'tuple', 4),
  colorFunction('lchToColor', ['l', 'c', 'h', 't'], 4, 4, 'color'),
  colorFunction('getOKLCH', ['r', 'g', 'b', 't'], 1, 4, 'tuple', 4),
  colorFunction('oklchToRGB', ['l', 'c', 'h', 't'], 4, 4, 'tuple', 4),
  colorFunction('oklchToColor', ['l', 'c', 'h', 't'], 4, 4, 'color'),
  colorFunction('contrastRatio', ['value1', 'value2'], 2, 2, 'float'),
  colorFunction('isLightTheme', ['source'], 1, 1, 'bool'),
  colorFunction('grayscale', ['source'], 1, 1, 'color'),
  colorFunction('negative', ['source', 'colorSpace'], 1, 2, 'color'),
  colorFunction('complement', ['source', 'colorSpace'], 1, 2, 'color'),
  colorFunction('analogousColors', ['source', 'colorSpace'], 1, 2, 'tuple', 2),
  colorFunction('splitComplements', ['source', 'colorSpace'], 1, 2, 'tuple', 2),
  colorFunction('triadicColors', ['source', 'colorSpace'], 1, 2, 'tuple', 2),
  colorFunction('tetradicColors', ['source', 'colorSpace', 'square'], 1, 3, 'tuple', 3),
  colorFunction('pentadicColors', ['source', 'colorSpace'], 1, 2, 'tuple', 4),
  colorFunction('hexadicColors', ['source', 'colorSpace'], 1, 2, 'tuple', 5),
  colorFunction('add', ['value1', 'value2', 'transpWeight'], 2, 3, 'color'),
  colorFunction('overlay', ['fg', 'bg'], 2, 2, 'color'),
  colorFunction('fromGradient', ['value', 'bottomValue', 'topValue', 'bottomColor', 'topColor', 'colorSpace'], 5, 6, 'color'),
  colorFunction('fromMultiStepGradient', ['value', 'steps', 'colors', 'colorSpace'], 3, 4, 'color'),
  colorFunction('gradientPalette', ['baseColor', 'stopColor', 'steps', 'strength', 'model'], 2, 5, 'array'),
  colorFunction('monoPalette', ['baseColor', 'grayLuminance', 'variations', 'strength', 'colorSpace'], 1, 5, 'array'),
  colorFunction('harmonyPalette', ['baseColor', 'harmonyType', 'grayLuminance', 'variations', 'strength', 'colorSpace'], 1, 6, 'matrix'),
];

const TRADINGVIEW_VALUE_AT_TIME_V2_FUNCTIONS: OfficialTradingViewLibraryFunction[] = [
  valueAtTimeFunction('getArrayFromString', ['str'], 1, 1, 'array'),
  valueAtTimeFunction('periodToTimestamp', ['period', 'referenceTime'], 2, 2, 'int'),
  valueAtTimeFunction('collectData', ['source', 'timeOffsetLimit', 'timeframeLimit'], 1, 3, 'unknown', undefined, 'Data'),
  valueAtTimeFunction('valueAtTime', ['source', 'timestamp', 'timeOffsetLimit', 'timeframeLimit'], 2, 4, 'tuple', 3),
  valueAtTimeFunction('valueAtTimeOffset', ['source', 'timeOffset', 'timeOffsetLimit', 'timeframeLimit'], 2, 4, 'tuple', 3),
  valueAtTimeFunction('valueAtPeriodOffset', ['source', 'period', 'timeOffsetLimit', 'timeframeLimit'], 2, 4, 'tuple', 3),
  valueAtTimeFunction('getDataAtTimes', ['timestamps', 'source', 'timeOffsetLimit', 'timeframeLimit'], 2, 4, 'tuple', 4),
  valueAtTimeFunction('getDataAtTimeOffsets', ['timeOffsets', 'source', 'timeOffsetLimit', 'timeframeLimit'], 2, 4, 'tuple', 4),
  valueAtTimeFunction('getDataAtPeriodOffsets', ['periods', 'source', 'timeOffsetLimit', 'timeframeLimit'], 2, 4, 'tuple', 4),
];

const TRADINGVIEW_TA_V1_FUNCTIONS: OfficialTradingViewLibraryFunction[] = [
  taFunction('cagr', ['entryTime', 'entryPrice', 'exitTime', 'exitPrice'], 4, 4),
];

const TRADINGVIEW_TA_V7_FUNCTIONS: OfficialTradingViewLibraryFunction[] = [
  taFunction('ao', [], 0, 0),
  taFunction('aroon', ['length'], 1, 1, 'tuple', undefined, 2),
  taFunction('atr2', ['length'], 1, 1),
  ...TRADINGVIEW_TA_V1_FUNCTIONS,
  taFunction('changePercent', ['newValue', 'oldValue'], 2, 2, 'float', 'TradingView.ta.changePercent'),
  taFunction('coppock', ['source', 'longLength', 'shortLength', 'smoothLength'], 4, 4),
  taFunction('dema', ['source', 'length'], 2, 2, 'float', 'ta.dema'),
  taFunction('dema2', ['src', 'length'], 2, 2),
  taFunction('dm', ['length'], 1, 1),
  taFunction('donchian', ['length'], 1, 1, 'tuple', undefined, 3),
  taFunction('ema2', ['src', 'length'], 2, 2),
  taFunction('eom', ['length', 'div'], 1, 2),
  taFunction('frama', ['source', 'length'], 2, 2),
  taFunction('ft', ['source', 'length'], 2, 2),
  taFunction('highestSince', ['cond', 'source'], 1, 2),
  taFunction('ht', ['source'], 1, 1),
  taFunction('ichimoku', ['conLength', 'baseLength', 'senkouLength'], 3, 3, 'tuple', undefined, 5),
  taFunction('ift', ['source'], 1, 1),
  taFunction('kvo', ['fastLen', 'slowLen', 'trigLen'], 3, 3, 'tuple', undefined, 2),
  taFunction('lowestSince', ['cond', 'source'], 1, 2),
  taFunction('pzo', ['length'], 1, 1),
  taFunction('relativeVolume', ['length', 'anchorTimeframe', 'isCumulative', 'adjustRealtime'], 1, 4, 'tuple', undefined, 3),
  taFunction('rma2', ['source', 'length'], 2, 2),
  taFunction('rms', ['source', 'length'], 2, 2),
  taFunction('rwi', ['length'], 1, 1, 'tuple', undefined, 2),
  taFunction('stc', ['source', 'fast', 'slow', 'cycle', 'd1', 'd2'], 6, 6),
  taFunction('stochFull', ['periodK', 'smoothK', 'periodD'], 3, 3, 'tuple', undefined, 2),
  taFunction('stochRsi', ['lengthRsi', 'periodK', 'smoothK', 'periodD', 'source'], 4, 5, 'tuple', undefined, 2),
  taFunction('supertrend', ['factor', 'atrLength', 'wicks'], 2, 3, 'tuple', 'ta.supertrend', 2),
  taFunction('supertrend2', ['factor', 'atrLength', 'wicks'], 2, 3, 'tuple', undefined, 2),
  taFunction('szo', ['source', 'length'], 2, 2),
  taFunction('t3', ['source', 'length', 'vf'], 3, 3),
  taFunction('t3Alt', ['source', 'length', 'vf'], 3, 3),
  taFunction('tema', ['source', 'length'], 2, 2, 'float', 'ta.tema'),
  taFunction('tema2', ['source', 'length'], 2, 2),
  taFunction('trima', ['source', 'length'], 2, 2),
  taFunction('trix', ['source', 'length', 'signalLength', 'exponential'], 3, 4, 'tuple', undefined, 3),
  taFunction('uo', ['fastLen', 'midLen', 'slowLen'], 3, 3),
  taFunction('vhf', ['source', 'length'], 2, 2),
  taFunction('vi', ['length'], 1, 1, 'tuple', undefined, 2),
  taFunction('vStop', ['source', 'atrLength', 'atrFactor'], 3, 3, 'tuple', undefined, 2),
  taFunction('vStop2', ['source', 'atrLength', 'atrFactor'], 3, 3, 'tuple', undefined, 2),
  taFunction('vzo', ['length'], 1, 1),
  taFunction('williamsFractal', ['period'], 1, 1, 'tuple', undefined, 2),
  taFunction('wpo', ['length'], 1, 1),
];

const TRADINGVIEW_TA_V4_FUNCTION_NAMES = new Set([
  'cagr', 'aroon', 'coppock', 'dema', 'dema2', 'dm', 'donchian', 'ema2', 'eom',
  'frama', 'ft', 'ht', 'ichimoku', 'ift', 'kvo', 'pzo', 'rms', 'rwi', 'stc',
  'stochFull', 'stochRsi', 'supertrend', 'szo', 't3', 't3Alt', 'tema', 'tema2',
  'trima', 'trima2', 'trix', 'uo', 'vhf', 'vi', 'vzo', 'williamsFractal', 'wpo',
]);

const TRADINGVIEW_TA_V4_FUNCTIONS = TRADINGVIEW_TA_V7_FUNCTIONS
  .filter(({ name }) => TRADINGVIEW_TA_V4_FUNCTION_NAMES.has(name))
  .concat([taFunction('trima2', ['src', 'length'], 2, 2)]);

const TRADINGVIEW_TA_V8_ADDITIONS: OfficialTradingViewLibraryFunction[] = [
  taFunction('requestUpAndDownVolume', ['lowerTimeframe'], 1, 1, 'tuple', undefined, 3),
  taFunction('requestVolumeDelta', ['lowerTimeframe', 'cumulativePeriod'], 1, 2, 'tuple', undefined, 4),
];

const TRADINGVIEW_TA_V12_ADDITIONS: OfficialTradingViewLibraryFunction[] = [
  taFunction('chandelier', ['length', 'atrLength', 'mult'], 3, 3, 'tuple', undefined, 2),
  taFunction('chandelier2', ['length', 'atrLength', 'mult'], 3, 3, 'tuple', undefined, 2),
  taFunction('er', ['source', 'length'], 2, 2),
  taFunction('kama', ['source', 'erLen', 'fastLen', 'slowLen'], 4, 4, 'float', 'TradingView.ta.kama'),
  taFunction('macd2', ['source', 'fastLen', 'slowLen', 'sigLen'], 4, 4, 'tuple', undefined, 3),
  taFunction('pmo', ['source', 'length1', 'length2', 'sigLen'], 4, 4, 'tuple', undefined, 2),
  taFunction('ppo', ['source', 'fastLen', 'slowLen', 'sigLen'], 4, 4, 'tuple', undefined, 3),
  taFunction('ppo2', ['source', 'fastLen', 'slowLen', 'sigLen'], 4, 4, 'tuple', undefined, 3),
  taFunction('specialK', ['source', 'sigLen1', 'sigLen2'], 3, 3, 'tuple', undefined, 2),
  taFunction('ulcerIndex', ['source', 'length'], 2, 2),
];

const TRADINGVIEW_TA_V14_ADDITIONS: OfficialTradingViewLibraryFunction[] = [
  taFunction('allTimeHigh', ['src'], 1, 1, 'float', 'TradingView.ta.allTimeHigh'),
  taFunction('allTimeLow', ['src'], 1, 1, 'float', 'TradingView.ta.allTimeLow'),
  taFunction('trima2', ['src', 'length'], 2, 2),
];

const TRADINGVIEW_TA_SUPPORTED_VERSIONS = new Set(['1', '4', '7', '8', '9', '10', '12', '14']);

function tradingViewTaFunctions(version: '1' | '4' | '7' | '8' | '9' | '10' | '12' | '14'): Map<string, OfficialTradingViewLibraryFunction> {
  const functions = version === '1'
    ? TRADINGVIEW_TA_V1_FUNCTIONS
    : version === '4'
    ? TRADINGVIEW_TA_V4_FUNCTIONS
    : version === '7'
    ? TRADINGVIEW_TA_V7_FUNCTIONS
    : version === '14'
      ? [...TRADINGVIEW_TA_V7_FUNCTIONS, ...TRADINGVIEW_TA_V8_ADDITIONS, ...TRADINGVIEW_TA_V12_ADDITIONS, ...TRADINGVIEW_TA_V14_ADDITIONS]
      : version === '12'
        ? [...TRADINGVIEW_TA_V7_FUNCTIONS, ...TRADINGVIEW_TA_V8_ADDITIONS, ...TRADINGVIEW_TA_V12_ADDITIONS]
      : [...TRADINGVIEW_TA_V7_FUNCTIONS, ...TRADINGVIEW_TA_V8_ADDITIONS];
  const result = new Map(functions.map((fn) => [fn.name, fn]));
  if (version !== '1' && version !== '4' && version !== '7' && version !== '8') {
    const ichimoku = result.get('ichimoku');
    if (ichimoku) result.set('ichimoku', { ...ichimoku, minArgs: 0 });
  }
  return result;
}

export function parseTradingViewImportPath(path: string): ParsedTradingViewImportPath | undefined {
  const parts = path.split('/').filter(Boolean);
  if (parts.length < 3) return undefined;
  const version = parts.at(-1);
  const library = parts.at(-2);
  if (!version || !library) return undefined;
  return {
    owner: parts.slice(0, -2).join('/'),
    library,
    version,
  };
}

export function getOfficialTradingViewLibrary(path: string): OfficialTradingViewLibrary | undefined {
  const parsed = parseTradingViewImportPath(path);
  if (!parsed || parsed.owner !== 'TradingView') return undefined;
  if (parsed.library === 'LibraryCOT' && parsed.version === '5') {
    return {
      owner: 'TradingView',
      library: 'LibraryCOT',
      version: '5',
      functions: new Map(),
      program: TRADINGVIEW_LIBRARY_COT_V5_PROGRAM,
    };
  }
  if (parsed.library === 'RelativeValue' && parsed.version === '3') {
    return {
      owner: 'TradingView',
      library: 'RelativeValue',
      version: '3',
      functions: new Map(),
      program: TRADINGVIEW_RELATIVE_VALUE_V3_PROGRAM,
    };
  }
  if (parsed.library === 'TechnicalRating' && parsed.version === '1') {
    return {
      owner: 'TradingView',
      library: 'TechnicalRating',
      version: '1',
      functions: new Map(),
      program: TRADINGVIEW_TECHNICAL_RATING_V1_PROGRAM,
    };
  }
  if (parsed.library === 'Color' && parsed.version === '2') {
    return {
      owner: 'TradingView',
      library: 'Color',
      version: '2',
      functions: new Map(TRADINGVIEW_COLOR_V2_FUNCTIONS.map((fn) => [fn.name, fn])),
    };
  }
  if (parsed.library === 'ValueAtTime' && parsed.version === '2') {
    return {
      owner: 'TradingView',
      library: 'ValueAtTime',
      version: '2',
      functions: new Map(TRADINGVIEW_VALUE_AT_TIME_V2_FUNCTIONS.map((fn) => [fn.name, fn])),
      program: TRADINGVIEW_VALUE_AT_TIME_V2_PROGRAM,
    };
  }
  if (parsed.library === 'ta') {
    if (!TRADINGVIEW_TA_SUPPORTED_VERSIONS.has(parsed.version)) return undefined;
    const version = parsed.version as '1' | '4' | '7' | '8' | '9' | '10' | '12' | '14';
    return {
      owner: 'TradingView',
      library: 'ta',
      version,
      functions: tradingViewTaFunctions(version),
      program: version === '1'
        ? TRADINGVIEW_TA_V1_PROGRAM
        : version === '4'
        ? TRADINGVIEW_TA_V4_PROGRAM
        : version === '7'
        ? TRADINGVIEW_TA_V7_PROGRAM
        : version === '10'
        ? TRADINGVIEW_TA_V10_PROGRAM
        : version === '12'
          ? TRADINGVIEW_TA_V12_PROGRAM
        : version === '14'
          ? TRADINGVIEW_TA_V14_PROGRAM
          : TRADINGVIEW_TA_V9_PROGRAM,
    };
  }
  if (parsed.library === 'ZigZag' && (parsed.version === '6' || parsed.version === '7' || parsed.version === '8' || parsed.version === '9')) {
    return {
      owner: 'TradingView',
      library: 'ZigZag',
      version: parsed.version,
      functions: new Map(),
      program: parsed.version === '6' ? TRADINGVIEW_ZIGZAG_V6_PROGRAM : TRADINGVIEW_ZIGZAG_V8_PROGRAM,
    };
  }
  return undefined;
}

export function unsupportedOfficialTradingViewFunctionMessage(path: string, functionName: string): string {
  return `Official TradingView library function '${path}.${functionName}' is documented but not implemented by TealScript yet`;
}

export function unsupportedTradingViewLibraryImportMessage(path: string, alias: string): string | undefined {
  const parsed = parseTradingViewImportPath(path);
  if (!parsed || parsed.owner === 'TradingView') return undefined;
  return `Import '${path}' as alias '${alias}' is unsupported by design: TradingView library source is not network-resolvable or host-fetchable outside TradingView's closed Pine runtime; implement Tealstreet libraries through Tealstreet's own linker instead`;
}
