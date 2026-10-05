import type { FromWorkerMessage, ToWorkerMessage } from '../../worker/protocol';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

const bars = [1, 2].map((close, i) => ({
  time: (i + 1) * 60000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));

afterEach(() => vi.unstubAllGlobals());

describe('ledger gaps 192–197: background metadata and replacement', () => {
  // Native v4 drawing-default-blue-v5-v1-attempt1-grid-v2.png: color.blue matches #2962FF.
  it('197: v4 default transp90 matches explicit literal transparency across palettes', () => {
    const run = (version: number, expression: string) =>
      executeScript(
        parse(`//@version=${version}\n${version === 4 ? 'study' : 'indicator'}("bg")\nbgcolor(${expression})`),
        bars,
      );
    const v4 = run(4, 'color.blue');
    const v5 = run(5, 'color.blue');
    const explicit = run(5, 'color.new(#2196F3, 90)');
    expect(v4.errors).toEqual([]);
    expect(v4.plots[0].color).toEqual(['#2196F31A', '#2196F31A']);
    expect(v5.plots[0].color).toEqual(['#2962FF', '#2962FF']);
    expect(run(5, 'color.new(color.blue, 90)').plots[0].color).toEqual(['#2962FF1A', '#2962FF1A']);
    expect(v4.plots[0].color).toEqual(explicit.plots[0].color);
    expect(run(4, 'color.blue, transp=0').plots[0].color).toEqual(['#2196F3FF', '#2196F3FF']);
    expect(run(4, 'color.new(color.blue, 50)').plots[0].color).toEqual(['#2196F380', '#2196F380']);
    expect(run(4, 'color.new(color.blue, 50), transp=0').plots[0].color).toEqual(['#2196F380', '#2196F380']);
    expect(run(4, 'na').plots[0].color).toEqual([null, null]);
  });
  it('192: worker ticks replace current bgcolor, including NA, without changing history', async () => {
    const messages: FromWorkerMessage[] = [];
    const host: {
      onmessage?: (event: { data: ToWorkerMessage }) => void;
      postMessage: (message: FromWorkerMessage) => void;
    } = {
      postMessage: (message) => messages.push(message),
    };
    vi.stubGlobal('self', host);
    vi.resetModules();
    await import('../../worker/worker');
    const send = (data: ToWorkerMessage) => host.onmessage!({ data });
    const latest = () => {
      const message = messages.at(-1)!;
      expect(message.type).toBe('result');
      if (message.type !== 'result') throw new Error(JSON.stringify(message));
      return message.output.plots[0];
    };
    send({
      type: 'init',
      scriptId: 'bg',
      script: '//@version=6\nindicator("bg")\nbgcolor(close == 0 ? na : close > 0 ? color.blue : color.red)',
      bars,
      inputs: {},
    });
    expect(latest().color).toEqual(['#2962FF', '#2962FF']);
    for (const [close, expected] of [
      [-1, '#F23645'],
      [0, null],
      [3, '#2962FF'],
    ] as const) {
      send({ type: 'updateBar', bar: { ...bars[1], close } });
      expect(latest().values.length).toBe(2);
      expect(latest().color).toEqual(['#2962FF', expected]);
    }
  });
});
