import type { Program } from '../../parser/ast';
import type { Bar, PlotOutput, InputDefinition } from '../context';
import { ExecutionContext } from '../context';
import type { ExecutionResult, RuntimeProfile, TealscriptRuntimeOptions } from '../engine';
import type { StrategyLedger, StrategyDirection, StrategyOrderInput } from '../strategy';
import {
  createStrategyLedger,
  submitStrategyOrder,
  fillPendingStrategyMarketOrders,
  fillPendingStrategyOrders,
  markStrategyLedgerToMarket,
  cancelStrategyOrder,
  cancelAllStrategyOrders,
} from '../strategy';
import { compile, ARRAY_HELPERS, MAP_HELPERS, UDT_HELPERS, MATRIX_HELPERS } from './compile';
import type { CompiledSecurityScript } from './compile';
import type { CompiledScript, CompiledBarContext } from './compile';
import type { RequestDatafeed, RequestDataContext } from '../requestDatafeed';
import { NumericSeries } from './runtime';
import * as ta from './ta-classes';

export interface CompiledExecutionOptions {
  runtime?: TealscriptRuntimeOptions;
  maxBarsBack?: number;
  requestDatafeed?: RequestDatafeed;
}

export function tryCompile(ast: Program, maxBarsBack?: number): CompiledScript {
  return compile(ast, maxBarsBack);
}

function extractStrategySettings(compiled: CompiledScript): Partial<StrategyLedger['settings']> {
  const decl = compiled.analysis.declarationInfo;
  if (!decl || decl.kind !== 'strategy') return {};
  const node = decl.node;
  const settings: Partial<StrategyLedger['settings']> = { title: decl.title };

  const numVal = (expr: unknown): number | undefined => {
    const e = expr as { type?: string; value?: number } | undefined;
    if (!e) return undefined;
    if (e.type === 'NumericLiteral') return e.value;
    return undefined;
  };
  const boolVal = (expr: unknown): boolean | undefined => {
    const e = expr as { type?: string; value?: boolean } | undefined;
    if (!e) return undefined;
    if (e.type === 'BooleanLiteral') return e.value;
    return undefined;
  };
  const strVal = (expr: unknown): string | undefined => {
    const e = expr as { type?: string; value?: string; name?: string; object?: { name?: string }; property?: { name?: string } } | undefined;
    if (!e) return undefined;
    if (e.type === 'StringLiteral') return e.value;
    if (e.type === 'MemberExpression' && e.object?.name && e.property?.name) {
      return `${e.object.name}.${e.property.name}`;
    }
    return undefined;
  };

  const ic = numVal(node.initial_capital);
  if (ic !== undefined) settings.initialCapital = ic;
  const dqv = numVal(node.default_qty_value);
  if (dqv !== undefined) settings.defaultQtyValue = dqv;
  const pyr = numVal(node.pyramiding);
  if (pyr !== undefined) settings.pyramiding = pyr;
  const cv = numVal(node.commission_value);
  if (cv !== undefined) settings.commissionValue = cv;
  const slip = numVal(node.slippage);
  if (slip !== undefined) settings.slippageTicks = slip;
  const ml = numVal(node.margin_long);
  if (ml !== undefined) settings.marginLong = ml;
  const ms = numVal(node.margin_short);
  if (ms !== undefined) settings.marginShort = ms;
  const coof = boolVal(node.calc_on_order_fills);
  if (coof !== undefined) settings.calcOnOrderFills = coof;
  const coet = boolVal(node.calc_on_every_tick);
  if (coet !== undefined) settings.calcOnEveryTick = coet;
  const pooc = boolVal(node.process_orders_on_close);
  if (pooc !== undefined) settings.processOrdersOnClose = pooc;
  const cur = strVal(node.currency);
  if (cur !== undefined) settings.currency = cur;

  const dqt = strVal(node.default_qty_type);
  if (dqt !== undefined) {
    if (dqt.includes('fixed')) settings.defaultQtyType = 'fixed';
    else if (dqt.includes('cash')) settings.defaultQtyType = 'cash';
    else if (dqt.includes('percent_of_equity')) settings.defaultQtyType = 'percent_of_equity';
  }
  const ct = strVal(node.commission_type);
  if (ct !== undefined) {
    if (ct.includes('cash_per_contract')) settings.commissionType = 'cash_per_contract';
    else if (ct.includes('cash_per_order')) settings.commissionType = 'cash_per_order';
    else if (ct.includes('percent')) settings.commissionType = 'percent';
  }

  return settings;
}

