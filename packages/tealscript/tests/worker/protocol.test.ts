import { describe, expect, it } from 'vitest';

import {
  createResultMessage,
  createSemanticErrorMessage,
  getResultOutput,
  type ResultMessage,
  type WorkerOutputBundle,
} from '../../src/worker/protocol';
import { parse } from '../../src/parser';
import type { SemanticDiagnostic } from '../../src/semantic';
import { semanticOptionsFromLibraries } from '../../src/worker/semanticOptions';

describe('worker protocol output bundles', () => {
  const output: WorkerOutputBundle = {
    plots: [
      {
        id: 'plot_close',
        type: 'plot',
        title: 'Close',
        values: [100, 101],
        color: '#ffffff',
      },
    ],
    drawings: [],
    alerts: [],
    logs: [],
    inputs: [],
    profile: {
      executionMode: 'compiled',
      elapsedMs: 12,
      bars: 2,
      statements: 8,
      expressions: 13,
      builtinCalls: 3,
      requestContexts: 1,
      maxBarsBack: 5,
      errors: 0,
    },
    metadata: {
      generation: 3,
      requestId: 7,
    },
  };

  it('creates result messages with one atomic output bundle', () => {
    const message = createResultMessage('study-1', output);

    expect(message).toMatchObject({
      type: 'result',
      scriptId: 'study-1',
      output,
    });
  });

  it('normalizes bundled output logs', () => {
    const message: ResultMessage = createResultMessage('study-1', { ...output, logs: undefined });

    expect(getResultOutput(message)).toEqual({
      ...output,
      logs: [],
    });
  });
});

describe('worker protocol semantic diagnostics', () => {
  it('creates semantic error messages with structured diagnostics and freshness metadata', () => {
    const diagnostics: SemanticDiagnostic[] = [
      {
        code: 'unknown-argument',
        message: "Unknown argument 'caption' for plot()",
        severity: 'error',
        line: 4,
        column: 12,
      },
      {
        code: 'argument-count',
        message: 'Expected at most 2 arguments for hline() but got 3',
        severity: 'error',
        line: 5,
        column: 1,
      },
    ];

    const message = createSemanticErrorMessage(
      'study-1',
      diagnostics,
      diagnostics.map((diagnostic) => diagnostic.message).join('\n'),
      {
        generation: 4,
        requestId: 9,
      }
    );

    expect(message).toEqual({
      type: 'semanticError',
      scriptId: 'study-1',
      message: "Unknown argument 'caption' for plot()\nExpected at most 2 arguments for hline() but got 3",
      diagnostics,
      line: 4,
      column: 12,
      metadata: {
        generation: 4,
        requestId: 9,
      },
    });
  });

  it('preserves planned unsupported semantic diagnostic codes', () => {
    const diagnostics: SemanticDiagnostic[] = [
      {
        code: 'unsupported-feature',
        message: 'planned feature is not supported yet',
        severity: 'error',
        line: 2,
        column: 1,
      },
    ];

    expect(createSemanticErrorMessage('study-unsupported', diagnostics, diagnostics[0]!.message)).toEqual({
      type: 'semanticError',
      scriptId: 'study-unsupported',
      message: 'planned feature is not supported yet',
      diagnostics,
      line: 2,
      column: 1,
      metadata: undefined,
    });
  });
});

describe('worker semantic options', () => {
  it('forwards deterministic runtime libraries to semantic checks', () => {
    const library = parse(`
library("Constants")
export const int fast = 2
`);
    const libraries = new Map([['TestUser/Constants/1', library]]);

    expect(semanticOptionsFromLibraries(libraries)).toEqual({ libraries });
    expect(semanticOptionsFromLibraries()).toEqual({});
  });
});
