/**
 * Create a "synchronous" promise that executes .then() callbacks immediately
 * instead of scheduling them in the microtask queue.
 *
 * This matches TradingView's behavior where line adapters are available
 * synchronously after creation. The standard Promise.resolve().then() pattern
 * schedules callbacks asynchronously, which causes timing issues with code
 * that expects the adapter to be stored before the next update cycle.
 *
 * @param value - The value to resolve immediately
 * @returns A Promise-like object that executes .then() synchronously
 */
export function createSyncPromise<T>(value: T): Promise<T> {
  const syncPromise: Promise<T> = {
    then: <TResult1 = T, TResult2 = never>(
      onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
      _onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> => {
      if (onfulfilled) {
        const result = onfulfilled(value);
        return Promise.resolve(result);
      }
      return Promise.resolve(value as unknown as TResult1);
    },
    catch: () => syncPromise as Promise<T>,
    finally: (onfinally?: (() => void) | null) => {
      if (onfinally) onfinally();
      return syncPromise;
    },
    [Symbol.toStringTag]: 'Promise',
  };
  return syncPromise;
}