function normalizeDirection(val: unknown): StrategyDirection {
  if (val === 'long' || val === true || val === 1) return 'long';
  if (val === 'short' || val === false || val === -1) return 'short';
  return 'long';
}

function toOptionalNumber(val: unknown): number | undefined {
  if (val === undefined || val === null) return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

function toOptionalString(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined;
  return String(val);
}

function evaluateSecuritySeries(
  secScript: CompiledSecurityScript,
  requestBars: Bar[],
  maxBarsBack: number,
): unknown[] {
  const deps = {
    NumericSeries, maxBarsBack,
    _arr: ARRAY_HELPERS, _map: MAP_HELPERS, _udt: UDT_HELPERS, _mtx: MATRIX_HELPERS,
    ...ta,
  };
  const inst = new secScript.ScriptClass(deps);
  const values: unknown[] = [];
  let lastPlotValue: unknown = NaN;

  for (let i = 0; i < requestBars.length; i++) {
    const b = requestBars[i];
    lastPlotValue = NaN;
    const secBarCtx = {
      bar: { open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume, time: b.time },
      barIndex: i,
      lastBarIndex: requestBars.length - 1,
      isFirstTick: true,
      barstate: { isfirst: i === 0, islast: i === requestBars.length - 1, ishistory: true, isrealtime: false, isnew: true, isconfirmed: true, islastconfirmedhistory: i === requestBars.length - 1 },
      syminfo: {}, timeframe: {},
      plot(_index: number, _funcName: string, value: unknown) {
        lastPlotValue = value;
      },
      input(_id: string, _fn: string, defval: unknown) { return defval; },
      strategyEntry() {}, strategyExit() {}, strategyClose() {}, strategyCloseAll() {},
      strategyCancel() {}, strategyCancelAll() {}, strategyOrder() {},
      strategyProp() { return 0; },
      requestSecurity() { return NaN; },
      alert() {}, alertCondition() {}, logInfo() {}, logWarning() {}, logError() {},
      runtimeError(msg: unknown) { throw new Error(String(msg)); },
      callBuiltin() { return NaN; },
      colorNew() { return ''; }, colorRgb() { return ''; },
      colorR() { return 0; }, colorG() { return 0; }, colorB() { return 0; }, colorT() { return 0; },
      mathSum() { return NaN; },
      strFormat(...args: unknown[]) { return String(args[0]); },
      strFormatTime(...args: unknown[]) { return String(args[0]); },
      tickerNew() { return ''; }, tickerModify() { return ''; }, tickerStandard() { return ''; },
      tickerHeikinashi() { return ''; }, tickerRenko() { return ''; }, tickerKagi() { return ''; },
      tickerLinebreak() { return ''; }, tickerPointfigure() { return ''; },
    };
    try { inst.onBar(secBarCtx as CompiledBarContext); } catch { /* continue */ }
    values.push(lastPlotValue);
  }
  return values;
}

function findConfirmedRequestBarIndex(requestBars: Bar[], chartTime: number): number {
  let index = -1;
  for (let i = 0; i < requestBars.length - 1; i++) {
    if (requestBars[i + 1]!.time <= chartTime) {
      index = i;
    } else {
      break;
    }
  }
  return index;
}

function findActiveRequestBarIndex(requestBars: Bar[], chartTime: number): number {
  let index = -1;
  for (let i = 0; i < requestBars.length; i++) {
    if (requestBars[i]!.time <= chartTime) {
      index = i;
    } else {
      break;
    }
  }
  return index;
}

function mergeRequestedValue(
  requestBars: Bar[],
  requestedValues: unknown[],
  chartTime: number,
  previousChartTime: number | undefined,
  gaps: string,
  lookahead: string,
): unknown {
  if (requestBars.length === 0) return NaN;

  const selectedIndex = lookahead === 'barmerge.lookahead_on'
    ? findActiveRequestBarIndex(requestBars, chartTime)
    : findConfirmedRequestBarIndex(requestBars, chartTime);
  if (selectedIndex < 0) return NaN;

  if (gaps === 'barmerge.gaps_on') {
    const availableAt = lookahead === 'barmerge.lookahead_on'
      ? requestBars[selectedIndex]?.time
      : requestBars[selectedIndex + 1]?.time;
    if (availableAt === undefined || (previousChartTime !== undefined && previousChartTime >= availableAt)) {
      return NaN;
    }
  }

  return requestedValues[selectedIndex] ?? NaN;
}

export function executeCompiled(
  compiled: CompiledScript,
  bars: Bar[],
  inputs?: Map<string, unknown>,
  options?: CompiledExecutionOptions,
): ExecutionResult | null {
  if (!compiled.success) return null;

  const startMs = performance.now();
  const ctx = new ExecutionContext();

  if (options?.runtime?.syminfo) {
    ctx.syminfo = { ...ctx.syminfo, ...options.runtime.syminfo };
  }
  if (options?.runtime?.timeframe) {
    ctx.timeframe = { ...ctx.timeframe, ...options.runtime.timeframe };
  }
  if (options?.runtime?.chart) {
    ctx.chart = { ...ctx.chart, ...options.runtime.chart };
  }

  if (inputs) {
    for (const [key, value] of inputs) {
      ctx.setInput(key, value);
    }
  }

  const isStrategy = compiled.analysis.declarationInfo?.kind === 'strategy';
  const strategySettings = extractStrategySettings(compiled);
  if (options?.runtime?.syminfo?.currency) {
    strategySettings.currency = options.runtime.syminfo.currency;
  }
  const ledger = createStrategyLedger(strategySettings);
  const mintick = (ctx.syminfo as unknown as { mintick: number }).mintick ?? 0.01;
  const lastBarIndex = bars.length - 1;

  const deps = {
    NumericSeries,
    maxBarsBack: options?.maxBarsBack ?? 500,
    _arr: ARRAY_HELPERS,
    _map: MAP_HELPERS,
    _udt: UDT_HELPERS,
    _mtx: MATRIX_HELPERS,
    ...ta,
  };

  const inst = new compiled.ScriptClass(deps);

  const plotRegistered = new Map<number, string>();
  const plotArrays = new Map<number, (number | null)[]>();
  const plotColors = new Map<number, string>();
  const inputDefs = new Map<string, InputDefinition>();

  const securityCache = new Map<string, { bars: Bar[]; values: unknown[] }>();
  const requestDatafeed = options?.requestDatafeed;

  let barCount = 0;

  const barData = { open: 0, high: 0, low: 0, close: 0, volume: 0, time: 0 };
  const barstateObj = {
    isfirst: false, islast: false, ishistory: true, isrealtime: false,
    isnew: true, isconfirmed: true, islastconfirmedhistory: false,
  };

  const barCtx: CompiledBarContext = {
    bar: barData,
    barIndex: 0,
    lastBarIndex,
    isFirstTick: true,
    barstate: barstateObj,
    syminfo: ctx.syminfo as unknown as Record<string, unknown>,
    timeframe: ctx.timeframe as unknown as Record<string, unknown>,

    plot(index: number, funcName: string, value: unknown, named: Record<string, unknown>, extraArgs: unknown[]) {
      let arr = plotArrays.get(index);
      if (!arr) {
        const plotId = `plot_${index}`;
        const title = typeof named.title === 'string' ? named.title : `Plot ${index}`;
        const color = typeof named.color === 'string' ? named.color : (typeof extraArgs[0] === 'string' ? extraArgs[0] : 'blue');
        plotColors.set(index, color);

        ctx.registerPlot({
          id: plotId,
          type: funcName as PlotOutput['type'],
          title,
          color,
          linewidth: typeof named.linewidth === 'number' ? named.linewidth : undefined,
          style: typeof named.style === 'string' ? named.style as PlotOutput['style'] : undefined,
          offset: typeof named.offset === 'number' ? named.offset : undefined,
          display: typeof named.display === 'number' ? named.display : undefined,
        });
        plotRegistered.set(index, plotId);
        const plot = ctx.getPlots().find((p) => p.id === plotId);
        arr = plot!.values;
        plotArrays.set(index, arr);
      }

      const numValue = typeof value === 'number' ? (value !== value ? null : value) : null;
      arr.push(numValue);

      if (typeof named.color === 'string' && named.color !== plotColors.get(index)) {
        const plot = ctx.getPlots().find((p) => p.id === `plot_${index}`);
        if (plot) {
          if (!Array.isArray(plot.color)) {
            const prev = plot.color;
            plot.color = new Array(plot.values.length - 1).fill(prev);
          }
          (plot.color as (string | null)[]).push(named.color);
        }
      }
    },

    input(id: string, funcName: string, defval: unknown, _named: Record<string, unknown>, _extraArgs: unknown[]) {
      const userValue = inputs?.get(id);
      if (userValue !== undefined) return userValue;

      if (!inputDefs.has(id)) {
        const type = funcName.replace('input.', '') as InputDefinition['type'];
        inputDefs.set(id, {
          id,
          type,
          title: id,
          defval,
        });
      }

      return defval;
    },

      strategyEntry(...args: unknown[]) {
        if (!isStrategy) return;
        const named = (typeof args[args.length - 1] === 'object' && args[args.length - 1] !== null && !Array.isArray(args[args.length - 1])) ? args.pop() as Record<string, unknown> : {};
        const id = String(args[0] ?? named.id ?? '');
        const direction = normalizeDirection(args[1] ?? named.direction);
        const rawQty = toOptionalNumber(args[2] ?? named.qty);
        const qtyType = rawQty === undefined ? ledger.settings.defaultQtyType : 'fixed' as const;
        const qtyValue = rawQty ?? ledger.settings.defaultQtyValue;
        const limitPrice = toOptionalNumber(args[3] ?? named.limit);
        const stopPrice = toOptionalNumber(args[4] ?? named.stop);
        const comment = toOptionalString(args[7] ?? named.comment);
        if (!id || !Number.isFinite(qtyValue) || qtyValue <= 0) return;
        submitStrategyOrder(ledger, {
          id, direction, qty: qtyValue, qtyType, qtyValue,
          isEntry: true, requestedQty: qtyValue,
          limitPrice, stopPrice, comment,
          barIndex, time: bar.time,
        });
      },
      strategyOrder(...args: unknown[]) {
        if (!isStrategy) return;
        const named = (typeof args[args.length - 1] === 'object' && args[args.length - 1] !== null && !Array.isArray(args[args.length - 1])) ? args.pop() as Record<string, unknown> : {};
        const id = String(args[0] ?? named.id ?? '');
        const direction = normalizeDirection(args[1] ?? named.direction);
        const rawQty = toOptionalNumber(args[2] ?? named.qty);
        const qtyType = rawQty === undefined ? ledger.settings.defaultQtyType : 'fixed' as const;
        const qtyValue = rawQty ?? ledger.settings.defaultQtyValue;
        const limitPrice = toOptionalNumber(args[3] ?? named.limit);
        const stopPrice = toOptionalNumber(args[4] ?? named.stop);
        const comment = toOptionalString(args[7] ?? named.comment);
        if (!id || !Number.isFinite(qtyValue) || qtyValue <= 0) return;
        submitStrategyOrder(ledger, {
          id, direction, qty: qtyValue, qtyType, qtyValue,
          isEntry: false, requestedQty: qtyValue,
          limitPrice, stopPrice, comment,
          barIndex, time: bar.time,
        });
      },
      strategyExit(...args: unknown[]) {
        if (!isStrategy) return;
        const named = (typeof args[args.length - 1] === 'object' && args[args.length - 1] !== null && !Array.isArray(args[args.length - 1])) ? args.pop() as Record<string, unknown> : {};
        const id = String(args[0] ?? named.id ?? '');
        const fromEntry = toOptionalString(args[1] ?? named.from_entry);
        const openTrades = ledger.openTrades.filter((t) => fromEntry === undefined || t.entryOrderId === fromEntry);
        if (openTrades.length === 0) return;
        const exitDir: StrategyDirection = openTrades[0].direction === 'long' ? 'short' : 'long';
        const openQty = openTrades.reduce((t, tr) => t + tr.qty, 0);
        const rawQty = toOptionalNumber(args[2] ?? named.qty);
        const qty = rawQty !== undefined ? Math.min(rawQty, openQty) : openQty;
        const limitPrice = toOptionalNumber(args[5] ?? named.limit);
        const stopPrice = toOptionalNumber(args[7] ?? named.stop);
        if (limitPrice === undefined && stopPrice === undefined) {
          submitStrategyOrder(ledger, {
            id, direction: exitDir, qty, qtyType: 'fixed', qtyValue: qty,
            isExit: true, fromEntry, barIndex, time: bar.time,
          });
        } else {
          if (limitPrice !== undefined) {
            submitStrategyOrder(ledger, {
              id: `${id} Limit`, direction: exitDir, qty, qtyType: 'fixed', qtyValue: qty,
              isExit: true, fromEntry, limitPrice, barIndex, time: bar.time,
            });
          }
          if (stopPrice !== undefined) {
            submitStrategyOrder(ledger, {
              id: `${id} Stop`, direction: exitDir, qty, qtyType: 'fixed', qtyValue: qty,
              isExit: true, fromEntry, stopPrice, barIndex, time: bar.time,
            });
          }
        }
      },
      strategyClose(...args: unknown[]) {
        if (!isStrategy) return;
        const named = (typeof args[args.length - 1] === 'object' && args[args.length - 1] !== null && !Array.isArray(args[args.length - 1])) ? args.pop() as Record<string, unknown> : {};
        const entryId = String(args[0] ?? named.id ?? '');
        const matchingTrades = entryId
          ? ledger.openTrades.filter((t) => t.entryOrderId === entryId)
          : ledger.openTrades;
        if (matchingTrades.length === 0) return;
        const exitDir: StrategyDirection = matchingTrades[0].direction === 'long' ? 'short' : 'long';
        const qty = matchingTrades.reduce((t, tr) => t + tr.qty, 0);
        submitStrategyOrder(ledger, {
          id: `Close ${entryId || 'all'}`, direction: exitDir, qty, qtyType: 'fixed', qtyValue: qty,
          isExit: true, fromEntry: entryId || undefined, barIndex, time: bar.time,
        });
      },
      strategyCloseAll(...args: unknown[]) {
        if (!isStrategy) return;
        const named = (typeof args[args.length - 1] === 'object' && args[args.length - 1] !== null && !Array.isArray(args[args.length - 1])) ? args.pop() as Record<string, unknown> : {};
        const comment = toOptionalString(named.comment);
        const openTrades = ledger.openTrades;
        if (openTrades.length === 0) return;
        const exitDir: StrategyDirection = openTrades[0].direction === 'long' ? 'short' : 'long';
        const qty = openTrades.reduce((t, tr) => t + tr.qty, 0);
        submitStrategyOrder(ledger, {
          id: 'close_all', direction: exitDir, qty, qtyType: 'fixed', qtyValue: qty,
          isExit: true, comment, barIndex, time: bar.time,
        });
      },
      strategyCancel(...args: unknown[]) {
        if (!isStrategy) return;
        const named = (typeof args[args.length - 1] === 'object' && args[args.length - 1] !== null && !Array.isArray(args[args.length - 1])) ? args.pop() as Record<string, unknown> : {};
        const id = String(args[0] ?? named.id ?? '');
        if (id) cancelStrategyOrder(ledger, id, barIndex, bar.time);
      },
      strategyCancelAll() {
        if (!isStrategy) return;
        cancelAllStrategyOrders(ledger, barIndex, bar.time);
      },
      strategyProp(name: string) {
        if (name === 'long') return 'long';
        if (name === 'short') return 'short';
        if (name === 'position_size') return ledger.position.size;
        if (name === 'equity') return ledger.equity;
        if (name === 'initial_capital') return ledger.settings.initialCapital;
        if (name === 'netprofit') return ledger.netProfit;
        if (name === 'grossprofit') return ledger.grossProfit;
        if (name === 'grossloss') return ledger.grossLoss;
        if (name === 'openprofit') return ledger.position.openProfit;
        if (name === 'closedtrades') return ledger.closedTrades.length;
        if (name === 'opentrades') return ledger.openTrades.length;
        if (name === 'wintrades') return ledger.closedTrades.filter((t) => t.profit > 0).length;
        if (name === 'losstrades') return ledger.closedTrades.filter((t) => t.profit <= 0).length;
        return 0;
      },

      requestSecurity(secId: number, symbol: unknown, timeframe: unknown, gaps: unknown, lookahead: unknown): unknown {
        const symStr = String(symbol ?? '');
        const tfStr = String(timeframe ?? '');
        const gapsStr = String(gaps ?? 'barmerge.gaps_off');
        const laStr = String(lookahead ?? 'barmerge.lookahead_off');
        const cacheKey = `${secId}:${symStr}:${tfStr}`;

        let cached = securityCache.get(cacheKey);
        if (!cached) {
          const secScript = compiled.securityScripts.get(secId);
          if (!secScript || !requestDatafeed) return NaN;

          const result = requestDatafeed.getBars({ symbol: symStr, timeframe: tfStr });
          if (!result.ok) return NaN;

          const values = evaluateSecuritySeries(
            secScript, result.context.bars, options?.maxBarsBack ?? 500,
          );
          cached = { bars: result.context.bars, values };
          securityCache.set(cacheKey, cached);
        }

        const chartTime = bar.time;
        const prevBar = barIndex > 0 ? bars[barIndex - 1] : undefined;
        return mergeRequestedValue(
          cached.bars, cached.values, chartTime, prevBar?.time, gapsStr, laStr,
        );
      },

      alert() {},
      alertCondition() {},
      logInfo() {},
      logWarning() {},
      logError() {},
      runtimeError(msg: unknown) { throw new Error(String(msg)); },
      callBuiltin() { return NaN; },
      colorNew(color: unknown, transp: unknown) {
        if (typeof color === 'string' && typeof transp === 'number') {
          return color;
        }
        return typeof color === 'string' ? color : '';
      },
      colorRgb(r: unknown, g: unknown, b: unknown, t?: unknown) {
        return `rgba(${r}, ${g}, ${b}, ${typeof t === 'number' ? 1 - t / 100 : 1})`;
      },
      colorR() { return 0; },
      colorG() { return 0; },
      colorB() { return 0; },
      colorT() { return 0; },
      mathSum(..._args: unknown[]) { return NaN; },
      strFormat(...args: unknown[]) { return String(args[0]); },
      strFormatTime(...args: unknown[]) { return String(args[0]); },
      tickerNew(...args: unknown[]) { return String(args[0] ?? ctx.syminfo.tickerid ?? ''); },
      tickerModify(...args: unknown[]) { return String(args[0] ?? ''); },
      tickerStandard(...args: unknown[]) { return String(args[0] ?? ctx.syminfo.tickerid ?? ''); },
      tickerHeikinashi(...args: unknown[]) { return String(args[0] ?? ctx.syminfo.tickerid ?? ''); },
      tickerRenko(...args: unknown[]) { return String(args[0] ?? ''); },
      tickerKagi(...args: unknown[]) { return String(args[0] ?? ''); },
      tickerLinebreak(...args: unknown[]) { return String(args[0] ?? ''); },
      tickerPointfigure(...args: unknown[]) { return String(args[0] ?? ''); },
    };

  let bar = bars[0];
  let barIndex = 0;

  for (barIndex = 0; barIndex < bars.length; barIndex++) {
    barCount++;
    const isLastBar = barIndex === lastBarIndex;
    bar = bars[barIndex];

    barData.open = bar.open;
    barData.high = bar.high;
    barData.low = bar.low;
    barData.close = bar.close;
    barData.volume = bar.volume;
    barData.time = bar.time;
    barCtx.barIndex = barIndex;
    barstateObj.isfirst = barIndex === 0;
    barstateObj.islast = isLastBar;
    barstateObj.islastconfirmedhistory = isLastBar;

    if (isStrategy) {
      fillPendingStrategyMarketOrders(ledger, bar.open, barIndex, bar.time, mintick);
      markStrategyLedgerToMarket(ledger, bar.close, bar.high, bar.low, { barIndex, time: bar.time });
    }

    try {
      inst.onBar(barCtx);
    } catch (_error) {
      // Continue execution — single bar errors shouldn't abort
    }

    if (isStrategy) {
      markStrategyLedgerToMarket(ledger, bar.close, bar.high, bar.low, { barIndex, time: bar.time });
      fillPendingStrategyOrders(ledger, bar.high, bar.low, barIndex, bar.time, mintick);
      markStrategyLedgerToMarket(ledger, bar.close, bar.high, bar.low, { barIndex, time: bar.time });
    }

  }

  const decl = compiled.analysis.declarationInfo;
  const profile: RuntimeProfile = {
    elapsedMs: performance.now() - startMs,
    bars: barCount,
    statements: 0,
    expressions: 0,
    builtinCalls: 0,
    requestContexts: 0,
    maxBarsBack: options?.maxBarsBack ?? 500,
    errors: 0,
  };

  const declaration = {
    title: decl?.title ?? 'Compiled Script',
    shortTitle: undefined,
    overlay: false,
    precision: 4,
    format: undefined,
    scale: undefined,
    timeframe: undefined,
    timeframeGaps: undefined,
    explicitPlotZOrder: undefined,
    behindChart: undefined,
    calcBarsCount: undefined,
    maxBarsBack: undefined,
    dynamicRequests: false,
    drawingLimits: { label: 500, line: 500, box: 500, polyline: 100 },
  };

  // Parse indicator declaration metadata from the AST
  if (decl?.node) {
    const node = decl.node;
    if (node.overlay?.type === 'BooleanLiteral') declaration.overlay = node.overlay.value;
    if (node.precision?.type === 'NumericLiteral') declaration.precision = node.precision.value;
  }

  return {
    plots: ctx.getPlots(),
    drawings: ctx.getDrawings(),
    alerts: ctx.getAlerts(),
    logs: ctx.getLogs(),
    inputs: Array.from(inputDefs.values()),
    declaration,
    indicatorTitle: declaration.title,
    indicatorShortTitle: declaration.shortTitle,
    indicatorOverlay: declaration.overlay,
    indicatorPrecision: declaration.precision,
    indicatorFormat: declaration.format,
    indicatorScale: declaration.scale,
    indicatorTimeframe: declaration.timeframe,
    indicatorTimeframeGaps: declaration.timeframeGaps,
    indicatorExplicitPlotZOrder: declaration.explicitPlotZOrder,
    indicatorBehindChart: declaration.behindChart,
    indicatorCalcBarsCount: declaration.calcBarsCount,
    indicatorMaxBarsBack: declaration.maxBarsBack,
    indicatorDynamicRequests: declaration.dynamicRequests,
    indicatorDrawingLimits: declaration.drawingLimits,
    strategy: ledger,
    errors: [],
    profile,
  };
}
