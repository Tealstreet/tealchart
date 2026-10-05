import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FromWorkerMessage, ResultMessage, ToWorkerMessage } from '../../src/worker/protocol';
import { compatibilityBars } from '../compat/fixtures';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.resetModules(); });

describe('ledger18 public worker timenow lifecycle', () => {
  it('does not publish timestamp observations made by request discovery', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    const posted: FromWorkerMessage[] = [];
    const worker = { onmessage: null as ((event: MessageEvent<ToWorkerMessage>) => void) | null, postMessage: (message: FromWorkerMessage) => posted.push(message) };
    vi.stubGlobal('self', worker);
    await import('../../src/worker/worker');
    const script = '//@version=6\nindicator("discovery clock")\nremote = request.security(close > 0 ? "TEST" : "ALT", "D", close)\nplot(remote, title="remote")\nplot(timenow, title="clock")';
    worker.onmessage?.({ data: { type: 'init', scriptId: 'discovery-clock', script, bars: compatibilityBars.slice(0, 2), inputs: {} } } as MessageEvent<ToWorkerMessage>);
    const requests = posted.filter((message) => message.type === 'requestData');
    expect(requests.length).toBeGreaterThan(0);
    expect(posted.some((message) => message.type === 'result')).toBe(false);
    clock.mockReturnValue(20_000);
    for (const request of requests) {
      worker.onmessage?.({ data: { type: 'requestDataResult', scriptId: request.scriptId, requestId: request.requestId, generation: request.generation, kind: 'bars', ok: true, value: { symbol: 'TEST', timeframe: 'D', bars: [{ ...compatibilityBars[0], close: 50 }] } } } as MessageEvent<ToWorkerMessage>);
    }
    expect(posted.filter((message) => message.type === 'error')).toEqual([]);
    const result = posted.find((message): message is ResultMessage => message.type === 'result');
    expect(result).toBeDefined();
    expect(result!.output.plots.find((plot) => plot.title === 'clock')?.values).toEqual([20_000, 20_000]);
  });
  it('retains elapsed timestamps and varip clock intervals until explicit reload', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(10_000);
    const posted: FromWorkerMessage[] = [];
    const worker = { onmessage: null as ((event: MessageEvent<ToWorkerMessage>) => void) | null, postMessage: (message: FromWorkerMessage) => posted.push(message) };
    vi.stubGlobal('self', worker);
    await import('../../src/worker/worker');
    const send = (data: ToWorkerMessage): ResultMessage => {
      posted.length = 0;
      worker.onmessage?.({ data } as MessageEvent<ToWorkerMessage>);
      expect(posted.filter((message) => message.type === 'error')).toEqual([]);
      const result = posted.find((message): message is ResultMessage => message.type === 'result');
      expect(result).toBeDefined();
      return result!;
    };
    const script = `//@version=6
indicator("clock intervals")
varip int previous = timenow
varip int elapsed = 0
varip int updates = 0
if barstate.isrealtime and timenow != previous
    elapsed += timenow - previous
    updates += 1
    previous := timenow
plot(timenow, title="clock")
plot(elapsed, title="elapsed")
plot(updates, title="updates")`;
    const initial = send({ type: 'init', scriptId: 'clock', script, bars: compatibilityBars.slice(0, 1), inputs: {} });
    expect(initial.output.plots[0].values).toEqual([10_000]);
    clock.mockReturnValue(10_010);
    const first = send({ type: 'updateBar', bar: compatibilityBars[1] });
    expect(first.output.plots[0].values).toEqual([10_000, 10_010]);
    clock.mockReturnValue(10_030);
    const tick = send({ type: 'updateBar', bar: { ...compatibilityBars[1], close: 108 } });
    expect(tick.output.plots[0].values).toEqual([10_000, 10_030]);
    expect(tick.output.plots[1].values.at(-1)).toBe(30);
    expect(tick.output.plots[2].values.at(-1)).toBe(2);
    clock.mockReturnValue(10_040);
    const next = send({ type: 'updateBar', bar: compatibilityBars[2] });
    expect(next.output.plots[0].values).toEqual([10_000, 10_030, 10_040]);
    clock.mockReturnValue(20_000);
    const reload = send({ type: 'init', scriptId: 'clock', script, bars: compatibilityBars.slice(0, 3), inputs: {} });
    expect(reload.output.plots[0].values).toEqual([20_000, 20_000, 20_000]);
  });
});
