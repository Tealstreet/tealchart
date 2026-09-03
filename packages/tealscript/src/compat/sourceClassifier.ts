import { parse, TealscriptParseError, type Program } from '../parser';
import { checkProgram, type SemanticCheckOptions } from '../semantic';
import {
  executeScript,
  type Bar,
  type ExecutionError,
  type ExecutionResult,
  type TealscriptExecutionOptions,
} from '../runtime';
import {
  executeCompiled,
  tryCompile,
  type CompiledExecutionOptions,
} from '../runtime/codegen';

import type {
  CompatibilityDiagnostic,
  CompatibilityFailureClass,
  CompatibilityStageOutcome,
} from './index';

export interface PineSourceClassificationOptions {
  bars: Bar[];
  inputs?: Map<string, unknown>;
  engineOptions?: TealscriptExecutionOptions;
  semanticOptions?: SemanticCheckOptions;
  requireCompiled?: boolean;
}

export function classifyPineCompatibilitySource(
  source: string,
  options: PineSourceClassificationOptions,
): CompatibilityStageOutcome[] {
  const stages: CompatibilityStageOutcome[] = [];
  let ast: Program;

  try {
    ast = parse(source);
    stages.push({ stage: 'parse', status: 'passed' });
  } catch (error) {
    return [{
      stage: 'parse',
      status: 'failed',
      failureClass: 'parse_gap',
      message: error instanceof Error ? error.message : String(error),
      diagnostics: createParseCompatibilityDiagnostics(error),
    }];
  }

  const semanticResult = checkProgram(ast, {
    ...options.semanticOptions,
    libraries: options.semanticOptions?.libraries ?? options.engineOptions?.libraries,
  });
  const semanticErrors = semanticResult.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (semanticErrors.length > 0) {
    const diagnostics = semanticErrors.map((diagnostic) => ({
      code: diagnostic.code,
      message: diagnostic.message,
      line: diagnostic.line,
      column: diagnostic.column,
    }));
    return [
      ...stages,
      {
        stage: 'semantic',
        status: 'failed',
        failureClass: classifySemanticDiagnostics(diagnostics),
        diagnostics,
      },
    ];
  }
  stages.push({ stage: 'semantic', status: 'passed' });

  let interpreted: ExecutionResult;
  try {
    interpreted = executeScript(ast, options.bars, options.inputs, options.engineOptions);
  } catch (error) {
    return [
      ...stages,
      createErrorStage(error, 'runtime', 'runtime_gap'),
    ];
  }

  if (interpreted.errors.length > 0) {
    const errorStage = classifyExecutionErrors(interpreted.errors);
    if (errorStage.stage === 'datafeed') {
      return [
        ...stages,
        { stage: 'runtime', status: 'passed' },
        errorStage,
      ];
    }
    return [
      ...stages,
      errorStage,
    ];
  }
  stages.push({ stage: 'runtime', status: 'passed' });
  stages.push({ stage: 'datafeed', status: 'passed' });

  if (options.requireCompiled !== false) {
    const compiled = tryCompile(ast, undefined, { libraries: options.engineOptions?.libraries });
    if (!compiled.success) {
      return [
        ...stages,
        {
          stage: 'output',
          status: 'failed',
          failureClass: 'compiled_fallback',
          message: `Compiled execution fallback: ${compiled.unsupported.join(', ') || 'unsupported script shape'}`,
        },
      ];
    }

    let compiledResult: ExecutionResult | null;
    try {
      compiledResult = executeCompiled(
        compiled,
        options.bars,
        options.inputs,
        options.engineOptions as CompiledExecutionOptions,
      );
    } catch (error) {
      return [
        ...stages,
        createErrorStage(error, 'output', 'compiled_fallback'),
      ];
    }
    if (!compiledResult) {
      return [
        ...stages,
        {
          stage: 'output',
          status: 'failed',
          failureClass: 'compiled_fallback',
          message: 'Compiled execution returned null and is unsupported',
        },
      ];
    }
    if (compiledResult.errors.length > 0) {
      return [
        ...stages,
        {
          stage: 'output',
          status: 'failed',
          failureClass: 'compiled_fallback',
          diagnostics: compiledResult.errors.map(createRuntimeDiagnostic),
        },
      ];
    }

    const outputDiff = compareNormalizedOutputs(interpreted, compiledResult);
    if (outputDiff.outputMessage) {
      return [
        ...stages,
        {
          stage: 'output',
          status: 'failed',
          failureClass: 'output_gap',
          message: outputDiff.outputMessage,
        },
      ];
    }
    stages.push({ stage: 'output', status: 'passed' });

    if (outputDiff.renderMessage) {
      return [
        ...stages,
        {
          stage: 'render',
          status: 'failed',
          failureClass: 'render_gap',
          message: outputDiff.renderMessage,
        },
      ];
    }
    stages.push({ stage: 'render', status: 'passed' });
    return stages;
  }

  stages.push({ stage: 'output', status: 'passed' });
  stages.push({ stage: 'render', status: 'skipped', message: 'Compiled output normalization was not requested' });
  return stages;
}

function classifySemanticDiagnostics(diagnostics: CompatibilityDiagnostic[]): CompatibilityFailureClass {
  return diagnostics.some((diagnostic) => diagnostic.code === 'unsupported-feature')
    ? 'unsupported_planned'
    : 'semantic_gap';
}

