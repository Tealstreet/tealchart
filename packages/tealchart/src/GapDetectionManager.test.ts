import type { GapDetectionEvent, GapDetectionReason } from './types';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GapDetectionManager } from './GapDetectionManager';

describe('GapDetectionManager', () => {
  let onRecoveryNeeded: ReturnType<typeof vi.fn<(event: GapDetectionEvent) => void>>;
  let manager: GapDetectionManager;

  beforeEach(() => {
    vi.useFakeTimers();
    onRecoveryNeeded = vi.fn<(event: GapDetectionEvent) => void>();
  });

  afterEach(() => {
    manager?.dispose();
    vi.useRealTimers();
  });

  // ============================================================================
  // Initialization
  // ============================================================================

  describe('initialization', () => {
    it('should create manager with default options', () => {
      manager = new GapDetectionManager(onRecoveryNeeded);
      expect(manager).toBeDefined();
    });

    it('should create manager with custom options', () => {
      manager = new GapDetectionManager(onRecoveryNeeded, {
        barTimeoutMultiplier: 3,
        visibilityDebounceMs: 2000,
        networkDebounceMs: 3000,
        minBarTimeoutMs: 60000,
        gapThresholdMultiplier: 2.0,
      });
      expect(manager).toBeDefined();
    });

    it('should not trigger recovery before start() is called', () => {
      manager = new GapDetectionManager(onRecoveryNeeded);
      manager.setInterval(60000); // 1 minute
      manager.recordBar(Date.now());

      // Advance time past bar timeout
      vi.advanceTimersByTime(200000);

      expect(onRecoveryNeeded).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Bar Gap Detection
  // ============================================================================

  describe('bar gap detection', () => {
    beforeEach(() => {
      manager = new GapDetectionManager(onRecoveryNeeded);
      manager.setInterval(60000); // 1 minute interval
    });

    it('should not detect gap when no last bar recorded', () => {
      const result = manager.checkBarGap(Date.now());
      expect(result).toBeNull();
    });

    it('should not detect gap for normal consecutive bars', () => {
      const now = Date.now();
      manager.recordBar(now);

      // Next bar exactly 1 minute later
      const result = manager.checkBarGap(now + 60000);
      expect(result).toBeNull();
    });

    it('should not detect gap within threshold (1.5x interval)', () => {
      const now = Date.now();
      manager.recordBar(now);

      // Gap of 1.4x interval - should be OK
      const result = manager.checkBarGap(now + 84000); // 1.4 * 60000
      expect(result).toBeNull();
    });

    it('should detect gap exceeding threshold (1.5x interval)', () => {
      const now = Date.now();
      manager.recordBar(now);

      // Gap of 2x interval - should trigger
      const result = manager.checkBarGap(now + 120000); // 2 * 60000
      expect(result).not.toBeNull();
      expect(result!.reason).toBe('bar-gap');
      expect(result!.details?.gapMs).toBe(120000);
    });

    it('should respect custom gapThresholdMultiplier', () => {
      manager = new GapDetectionManager(onRecoveryNeeded, {
        gapThresholdMultiplier: 3.0,
      });
      manager.setInterval(60000);

      const now = Date.now();
      manager.recordBar(now);

      // Gap of 2x interval - should NOT trigger with 3x threshold
      const result1 = manager.checkBarGap(now + 120000);
      expect(result1).toBeNull();

      // Gap of 4x interval - should trigger
      const result2 = manager.checkBarGap(now + 240000);
      expect(result2).not.toBeNull();
      expect(result2!.reason).toBe('bar-gap');
    });

    it('should not check gaps when disabled', () => {
      manager = new GapDetectionManager(onRecoveryNeeded, { enabled: false });
      manager.setInterval(60000);

      const now = Date.now();
      manager.recordBar(now);

      // Huge gap - should not trigger because disabled
      const result = manager.checkBarGap(now + 600000);
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // Bar Timeout Detection
  // ============================================================================

  describe('bar timeout detection', () => {
    beforeEach(() => {
      manager = new GapDetectionManager(onRecoveryNeeded);
    });

    it('should trigger recovery after bar timeout', () => {
      manager.setInterval(60000); // 1 minute
      manager.recordBar(Date.now());
      manager.start();

      // Advance time to 2x interval (default timeout multiplier)
      vi.advanceTimersByTime(120000);

      expect(onRecoveryNeeded).toHaveBeenCalledTimes(1);
      expect(onRecoveryNeeded).toHaveBeenCalledWith(expect.objectContaining({ reason: 'bar-timeout' }));
    });

    it('should respect minBarTimeoutMs', () => {
      manager.setInterval(5000); // 5 seconds - too short
      manager.recordBar(Date.now());
      manager.start();

      // 2x 5 seconds = 10 seconds, but min is 30 seconds
      vi.advanceTimersByTime(10000);
      expect(onRecoveryNeeded).not.toHaveBeenCalled();

      // Advance to 30 seconds
      vi.advanceTimersByTime(20000);
      expect(onRecoveryNeeded).toHaveBeenCalledTimes(1);
    });

    it('should respect custom barTimeoutMultiplier', () => {
      manager = new GapDetectionManager(onRecoveryNeeded, {
        barTimeoutMultiplier: 4,
        minBarTimeoutMs: 1000, // Low min so it doesn't interfere
      });
      manager.setInterval(10000); // 10 seconds
      manager.recordBar(Date.now());
      manager.start();

      // 2x interval - should NOT trigger yet
      vi.advanceTimersByTime(20000);
      expect(onRecoveryNeeded).not.toHaveBeenCalled();

      // 4x interval - should trigger
      vi.advanceTimersByTime(20000);
      expect(onRecoveryNeeded).toHaveBeenCalledTimes(1);
    });

    it('should reset timeout when new bar is recorded', () => {
      manager.setInterval(60000);
      manager.recordBar(Date.now());
      manager.start();

      // Advance 90 seconds
      vi.advanceTimersByTime(90000);
      expect(onRecoveryNeeded).not.toHaveBeenCalled();

      // Record a new bar - resets timeout
      manager.recordBar(Date.now() + 90000);

      // Advance another 90 seconds
      vi.advanceTimersByTime(90000);
      expect(onRecoveryNeeded).not.toHaveBeenCalled();

      // Advance to trigger timeout
      vi.advanceTimersByTime(30000);
      expect(onRecoveryNeeded).toHaveBeenCalledTimes(1);
    });

    it('should not timeout when stopped', () => {
      manager.setInterval(60000);
      manager.recordBar(Date.now());
      manager.start();

      // Advance 60 seconds
      vi.advanceTimersByTime(60000);

      // Stop manager
      manager.stop();

      // Advance past timeout
      vi.advanceTimersByTime(120000);

      expect(onRecoveryNeeded).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Visibility Change Detection
  // ============================================================================

  describe('visibility change detection', () => {
    beforeEach(() => {
      manager = new GapDetectionManager(onRecoveryNeeded);
      manager.setInterval(60000);
      manager.recordBar(Date.now());
      manager.start();
    });

    it('should trigger recovery when page becomes visible after being hidden', () => {
      // Simulate going hidden
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Simulate coming back visible
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Wait for debounce (default 1000ms)
      vi.advanceTimersByTime(1000);

      expect(onRecoveryNeeded).toHaveBeenCalledTimes(1);
      expect(onRecoveryNeeded).toHaveBeenCalledWith(expect.objectContaining({ reason: 'visibility-change' }));
    });

    it('should debounce rapid visibility changes', () => {
      // Multiple hidden -> visible transitions
      for (let i = 0; i < 5; i++) {
        Object.defineProperty(document, 'visibilityState', {
          value: 'hidden',
          configurable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));

        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          configurable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));

        vi.advanceTimersByTime(100); // Less than debounce
      }

      // Still waiting for debounce
      expect(onRecoveryNeeded).not.toHaveBeenCalled();

      // Complete the debounce
      vi.advanceTimersByTime(1000);

      // Should only trigger once
      expect(onRecoveryNeeded).toHaveBeenCalledTimes(1);
    });

    it('should respect custom visibilityDebounceMs', () => {
      manager.dispose();
      manager = new GapDetectionManager(onRecoveryNeeded, {
        visibilityDebounceMs: 3000,
      });
      manager.setInterval(60000);
      manager.start();

      // Simulate visibility change
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Default debounce (1000ms) - should NOT trigger
      vi.advanceTimersByTime(1000);
      expect(onRecoveryNeeded).not.toHaveBeenCalled();

      // Custom debounce (3000ms)
      vi.advanceTimersByTime(2000);
      expect(onRecoveryNeeded).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Network Change Detection
  // ============================================================================

  describe('network change detection', () => {
    beforeEach(() => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      });

      manager = new GapDetectionManager(onRecoveryNeeded);
      manager.setInterval(60000);
      manager.recordBar(Date.now());
      manager.start();
    });

    it('should trigger recovery when coming back online after being offline', () => {
      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      });
      window.dispatchEvent(new Event('offline'));

      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      });
      window.dispatchEvent(new Event('online'));

      // Wait for debounce (default 2000ms)
      vi.advanceTimersByTime(2000);

      expect(onRecoveryNeeded).toHaveBeenCalledTimes(1);
      expect(onRecoveryNeeded).toHaveBeenCalledWith(expect.objectContaining({ reason: 'network-reconnect' }));
    });

    it('should debounce rapid network changes', () => {
      // Multiple offline -> online transitions
      for (let i = 0; i < 5; i++) {
        Object.defineProperty(navigator, 'onLine', {
          value: false,
          configurable: true,
        });
        window.dispatchEvent(new Event('offline'));

        Object.defineProperty(navigator, 'onLine', {
          value: true,
          configurable: true,
        });
        window.dispatchEvent(new Event('online'));

        vi.advanceTimersByTime(500); // Less than debounce
      }

      // Still waiting for debounce
      expect(onRecoveryNeeded).not.toHaveBeenCalled();

      // Complete the debounce
      vi.advanceTimersByTime(2000);

      // Should only trigger once
      expect(onRecoveryNeeded).toHaveBeenCalledTimes(1);
    });

    it('should respect custom networkDebounceMs', () => {
      manager.dispose();
      manager = new GapDetectionManager(onRecoveryNeeded, {
        networkDebounceMs: 5000,
      });
      manager.setInterval(60000);
      manager.start();

      // Simulate network change
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      });
      window.dispatchEvent(new Event('offline'));

      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      });
      window.dispatchEvent(new Event('online'));

      // Default debounce (2000ms) - should NOT trigger
      vi.advanceTimersByTime(2000);
      expect(onRecoveryNeeded).not.toHaveBeenCalled();

      // Custom debounce (5000ms)
      vi.advanceTimersByTime(3000);
      expect(onRecoveryNeeded).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Recovery Lock (Prevent Multiple Simultaneous Recoveries)
  // ============================================================================

  describe('recovery lock', () => {
    beforeEach(() => {
      manager = new GapDetectionManager(onRecoveryNeeded);
      manager.setInterval(60000);
      manager.recordBar(Date.now());
      manager.start();
    });

    it('should prevent multiple recoveries within lock period', () => {
      // Trigger visibility recovery
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      vi.advanceTimersByTime(1000); // Complete visibility debounce
      expect(onRecoveryNeeded).toHaveBeenCalledTimes(1);

      // Try to trigger network recovery immediately
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      });
      window.dispatchEvent(new Event('offline'));

      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      });
      window.dispatchEvent(new Event('online'));

      vi.advanceTimersByTime(2000); // Complete network debounce

      // Should still be just 1 call due to recovery lock
      expect(onRecoveryNeeded).toHaveBeenCalledTimes(1);
    });

    it('should allow recovery after lock expires (5s)', () => {
      // First recovery
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      vi.advanceTimersByTime(1000);
      expect(onRecoveryNeeded).toHaveBeenCalledTimes(1);

      // Wait for lock to expire (5 seconds)
      vi.advanceTimersByTime(5000);

      // Second recovery should work
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      vi.advanceTimersByTime(1000);
      expect(onRecoveryNeeded).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================================
  // Start/Stop/Dispose
  // ============================================================================

  describe('lifecycle', () => {
    it('should be safe to call stop() multiple times', () => {
      manager = new GapDetectionManager(onRecoveryNeeded);
      manager.start();
      manager.stop();
      manager.stop();
      manager.stop();
      // No error thrown
    });

    it('should be safe to call dispose() multiple times', () => {
      manager = new GapDetectionManager(onRecoveryNeeded);
      manager.start();
      manager.dispose();
      manager.dispose();
      manager.dispose();
      // No error thrown
    });

    it('should clean up event listeners on dispose', () => {
      manager = new GapDetectionManager(onRecoveryNeeded);
      manager.start();

      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      const windowRemoveEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      manager.dispose();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      expect(windowRemoveEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(windowRemoveEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should not trigger recovery after dispose', () => {
      manager = new GapDetectionManager(onRecoveryNeeded);
      manager.setInterval(60000);
      manager.recordBar(Date.now());
      manager.start();

      manager.dispose();

      // Try all triggers
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      vi.advanceTimersByTime(200000); // Well past all timeouts

      expect(onRecoveryNeeded).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle setInterval called before recordBar', () => {
      manager = new GapDetectionManager(onRecoveryNeeded);
      manager.setInterval(60000);
      manager.start();

      // No bars recorded yet, timeout should not trigger
      vi.advanceTimersByTime(200000);
      expect(onRecoveryNeeded).not.toHaveBeenCalled();
    });

    it('should handle zero interval', () => {
      manager = new GapDetectionManager(onRecoveryNeeded);
      manager.setInterval(0);
      manager.recordBar(Date.now());
      manager.start();

      // Should not crash or trigger
      vi.advanceTimersByTime(100000);
      expect(onRecoveryNeeded).not.toHaveBeenCalled();
    });

    it('should handle interval change mid-stream', () => {
      manager = new GapDetectionManager(onRecoveryNeeded, {
        minBarTimeoutMs: 1000,
      });
      manager.setInterval(10000); // 10 seconds
      manager.recordBar(Date.now());
      manager.start();

      // Advance 15 seconds - should NOT trigger yet (2x = 20s)
      vi.advanceTimersByTime(15000);
      expect(onRecoveryNeeded).not.toHaveBeenCalled();

      // Change interval to 5 seconds (2x = 10s timeout)
      manager.setInterval(5000);
      manager.recordBar(Date.now() + 15000);

      // Advance 10 seconds - should trigger
      vi.advanceTimersByTime(10000);
      expect(onRecoveryNeeded).toHaveBeenCalledTimes(1);
    });
  });
});
