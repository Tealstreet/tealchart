import { expect, it, vi } from 'vitest';
import { parse } from '../../src/parser';
import type { FromWorkerMessage, ToWorkerMessage } from '../../src/worker/protocol';
import { getResultOutput } from '../../src/worker/protocol';

async function withWorker(check: (send: (message: ToWorkerMessage) => void, messages: FromWorkerMessage[], checks: () => number) => void) {
  vi.resetModules();
  const semantic = await import('../../src/semantic');
  const validation = vi.spyOn(semantic, 'checkProgram');
  const messages: FromWorkerMessage[] = [];
  const worker = { onmessage: null as ((event: MessageEvent<ToWorkerMessage>) => void) | null, postMessage: (message: FromWorkerMessage) => messages.push(structuredClone(message)) };
  vi.stubGlobal('self', worker);
  try {
    await import('../../src/worker/worker');
    check(message => worker.onmessage!({ data: message } as MessageEvent<ToWorkerMessage>), messages, () => validation.mock.calls.length);
  } finally {
    validation.mockRestore();
    vi.unstubAllGlobals();
    vi.resetModules();
  }
}
const bars = [{ time: 60000, open: 1, high: 1, low: 1, close: 1, volume: 1 }];
const source = '//@version=6\nindicator("Init reset")\nvar int count = 0\ncount += 1\nplot(count)';
const init = (script = source): Extract<ToWorkerMessage, { type: 'init' }> => ({ type: 'init', scriptId: 'validation-reuse', script, bars, inputs: {} });

it('validates identical source once while resetting execution on every init', async () => {
  await withWorker((send, messages, checks) => {
    send(init());
    send(init());
    expect(checks()).toBe(1);
    const outputs = messages.filter(message => message.type === 'result').map(getResultOutput);
    expect(outputs.map(output => output.plots[0].values)).toEqual([[1], [1]]);
    expect(outputs.map(output => ({ ...output, profile: { ...output.profile, elapsedMs: 0 } })))
      .toEqual([0, 1].map(() => ({ ...outputs[0], profile: { ...outputs[0].profile, elapsedMs: 0 } })));
    expect(messages.map(message => message.type)).toEqual(['ready', 'result', 'result']);
  });
});

it('revalidates changed source and rejects it without keeping previous execution', async () => {
  await withWorker((send, messages, checks) => {
    send(init());
    send(init('//@version=6\nindicator("Invalid")\nfloat value = "bad"\nplot(value)'));
    expect(checks()).toBe(2);
    expect(messages.at(-1)?.type).toBe('semanticError');
    const length = messages.length;
    send({ type: 'updateBar', bar: bars[0] });
    expect(messages).toHaveLength(length);
  });
});

it('invalidates validation for in-place imported library changes', async () => {
  await withWorker((send, messages, checks) => {
    const library = parse('//@version=6\nlibrary("Provider")\nexport value() => 1');
    const libraries = new Map([['Owner/Provider/1', library]]);
    const script = '//@version=6\nindicator("Import")\nimport Owner/Provider/1 as lib\nfloat value = lib.value()\nplot(value)';
    send({ ...init(script), libraries });
    expect(messages.at(-1)?.type).toBe('result');
    library.body.splice(0, library.body.length, ...parse('//@version=6\nlibrary("Provider")\nexport value() => "bad"').body);
    send({ ...init(script), libraries });
    expect(checks()).toBe(2);
    expect(messages.at(-1)?.type).toBe('semanticError');
  });
});

it('clears the validated program on explicit disposal', async () => {
  await withWorker((send, _messages, checks) => {
    send(init());
    send({ type: 'dispose' });
    send(init());
    expect(checks()).toBe(2);
  });
});

it('revalidates when runtime options change even with identical source and libraries', async () => {
  await withWorker((send, messages, checks) => {
    send({ ...init(), runtime: { now: 100 } });
    send({ ...init(), runtime: { now: 200 } });
    expect(checks()).toBe(2);
    expect(messages.filter(message => message.type === 'result')).toHaveLength(2);
  });
});
