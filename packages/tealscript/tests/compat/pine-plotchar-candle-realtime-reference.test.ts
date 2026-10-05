import type { Bar } from '../../src/runtime';
import type { FromWorkerMessage, ToWorkerMessage } from '../../src/worker/protocol';

import { describe, expect, it, vi } from 'vitest';

import { getResultOutput } from '../../src/worker/protocol';

describe('same-bar plotchar and plotcandle replacement', () => {
  // Ledger ranks726/744; public worker contract, with no worker implementation change.
  // https://www.tradingview.com/pine-script-docs/language/execution-model/#realtime-bars
  // Fresh worker module loading and six executions can exceed Vitest's default 5s under shared load.
  it.each([
    {
      type: 'plotchar',
      call: 'plotchar(close > open, title="Ticks", char="^")',
      values: [[1], [1, 1], [1, null], [1, 1], [1, null], [1, null, 1]],
    },
    {
      type: 'plotcandle',
      call: 'plotcandle(open, high, low, close > open ? close : na, title="Ticks")',
      values: [[11], [11, 11], [11, null], [11, 12], [11, null], [11, null, 11]],
    },
  ])(
    '$type replaces visible and missing ticks at one timestamp',
    async ({ type, call, values }) => {
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
        const historical: Bar = { time: Date.UTC(2024, 0, 1), open: 10, high: 12, low: 8, close: 11, volume: 100 };
        send({
          type: 'init',
          scriptId: `ticks-${type}`,
          inputs: {},
          bars: [historical],
          script: `//@version=6\nindicator("Ticks", overlay=true)\n${call}\n`,
        });
        const live = { ...historical, time: historical.time + 60_000 };
        for (const close of [11, 9, 12, 8]) send({ type: 'updateBar', bar: { ...live, close } });
        send({ type: 'updateBar', bar: { ...live, time: live.time + 60_000, close: 11 } });
        expect(messages.filter((message) => ['error', 'parseError', 'semanticError'].includes(message.type))).toEqual(
          [],
        );
        const outputs = messages.flatMap((message) => (message.type === 'result' ? [getResultOutput(message)] : []));
        expect(outputs).toHaveLength(6);
        const plots = outputs.map((output) => {
          expect(output.plots).toHaveLength(1);
          return output.plots[0]!;
        });
        expect(plots.every((plot) => plot.type === type && plot.title === 'Ticks')).toBe(true);
        expect(plots.map((plot) => plot.values)).toEqual(values);
        expect(new Set(plots.map((plot) => plot.id)).size).toBe(1);
        if (type === 'plotcandle') {
          for (const [field, value] of [
            ['openValues', 10],
            ['highValues', 12],
            ['lowValues', 8],
          ] as const) {
            expect(plots.map((plot) => plot[field])).toEqual(
              // Native coverage-plot-1-v1 exports each supplied OHLC field
              // independently; missing close masks the glyph, not other fields.
              values.map((row) => row.map(() => value)),
            );
          }
          expect(plots.map((plot) => plot.closeValues)).toEqual(values);
        }
      } finally {
        vi.unstubAllGlobals();
        vi.resetModules();
      }
    },
    30_000,
  );
});
