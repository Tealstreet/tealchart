import type { Program } from '../parser/ast';
import type {
  AlertOutput,
  Bar,
  ChartInfo,
  DrawingOutput,
  InputDefinition,
  LogOutput,
  PlotOutput,
  SessionClassificationInfo,
  SymInfo,
  TimeframeInfo,
} from './context';
import type { RequestDatafeed } from './requestDatafeed';
import type { StrategyIntrabarDatafeed, StrategyLedger } from './strategy';
import type {
  TealscriptBackendSelectionOptions,
  TealscriptBackendSelectionSource,
  TealscriptExecutionBackend,
} from './backendSelection';

export interface ExecutionResult {
  plots: PlotOutput[];
  drawings: DrawingOutput[];
  alerts: AlertOutput[];
  logs: LogOutput[];
  inputs: InputDefinition[];
  declaration: IndicatorDeclarationMetadata;
  indicatorTitle: string;
  indicatorShortTitle?: string;
  indicatorOverlay: boolean;
  indicatorPrecision?: number;
  indicatorFormat?: string;
  indicatorScale?: string;
  indicatorTimeframe?: string;
  indicatorTimeframeGaps?: boolean;
  indicatorExplicitPlotZOrder?: boolean;
  indicatorBehindChart?: boolean;
  indicatorCalcBarsCount?: number;
  indicatorMaxBarsBack?: number;
  indicatorDynamicRequests: boolean;
  indicatorDrawingLimits: {
    label: number;
    line: number;
    box: number;
    polyline: number;
  };
  strategy: StrategyLedger;
  errors: ExecutionError[];
  profile: RuntimeProfile;
}

export interface IndicatorDeclarationMetadata {
  title: string;
  shortTitle?: string;
  overlay: boolean;
  precision?: number;
  format?: string;
  scale?: string;
  timeframe?: string;
  timeframeGaps?: boolean;
  explicitPlotZOrder?: boolean;
  behindChart?: boolean;
  calcBarsCount?: number;
  maxBarsBack?: number;
  dynamicRequests: boolean;
  drawingLimits: {
    label: number;
    line: number;
    box: number;
    polyline: number;
  };
}

export interface RuntimeProfile {
  executionMode: 'compiled';
  selectedBackend?: TealscriptExecutionBackend;
  backendSelectionSource?: TealscriptBackendSelectionSource;
  fallbackReason?: string;
  fallbackDiagnostics?: RuntimeFallbackDiagnostic[];
  swallowedErrors?: RuntimeSwallowedErrorSummary[];
  compiledBarErrors?: {
    count: number;
    firstBarIndex: number;
    firstMessage: string;
  };
  elapsedMs: number;
  bars: number;
  statements: number;
  expressions: number;
  builtinCalls: number;
  requestContexts: number;
  maxBarsBack: number;
  errors: number;
}

export interface RuntimeSwallowedErrorSummary {
  site: string;
  count: number;
  firstBarIndex: number;
  firstMessage: string;
}

export interface RuntimeFallbackDiagnostic {
  reason: string;
  construct: string;
  message: string;
  line?: number;
  column?: number;
}

export interface ExecutionError {
  message: string;
  code?: RuntimeErrorCode;
  line?: number;
  column?: number;
  runtimeError?: RuntimeErrorPayload;
}

export type RuntimeErrorCode = 'runtime.error';
export type RuntimeInfrastructureErrorCode =
  | 'mobile-tealscript-webview-required'
  | 'request-data-unavailable';

export interface RuntimeErrorPayload {
  code: RuntimeErrorCode;
  message: string;
  line?: number;
  column?: number;
}

export interface TealscriptExecutionOptions {
  requestDatafeed?: RequestDatafeed;
  strategyIntrabarDatafeed?: StrategyIntrabarDatafeed;
  libraries?: Map<string, Program>;
  runtime?: TealscriptRuntimeOptions;
  realtimeLastBar?: {
    isNew: boolean;
  };
  confirmedRealtimeBarIndex?: number;
  confirmedRealtimeBarStartIndex?: number;
}

export interface TealscriptRuntimeOptions {
  backend?: TealscriptBackendSelectionOptions;
  syminfo?: Partial<SymInfo>;
  chart?: Partial<ChartInfo>;
  timeframe?: Partial<TimeframeInfo>;
  session?: Partial<SessionClassificationInfo>;
  now?: number;
}

export const TEALSCRIPT_MAX_UNIQUE_REQUEST_CONTEXTS = 40;

export function createRuntimeErrorPayload(
  error: unknown,
  line?: number,
  column?: number,
): RuntimeErrorPayload | undefined {
  if (
    !(error instanceof Error) ||
    (error as { runtimeErrorCode?: unknown }).runtimeErrorCode !== 'runtime.error'
  ) {
    return undefined;
  }

  return {
    code: 'runtime.error',
    message: error.message,
    line,
    column,
  };
}
