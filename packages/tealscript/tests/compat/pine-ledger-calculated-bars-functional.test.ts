import { afterEach, describe, expect, it, vi } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { getResultOutput, type FromWorkerMessage, type ToWorkerMessage } from '../../src/worker/protocol';

// Ledger408: positive calc_bars_count creates a Calculation input and limits startup.
// Authority: tradingview.com/pine-script-docs/language/declaration-statements/#calc_bars_count.
afterEach(() => vi.unstubAllGlobals());

describe('Calculated bars public worker behavior', () => {
  it('reruns the selected recent history, rebases script indices and keeps chart alignment', async () => {
    const posted: FromWorkerMessage[] = [];
    const host = {
      onmessage: null as ((event: MessageEvent<ToWorkerMessage>) => void) | null,
      postMessage: (message: FromWorkerMessage) => posted.push(message),
    };
    vi.resetModules();
    vi.stubGlobal('self', host);
    await import('../../src/worker/worker');
    const send = (data: ToWorkerMessage) => host.onmessage?.({ data } as MessageEvent<ToWorkerMessage>);
    const result = () => {
      expect(posted.filter((message) => ['error', 'parseError', 'semanticError'].includes(message.type))).toEqual([]);
      const message = posted.filter((message) => message.type === 'result').at(-1);
      if (!message || message.type !== 'result') throw new Error('Worker did not return a result');
      return getResultOutput(message);
    };
    const bars = Array.from({ length: 5 }, (_, index) => ({ time: (index + 1) * 60_000, open: index, high: index + 2, low: index - 1, close: index + 1, volume: 10 }));
    send({ type: 'init', scriptId: 'calculated-bars', bars, inputs: {}, script: `//@version=6
indicator("Calculated bars", calc_bars_count=3)
factor=input.int(9, "Factor")
var float total=0
total += close * factor
plot(total)
plot(bar_index)
plot(close[1])` });
    const initial = result();
    expect(initial.plots.map((plot) => plot.values)).toEqual([
      [null, null, 27, 63, 108], [null, null, 0, 1, 2], [null, null, null, 3, 4],
    ]);
    expect(initial.inputs).toHaveLength(2);
    const calculated = initial.inputs.find((input) => input.title === 'Calculated bars');
    expect(calculated).toEqual(expect.objectContaining({ type: 'int', group: 'Calculation', defval: 3, minval: 0 }));
    if (!calculated) throw new Error('Calculated bars input is absent');
    const factor = initial.inputs.find((input) => input.title === 'Factor');
    if (!factor) throw new Error('Factor input is absent');
    expect(calculated.id).not.toBe(factor.id);
    send({ type: 'setInputs', inputs: { [calculated.id]: 2, [factor.id]: 9 } });
    expect(result().plots.map((plot) => plot.values)).toEqual([
      [null, null, null, 36, 81], [null, null, null, 0, 1], [null, null, null, null, 4],
    ]);
    send({ type: 'setInputs', inputs: { [calculated.id]: 0, [factor.id]: 9 } });
    expect(result().plots.map((plot) => plot.values)).toEqual([
      [9, 27, 54, 90, 135], [0, 1, 2, 3, 4], [null, 1, 2, 3, 4],
    ]);
    send({ type: 'setInputs', inputs: { [calculated.id]: 3, [factor.id]: 1 } });
    expect(result().plots.map((plot) => plot.values)).toEqual([
      [null, null, 3, 7, 12], [null, null, 0, 1, 2], [null, null, null, 3, 4],
    ]);
    send({ type: 'updateBar', bar: { time: 360_000, open: 5, high: 7, low: 4, close: 6, volume: 10 } });
    expect(result().plots.map((plot) => plot.values)).toEqual([
      [null, null, 3, 7, 12, 18], [null, null, 0, 1, 2, 3], [null, null, null, 3, 4, 5],
    ]);
    send({ type: 'updateBar', bar: { time: 360_000, open: 5, high: 8, low: 4, close: 7, volume: 10 } });
    expect(result().plots.map((plot) => plot.values)).toEqual([
      [null, null, 3, 7, 12, 19], [null, null, 0, 1, 2, 3], [null, null, null, 3, 4, 5],
    ]);
  });

  it('projects candle and drawing outputs without changing logical drawing getters', () => {
    const bars = Array.from({ length: 5 }, (_, index) => ({ time: (index + 1) * 60_000, open: index, high: index + 2, low: index - 1, close: index + 1, volume: 10 }));
    const output = executeScript(parse(`//@version=6
indicator("Calculated drawing coordinates", calc_bars_count=3, overlay=true)
var line first=na
if barstate.isfirst
    label.new(bar_index, close, "Index")
    label.new(time, close, "Time", xloc=xloc.bar_time)
    first := line.new(0, 2, 1, 4)
    second = line.new(0, 5, 1, 7)
    linefill.new(first, second, color.red)
    box.new(0, 6, 1, 1)
    polyline.new(array.from(chart.point.from_index(0, 2), chart.point.from_index(1, 4)))
    table.new(position.top_right, 1, 1)
plotcandle(open, high, low, close, color=close>3?color.red:color.blue)
plot(line.get_x1(first))`), bars);
    expect(output.errors).toEqual([]);
    const candle = output.plots[0];
    expect(candle.closeValues).toEqual([null, null, 3, 4, 5]);
    expect(candle.openValues).toEqual([null, null, 2, 3, 4]);
    expect(candle.highValues).toEqual([null, null, 4, 5, 6]);
    expect(candle.lowValues).toEqual([null, null, 1, 2, 3]);
    expect(candle.color).toHaveLength(5);
    expect((candle.color as (string | null)[]).slice(0, 2)).toEqual([null, null]);
    expect(output.plots[1].values).toEqual([null, null, 0, 0, 0]);
    expect(output.drawings).toHaveLength(8);
    expect(output.drawings.every((drawing) => drawing.barIndex === 2)).toBe(true);
    expect(output.drawings.find((drawing) => drawing.type === 'label' && drawing.text === 'Index')).toEqual(expect.objectContaining({ x: 2, y: 3 }));
    expect(output.drawings.find((drawing) => drawing.type === 'label' && drawing.text === 'Time')).toEqual(expect.objectContaining({ x: 180_000, y: 3 }));
    expect(output.drawings.filter((drawing) => drawing.type === 'line')).toEqual([
      expect.objectContaining({ x1: 2, x2: 3 }), expect.objectContaining({ x1: 2, x2: 3 }),
    ]);
    expect(output.drawings.find((drawing) => drawing.type === 'box')).toEqual(expect.objectContaining({ left: 2, right: 3 }));
    expect(output.drawings.find((drawing) => drawing.type === 'polyline')).toEqual(expect.objectContaining({
      points: [expect.objectContaining({ index: 2, price: 2 }), expect.objectContaining({ index: 3, price: 4 })],
    }));
  });

  it.each([-1, 1.5, '2'])('visibly refuses invalid Calculated bars host value %s', async (value) => {
    const posted: FromWorkerMessage[] = [];
    const host = {
      onmessage: null as ((event: MessageEvent<ToWorkerMessage>) => void) | null,
      postMessage: (message: FromWorkerMessage) => posted.push(message),
    };
    vi.resetModules();
    vi.stubGlobal('self', host);
    await import('../../src/worker/worker');
    const send = (data: ToWorkerMessage) => host.onmessage?.({ data } as MessageEvent<ToWorkerMessage>);
    const bars = Array.from({ length: 5 }, (_, index) => ({ time: (index + 1) * 60_000, open: index, high: index + 2, low: index - 1, close: index + 1, volume: 10 }));
    send({ type: 'init', scriptId: 'invalid-calculated-bars', bars, inputs: {}, script: '//@version=6\nindicator("Calculated bars", calc_bars_count=3)\nplot(close)' });
    const message = posted.find((entry) => entry.type === 'result');
    if (!message || message.type !== 'result') throw new Error('Worker did not return initial result');
    const calculated = getResultOutput(message).inputs.find((input) => input.title === 'Calculated bars');
    if (!calculated) throw new Error('Calculated bars input is absent');
    const initialMessages = posted.length;
    send({ type: 'setInputs', inputs: { [calculated.id]: value } });
    const failures = posted.slice(initialMessages);
    expect(failures.filter((entry) => entry.type === 'result')).toEqual([]);
    expect(failures).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'error', message: expect.stringContaining('Calculated bars must be a non-negative integer') }),
    ]));
  });
});
