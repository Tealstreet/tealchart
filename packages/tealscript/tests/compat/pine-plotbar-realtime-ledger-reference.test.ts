import type { Bar } from '../../src/runtime';
import type { FromWorkerMessage, ToWorkerMessage } from '../../src/worker/protocol';

import { describe, expect, it, vi } from 'vitest';

import { getResultOutput } from '../../src/worker/protocol';

describe('realtime plotbar replacement, ledger rank 1471', () => {
  it('replaces OHLC, colors and gaps on each same-bar tick and preserves earlier bars', async () => {
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
        scriptId: 'plotbar-ticks',
        inputs: {},
        bars: [historical],
        script: `//@version=6
indicator("Plotbar ticks", overlay=true)
barClose = close == 31 ? na : close
plotbar(open, high, low, barClose, title="Bars", color=close >= open ? color.green : color.red)
`,
      });
      const live = { ...historical, time: 120_000, open: 20 };
      for (const [high, low, close] of [
        [25, 19, 22],
        [28, 17, 18],
        [32, 16, 31],
        [33, 15, 27],
      ]) {
        send({ type: 'updateBar', bar: { ...live, high, low, close } });
      }
      send({ type: 'updateBar', bar: { ...live, time: 180_000, open: 40, high: 45, low: 38, close: 42 } });
      expect(messages.filter((message) => ['error', 'parseError', 'semanticError'].includes(message.type))).toEqual([]);
      const outputs = messages.flatMap((message) => (message.type === 'result' ? [getResultOutput(message)] : []));
      expect(outputs).toHaveLength(6);
      const plots = outputs.map((output) => {
        expect(output.plots).toHaveLength(1);
        expect(output.plots[0]).toMatchObject({ type: 'plotbar', title: 'Bars' });
        return output.plots[0]!;
      });
      expect(plots.map((plot) => plot.values)).toEqual([[11], [11, 22], [11, 18], [11, null], [11, 27], [11, 27, 42]]);
      expect(plots.map((plot) => plot.openValues)).toEqual([
        [10],
        [10, 20],
        [10, 20],
        [10, 20],
        [10, 20],
        [10, 20, 40],
      ]);
      expect(plots.map((plot) => plot.highValues)).toEqual([
        [12],
        [12, 25],
        [12, 28],
        [12, 32],
        [12, 33],
        [12, 33, 45],
      ]);
      expect(plots.map((plot) => plot.lowValues)).toEqual([[8], [8, 19], [8, 17], [8, 16], [8, 15], [8, 15, 38]]);
      expect(plots.map((plot) => plot.closeValues)).toEqual([
        [11],
        [11, 22],
        [11, 18],
        [11, null],
        [11, 27],
        [11, 27, 42],
      ]);
      const green = (plots[0]!.color as string[])[0]!;
      const red = (plots[2]!.color as string[])[1]!;
      expect(red).not.toBe(green);
      expect(plots.map((plot) => plot.color)).toEqual([
        [green],
        [green, green],
        [green, red],
        [green, null],
        [green, green],
        [green, green, green],
      ]);
      expect(new Set(plots.map((plot) => plot.id)).size).toBe(1);
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  }, 30_000);
});
