import { describe, expect, it } from 'vitest';

import {
  createResultMessage,
  createSemanticErrorMessage,
  getResultOutput,
  type ResultMessage,
  type WorkerOutputBundle,
} from '../../src/worker/protocol';
import type { SemanticDiagnostic } from '../../src/semantic';

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

  it('creates result messages with bundled and legacy output fields', () => {
    const message = createResultMessage('study-1', output);

    expect(message).toMatchObject({
      type: 'result',
      scriptId: 'study-1',
      output,
      plots: output.plots,
      drawings: output.drawings,
      alerts: output.alerts,
      logs: output.logs,
      inputs: output.inputs,
      profile: output.profile,
    });
  });

  it('prefers bundled output when normalizing a result message', () => {
    const message = {
      ...createResultMessage('study-1', output),
      plots: [],
    };

    expect(getResultOutput(message)).toEqual(output);
  });

  it('normalizes legacy result messages without a bundled output', () => {
    const message: ResultMessage = {
      type: 'result',
      scriptId: 'study-1',
      plots: output.plots,
      drawings: output.drawings,
      alerts: output.alerts,
      inputs: output.inputs,
    };

    expect(getResultOutput(message)).toEqual({
      plots: output.plots,
      drawings: output.drawings,
      alerts: output.alerts,
      logs: [],
      inputs: output.inputs,
      profile: undefined,
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
        message: 'request.footprint is not supported yet: footprint data requires a host-provided footprint/intrabar volume model',
        severity: 'error',
        line: 2,
        column: 1,
      },
    ];

    expect(createSemanticErrorMessage('study-unsupported', diagnostics, diagnostics[0]!.message)).toEqual({
      type: 'semanticError',
      scriptId: 'study-unsupported',
      message: 'request.footprint is not supported yet: footprint data requires a host-provided footprint/intrabar volume model',
      diagnostics,
      line: 2,
      column: 1,
      metadata: undefined,
    });
  });
});
