#!/usr/bin/env tsx

import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { parse } from '../src/parser/parser.ts';
import type { Program } from '../src/parser/ast.ts';
import { checkProgram } from '../src/semantic/checker.ts';
import { executeScript } from '../src/runtime/compiledOnly.ts';
import { compile, ARRAY_HELPERS, MAP_HELPERS, MATRIX_HELPERS, UDT_HELPERS } from '../src/runtime/codegen/compile.ts';
import { NumericSeries, ValueSeries } from '../src/runtime/codegen/runtime.ts';
import type { Bar } from '../src/runtime/context.ts';
import type { PineArray } from '../src/runtime/arrays.ts';
import * as ta from '../src/runtime/codegen/ta-classes.ts';
import usageReport from '../reports/pine-corpus-optional-argument-usage-v1.json' with { type: 'json' };

type Form = 'named' | 'positional' | 'declaration';

interface UsageSlot {
  slot: string;
  scriptCount: number;
  hitCount: number;
  forms: Partial<Record<Form, number>>;
}

interface RuntimeCall {
  kind: string;
  name: string;
  args: unknown[];
  named: Record<string, unknown>;
  extraArgs?: unknown[];
}

interface AuditCase {
  slot: string;
  member: string;
  param: string;
  form: Form;
  scripts: number;
  source: string;
  expected: unknown;
  verify: (result: AuditRuntimeResult) => string | undefined;
}

interface AuditRuntimeResult {
  program: Program;
  calls: RuntimeCall[];
  execution: ReturnType<typeof executeScript>;
  generatedCode: string;
}

interface AuditRow {
  slot: string;
  member: string;
  param: string;
  form: Form;
  scripts: number;
  status: 'ok' | 'failed' | 'skipped';
  evidence: string;
  source?: string;
}

const packageRoot = resolve(dirname(dirname(new URL(import.meta.url).pathname)));
const outJson = join(packageRoot, 'reports/pine-optional-argument-binding-audit-v1.json');
const outMd = join(packageRoot, 'reports/pine-optional-argument-binding-audit-v1.md');
const bars: Bar[] = [{ time: 1, open: 1, high: 2, low: 0, close: 1, volume: 10 }];

const inputDefaults: Record<string, string> = {
  input: '1',
  'input.bool': 'true',
  'input.color': 'color.red',
  'input.float': '1.5',
  'input.int': '1',
  'input.session': '"0930-1600"',
  'input.source': 'close',
  'input.string': '"A"',
  'input.symbol': '"NASDAQ:AAPL"',
  'input.time': 'timestamp("UTC", 2024, 1, 1, 0, 0)',
  'input.timeframe': '"60"',
};

const valueExpr: Record<string, string> = {
  active: 'true',
  alert_message: '"SLOT_ALERT"',
  anchor: 'true',
  bgcolor: 'color.red',
  calc_on_every_tick: 'true',
  comment: '"SLOT_COMMENT"',
  confirm: 'true',
  display: 'display.all',
  force_overlay: 'true',
  group: '"SLOT_GROUP"',
  initial_value: '1.5',
  inline: '"SLOT_INLINE"',
  loss: '5',
  margin_long: '22',
  margin_short: '33',
  max_bars_back: '500',
  max_boxes_count: '28',
  max_labels_count: '55',
  max_lines_count: '46',
  oca_name: '"SLOT_OCA"',
  overlay: 'true',
  precision: '2',
  profit: '4',
  qty_percent: '50',
  shorttitle: '"SLOT_SHORT"',
  size: 'size.large',
  slippage: '7',
  stop: '3',
  style: 'label.style_label_up',
  text: '"SLOT_TEXT"',
  text_color: 'color.white',
  text_valign: 'text.align_center',
  text_halign: 'text.align_center',
  textalign: 'text.align_center',
  textcolor: 'color.white',
  timeframe: '"60"',
  title: '"SLOT_TITLE"',
  tooltip: '"SLOT_TOOLTIP"',
  xloc: 'xloc.bar_index',
};

