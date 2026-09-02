import { describe, expect, it, vi } from 'vitest';

import { parse } from '../../src/parser';
import { TealscriptEngine, type Bar, type PlotOutput } from '../../src/runtime';
import type { FromWorkerMessage, ResultMessage, ToWorkerMessage } from '../../src/worker/protocol';
import { getResultOutput } from '../../src/worker/protocol';

const barstateSource = `//@version=6
indicator("Barstate behavior")
plot(barstate.isfirst ? 1 : 0, title="First")
plot(barstate.islast ? 1 : 0, title="Last")
plot(barstate.ishistory ? 1 : 0, title="History")
plot(barstate.isrealtime ? 1 : 0, title="Realtime")
plot(barstate.isnew ? 1 : 0, title="New")
plot(barstate.isconfirmed ? 1 : 0, title="Confirmed")
plot(barstate.islastconfirmedhistory ? 1 : 0, title="Last Confirmed History")`;

const historicalBars: Bar[] = Array.from({ length: 4 }, (_, index) => ({
  time: Date.UTC(2024, 0, 2, 9, 30 + index),
  open: 100 + index,
  high: 101 + index,
  low: 99 + index,
  close: 100.5 + index,
  volume: 1_000 + index,
}));

const sameBarTick: Bar = {
  ...historicalBars[historicalBars.length - 1]!,
  high: 105,
  close: 104,
  volume: 2_000,
};

const nextRealtimeBar: Bar = {
  time: historicalBars[historicalBars.length - 1]!.time + 60_000,
  open: 104,
  high: 106,
  low: 103,
  close: 105,
  volume: 2_500,
};

const expectedLoad = {
  First: [1, 0, 0, 0],
  Last: [0, 0, 0, 1],
  History: [1, 1, 1, 1],
  Realtime: [0, 0, 0, 0],
  New: [1, 1, 1, 1],
  Confirmed: [1, 1, 1, 1],
  'Last Confirmed History': [0, 0, 0, 1],
};

const expectedSameBarTick = {
  First: [1, 0, 0, 0],
  Last: [0, 0, 0, 1],
  History: [1, 1, 1, 0],
  Realtime: [0, 0, 0, 1],
  New: [1, 1, 1, 0],
  Confirmed: [1, 1, 1, 0],
  'Last Confirmed History': [0, 0, 0, 0],
};

const expectedNextRealtimeBar = {
  First: [1, 0, 0, 0, 0],
  Last: [0, 0, 0, 1, 1],
  History: [1, 1, 1, 0, 0],
  Realtime: [0, 0, 0, 1, 1],
  New: [1, 1, 1, 0, 1],
  Confirmed: [1, 1, 1, 1, 0],
  'Last Confirmed History': [0, 0, 0, 0, 0],
};

function expectBarstatePlots(plots: PlotOutput[], expected: Record<string, number[]>): void {
  for (const [title, values] of Object.entries(expected)) {
    const plot = plots.find((entry) => entry.title === title);
    expect(plot?.values).toEqual(values);
  }
}

function cloneBars(bars: Bar[]): Bar[] {
  return bars.map((bar) => ({ ...bar }));
}

function isResultMessage(message: FromWorkerMessage): message is ResultMessage {
  return message.type === 'result';
}

async function createWorkerDriver(): Promise<{
  init(): ResultMessage;
  updateBar(bar: Bar): ResultMessage;
}> {
  const posted: FromWorkerMessage[] = [];
  const workerGlobal = {
    onmessage: null as ((event: MessageEvent<ToWorkerMessage>) => void) | null,
    postMessage: (message: FromWorkerMessage) => {
      posted.push(message);
    },
  };

  vi.resetModules();
  vi.stubGlobal('self', workerGlobal);
  await import('../../src/worker/worker');

  let requestId = 0;
  const postAndReadResult = (message: ToWorkerMessage): ResultMessage => {
    const start = posted.length;
    workerGlobal.onmessage?.({ data: message } as MessageEvent<ToWorkerMessage>);
    const result = posted.slice(start).find(isResultMessage);
    if (!result) {
      throw new Error(`Worker did not post a result for ${message.type}`);
    }
    return result;
  };

  return {
    init() {
      requestId += 1;
      return postAndReadResult({
        type: 'init',
        scriptId: 'barstate-behavior',
        script: barstateSource,
        bars: historicalBars.map((bar) => ({ ...bar })),
        inputs: {},
        metadata: { generation: 1, requestId, requestKind: 'full' },
      });
    },
    updateBar(bar: Bar) {
      requestId += 1;
      return postAndReadResult({
        type: 'updateBar',
        bar: { ...bar },
        metadata: { generation: 1, requestId, requestKind: 'incremental' },
      });
    },
  };
}

describe('Pine v6 barstate behavior', () => {
  it('matches literal historical and realtime flag sequences on the interpreter path', () => {
    const ast = parse(barstateSource);
    const engine = new TealscriptEngine();

    const load = engine.execute(ast, cloneBars(historicalBars));
    expect(load.errors).toEqual([]);
    expectBarstatePlots(load.plots, expectedLoad);

    const sameBar = engine.updateBar(ast, sameBarTick);
    expectBarstatePlots(sameBar, expectedSameBarTick);

    const nextBar = engine.updateBar(ast, nextRealtimeBar);
    expectBarstatePlots(nextBar, expectedNextRealtimeBar);
  });

  it('matches literal historical and realtime flag sequences on the production compiled worker path', async () => {
    const worker = await createWorkerDriver();

    const load = worker.init();
    expect(load.profile?.executionMode).toBe('compiled');
    expectBarstatePlots(getResultOutput(load).plots, expectedLoad);

    const sameBar = worker.updateBar(sameBarTick);
    expect(sameBar.profile?.executionMode).toBe('compiled');
    expectBarstatePlots(getResultOutput(sameBar).plots, expectedSameBarTick);

    const nextBar = worker.updateBar(nextRealtimeBar);
    expect(nextBar.profile?.executionMode).toBe('compiled');
    expectBarstatePlots(getResultOutput(nextBar).plots, expectedNextRealtimeBar);
  });
});
