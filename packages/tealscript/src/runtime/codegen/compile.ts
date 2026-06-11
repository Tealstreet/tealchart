import type { Program } from '../../parser/ast';
import { analyze } from './analyzer';
import type { AnalysisContext } from './analyzer';
import { emit, RUNTIME_HELPERS } from './emitter';
import {
  NumericSeries,
  SMA, EMA, RMA, RSI, Crossover, Crossunder, Change,
  Highest, Lowest, MACD, ATR, Stoch, StdDev, BB,
  DEMA, TEMA, Cum,
} from './index';

export interface CompiledScript {
  ScriptClass: new (deps: ScriptDependencies) => GeneratedScriptInstance;
  analysis: AnalysisContext;
  success: boolean;
  unsupported: string[];
  generatedCode?: string;
}

export interface ScriptDependencies {
  NumericSeries: typeof NumericSeries;
  maxBarsBack: number;
  SMA: typeof SMA;
  EMA: typeof EMA;
  RMA: typeof RMA;
  RSI: typeof RSI;
  Crossover: typeof Crossover;
  Crossunder: typeof Crossunder;
  Change: typeof Change;
  Highest: typeof Highest;
  Lowest: typeof Lowest;
  MACD: typeof MACD;
  ATR: typeof ATR;
  Stoch: typeof Stoch;
  StdDev: typeof StdDev;
  BB: typeof BB;
  DEMA: typeof DEMA;
  TEMA: typeof TEMA;
  Cum: typeof Cum;
}

export interface GeneratedScriptInstance {
  onBar(ctx: CompiledBarContext): void;
  save(): unknown;
  restore(snap: unknown): void;
}

export interface CompiledBarContext {
  bar: { open: number; high: number; low: number; close: number; volume: number; time: number };
  barIndex: number;
  lastBarIndex: number;
  isFirstTick: boolean;
  barstate: {
    isfirst: boolean;
    islast: boolean;
    ishistory: boolean;
    isrealtime: boolean;
    isnew: boolean;
    isconfirmed: boolean;
    islastconfirmedhistory: boolean;
  };
  syminfo: Record<string, unknown>;
  timeframe: Record<string, unknown>;
  plot(index: number, funcName: string, value: unknown, named: Record<string, string>, extraArgs: unknown[]): void;
  input(id: string, funcName: string, defval: unknown, named: Record<string, string>, extraArgs: unknown[]): unknown;
  strategyEntry(...args: unknown[]): void;
  strategyExit(...args: unknown[]): void;
  strategyClose(...args: unknown[]): void;
  strategyCloseAll(...args: unknown[]): void;
  strategyCancel(...args: unknown[]): void;
  strategyCancelAll(...args: unknown[]): void;
  strategyOrder(...args: unknown[]): void;
  strategyProp(name: string): unknown;
  alert(...args: unknown[]): void;
  alertCondition(...args: unknown[]): void;
  logInfo(...args: unknown[]): void;
  logWarning(...args: unknown[]): void;
  logError(...args: unknown[]): void;
  runtimeError(...args: unknown[]): void;
  callBuiltin(name: string, args: unknown[]): unknown;
  colorNew(...args: unknown[]): unknown;
  colorRgb(...args: unknown[]): unknown;
  colorR(c: unknown): unknown;
  colorG(c: unknown): unknown;
  colorB(c: unknown): unknown;
  colorT(c: unknown): unknown;
  mathSum(...args: unknown[]): unknown;
  strFormat(...args: unknown[]): string;
  strFormatTime(...args: unknown[]): string;
}

const DEFAULT_DEPS: ScriptDependencies = {
  NumericSeries,
  maxBarsBack: 500,
  SMA, EMA, RMA, RSI, Crossover, Crossunder, Change,
  Highest, Lowest, MACD, ATR, Stoch, StdDev, BB,
  DEMA, TEMA, Cum,
};

export function compile(ast: Program, maxBarsBack?: number): CompiledScript {
  const analysis = analyze(ast);

  if (analysis.unsupported.length > 0) {
    return {
      ScriptClass: null as unknown as CompiledScript['ScriptClass'],
      analysis,
      success: false,
      unsupported: analysis.unsupported,
    };
  }

  const code = emit(ast, analysis);

  try {
    const factory = new Function(
      'deps',
      `${RUNTIME_HELPERS}\n${code}`
    );

    const deps = { ...DEFAULT_DEPS };
    if (maxBarsBack !== undefined) deps.maxBarsBack = maxBarsBack;

    const ScriptClass = factory(deps);

    return {
      ScriptClass,
      analysis,
      success: true,
      unsupported: [],
      generatedCode: code,
    };
  } catch (error) {
    return {
      ScriptClass: null as unknown as CompiledScript['ScriptClass'],
      analysis,
      success: false,
      unsupported: [`Compilation error: ${error instanceof Error ? error.message : String(error)}`],
      generatedCode: code,
    };
  }
}
