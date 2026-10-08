import type { Bar } from '../../src/runtime';
import type { FromWorkerMessage, ResultMessage, ToWorkerMessage } from '../../src/worker/protocol';

import { expect, it, vi } from 'vitest';

import { getResultOutput } from '../../src/worker/protocol';

import { createWorkerTestModule } from '../helpers/workerTestModule';

const workerModule = createWorkerTestModule();

const bar = (index: number, close: number): Bar => ({
  time: (index + 1) * 60_000,
  open: 1,
  high: Math.max(close, 1),
  low: 1,
  close,
  volume: 10,
});

async function withWorker(
  script: string,
  check: (send: (message: ToWorkerMessage) => void, latest: () => ReturnType<typeof getResultOutput>) => void,
) {
  const messages: FromWorkerMessage[] = [];
  const worker = {
    onmessage: undefined as ((event: MessageEvent<ToWorkerMessage>) => void) | undefined,
    postMessage: (message: FromWorkerMessage) => messages.push(structuredClone(message)),
  };
  try {
    await workerModule.attach(worker);
    const send = (message: ToWorkerMessage) => worker.onmessage!({ data: message } as MessageEvent<ToWorkerMessage>);
    const latest = () => {
      expect(messages.at(-1)?.type).toBe('result');
      return getResultOutput(messages.at(-1) as ResultMessage);
    };
    send({ type: 'init', scriptId: 'log-reference', script, bars: [bar(0, 2), bar(1, 4)], inputs: {} });
    check(send, latest);
  } finally {
    vi.unstubAllGlobals();
  }
}

// Execution model: Pine log messages escape rollback and remain until reload.
// Worklist1737: https://www.tradingview.com/pine-script-docs/language/execution-model/
it.each([5, 6])('v%s retains log events while ordinary var state rolls back between ticks', async (version) => {
  await withWorker(
    `//@version=${version}\nindicator("Log versus var rollback")\nvar int count = 0\ncount += 1\nlog.info(str.tostring(count))\nplot(count)`,
    (send, latest) => {
      send({ type: 'updateBar', bar: bar(2, 8) });
      send({ type: 'updateBar', bar: bar(2, 12) });
      expect(latest().plots[0].values).toEqual([1, 2, 3]);
      expect(latest().logs.map((log) => [log.message, log.barIndex])).toEqual([
        ['1', 0],
        ['2', 1],
        ['3', 2],
        ['3', 2],
      ]);
    },
  );
});

it.each([5, 6].flatMap((version) => ['info', 'warning', 'error'].map((level) => ({ version, level }))))(
  'v$version log.$level retains tick messages, including equal messages',
  async ({ version, level }) => {
    await withWorker(
      `//@version=${version}\nindicator("Log reference")\nlog.${level}(str.tostring(close))\nplot(close)`,
      (send, latest) => {
        for (const [index, close] of [
          [2, 8],
          [2, 12],
          [2, 12],
          [3, 20],
        ])
          send({ type: 'updateBar', bar: bar(index, close) });
        expect(latest().logs).toEqual(
          [2, 4, 8, 12, 12, 20].map((close, index) => ({
            level,
            message: String(close),
            barIndex: [0, 1, 2, 2, 2, 3][index],
            time: [60_000, 120_000, 180_000, 180_000, 180_000, 240_000][index],
          })),
        );
        expect(latest().plots[0].values).toEqual([2, 4, 12, 20]);
      },
    );
  },
);

it.each([5, 6])('v%s conditional logs survive a later non-logging tick', async (version) => {
  await withWorker(
    `//@version=${version}\nindicator("Conditional log")\nif barstate.isrealtime and close > 6\n    log.info(str.tostring(close))\nplot(close)`,
    (send, latest) => {
      send({ type: 'updateBar', bar: bar(2, 8) });
      send({ type: 'updateBar', bar: bar(2, 3) });
      send({ type: 'updateBar', bar: bar(3, 20) });
      expect(latest().logs.map((log) => log.message)).toEqual(['8', '20']);
    },
  );
});

it('loaded-last-bar replacement preserves historical logs and UDF call multiplicity', async () => {
  await withWorker(
    '//@version=6\nindicator("UDF log")\nrecord(x) => log.info(str.tostring(x))\nrecord(close)\nrecord(close)\nplot(close)',
    (send, latest) => {
      send({ type: 'updateBar', bar: bar(1, 8) });
      send({ type: 'updateBar', bar: bar(1, 12) });
      send({ type: 'updateBar', bar: bar(2, 20) });
      expect(latest().logs.map((log) => log.message)).toEqual(['2', '2', '4', '4', '8', '8', '12', '12', '20', '20']);
    },
  );
});

it('default strategy logs only newly executed confirmed bars', async () => {
  await withWorker(
    '//@version=6\nstrategy("Close log")\nlog.info(str.tostring(close))\nplot(close)',
    (send, latest) => {
      send({ type: 'updateBar', bar: bar(2, 8) });
      expect(latest().logs.map((log) => log.message)).toEqual(['2', '4']);
      send({ type: 'updateBar', bar: bar(2, 12) });
      expect(latest().logs.map((log) => log.message)).toEqual(['2', '4']);
      send({ type: 'updateBar', bar: bar(3, 20) });
      expect(latest().logs.map((log) => log.message)).toEqual(['2', '4', '12']);
      send({ type: 'updateBar', bar: bar(3, 24) });
      expect(latest().logs.map((log) => log.message)).toEqual(['2', '4', '12']);
      send({ type: 'updateBar', bar: bar(4, 30) });
      expect(latest().logs.map((log) => log.message)).toEqual(['2', '4', '12', '24']);
    },
  );
});

it.each(['init', 'updateBars', 'setInputs'] as const)(
  '%s reload discards previous realtime log events',
  async (reload) => {
    const script = '//@version=6\nindicator("Log reload")\nlog.info(str.tostring(close))\nplot(close)';
    await withWorker(script, (send, latest) => {
      send({ type: 'updateBar', bar: bar(2, 8) });
      send({ type: 'updateBar', bar: bar(2, 12) });
      expect(latest().logs.map((log) => log.message)).toEqual(['2', '4', '8', '12']);
      if (reload === 'init')
        send({ type: 'init', scriptId: 'reloaded', script, bars: [bar(0, 2), bar(1, 4)], inputs: {} });
      if (reload === 'updateBars') send({ type: 'updateBars', bars: [bar(0, 2), bar(1, 4)] });
      if (reload === 'setInputs') send({ type: 'setInputs', inputs: {} });
      expect(latest().logs.map((log) => log.message)).toEqual(reload === 'setInputs' ? ['2', '4', '12'] : ['2', '4']);
      send({ type: 'updateBar', bar: bar(reload === 'setInputs' ? 3 : 2, 20) });
      expect(latest().logs.map((log) => log.message)).toEqual(
        reload === 'setInputs' ? ['2', '4', '12', '20'] : ['2', '4', '20'],
      );
    });
  },
);
