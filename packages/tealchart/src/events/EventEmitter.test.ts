import { describe, expect, it, vi } from 'vitest';

import { EventEmitter, Subscription } from './EventEmitter';

describe('EventEmitter', () => {
  describe('subscribe/emit', () => {
    it('calls listener when event is emitted', () => {
      const emitter = new EventEmitter();
      const cb = vi.fn();
      emitter.subscribe('foo', cb);
      emitter.emit('foo');
      expect(cb).toHaveBeenCalledOnce();
    });

    it('passes arguments to listener', () => {
      const emitter = new EventEmitter();
      const cb = vi.fn();
      emitter.subscribe('data', cb);
      emitter.emit('data', 1, 'hello', { x: true });
      expect(cb).toHaveBeenCalledWith(1, 'hello', { x: true });
    });

    it('does not call listener for different event', () => {
      const emitter = new EventEmitter();
      const cb = vi.fn();
      emitter.subscribe('foo', cb);
      emitter.emit('bar');
      expect(cb).not.toHaveBeenCalled();
    });

    it('supports multiple listeners on same event', () => {
      const emitter = new EventEmitter();
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      emitter.subscribe('evt', cb1);
      emitter.subscribe('evt', cb2);
      emitter.emit('evt', 42);
      expect(cb1).toHaveBeenCalledWith(42);
      expect(cb2).toHaveBeenCalledWith(42);
    });

    it('supports multiple events independently', () => {
      const emitter = new EventEmitter();
      const cbA = vi.fn();
      const cbB = vi.fn();
      emitter.subscribe('a', cbA);
      emitter.subscribe('b', cbB);
      emitter.emit('a');
      expect(cbA).toHaveBeenCalledOnce();
      expect(cbB).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('removes specific listener', () => {
      const emitter = new EventEmitter();
      const cb = vi.fn();
      emitter.subscribe('evt', cb);
      emitter.unsubscribe('evt', cb);
      emitter.emit('evt');
      expect(cb).not.toHaveBeenCalled();
    });

    it('does not affect other listeners on same event', () => {
      const emitter = new EventEmitter();
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      emitter.subscribe('evt', cb1);
      emitter.subscribe('evt', cb2);
      emitter.unsubscribe('evt', cb1);
      emitter.emit('evt');
      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalledOnce();
    });

    it('is a no-op for non-existent listener', () => {
      const emitter = new EventEmitter();
      const cb = vi.fn();
      expect(() => emitter.unsubscribe('evt', cb)).not.toThrow();
    });

    it('is a no-op for non-existent event', () => {
      const emitter = new EventEmitter();
      expect(() => emitter.unsubscribe('nonexistent', vi.fn())).not.toThrow();
    });
  });

  describe('error isolation', () => {
    it('does not stop other listeners if one throws', () => {
      const emitter = new EventEmitter();
      const thrower = vi.fn(() => {
        throw new Error('boom');
      });
      const cb = vi.fn();
      emitter.subscribe('evt', thrower);
      emitter.subscribe('evt', cb);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      emitter.emit('evt');
      consoleSpy.mockRestore();

      expect(thrower).toHaveBeenCalledOnce();
      expect(cb).toHaveBeenCalledOnce();
    });

    it('logs error to console when listener throws', () => {
      const emitter = new EventEmitter();
      emitter.subscribe('evt', () => {
        throw new Error('oops');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      emitter.emit('evt');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('removeAllListeners', () => {
    it('removes all listeners for a specific event', () => {
      const emitter = new EventEmitter();
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      emitter.subscribe('evt', cb1);
      emitter.subscribe('evt', cb2);
      emitter.removeAllListeners('evt');
      emitter.emit('evt');
      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).not.toHaveBeenCalled();
    });

    it('does not affect other events when removing specific event', () => {
      const emitter = new EventEmitter();
      const cbA = vi.fn();
      const cbB = vi.fn();
      emitter.subscribe('a', cbA);
      emitter.subscribe('b', cbB);
      emitter.removeAllListeners('a');
      emitter.emit('b');
      expect(cbB).toHaveBeenCalledOnce();
    });

    it('removes all listeners for all events when called without args', () => {
      const emitter = new EventEmitter();
      const cbA = vi.fn();
      const cbB = vi.fn();
      emitter.subscribe('a', cbA);
      emitter.subscribe('b', cbB);
      emitter.removeAllListeners();
      emitter.emit('a');
      emitter.emit('b');
      expect(cbA).not.toHaveBeenCalled();
      expect(cbB).not.toHaveBeenCalled();
    });
  });

  describe('emit with no listeners', () => {
    it('does not throw when emitting to event with no subscribers', () => {
      const emitter = new EventEmitter();
      expect(() => emitter.emit('nothing')).not.toThrow();
    });
  });
});

describe('Subscription', () => {
  describe('context-based subscribe/emit', () => {
    it('calls listener when emitted', () => {
      const sub = new Subscription<(val: number) => void>();
      const cb = vi.fn();
      sub.subscribe(null, cb);
      sub.emit(42);
      expect(cb).toHaveBeenCalledWith(42);
    });

    it('supports context-based subscription', () => {
      const sub = new Subscription<(val: string) => void>();
      const ctx = {};
      const cb = vi.fn();
      sub.subscribe(ctx, cb);
      sub.emit('hello');
      expect(cb).toHaveBeenCalledWith('hello');
    });

    it('supports multiple contexts', () => {
      const sub = new Subscription<() => void>();
      const ctx1 = {};
      const ctx2 = {};
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      sub.subscribe(ctx1, cb1);
      sub.subscribe(ctx2, cb2);
      sub.emit();
      expect(cb1).toHaveBeenCalledOnce();
      expect(cb2).toHaveBeenCalledOnce();
    });
  });

  describe('unsubscribe', () => {
    it('removes specific listener from context', () => {
      const sub = new Subscription<() => void>();
      const ctx = {};
      const cb = vi.fn();
      sub.subscribe(ctx, cb);
      sub.unsubscribe(ctx, cb);
      sub.emit();
      expect(cb).not.toHaveBeenCalled();
    });

    it('is a no-op for non-existent context', () => {
      const sub = new Subscription<() => void>();
      expect(() => sub.unsubscribe({}, vi.fn())).not.toThrow();
    });
  });

  describe('unsubscribeAll', () => {
    it('removes all listeners for a context', () => {
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

    it('does not affect other contexts', () => {
      const sub = new Subscription<() => void>();
      const ctx1 = {};
      const ctx2 = {};
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      sub.subscribe(ctx1, cb1);
      sub.subscribe(ctx2, cb2);
      sub.unsubscribeAll(ctx1);
      sub.emit();
      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalledOnce();
    });
  });

  describe('error isolation', () => {
    it('does not stop other listeners if one throws', () => {
      const sub = new Subscription<() => void>();
      const thrower = vi.fn(() => {
        throw new Error('boom');
      });
      const cb = vi.fn();
      sub.subscribe(null, thrower);
      sub.subscribe({}, cb);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      sub.emit();
      consoleSpy.mockRestore();

      expect(thrower).toHaveBeenCalledOnce();
      expect(cb).toHaveBeenCalledOnce();
    });
  });

  describe('clear', () => {
    it('removes all listeners from all contexts', () => {
      const sub = new Subscription<() => void>();
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      sub.subscribe(null, cb1);
      sub.subscribe({}, cb2);
      sub.clear();
      sub.emit();
      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).not.toHaveBeenCalled();
    });
  });
});
