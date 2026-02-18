import type { LabelBounds } from './labelCollision';

import { clearCollisionCache, resolveLabelCollisions } from './labelCollision';

/** Helper to create a label with defaults */
function makeLabel(originalY: number, height: number, priority?: number): LabelBounds {
  return { originalY, adjustedY: 0, height, priority };
}

/** Helper to check if two labels overlap after resolution (using adjustedY) */
function labelsOverlap(a: LabelBounds, b: LabelBounds): boolean {
  const epsilon = 0.1;
  const aTop = a.adjustedY - a.height / 2;
  const aBottom = a.adjustedY + a.height / 2;
  const bTop = b.adjustedY - b.height / 2;
  const bBottom = b.adjustedY + b.height / 2;
  return aBottom > bTop + epsilon && aTop < bBottom - epsilon;
}

/** Helper to verify no pair of labels overlaps */
function assertNoOverlaps(labels: LabelBounds[]): void {
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      if (labelsOverlap(labels[i], labels[j])) {
        throw new Error(
          `Labels ${i} and ${j} overlap: ` +
            `label[${i}] adjustedY=${labels[i].adjustedY} h=${labels[i].height} ` +
            `(${labels[i].adjustedY - labels[i].height / 2} to ${labels[i].adjustedY + labels[i].height / 2}), ` +
            `label[${j}] adjustedY=${labels[j].adjustedY} h=${labels[j].height} ` +
            `(${labels[j].adjustedY - labels[j].height / 2} to ${labels[j].adjustedY + labels[j].height / 2})`,
        );
      }
    }
  }
}

