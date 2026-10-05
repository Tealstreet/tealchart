import type { FromWorkerMessage, ToWorkerMessage } from '../../src/worker/protocol';

import { afterEach, describe, expect, it, vi } from 'vitest';

describe('ledger gaps 45: complete-script worker declaration boundary', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  async function initialize(source: string) {
    const posted: FromWorkerMessage[] = [];
    const worker = {
      onmessage: null as ((event: MessageEvent<ToWorkerMessage>) => void) | null,
      postMessage: (message: FromWorkerMessage) => posted.push(message),
    };
    vi.stubGlobal('self', worker);
    await import('../../src/worker/worker');
    const data: ToWorkerMessage = {
      type: 'init',
      scriptId: 'declaration',
      script: `//@version=6\n${source}`,
      bars: [],
      inputs: {},
    };
    worker.onmessage?.(new MessageEvent<ToWorkerMessage>('message', { data }));
    return posted;
  }

  it('1777 refuses a declaration-free complete script at worker initialization', async () => {
    const posted = await initialize('plot(close)');
    const errors = posted.filter((message) => message.type === 'semanticError');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      diagnostics: expect.arrayContaining([expect.objectContaining({ code: 'declaration-count' })]),
    });
    expect(posted.filter((message) => message.type === 'result')).toEqual([]);
  });

  it('1777 executes a complete script with one global declaration', async () => {
    const posted = await initialize('indicator("Complete")\nplot(close)');
    expect(posted.filter((message) => ['semanticError', 'error', 'parseError'].includes(message.type))).toEqual([]);
    expect(posted.filter((message) => message.type === 'result')).toHaveLength(1);
  });
});
