import type { Bar } from '../../src/runtime';
import type { FromWorkerMessage, ToWorkerMessage } from '../../src/worker/protocol';

import { describe, expect, it, vi } from 'vitest';

import { getResultOutput } from '../../src/worker/protocol';

describe('realtime plotshape replaces prior same-bar marker output', () => {
  // Ledger realtime-barstate-v1#34 (global rank257).
  // https://www.tradingview.com/pine-script-docs/language/execution-model/#realtime-bars
  // Public worker sequence: true -> false -> true -> false on one timestamp.
  // Fresh worker module loading and six executions can exceed the default 5s under shared load.
  it('removes and restores a marker without appending ticks or losing prior bars', async () => {
    vi.resetModules();
    const messages: FromWorkerMessage[] = [];
    const worker = {
      postMessage: (message: FromWorkerMessage) => messages.push(message),
      onmessage: undefined as ((event: MessageEvent<ToWorkerMessage>) => void) | undefined,
    };
    vi.stubGlobal('self', worker);
    try {
      await import('../../src/worker/worker');
      const send = (message: ToWorkerMessage) => {
        expect(worker.onmessage).toBeTypeOf('function');
        worker.onmessage!({ data: message } as MessageEvent<ToWorkerMessage>);
      };
      const historical: Bar = { time: 60_000, open: 10, high: 12, low: 8, close: 11, volume: 100 };
      send({
        type: 'init',
        scriptId: 'marker-ticks',
        inputs: {},
        bars: [historical],
        script: `//@version=6
indicator("Marker ticks", overlay=true)
plotshape(close > open, title="Marker", style=shape.triangleup, location=location.abovebar, color=color.green)
`,
      });
      const live = { ...historical, time: 120_000 };
      for (const close of [11, 9, 12, 8]) send({ type: 'updateBar', bar: { ...live, close } });
      send({ type: 'updateBar', bar: { ...live, time: 180_000, close: 11 } });

      expect(messages.filter((message) => ['error', 'parseError', 'semanticError'].includes(message.type))).toEqual([]);
      const outputs = messages.flatMap((message) => (message.type === 'result' ? [getResultOutput(message)] : []));
      expect(outputs).toHaveLength(6);
      const markers = outputs.map((output) => {
        expect(output.plots).toHaveLength(1);
        return output.plots[0]!;
      });
      expect(markers.every((plot) => plot.type === 'plotshape' && plot.title === 'Marker')).toBe(true);
      expect(markers.map((plot) => plot.values)).toEqual([[1], [1, 1], [1, null], [1, 1], [1, null], [1, null, 1]]);
      expect(new Set(markers.map((plot) => plot.id)).size).toBe(1);
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  }, 30_000);
});