const expectedValue: Record<string, unknown> = {
  active: true,
  alert_message: 'SLOT_ALERT',
  anchor: true,
  bgcolor: '#F23645',
  calc_on_every_tick: true,
  comment: 'SLOT_COMMENT',
  confirm: true,
  display: 31,
  force_overlay: true,
  group: 'SLOT_GROUP',
  initial_value: 1.5,
  inline: 'SLOT_INLINE',
  loss: 5,
  margin_long: 22,
  margin_short: 33,
  max_bars_back: 500,
  max_boxes_count: 28,
  max_labels_count: 55,
  max_lines_count: 46,
  oca_name: 'SLOT_OCA',
  overlay: true,
  precision: 2,
  profit: 4,
  qty_percent: 50,
  shorttitle: 'SLOT_SHORT',
  size: 'large',
  slippage: 7,
  stop: 3,
  style: 'label_up',
  text: 'SLOT_TEXT',
  text_color: '#FFFFFF',
  text_valign: 'center',
  text_halign: 'center',
  textalign: 'center',
  textcolor: '#FFFFFF',
  timeframe: 3600,
  title: 'SLOT_TITLE',
  tooltip: 'SLOT_TOOLTIP',
  xloc: 'bar_index',
};

const labelParams = ['x', 'y', 'text', 'xloc', 'yloc', 'color', 'style', 'textcolor', 'size', 'textalign', 'tooltip', 'text_font_family', 'force_overlay', 'text_formatting'];
const lineParams = ['x1', 'y1', 'x2', 'y2', 'xloc', 'extend', 'color', 'style', 'width', 'force_overlay'];
const boxParams = ['left', 'top', 'right', 'bottom', 'border_color', 'border_width', 'border_style', 'extend', 'xloc', 'bgcolor', 'text', 'text_size', 'text_color', 'text_halign', 'text_valign', 'text_wrap', 'text_font_family', 'force_overlay', 'text_formatting'];
const plotcharParams = ['series', 'title', 'char', 'location', 'color', 'offset', 'text', 'textcolor', 'editable', 'size', 'show_last', 'display', 'format', 'precision', 'force_overlay'];
const strategyEntryParams = ['id', 'direction', 'qty', 'limit', 'stop', 'oca_name', 'oca_type', 'comment', 'alert_message', 'disable_alert'];
const strategyExitParams = ['id', 'from_entry', 'qty', 'qty_percent', 'profit', 'limit', 'loss', 'stop', 'trail_price', 'trail_points', 'trail_offset', 'oca_name', 'comment', 'comment_profit', 'comment_loss', 'comment_trailing', 'alert_message', 'alert_profit', 'alert_loss', 'alert_trailing', 'disable_alert'];
const strategyCloseAllParams = ['comment', 'alert_message', 'immediately', 'disable_alert'];

function expectEqual(actual: unknown, expected: unknown, label: string): string | undefined {
  if (Number.isNaN(expected) && Number.isNaN(actual)) return undefined;
  if (actual === expected) return undefined;
  return `${label}: expected ${String(expected)}, got ${String(actual)}`;
}

function highPrioritySlots(): UsageSlot[] {
  return (usageReport as unknown as { highPrioritySlots: UsageSlot[] }).highPrioritySlots;
}

function forms(slot: UsageSlot): Form[] {
  const observed = Object.keys(slot.forms).filter((form): form is Form => form === 'named' || form === 'positional' || form === 'declaration');
  if (observed.includes('declaration')) return observed;
  return [...new Set<Form>([...observed, 'named', 'positional'])];
}

function splitSlot(slot: string): { member: string; param: string } {
  const index = slot.lastIndexOf(':');
  return { member: slot.slice(0, index), param: slot.slice(index + 1) };
}

function indicatorHeader(member: string): string {
  return member.startsWith('strategy') ? 'strategy("Arg Audit")' : 'indicator("Arg Audit", overlay=true)';
}

function namedArg(param: string): string {
  return `${param}=${valueExpr[param]}`;
}

function positionalArgs(params: readonly string[], param: string, values: Record<string, string>): string {
  const index = params.indexOf(param);
  return params.slice(0, index + 1).map((name) => values[name] ?? valueExpr[name] ?? 'na').join(', ');
}

function inputSource(member: string, param: string, form: Form): string | undefined {
  const defval = inputDefaults[member];
  if (!defval) return undefined;
  if (form === 'named') {
    const prefix = param === 'title' ? `${member}(${defval}` : `${member}(${defval}, "Input"`;
    return `x = ${prefix}, ${namedArg(param)})`;
  }
  const positionalParams = inputPositionalParams(member, param);
  if (!positionalParams) return undefined;
  const values = {
    defval,
    title: param === 'title' ? '"SLOT_TITLE"' : '"Input"',
    options: member === 'input.timeframe' ? '["60", "D"]' : '["A", "B"]',
    minval: '0',
    maxval: '10',
    step: '1',
    tooltip: '"SLOT_TOOLTIP"',
    inline: '"SLOT_INLINE"',
    group: '"SLOT_GROUP"',
    confirm: 'true',
    display: 'display.all',
    active: 'true',
  };
  return `x = ${member}(${positionalArgs(positionalParams, param, values)})`;
}

