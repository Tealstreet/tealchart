import type { Bar } from '../../src/runtime/context';
import type { FromWorkerMessage, ResultMessage, ToWorkerMessage } from '../../src/worker/protocol';

import { afterEach, describe, expect, it, vi } from 'vitest';

function bars(closes: number[], startTime = 60_000): Bar[] {
  return closes.map((close, index) => ({
    time: startTime + index * 60_000,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 100,
  }));
}

async function worker() {
  const posted: FromWorkerMessage[] = [];
  const global = {
    onmessage: null as ((event: MessageEvent<ToWorkerMessage>) => void) | null,
    postMessage: (message: FromWorkerMessage) => posted.push(message),
  };
  vi.stubGlobal('self', global);
  await import('../../src/worker/worker');
  return (data: ToWorkerMessage): ResultMessage['output'] => {
    posted.length = 0;
    global.onmessage?.({ data } as MessageEvent<ToWorkerMessage>);
    expect(posted.filter((message) => ['error', 'parseError', 'semanticError'].includes(message.type))).toEqual([]);
    const results = posted.filter((message): message is ResultMessage => message.type === 'result');
    expect(results).toHaveLength(1);
    return results[0]!.output;
  };
}

const source = `//@version=6
indicator("Worker lifecycle")
var int visits = 0
visits += 1
plot(visits)
plot(close)
plot(barstate.isrealtime ? 1 : 0)
plot(barstate.ishistory ? 1 : 0)`;

describe('ledger gaps 45: worker execution lifecycle', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('1765 executes the supplied initial dataset chronologically', async () => {
    const send = await worker();
    const output = send({ type: 'init', scriptId: 'initial', script: source, bars: bars([11, 4, 9]), inputs: {} });
    expect(output.plots.map((plot) => plot.values)).toEqual([
      [1, 2, 3],
      [11, 4, 9],
      [0, 0, 0],
      [1, 1, 1],
    ]);
  });

  it('1763 replaces repeated current-bar observations instead of appending them', async () => {
    const send = await worker();
    send({ type: 'init', scriptId: 'ticks', script: source, bars: bars([11, 4, 9]), inputs: {} });
    for (const close of [13, 7, 19]) {
      const current = bars([close], 180_000)[0]!;
      const output = send({ type: 'updateBar', bar: current });
      expect(output.plots.map((plot) => plot.values)).toEqual([
        [1, 2, 3],
        [11, 4, close],
        [0, 0, 1],
        [1, 1, 0],
      ]);
    }
  });

  it('1764 treats elapsed realtime bars as historical when inputs trigger reload', async () => {
    const send = await worker();
    send({ type: 'init', scriptId: 'reload', script: source, bars: bars([11, 4]), inputs: {} });
    send({ type: 'updateBar', bar: bars([9], 180_000)[0]! });
    send({ type: 'updateBar', bar: bars([2], 240_000)[0]! });
    const output = send({ type: 'setInputs', inputs: {} });
    expect(output.plots.map((plot) => plot.values)).toEqual([
      [1, 2, 3, 4],
      [11, 4, 9, 2],
      [0, 0, 0, 0],
      [1, 1, 1, 1],
    ]);
  });

  it('1766 replaces source and resets state through reinitialization', async () => {
    const send = await worker();
    send({ type: 'init', scriptId: 'source', script: source, bars: bars([11, 4, 9]), inputs: {} });
    const replacement = source.replace('visits += 1', 'visits += 10');
    const output = send({ type: 'init', scriptId: 'source', script: replacement, bars: bars([3, 8]), inputs: {} });
    expect(output.plots.map((plot) => plot.values)).toEqual([
      [10, 20],
      [3, 8],
      [0, 0],
      [1, 1],
    ]);
  });

  it('1767 fresh initialization resets accumulated live state', async () => {
    const send = await worker();
    send({ type: 'init', scriptId: 'refresh', script: source, bars: bars([11, 4]), inputs: {} });
    send({ type: 'updateBar', bar: bars([9], 180_000)[0]! });
    const output = send({ type: 'init', scriptId: 'refresh', script: source, bars: bars([11, 4, 9]), inputs: {} });
    expect(output.plots.map((plot) => plot.values)).toEqual([
      [1, 2, 3],
      [11, 4, 9],
      [0, 0, 0],
      [1, 1, 1],
    ]);
  });

  it('1770 replaces the dataset and excludes previous symbol bars', async () => {
    const send = await worker();
    send({ type: 'init', scriptId: 'dataset', script: source, bars: bars([11, 4, 9]), inputs: {} });
    send({ type: 'updateBar', bar: bars([2], 240_000)[0]! });
    const output = send({ type: 'updateBars', bars: bars([31, 47], 600_000) });
    expect(output.plots.map((plot) => plot.values)).toEqual([
      [1, 2],
      [31, 47],
      [0, 0],
      [1, 1],
    ]);
  });

  it('1776 retains declaration metadata across input reloads and replaces it with the source', async () => {
    const send = await worker();
    const declaration = (title: string, overlay: boolean, precision: number) =>
      `//@version=6\nindicator("${title}", overlay=${overlay}, precision=${precision})\nfactor = input.int(2, "Factor")\nplot(close * factor)`;
    const initial = send({
      type: 'init',
      scriptId: 'metadata',
      script: declaration('First', true, 2),
      bars: bars([11, 4]),
      inputs: {},
    });
    expect(initial.declaration).toMatchObject({ title: 'First', overlay: true, precision: 2 });
    expect(initial.plots[0]?.values).toEqual([22, 8]);
    const factor = initial.inputs.find((input) => input.title === 'Factor');
    expect(factor).toBeDefined();
    const reloaded = send({ type: 'setInputs', inputs: { [factor!.id]: 7 } });
    expect(reloaded.declaration).toMatchObject({ title: 'First', overlay: true, precision: 2 });
    expect(reloaded.plots[0]?.values).toEqual([77, 28]);
    const replaced = send({
      type: 'init',
      scriptId: 'metadata',
      script: declaration('Second', false, 5),
      bars: bars([11, 4]),
      inputs: {},
    });
    expect(replaced.declaration).toMatchObject({ title: 'Second', overlay: false, precision: 5 });
    expect(replaced.plots[0]?.values).toEqual([22, 8]);
  });
});
