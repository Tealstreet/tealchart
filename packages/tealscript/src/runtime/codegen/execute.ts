import type { Program } from '../../parser/ast';
import type { Bar, PlotOutput, InputDefinition } from '../context';
import { ExecutionContext } from '../context';
import type { ExecutionResult, RuntimeProfile, TealscriptRuntimeOptions } from '../engine';
import type { StrategyLedger } from '../strategy';
import { createStrategyLedger } from '../strategy';
import { compile } from './compile';
import type { CompiledScript, CompiledBarContext } from './compile';
import { NumericSeries } from './runtime';
import * as ta from './ta-classes';

export interface CompiledExecutionOptions {
  runtime?: TealscriptRuntimeOptions;
  maxBarsBack?: number;
}

export function tryCompile(ast: Program, maxBarsBack?: number): CompiledScript {
  return compile(ast, maxBarsBack);
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

  ctx.loadBars(bars);

  if (inputs) {
    for (const [key, value] of inputs) {
      ctx.setInput(key, value);
    }
  }

  const deps = {
    NumericSeries,
    maxBarsBack: options?.maxBarsBack ?? 500,
    ...ta,
  };

  const inst = new compiled.ScriptClass(deps);

  const plotRegistered = new Map<number, string>();
  const plotColors = new Map<number, string>();
  const inputDefs = new Map<string, InputDefinition>();

  let barCount = 0;

  while (ctx.advanceBar()) {
    barCount++;
    const barIndex = ctx.bar_index;
    const isLastBar = barIndex === ctx.last_bar_index;
    const bar = bars[barIndex];

    const barCtx: CompiledBarContext = {
      bar: {
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
        time: bar.time,
      },
      barIndex,
      lastBarIndex: ctx.last_bar_index,
      isFirstTick: true,
      barstate: {
        isfirst: barIndex === 0,
        islast: isLastBar,
        ishistory: true,
        isrealtime: false,
        isnew: true,
        isconfirmed: true,
        islastconfirmedhistory: isLastBar,
      },
      syminfo: ctx.syminfo as Record<string, unknown>,
      timeframe: ctx.timeframe as Record<string, unknown>,

      plot(index: number, funcName: string, value: unknown, named: Record<string, unknown>, extraArgs: unknown[]) {
        const plotId = `plot_${index}`;
        if (!plotRegistered.has(index)) {
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
        }

        const numValue = typeof value === 'number' ? (value !== value ? null : value) : null;
        ctx.addPlotValue(plotId, numValue);

        if (typeof named.color === 'string' && named.color !== plotColors.get(index)) {
          const plot = ctx.getPlots().find((p) => p.id === plotId);
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

      strategyEntry() {},
      strategyExit() {},
      strategyClose() {},
      strategyCloseAll() {},
      strategyCancel() {},
      strategyCancelAll() {},
      strategyOrder() {},
      strategyProp(name: string) {
        if (name === 'position_size') return 0;
        if (name === 'equity') return 0;
        if (name === 'initial_capital') return 0;
        return 0;
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
    };

    try {
      inst.onBar(barCtx);
    } catch (_error) {
      // Continue execution — single bar errors shouldn't abort
    }

    ctx.commitBar();
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
    strategy: createStrategyLedger({} as StrategyLedger['settings']),
    errors: [],
    profile,
  };
}