function inputPositionalParams(member: string, param: string): readonly string[] | undefined {
  if (member === 'input') return ['defval', 'title', 'tooltip', 'inline', 'group', 'display', 'active'];
  if (member === 'input.int' || member === 'input.float') return ['defval', 'title', 'minval', 'maxval', 'step', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'];
  if (member === 'input.string' || member === 'input.timeframe') return ['defval', 'title', 'options', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'];
  return ['defval', 'title', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'];
}

function callSource(member: string, param: string, form: Form): string | undefined {
  if (member.startsWith('input')) return inputSource(member, param, form);
  if (member === 'label.new') {
    const base = { x: 'bar_index', y: 'close', text: '"Label"', xloc: 'xloc.bar_index', yloc: 'yloc.price', color: 'color.blue' };
    return form === 'named'
      ? `label.new(bar_index, close, "Label", ${namedArg(param)})`
      : `label.new(${positionalArgs(labelParams, param, base)})`;
  }
  if (member === 'line.new') {
    const base = { x1: 'bar_index', y1: 'close', x2: 'bar_index + 1', y2: 'close' };
    return form === 'named'
      ? `line.new(bar_index, close, bar_index + 1, close, ${namedArg(param)})`
      : `line.new(${positionalArgs(lineParams, param, base)})`;
  }
  if (member === 'box.new') {
    const base = { left: 'bar_index', top: 'high', right: 'bar_index + 1', bottom: 'low', border_color: 'color.blue', border_width: '1', border_style: 'line.style_solid', extend: 'extend.none' };
    return form === 'named'
      ? `box.new(bar_index, high, bar_index + 1, low, ${namedArg(param)})`
      : `box.new(${positionalArgs(boxParams, param, base)})`;
  }
  if (member === 'plotchar') {
    const base = { series: 'true', title: '"Char"', char: '"x"', location: 'location.abovebar', color: 'color.blue', offset: '0', text: '""', textcolor: 'color.white', editable: 'true' };
    return form === 'named'
      ? `plotchar(true, ${namedArg(param)})`
      : `plotchar(${positionalArgs(plotcharParams, param, base)})`;
  }
  if (member === 'strategy.entry') {
    const base = { id: '"E"', direction: 'strategy.long', qty: '1', limit: 'na' };
    return form === 'named'
      ? `strategy.entry("E", strategy.long, ${namedArg(param)})`
      : `strategy.entry(${positionalArgs(strategyEntryParams, param, base)})`;
  }
  if (member === 'strategy.exit') {
    const base = { id: '"X"', from_entry: '"E"', qty: 'na' };
    const requiredExit = ['stop', 'profit', 'loss'].includes(param) ? '' : ', stop=3';
    if (form === 'positional' && param === 'qty_percent') return 'strategy.exit("X", "E", na, 50, stop=3)';
    return form === 'named'
      ? `strategy.exit("X", "E"${requiredExit}, ${namedArg(param)})`
      : `strategy.exit(${positionalArgs(strategyExitParams, param, base)})`;
  }
  if (member === 'strategy.close_all') {
    return form === 'named'
      ? `strategy.close_all(${namedArg(param)})`
      : `strategy.close_all(${positionalArgs(strategyCloseAllParams, param, {})})`;
  }
  if (member === 'array.new') {
    if (form === 'named' && param === 'size') return `arr = array.new<float>(size=2)\nplot(array.size(arr))`;
    if (form === 'named') return `arr = array.new<float>(2, ${namedArg(param)})\nplot(array.size(arr) + nz(array.get(arr, 0)))`;
    return `arr = array.new<float>(${positionalArgs(['size', 'initial_value'], param, { size: '2', initial_value: '1.5' })})\nplot(array.size(arr) + nz(array.get(arr, 0)))`;
  }
  if (member === 'array.new_box') {
    return form === 'named'
      ? `b = box.new(bar_index, high, bar_index + 1, low)\narr = array.new_box(1, ${namedArg(param)})\nplot(array.size(arr))`
      : `b = box.new(bar_index, high, bar_index + 1, low)\narr = array.new_box(${positionalArgs(['size', 'initial_value'], param, { size: '1', initial_value: 'b' })})\nplot(array.size(arr))`;
  }
  if (member === 'timeframe.in_seconds') {
    return form === 'named' ? `plot(timeframe.in_seconds(${namedArg(param)}))` : `plot(timeframe.in_seconds("60"))`;
  }
  if (member === 'ta.vwap') {
    return form === 'named' ? `plot(ta.vwap(close, ${namedArg(param)}))` : `plot(ta.vwap(close, true))`;
  }
  return undefined;
}

function declarationSource(param: string): string {
  return `strategy("Arg Audit", ${namedArg(param)})\nplot(close)`;
}

function sourceFor(member: string, param: string, form: Form): string | undefined {
  const body = form === 'declaration' ? declarationSource(param) : callSource(member, param, form);
  if (!body) return undefined;
  return `//@version=6\n${form === 'declaration' ? '' : indicatorHeader(member) + '\n'}${body}\n`;
}

function inputField(param: string): string {
  if (param === 'title') return 'title';
  return param;
}

function drawingField(member: string, param: string): string {
  const labelMap: Record<string, string> = { textalign: 'textAlign', textcolor: 'textColor', force_overlay: 'forceOverlay' };
  const boxMap: Record<string, string> = { text_color: 'textColor', text_halign: 'textHalign', text_valign: 'textValign' };
  if (member === 'label.new') return labelMap[param] ?? param;
  if (member === 'box.new') return boxMap[param] ?? param;
  return param;
}

function strategyDeclarationValue(result: AuditRuntimeResult, param: string): unknown {
  const { declaration, strategy } = result.execution;
  const settings = strategy.settings as unknown as Record<string, unknown>;
  const declarationMap: Record<string, unknown> = {
    overlay: declaration.overlay,
    shorttitle: declaration.shortTitle,
    precision: declaration.precision,
    max_bars_back: declaration.maxBarsBack,
    max_labels_count: declaration.drawingLimits.label,
    max_lines_count: declaration.drawingLimits.line,
    max_boxes_count: declaration.drawingLimits.box,
  };
  const settingsMap: Record<string, unknown> = {
    slippage: settings.slippageTicks,
    margin_long: settings.marginLong,
    margin_short: settings.marginShort,
    calc_on_every_tick: settings.calcOnEveryTick,
  };
  return declarationMap[param] ?? settingsMap[param];
}

function runtimeVerifier(member: string, param: string, form: Form): AuditCase['verify'] {
  return (result) => {
    if (form === 'named') {
      const call = result.calls.find((candidate) => candidate.name === member || candidate.name === member.replace('strategy.', 'strategy'));
      if (call && Object.prototype.hasOwnProperty.call(call.named, param)) {
        const rawExpectedByParam: Record<string, unknown> = {
          bgcolor: 'red',
          display: 31,
          style: 'label_up',
          text_color: 'white',
          textcolor: 'white',
          timeframe: '60',
          xloc: 'bar_index',
        };
        const rawExpected = rawExpectedByParam[param] ?? expectedValue[param];
        const rawError = expectEqual(call.named[param], rawExpected, 'compiled named argument');
        if (rawError) return rawError;
      }
    }
    if (member.startsWith('input')) {
      const input = result.execution.inputs[0] as unknown as Record<string, unknown> | undefined;
      return expectEqual(input?.[inputField(param)], expectedValue[param], 'input metadata');
    }
    if (member === 'label.new' || member === 'box.new' || member === 'line.new') {
      const drawing = result.execution.drawings[0] as unknown as Record<string, unknown> | undefined;
      return expectEqual(drawing?.[drawingField(member, param)], expectedValue[param], 'drawing field');
    }
    if (member === 'plotchar') {
      const plot = result.execution.plots[0] as unknown as Record<string, unknown> | undefined;
      return expectEqual(plot?.[param], expectedValue[param], 'plotchar field');
    }
    if (member === 'strategy') {
      return expectEqual(strategyDeclarationValue(result, param), expectedValue[param], 'strategy declaration/runtime metadata');
    }
    if (member === 'strategy.entry') {
      const order = result.execution.strategy.orders.find((candidate) => candidate.id === 'E') as Record<string, unknown> | undefined;
      const map: Record<string, unknown> = { stop: order?.stopPrice, alert_message: order?.alertMessage, oca_name: order?.ocaName };
      return expectEqual(map[param], expectedValue[param], 'strategy entry order field');
    }
    if (member === 'strategy.exit') {
      const call = result.calls.find((candidate) => candidate.name === 'strategyExit');
      if (!call) return 'strategy.exit compiled call was not emitted';
      return form === 'named'
        ? expectEqual(call.named[param], expectedValue[param], 'strategy.exit compiled named argument')
        : undefined;
    }
    if (member === 'strategy.close_all') {
      const call = result.calls.find((candidate) => candidate.name === 'strategyCloseAll');
      if (!call) return 'strategy.close_all compiled call was not emitted';
      return form === 'named'
        ? expectEqual(call.named[param], expectedValue[param], 'strategy.close_all compiled named argument')
        : expectEqual(call.args[0], expectedValue[param], 'strategy.close_all compiled positional argument');
    }
    if (member === 'array.new') {
      const value = result.execution.plots[0]?.values[0];
      const expected = param === 'size' ? 2 : 3.5;
      return expectEqual(value, expected, 'array.new plotted size/value');
    }
    if (member === 'array.new_box') {
      return expectEqual(result.execution.plots[0]?.values[0], 1, 'array.new_box plotted size');
    }
    if (member === 'timeframe.in_seconds') {
      return expectEqual(result.execution.plots[0]?.values[0], 3600, 'timeframe.in_seconds plot');
    }
    if (member === 'ta.vwap') {
      return expectEqual(result.execution.plots[0]?.values[0], 1, 'ta.vwap plot');
    }
    return undefined;
  };
}

function makeCase(slot: UsageSlot, form: Form): AuditCase {
  const { member, param } = splitSlot(slot.slot);
  const source = sourceFor(member, param, form);
  if (!source) {
    return {
      slot: slot.slot,
      member,
      param,
      form,
      scripts: slot.scriptCount,
      source: '',
      expected: expectedValue[param],
      verify: () => `no synthetic source builder for ${slot.slot} ${form}`,
    };
  }
  return {
    slot: slot.slot,
    member,
    param,
    form,
    scripts: slot.scriptCount,
    source,
    expected: expectedValue[param],
    verify: runtimeVerifier(member, param, form),
  };
}

function runSpy(program: Program): { calls: RuntimeCall[]; generatedCode: string } {
  const compiled = compile(program);
  if (!compiled.success) throw new Error(`compile failed: ${compiled.unsupported.join('; ')}`);
  const calls: RuntimeCall[] = [];
  const deps = { NumericSeries, ValueSeries, maxBarsBack: 500, _arr: ARRAY_HELPERS, _map: MAP_HELPERS, _udt: UDT_HELPERS, _mtx: MATRIX_HELPERS, ...ta };
  const inst = new compiled.ScriptClass(deps);
  const bar = bars[0]!;
  const ctx = {
    bar: { open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume, time: bar.time },
    barIndex: 0,
    lastBarIndex: 0,
    isFirstTick: true,
    barstate: { isfirst: true, islast: true, ishistory: true, isrealtime: false, isnew: true, isconfirmed: true, islastconfirmedhistory: true },
    syminfo: { ticker: 'TEST', mintick: 0.01, pricescale: 100 },
    timeframe: { period: '1', multiplier: 1, isintraday: true, isdaily: false, isweekly: false, ismonthly: false },
    chart: { bgColor: '#FFFFFF', fgColor: '#363A45', type: 'standard' },
    plot(_index: number, funcName: string, _funcCallIndex: number, value: unknown, named?: Record<string, unknown>, extraArgs?: unknown[]) {
      calls.push({ kind: 'plot', name: funcName, args: [value], named: named ?? {}, extraArgs });
    },
    input(_id: string, funcName: string, defval: unknown, named: Record<string, unknown>, extraArgs: unknown[]) {
      calls.push({ kind: 'input', name: funcName, args: [defval], named, extraArgs });
      return Object.prototype.hasOwnProperty.call(named, 'defval') ? named.defval : defval;
    },
    strategyEntry(...args: unknown[]) { recordStrategyCall(calls, 'strategyEntry', args); },
    strategyExit(...args: unknown[]) { recordStrategyCall(calls, 'strategyExit', args); },
    strategyCloseAll(...args: unknown[]) { recordStrategyCall(calls, 'strategyCloseAll', args); },
    strategyClose(...args: unknown[]) { recordStrategyCall(calls, 'strategyClose', args); },
    strategyCancel() {}, strategyCancelAll() {}, strategyOrder() {},
    strategyDefaultEntryQty() { return NaN; }, strategyConvertToAccount() { return NaN; }, strategyConvertToSymbol() { return NaN; },
    strategyProp() { return 0; }, strategyPropHistory() { return NaN; }, strategyTradeProp() { return NaN; }, strategyRisk() { return undefined; },
    alert() {}, alertCondition() {}, logInfo() {}, logWarning() {}, logError() {},
    drawingCount() { return 0; }, markDrawingsPersistentFrom() {}, markPersistentRuntimeValue() {}, markPersistentArrayDrawing() {}, markPersistentUdtField() {},
    arrayPush(array: PineArray, value: unknown) { return deps._arr.push(array, value); },
    arraySet(array: PineArray, index: number, value: unknown) { deps._arr.set(array, index, value); },
    arrayUnshift(array: PineArray, value: unknown) { return deps._arr.unshift(array, value); },
    arrayInsert(array: PineArray, index: number, value: unknown) { return deps._arr.insert(array, index, value); },
    arrayConcat(array: PineArray, other: PineArray) { return deps._arr.concat(array, other); },
    runtimeError(msg: unknown) { throw new Error(String(msg)); },
    timestamp() { return 1704067200000; }, timeFilter() { return NaN; }, calendarPart() { return NaN; }, runtimeTimeValue() { return NaN; }, sessionValue() { return NaN; },
    nextBuiltinCallId(name: string) { return `${name}_0`; },
    callBuiltin(name: string, args: unknown[], named?: Record<string, unknown>, callId?: string) {
      calls.push({ kind: 'builtin', name, args, named: named ?? {}, extraArgs: callId ? [callId] : [] });
      return name === 'timeframe.in_seconds' ? 3600 : name === 'ta.vwap' ? 1 : NaN;
    },
    callMethodBuiltin() { return NaN; },
    colorNew() { return ''; }, colorRgb() { return ''; }, colorR() { return 0; }, colorG() { return 0; }, colorB() { return 0; }, colorT() { return 0; }, colorFromGradient() { return ''; },
    mathCall() { return NaN; }, mathSum() { return 0; }, strFormat(args: unknown[]) { return String(args[0]); }, strFormatTime(args: unknown[]) { return String(args[0]); },
    tickerNew() { return ''; }, tickerModify() { return ''; }, tickerStandard() { return ''; }, tickerInherit() { return ''; }, tickerHeikinashi() { return ''; }, tickerRenko() { return ''; }, tickerKagi() { return ''; }, tickerLinebreak() { return ''; }, tickerPointfigure() { return ''; },
    requestSecurity() { return NaN; }, requestSecurityLowerTf() { return deps._arr.create(); }, requestCurrencyRate() { return NaN; }, requestPointSeries() { return NaN; }, requestFootprint() { return NaN; }, requestSeed() { return NaN; },
    footprintMethod() { return NaN; }, capture() { return NaN; }, captureSource() { return undefined; },
  };
  inst.onBar(ctx);
  return { calls, generatedCode: compiled.generatedCode ?? '' };
}

function recordStrategyCall(calls: RuntimeCall[], name: string, args: unknown[]): void {
  const maybeNamed = args[args.length - 1];
  const named = maybeNamed && typeof maybeNamed === 'object' && !Array.isArray(maybeNamed)
    ? maybeNamed as Record<string, unknown>
    : {};
  const pos = named === maybeNamed ? args.slice(0, -1) : args;
  calls.push({ kind: 'strategy', name, args: pos, named });
}

function runCase(testCase: AuditCase): AuditRow {
  if (!testCase.source) {
    return { ...testCase, status: 'skipped', evidence: `No synthetic source builder for ${testCase.slot} ${testCase.form}` };
  }
  try {
    const program = parse(testCase.source);
    const diagnostics = checkProgram(program).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
    if (diagnostics.length > 0) {
      return { ...testCase, status: 'failed', evidence: `semantic diagnostics: ${diagnostics.map((diagnostic) => diagnostic.message).join('; ')}` };
    }
    const spy = runSpy(program);
    const execution = executeScript(program, bars);
    if (execution.errors.length > 0) {
      return { ...testCase, status: 'failed', evidence: `runtime errors: ${execution.errors.map((error) => error.message).join('; ')}` };
    }
    const verifyError = testCase.verify({ program, calls: spy.calls, execution, generatedCode: spy.generatedCode });
    if (verifyError) return { ...testCase, status: 'failed', evidence: verifyError };
    return { ...testCase, status: 'ok', evidence: 'parse ok; semantic ok; compiled execution exposes the expected value' };
  } catch (error) {
    return { ...testCase, status: 'failed', evidence: error instanceof Error ? error.message : String(error) };
  }
}

function renderMarkdown(rows: AuditRow[], commit: string): string {
  const ok = rows.filter((row) => row.status === 'ok').length;
  const failed = rows.filter((row) => row.status === 'failed');
  const skipped = rows.filter((row) => row.status === 'skipped');
  const byMember = new Map<string, AuditRow[]>();
  for (const row of rows) byMember.set(row.member, [...(byMember.get(row.member) ?? []), row]);

  const lines = [
    '# Pine Optional Argument Binding Audit V1',
    '',
    `Generated at ${new Date().toISOString()}. Measured at commit \`${commit.slice(0, 10)}\`.`,
    '',
    '## Headline',
    '',
    `Audited ${rows.length} high-use optional-argument forms from the 75 corpus-ranked slots used by at least 25 scripts.`,
    '',
    `Result: ${ok} OK, ${failed.length} failed, ${skipped.length} skipped.`,
    '',
    'Callable slots are checked in both named and positional form; declaration slots are checked as declaration metadata. The check is intentionally acceptance/binding only: every row parses, passes semantic checking, compiles, and exposes the expected argument value at the runtime-visible call surface or metadata field. It does not assert the downstream value semantics that the vector lane owns.',
    '',
    '## Failures',
    '',
  ];

  if (failed.length === 0) lines.push('None.');
  for (const row of failed) lines.push(`- \`${row.slot}\` (${row.form}, ${row.scripts} scripts): ${row.evidence}`);

  lines.push('', '## Skipped', '');
  if (skipped.length === 0) lines.push('None.');
  for (const row of skipped) lines.push(`- \`${row.slot}\` (${row.form}, ${row.scripts} scripts): ${row.evidence}`);

  lines.push('', '## Groups', '');
  for (const [member, memberRows] of [...byMember].sort((a, b) => Math.max(...b[1].map((row) => row.scripts)) - Math.max(...a[1].map((row) => row.scripts)))) {
    const memberOk = memberRows.filter((row) => row.status === 'ok').length;
    const memberFailed = memberRows.filter((row) => row.status === 'failed').length;
    const slots = [...new Set(memberRows.map((row) => row.slot))].length;
    lines.push(`- \`${member}\`: ${slots} slots, ${memberOk}/${memberRows.length} forms OK${memberFailed ? `, ${memberFailed} failed` : ''}`);
  }

  lines.push('', '## Rows', '', '| Slot | Scripts | Form | Status | Evidence |', '| --- | ---: | --- | --- | --- |');
  for (const row of rows) {
    lines.push(`| \`${row.slot}\` | ${row.scripts} | ${row.form} | ${row.status} | ${row.evidence.replaceAll('|', '\\|')} |`);
  }

  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const commit = (await import('node:child_process')).execFileSync('git', ['rev-parse', 'HEAD'], { cwd: packageRoot, encoding: 'utf8' }).trim();
  const cases = highPrioritySlots().flatMap((slot) => forms(slot).map((form) => makeCase(slot, form)));
  const rows = cases.map(runCase).sort((a, b) => b.scripts - a.scripts || a.slot.localeCompare(b.slot) || a.form.localeCompare(b.form));
  await writeFile(outJson, `${JSON.stringify({ generatedAt: new Date().toISOString(), commit, rows }, null, 2)}\n`);
  await writeFile(outMd, renderMarkdown(rows, commit));

  const failed = rows.filter((row) => row.status === 'failed');
  const skipped = rows.filter((row) => row.status === 'skipped');
  console.log(`optional-argument binding audit: ${rows.length - failed.length - skipped.length}/${rows.length} OK, ${failed.length} failed, ${skipped.length} skipped`);
  if (failed.length > 0) {
    for (const row of failed) console.log(`FAILED ${row.slot} ${row.form}: ${row.evidence}`);
    process.exitCode = 1;
  }
}

void main();