describe('resolveLabelCollisions', () => {
  beforeEach(() => {
    clearCollisionCache();
  });

  // ── No adjustment needed ──────────────────────────────────────────

  describe('no adjustment needed', () => {
    it('returns empty array for empty input', () => {
      const result = resolveLabelCollisions([]);
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('sets adjustedY to originalY for a single label', () => {
      const labels = [makeLabel(100, 20)];
      resolveLabelCollisions(labels);
      expect(labels[0].adjustedY).toBe(100);
    });

    it('does not adjust two non-overlapping labels', () => {
      // Labels are far apart: 50 +/- 10 = [40, 60] and 200 +/- 10 = [190, 210]
      const labels = [makeLabel(50, 20), makeLabel(200, 20)];
      resolveLabelCollisions(labels);
      expect(labels[0].adjustedY).toBe(50);
      expect(labels[1].adjustedY).toBe(200);
    });
  });

  // ── Two overlapping labels ────────────────────────────────────────

  describe('two overlapping labels', () => {
    it('adjusts two labels at the same originalY, higher priority stays', () => {
      const labels = [makeLabel(100, 20, 5), makeLabel(100, 20, 10)];
      resolveLabelCollisions(labels);
      // Higher priority (10) should stay at originalY
      expect(labels[1].adjustedY).toBe(100);
      // Lower priority should be displaced
      expect(labels[0].adjustedY).not.toBe(100);
    });

    it('stacks partially overlapping labels without gap or overlap', () => {
      // Labels at 100 and 110, each height 20 -> [90,110] and [100,120] -> they overlap
      const labels = [makeLabel(100, 20, 1), makeLabel(110, 20, 1)];
      resolveLabelCollisions(labels);
      assertNoOverlaps(labels);
    });

    it('ensures no overlap after resolution (checking bounds)', () => {
      const labels = [makeLabel(50, 30, 2), makeLabel(55, 30, 8)];
      resolveLabelCollisions(labels);
      const aTop = labels[0].adjustedY - labels[0].height / 2;
      const aBottom = labels[0].adjustedY + labels[0].height / 2;
      const bTop = labels[1].adjustedY - labels[1].height / 2;
      const bBottom = labels[1].adjustedY + labels[1].height / 2;
      // One must be fully above or below the other
      expect(aBottom <= bTop + 0.1 || bBottom <= aTop + 0.1).toBe(true);
    });
  });

  // ── Three-label cluster ───────────────────────────────────────────

  describe('three-label cluster', () => {
    it('stacks three labels at the same Y contiguously', () => {
      const labels = [makeLabel(100, 20, 1), makeLabel(100, 20, 2), makeLabel(100, 20, 3)];
      resolveLabelCollisions(labels);
      assertNoOverlaps(labels);

      // All three should be contiguous (total span = 3 * 20 = 60)
      const tops = labels.map((l) => l.adjustedY - l.height / 2);
      const bottoms = labels.map((l) => l.adjustedY + l.height / 2);
      const totalSpan = Math.max(...bottoms) - Math.min(...tops);
      expect(totalSpan).toBeCloseTo(60, 0);
    });

    it('anchor (highest priority) stays at originalY, others stack around it', () => {
      const labels = [makeLabel(100, 20, 1), makeLabel(105, 20, 10), makeLabel(110, 20, 1)];
      resolveLabelCollisions(labels);
      // Priority 10 label should stay at its original position
      expect(labels[1].adjustedY).toBe(105);
      assertNoOverlaps(labels);
    });
  });

  // ── Multiple independent clusters ─────────────────────────────────

  describe('multiple independent clusters', () => {
    it('resolves two groups far apart independently', () => {
      // Cluster 1: labels at 50, 55 (height 20, overlap)
      // Cluster 2: labels at 500, 505 (height 20, overlap)
      const labels = [makeLabel(50, 20, 1), makeLabel(55, 20, 2), makeLabel(500, 20, 1), makeLabel(505, 20, 2)];
      resolveLabelCollisions(labels);
      assertNoOverlaps(labels);

      // Cluster 1 labels should be near 50-55 range
      expect(Math.abs(labels[0].adjustedY - 50)).toBeLessThan(30);
      expect(Math.abs(labels[1].adjustedY - 55)).toBeLessThan(30);
      // Cluster 2 labels should be near 500-505 range
      expect(Math.abs(labels[2].adjustedY - 500)).toBeLessThan(30);
      expect(Math.abs(labels[3].adjustedY - 505)).toBeLessThan(30);
    });

    it('adjusts labels within a cluster but leaves isolated labels untouched', () => {
      // Isolated label far away, cluster of two overlapping labels
      const isolated = makeLabel(1000, 20, 1);
      const clusterA = makeLabel(100, 20, 1);
      const clusterB = makeLabel(105, 20, 5);
      const labels = [isolated, clusterA, clusterB];
      resolveLabelCollisions(labels);

      // Isolated label should remain at original position
      expect(isolated.adjustedY).toBe(1000);
      // Cluster labels should be resolved
      assertNoOverlaps(labels);
    });
  });

  // ── Priority handling ─────────────────────────────────────────────

  describe('priority handling', () => {
    it('higher priority label stays at originalY', () => {
      const highPrio = makeLabel(100, 20, 100);
      const lowPrio = makeLabel(105, 20, 1);
      resolveLabelCollisions([highPrio, lowPrio]);
      expect(highPrio.adjustedY).toBe(100);
    });

    it('lower priority labels are displaced when overlapping a high-priority label', () => {
      const anchor = makeLabel(100, 20, 50);
      const low1 = makeLabel(100, 20, 1);
      const low2 = makeLabel(100, 20, 2);
      const labels = [anchor, low1, low2];
      resolveLabelCollisions(labels);

      expect(anchor.adjustedY).toBe(100);
      expect(low1.adjustedY).not.toBe(100);
      expect(low2.adjustedY).not.toBe(100);
      assertNoOverlaps(labels);
    });

    it('uses lower originalY as tiebreaker for equal priority', () => {
      // Two labels with same priority, overlapping
      const labelA = makeLabel(90, 20, 5);
      const labelB = makeLabel(95, 20, 5);
      resolveLabelCollisions([labelA, labelB]);
      // Label A has lower originalY, so it should be the anchor and stay at originalY
      expect(labelA.adjustedY).toBe(90);
      assertNoOverlaps([labelA, labelB]);
    });
  });

  // ── Cache behavior ────────────────────────────────────────────────

  describe('cache behavior', () => {
    it('returns same adjustedY values for same input called twice within 100ms', () => {
      const labels1 = [makeLabel(100, 20, 1), makeLabel(105, 20, 5)];
      resolveLabelCollisions(labels1);
      const adj1_0 = labels1[0].adjustedY;
      const adj1_1 = labels1[1].adjustedY;

      // Call again with same originalY/height values
      const labels2 = [makeLabel(100, 20, 1), makeLabel(105, 20, 5)];
      resolveLabelCollisions(labels2);
      expect(labels2[0].adjustedY).toBe(adj1_0);
      expect(labels2[1].adjustedY).toBe(adj1_1);
    });

    it('recomputes after clearCollisionCache is called', () => {
      const labels1 = [makeLabel(100, 20, 1), makeLabel(105, 20, 5)];
      resolveLabelCollisions(labels1);

      clearCollisionCache();

      // After clearing, this should recompute (still same result, but exercises the path)
      const labels2 = [makeLabel(100, 20, 1), makeLabel(105, 20, 5)];
      resolveLabelCollisions(labels2);
      // Results should still be correct
      assertNoOverlaps(labels2);
    });

    it('does not return cached results for different input', () => {
      const labels1 = [makeLabel(100, 20, 1), makeLabel(105, 20, 5)];
      resolveLabelCollisions(labels1);

      // Different positions - should not use cache
      const labels2 = [makeLabel(200, 30, 1), makeLabel(210, 30, 5)];
      resolveLabelCollisions(labels2);
      // labels2 should get its own correct resolution, not labels1's cached values
      assertNoOverlaps(labels2);
      // At least one label should be near 200-210, not near 100-105
      expect(labels2.some((l) => Math.abs(l.adjustedY - 200) < 50 || Math.abs(l.adjustedY - 210) < 50)).toBe(true);
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles 100 labels at similar positions within 50ms', () => {
      const labels: LabelBounds[] = [];
      for (let i = 0; i < 100; i++) {
        labels.push(makeLabel(100 + i * 2, 20, i));
      }

      const start = performance.now();
      resolveLabelCollisions(labels);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(50);
      assertNoOverlaps(labels);
    });

    it('handles labels with height=0 without crashing', () => {
      const labels = [makeLabel(100, 0), makeLabel(100, 0), makeLabel(100, 0)];
      expect(() => resolveLabelCollisions(labels)).not.toThrow();
    });
  });

  // ── Correctness checks ───────────────────────────────────────────

  describe('correctness checks', () => {
    it('resolves 10 labels at similar positions with no overlaps', () => {
      const labels: LabelBounds[] = [];
      for (let i = 0; i < 10; i++) {
        // Labels clustered around Y=200, each height 24
        labels.push(makeLabel(200 + i * 3, 24, i + 1));
      }
      resolveLabelCollisions(labels);
      assertNoOverlaps(labels);
    });

    it('when sorted by adjustedY, adjacent pairs have no overlaps', () => {
      const labels: LabelBounds[] = [];
      // Create a challenging scenario: multiple labels at very close positions
      for (let i = 0; i < 8; i++) {
        labels.push(makeLabel(150 + i * 2, 20, Math.floor(Math.random() * 10)));
      }
      resolveLabelCollisions(labels);

      // Sort by adjustedY and check adjacent pairs
      const sorted = [...labels].sort((a, b) => a.adjustedY - b.adjustedY);
      for (let i = 0; i < sorted.length - 1; i++) {
        const currentBottom = sorted[i].adjustedY + sorted[i].height / 2;
        const nextTop = sorted[i + 1].adjustedY - sorted[i + 1].height / 2;
        expect(currentBottom).toBeLessThanOrEqual(nextTop + 0.1);
      }
    });
  });
});
