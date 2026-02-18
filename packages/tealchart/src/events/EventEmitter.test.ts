import { EventEmitter, Subscription } from './EventEmitter';

describe('EventEmitter', () => {
  describe('basic lifecycle', () => {
    it('subscribe and emit fires callback with correct args', () => {
      const emitter = new EventEmitter();
      const cb = vi.fn();

      emitter.subscribe('price', cb);
      emitter.emit('price', 42, 'BTC');

      expect(cb).toHaveBeenCalledOnce();
      expect(cb).toHaveBeenCalledWith(42, 'BTC');
    });

    it('multiple listeners on same event all fire', () => {
      const emitter = new EventEmitter();
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      const cb3 = vi.fn();

      emitter.subscribe('tick', cb1);
      emitter.subscribe('tick', cb2);
      emitter.subscribe('tick', cb3);
      emitter.emit('tick', 'data');

      expect(cb1).toHaveBeenCalledWith('data');
      expect(cb2).toHaveBeenCalledWith('data');
      expect(cb3).toHaveBeenCalledWith('data');
    });

    it('unsubscribe stops callback from firing', () => {
      const emitter = new EventEmitter();
      const cb = vi.fn();

      emitter.subscribe('update', cb);
      emitter.emit('update', 1);
      expect(cb).toHaveBeenCalledOnce();

      emitter.unsubscribe('update', cb);
      emitter.emit('update', 2);
      expect(cb).toHaveBeenCalledOnce();
    });

    it('removeAllListeners(event) removes only that event listeners', () => {
      const emitter = new EventEmitter();
      const cbA = vi.fn();
      const cbB = vi.fn();

      emitter.subscribe('eventA', cbA);
      emitter.subscribe('eventB', cbB);

      emitter.removeAllListeners('eventA');

      emitter.emit('eventA', 'gone');
      emitter.emit('eventB', 'still here');

      expect(cbA).not.toHaveBeenCalled();
      expect(cbB).toHaveBeenCalledWith('still here');
    });

    it('removeAllListeners() with no arg removes all listeners', () => {
      const emitter = new EventEmitter();
      const cbA = vi.fn();
      const cbB = vi.fn();

      emitter.subscribe('eventA', cbA);
      emitter.subscribe('eventB', cbB);

      emitter.removeAllListeners();

      emitter.emit('eventA');
      emitter.emit('eventB');

      expect(cbA).not.toHaveBeenCalled();
      expect(cbB).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('error in handler does not prevent other handlers from firing', () => {
      const emitter = new EventEmitter();
      const badCb = vi.fn(() => {
        throw new Error('boom');
      });
      const goodCb = vi.fn();

      vi.spyOn(console, 'error').mockImplementation(() => {});

      emitter.subscribe('data', badCb);
      emitter.subscribe('data', goodCb);
      emitter.emit('data', 'payload');

      expect(badCb).toHaveBeenCalledWith('payload');
      expect(goodCb).toHaveBeenCalledWith('payload');

      vi.restoreAllMocks();
    });

    it('error is logged to console.error', () => {
      const emitter = new EventEmitter();
      const error = new Error('handler failed');
      const badCb = vi.fn(() => {
        throw error;
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      emitter.subscribe('crash', badCb);
      emitter.emit('crash');

      expect(consoleSpy).toHaveBeenCalledWith('[Tealchart] Error in event handler for "crash":', error);

      vi.restoreAllMocks();
    });
  });

  describe('deduplication', () => {
    it('same callback added twice only fires once per emit', () => {
      const emitter = new EventEmitter();
      const cb = vi.fn();

      emitter.subscribe('dup', cb);
      emitter.subscribe('dup', cb);
      emitter.emit('dup', 'once');

      expect(cb).toHaveBeenCalledOnce();
    });
  });
});

describe('Subscription', () => {
  describe('basic lifecycle', () => {
    it('subscribe with null context and emit fires callback', () => {
      const sub = new Subscription<(val: number) => void>();
      const cb = vi.fn();

      sub.subscribe(null, cb);
      sub.emit(99);

      expect(cb).toHaveBeenCalledOnce();
      expect(cb).toHaveBeenCalledWith(99);
    });

    it('subscribe with object context fires callback', () => {
      const sub = new Subscription<(msg: string) => void>();
      const ctx = { id: 'widget-1' };
      const cb = vi.fn();

      sub.subscribe(ctx, cb);
      sub.emit('hello');

      expect(cb).toHaveBeenCalledWith('hello');
    });

    it('unsubscribe removes specific callback', () => {
      const sub = new Subscription<(x: number) => void>();
      const ctx = {};
      const cb = vi.fn();

      sub.subscribe(ctx, cb);
      sub.emit(1);
      expect(cb).toHaveBeenCalledOnce();

      sub.unsubscribe(ctx, cb);
      sub.emit(2);
      expect(cb).toHaveBeenCalledOnce();
    });

    it('unsubscribeAll removes all callbacks for a context', () => {
      const sub = new Subscription<() => void>();
      const ctx = {};
      const cb1 = vi.fn();
      const cb2 = vi.fn();

      sub.subscribe(ctx, cb1);
      sub.subscribe(ctx, cb2);

      sub.unsubscribeAll(ctx);
      sub.emit();

      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).not.toHaveBeenCalled();
    });
  });

  describe('advanced', () => {
    it('multiple contexts: emit fires all callbacks across all contexts', () => {
      const sub = new Subscription<(data: string) => void>();
      const ctxA = { name: 'A' };
      const ctxB = { name: 'B' };
      const cbA = vi.fn();
      const cbB = vi.fn();
      const cbNull = vi.fn();

      sub.subscribe(ctxA, cbA);
      sub.subscribe(ctxB, cbB);
      sub.subscribe(null, cbNull);
      sub.emit('broadcast');

      expect(cbA).toHaveBeenCalledWith('broadcast');
      expect(cbB).toHaveBeenCalledWith('broadcast');
      expect(cbNull).toHaveBeenCalledWith('broadcast');
    });

    it('clear() removes all listeners', () => {
      const sub = new Subscription<(n: number) => void>();
      const ctxA = {};
      const ctxB = {};
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      const cb3 = vi.fn();

      sub.subscribe(ctxA, cb1);
      sub.subscribe(ctxB, cb2);
      sub.subscribe(null, cb3);

      sub.clear();
      sub.emit(42);

      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).not.toHaveBeenCalled();
      expect(cb3).not.toHaveBeenCalled();
    });

    it('error in subscription handler does not crash others', () => {
      const sub = new Subscription<(val: string) => void>();
      const error = new Error('sub boom');
      const badCb = vi.fn(() => {
        throw error;
      });
      const goodCb = vi.fn();

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      sub.subscribe(null, badCb);
      sub.subscribe(null, goodCb);
      sub.emit('test');

      expect(badCb).toHaveBeenCalledWith('test');
      expect(goodCb).toHaveBeenCalledWith('test');
      expect(consoleSpy).toHaveBeenCalledWith('[Tealchart] Error in subscription handler:', error);

      vi.restoreAllMocks();
    });
  });
});
