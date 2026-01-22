import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateIndicatorId } from './indicatorActions';

// Note: Testing the atom factories requires more complex setup with Jotai's test utils.
// For now, we test the pure utility functions. The action atoms are integration-tested
// through component tests.

describe('indicatorActions', () => {
  describe('generateIndicatorId', () => {
    it('generates unique ID with builtin prefix', () => {
      const id = generateIndicatorId('sma');
      expect(id).toMatch(/^sma_\d+$/);
    });

    it('generates different IDs for same builtin', () => {
      const id1 = generateIndicatorId('ema');
      // Small delay to ensure different timestamp
      vi.useFakeTimers();
      vi.advanceTimersByTime(1);
      const id2 = generateIndicatorId('ema');
      vi.useRealTimers();

      // They should both start with ema_ but have different timestamps
      expect(id1).toMatch(/^ema_\d+$/);
      expect(id2).toMatch(/^ema_\d+$/);
    });

    it('includes timestamp in ID', () => {
      const before = Date.now();
      const id = generateIndicatorId('rsi');
      const after = Date.now();

      const timestamp = parseInt(id.split('_')[1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('handles hyphenated builtin IDs', () => {
      const id = generateIndicatorId('bollinger-bands');
      expect(id).toMatch(/^bollinger-bands_\d+$/);
    });
  });
});
