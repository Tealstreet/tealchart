import { describe, expect, it, vi } from 'vitest';

import { createSyncPromise } from './syncPromise';

describe('createSyncPromise', () => {
  it('runs then() synchronously', () => {
    const seen: string[] = [];
    createSyncPromise('adapter').then((value) => seen.push(value));
    seen.push('after');
    expect(seen).toEqual(['adapter', 'after']);
  });

  it('rejects the chain when the callback throws instead of unwinding into the caller', async () => {
    const onError = vi.fn();

    expect(() => {
      createSyncPromise('adapter')
        .then(() => {
          throw new Error('setter blew up');
        })
        .catch(onError);
    }).not.toThrow();

    await Promise.resolve();
    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0][0] as Error).message).toBe('setter blew up');
  });

  it('routes a throwing callback to an inline rejection handler', async () => {
    const recovered = await createSyncPromise('adapter').then(
      () => {
        throw new Error('boom');
      },
      () => 'recovered',
    );
    expect(recovered).toBe('recovered');
  });
});
