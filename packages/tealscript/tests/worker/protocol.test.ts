import { describe, expect, it } from 'vitest';

import {
  createResultMessage,
  getResultOutput,
  type ResultMessage,
  type WorkerOutputBundle,
} from '../../src/worker/protocol';

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
    inputs: [],
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
      inputs: output.inputs,
    });
  });

  it('prefers bundled output when normalizing a result message', () => {
    const message = {
      ...createResultMessage('study-1', output),
      plots: [],
    };

    expect(getResultOutput(message)).toBe(output);
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
      inputs: output.inputs,
    });
  });
});
