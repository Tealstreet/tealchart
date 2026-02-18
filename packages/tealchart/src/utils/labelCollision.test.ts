import type { LabelBounds } from './labelCollision';

import { beforeEach, describe, expect, it } from 'vitest';

import { clearCollisionCache, resolveLabelCollisions } from './labelCollision';

/**
 * Helper: create a label with defaults
 */
function label(originalY: number, height = 20, priority = 0): LabelBounds {
  return { originalY, adjustedY: 0, height, priority };
}

/**
 * Check that no two labels overlap after resolution
 */
function assertNoOverlaps(labels: LabelBounds[]): void {
  const sorted = [...labels].sort((a, b) => a.adjustedY - b.adjustedY);
  for (let i = 0; i < sorted.length - 1; i++) {
    const aBottom = sorted[i].adjustedY + sorted[i].height / 2;
    const bTop = sorted[i + 1].adjustedY - sorted[i + 1].height / 2;
    expect(aBottom).toBeLessThanOrEqual(bTop + 0.5); // small epsilon for floats
  }
}

describe('resolveLabelCollisions', () => {
  beforeEach(() => {
    clearCollisionCache();
  });

  describe('edge cases', () => {
    it('returns empty array unchanged', () => {
      const result = resolveLabelCollisions([]);
      expect(result).toEqual([]);
    });

    it('sets adjustedY = originalY for single label', () => {
      const labels = [label(100)];
      resolveLabelCollisions(labels);
      expect(labels[0].adjustedY).toBe(100);
    });
  });

  describe('non-overlapping labels', () => {
    it('preserves positions when labels are far apart', () => {
      const labels = [label(100), label(200), label(300)];
      resolveLabelCollisions(labels);
      expect(labels[0].adjustedY).toBe(100);
      expect(labels[1].adjustedY).toBe(200);
      expect(labels[2].adjustedY).toBe(300);
    });

    it('preserves positions when labels just barely do not overlap', () => {
      // height=20, so label at 100 spans [90, 110], label at 125 spans [115, 135]
      // Gap of 5px between them — no overlap
      const labels = [label(100, 20), label(125, 20)];
      resolveLabelCollisions(labels);
      expect(labels[0].adjustedY).toBe(100);
      expect(labels[1].adjustedY).toBe(125);
    });
  });

  describe('overlapping pairs', () => {
    it('separates two overlapping labels', () => {
      // Both at Y=100, height=20 — they overlap completely
      const labels = [label(100, 20), label(105, 20)];
      resolveLabelCollisions(labels);
      assertNoOverlaps(labels);
    });

    it('anchors higher priority label in place', () => {
      const labels = [label(100, 20, 0), label(105, 20, 10)];
      resolveLabelCollisions(labels);
      // The priority-10 label should stay at its original position
      expect(labels[1].adjustedY).toBe(105);
      assertNoOverlaps(labels);
    });

    it('handles exactly touching labels (within margin)', () => {
      // height=20, label at 100 spans [90,110], label at 120 spans [110,130]
      // Touching at 110 — within the 2px margin, should cluster
      const labels = [label(100, 20), label(120, 20)];
      resolveLabelCollisions(labels);
      assertNoOverlaps(labels);
    });
  });

  describe('cluster stacking', () => {
    it('stacks 3 overlapping labels without gaps', () => {
      const labels = [label(100, 20), label(105, 20), label(110, 20)];
      resolveLabelCollisions(labels);
      assertNoOverlaps(labels);
    });

    it('stacks labels above and below anchor', () => {
      // Anchor (priority 10) in the middle, two others crowd around it
      const labels = [
        label(95, 20, 0),
        label(100, 20, 10), // anchor
        label(105, 20, 0),
      ];
      resolveLabelCollisions(labels);
      // Anchor stays at 100
      expect(labels[1].adjustedY).toBe(100);
      assertNoOverlaps(labels);
    });

    it('handles 5 labels in a cluster', () => {
      const labels = Array.from({ length: 5 }, (_, i) => label(100 + i * 5, 20));
      resolveLabelCollisions(labels);
      assertNoOverlaps(labels);
    });
  });

  describe('multiple independent clusters', () => {
    it('resolves two separate clusters independently', () => {
      const cluster1 = [label(100, 20), label(105, 20)];
      const cluster2 = [label(300, 20), label(305, 20)];
      const labels = [...cluster1, ...cluster2];
      resolveLabelCollisions(labels);
      assertNoOverlaps(labels);

      // Clusters should not merge — adjusted positions should stay near originals
      const group1 = labels.slice(0, 2);
      const group2 = labels.slice(2, 4);
      const group1Center = (group1[0].adjustedY + group1[1].adjustedY) / 2;
      const group2Center = (group2[0].adjustedY + group2[1].adjustedY) / 2;
      expect(Math.abs(group1Center - 102.5)).toBeLessThan(30);
      expect(Math.abs(group2Center - 302.5)).toBeLessThan(30);
    });
  });

  describe('property: no overlaps for any input', () => {
    it('never produces overlapping output for random inputs', () => {
      for (let trial = 0; trial < 20; trial++) {
        clearCollisionCache();
        const count = 3 + Math.floor(Math.random() * 8);
        const labels = Array.from({ length: count }, () =>
          label(Math.random() * 500, 15 + Math.random() * 25, Math.floor(Math.random() * 5)),
        );
        resolveLabelCollisions(labels);
        assertNoOverlaps(labels);
      }
    });
  });

  describe('cache behavior', () => {
    it('returns same results for identical inputs (cache hit)', () => {
      const labels1 = [label(100, 20), label(105, 20)];
      resolveLabelCollisions(labels1);
      const y1a = labels1[0].adjustedY;
      const y1b = labels1[1].adjustedY;

      const labels2 = [label(100, 20), label(105, 20)];
      resolveLabelCollisions(labels2);
      expect(labels2[0].adjustedY).toBe(y1a);
      expect(labels2[1].adjustedY).toBe(y1b);
    });

    it('clearCollisionCache forces recomputation', () => {
      const labels = [label(100, 20), label(105, 20)];
      resolveLabelCollisions(labels);
      clearCollisionCache();

      // Should still produce correct results after cache clear
      const labels2 = [label(100, 20), label(105, 20)];
      resolveLabelCollisions(labels2);
      assertNoOverlaps(labels2);
    });
  });

  describe('priority anchoring', () => {
    it('highest priority label keeps its exact position', () => {
      const labels = [
        label(100, 20, 1),
        label(102, 20, 100), // highest priority
        label(104, 20, 1),
      ];
      resolveLabelCollisions(labels);
      expect(labels[1].adjustedY).toBe(102);
      assertNoOverlaps(labels);
    });

    it('uses lower originalY as tiebreaker for equal priority', () => {
      const labels = [label(90, 20, 5), label(95, 20, 5)];
      resolveLabelCollisions(labels);
      // The one at Y=90 (lower = higher on screen) should anchor
      expect(labels[0].adjustedY).toBe(90);
      assertNoOverlaps(labels);
    });
  });

  describe('varied heights', () => {
    it('handles labels with different heights', () => {
      const labels = [
        label(100, 30), // tall
        label(110, 10), // short
        label(115, 20), // medium
      ];
      resolveLabelCollisions(labels);
      assertNoOverlaps(labels);
    });
  });
});