function classifyExecutionErrors(errors: ExecutionError[]): CompatibilityStageOutcome {
  const diagnostics = errors.map(createRuntimeDiagnostic);
  const requestError = errors.some((error) => (
    error.message.includes('request datafeed')
      || error.message.startsWith('request.')
      || error.message.includes('No request ')
  ));

  return {
    stage: requestError ? 'datafeed' : 'runtime',
    status: 'failed',
    failureClass: requestError ? 'data_gap' : 'runtime_gap',
    diagnostics,
  };
}

function createErrorStage(
  error: unknown,
  stage: 'runtime' | 'output',
  failureClass: CompatibilityFailureClass,
): CompatibilityStageOutcome {
  return {
    stage,
    status: 'failed',
    failureClass,
    message: error instanceof Error ? error.message : String(error),
  };
}

function createRuntimeDiagnostic(error: ExecutionError): CompatibilityDiagnostic {
  return {
    code: error.code ?? 'runtime.error',
    message: error.message,
    line: error.line,
    column: error.column,
  };
}

function compareNormalizedOutputs(
  expected: ExecutionResult,
  compiled: ExecutionResult,
): { outputMessage?: string; renderMessage?: string } {
  const expectedOutput = normalizeOutput(expected);
  const compiledOutput = normalizeOutput(compiled);
  const expectedOutputJson = JSON.stringify(expectedOutput);
  const compiledOutputJson = JSON.stringify(compiledOutput);
  if (expectedOutputJson !== compiledOutputJson) {
    return {
      outputMessage: `Compiled output normalization differs from expected output: ${summarizeOutputDiff(expectedOutputJson, compiledOutputJson)}`,
    };
  }

  const expectedRender = normalizeRender(expected);
  const compiledRender = normalizeRender(compiled);
  const expectedRenderJson = JSON.stringify(expectedRender);
  const compiledRenderJson = JSON.stringify(compiledRender);
  if (expectedRenderJson !== compiledRenderJson) {
    return {
      renderMessage: `Compiled drawing normalization differs from expected drawing output: ${summarizeOutputDiff(expectedRenderJson, compiledRenderJson)}`,
    };
  }

  return {};
}

function summarizeOutputDiff(expected: string, compiled: string): string {
  const limit = 500;
  let firstDiff = -1;
  const max = Math.max(expected.length, compiled.length);
  for (let i = 0; i < max; i += 1) {
    if (expected[i] !== compiled[i]) {
      firstDiff = i;
      break;
    }
  }
  if (firstDiff < 0) return `expected=${expected.slice(0, limit)} compiled=${compiled.slice(0, limit)}`;

  const start = Math.max(0, firstDiff - Math.floor(limit / 2));
  const end = firstDiff + Math.floor(limit / 2);
  return `firstDiff=${firstDiff} expected=${expected.slice(start, end)} compiled=${compiled.slice(start, end)}`;
}

function normalizeOutput(result: ExecutionResult): unknown {
  return stableValue({
    plots: result.plots.map((plot) => ({
      title: plot.title,
      type: plot.type,
      values: plot.values.map(normalizeNumber),
      openValues: plot.openValues?.map(normalizeNumber),
      highValues: plot.highValues?.map(normalizeNumber),
      lowValues: plot.lowValues?.map(normalizeNumber),
      closeValues: plot.closeValues?.map(normalizeNumber),
      textValues: plot.textValues,
    })),
    alerts: result.alerts.map((alert) => ({
      title: alert.title,
      message: alert.message,
      values: alert.values,
      renderedMessages: alert.renderedMessages,
      events: alert.events.map((event) => ({
        barIndex: event.barIndex,
        message: event.message,
        frequency: event.frequency,
      })),
    })),
    logs: result.logs.map((log) => ({
      level: log.level,
      barIndex: log.barIndex,
      message: log.message,
    })),
    errors: result.errors.map(createRuntimeDiagnostic),
  });
}

function normalizeRender(result: ExecutionResult): unknown {
  const idMap = new Map<string, string>();
  let nextId = 0;

  const canonicalizeDrawingId = (id: unknown): unknown => {
    if (typeof id !== 'string') return id;
    const existing = idMap.get(id);
    if (existing) return existing;
    const canonical = `drawing#${nextId}`;
    nextId += 1;
    idMap.set(id, canonical);
    return canonical;
  };

  return stableValue(result.drawings.map((drawing) => ({
    ...drawing,
    id: canonicalizeDrawingId(drawing.id),
    ...(drawing.type === 'linefill'
      ? {
          line1: canonicalizeDrawingId(drawing.line1),
          line2: canonicalizeDrawingId(drawing.line2),
        }
      : {}),
  })));
}

function stableValue(value: unknown): unknown {
  if (typeof value === 'number') return normalizeNumber(value);
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entryValue]) => [key, stableValue(entryValue)]),
  );
}

function normalizeNumber(value: number | null): number | null | string {
  if (value === null) return null;
  if (Number.isNaN(value)) return 'NaN';
  if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity';
  return Math.round(value * 1e8) / 1e8;
}

function createParseCompatibilityDiagnostics(error: unknown): CompatibilityDiagnostic[] {
  if (error instanceof TealscriptParseError) {
    return [{
      code: 'parse.error',
      message: error.message,
      line: error.location.start.line,
      column: error.location.start.column,
    }];
  }
  if (error instanceof Error) {
    return [{ code: 'parse.error', message: error.message }];
  }
  return [{ code: 'parse.error', message: String(error) }];
}
