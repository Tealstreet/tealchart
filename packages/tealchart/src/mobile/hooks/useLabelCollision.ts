/**
 * useLabelCollision - Hook for resolving overlapping price line labels
 *
 * Algorithm (ported from web's labelCollision.ts):
 * 1. Build clusters of overlapping labels (optimized: sort by Y, check adjacent only)
 * 2. For each cluster, stack labels from an anchor point (highest priority label)
 * 3. If still overlapping after cluster stacking, use priority-based placement
 *
 * This makes gaps impossible by construction - each label is positioned
 * relative to the previous with explicit flush calculations.
 */

import { useMemo, useRef } from 'react';

export interface LabelBounds {
  /** Unique identifier for the label */
  id: string;
  /** Original Y position (center of label) - never changes */
  originalY: number;
  /** Adjusted Y position after collision resolution */
  adjustedY: number;
  /** Label height in pixels */
  height: number;
  /** Priority for placement (higher = anchor, keeps exact position) */
  priority?: number;
}

// Simple memoization cache
const CACHE_SIZE = 50;
const CACHE_TTL_MS = 100;

interface CacheEntry {
  result: Map<string, number>; // id -> adjustedY
  timestamp: number;
}

/**
 * Check if two labels overlap or are very close based on their original positions
 */
function overlapsOrTouches(a: LabelBounds, b: LabelBounds): boolean {
  const margin = 2;
  const aTop = a.originalY - a.height / 2;
  const aBottom = a.originalY + a.height / 2;
  const bTop = b.originalY - b.height / 2;
  const bBottom = b.originalY + b.height / 2;
  return aBottom >= bTop - margin && aTop <= bBottom + margin;
}

/**
 * Build clusters of overlapping labels using sorted adjacency check
 */
function buildClusters<T extends LabelBounds>(labels: T[]): T[][] {
  if (labels.length === 0) return [];
  if (labels.length === 1) return [[labels[0]]];

  const sorted = [...labels].sort((a, b) => a.originalY - b.originalY);
  const clusters: T[][] = [];
  let currentCluster: T[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    let overlapsCluster = false;

    for (let j = currentCluster.length - 1; j >= 0; j--) {
      if (overlapsOrTouches(currentCluster[j], current)) {
        overlapsCluster = true;
        break;
      }
      const memberBottom = currentCluster[j].originalY + currentCluster[j].height / 2;
      const currentTop = current.originalY - current.height / 2;
      if (currentTop > memberBottom + 2) break;
    }

    if (overlapsCluster) {
      currentCluster.push(current);
    } else {
      clusters.push(currentCluster);
      currentCluster = [current];
    }
  }

  clusters.push(currentCluster);
  return clusters;
}

/**
 * Stack a cluster of labels from an anchor point
 */
function stackCluster<T extends LabelBounds>(cluster: T[]): void {
  if (cluster.length === 0) return;

  if (cluster.length === 1) {
    cluster[0].adjustedY = cluster[0].originalY;
    return;
  }

  // Find anchor: highest priority, then lowest originalY as tiebreaker
  const anchor = cluster.reduce((best, curr) => {
    const bestPrio = best.priority ?? 0;
    const currPrio = curr.priority ?? 0;
    if (currPrio > bestPrio) return curr;
    if (currPrio < bestPrio) return best;
    return curr.originalY < best.originalY ? curr : best;
  });

  anchor.adjustedY = anchor.originalY;

  const above: T[] = [];
  const below: T[] = [];

  for (const label of cluster) {
    if (label === anchor) continue;
    if (label.originalY < anchor.originalY) {
      above.push(label);
    } else {
      below.push(label);
    }
  }

  above.sort((a, b) => b.originalY - a.originalY);
  below.sort((a, b) => a.originalY - b.originalY);

  let currentTop = anchor.adjustedY - anchor.height / 2;
  for (const label of above) {
    label.adjustedY = currentTop - label.height / 2;
    currentTop = label.adjustedY - label.height / 2;
  }

  let currentBottom = anchor.adjustedY + anchor.height / 2;
  for (const label of below) {
    label.adjustedY = currentBottom + label.height / 2;
    currentBottom = label.adjustedY + label.height / 2;
  }
}

/**
 * Check if two labels overlap (more than just touching)
 */
function overlapsAdjusted(a: LabelBounds, b: LabelBounds): boolean {
  const epsilon = 0.1;
  const aTop = a.adjustedY - a.height / 2;
  const aBottom = a.adjustedY + a.height / 2;
  const bTop = b.adjustedY - b.height / 2;
  const bBottom = b.adjustedY + b.height / 2;
  return aBottom > bTop + epsilon && aTop < bBottom - epsilon;
}

/**
 * Check if any labels overlap with each other
 */
function hasAnyOverlaps<T extends LabelBounds>(labels: T[]): boolean {
  if (labels.length < 2) return false;

  const sorted = [...labels].sort((a, b) => a.adjustedY - b.adjustedY);

  for (let i = 0; i < sorted.length - 1; i++) {
    if (overlapsAdjusted(sorted[i], sorted[i + 1])) {
      return true;
    }
  }
  return false;
}

/**
 * Resolve label collisions using cluster-based stacking
 */
function resolveLabelCollisions<T extends LabelBounds>(labels: T[]): T[] {
  if (labels.length === 0) return labels;
  if (labels.length === 1) {
    labels[0].adjustedY = labels[0].originalY;
    return labels;
  }

  // Phase 1: Build clusters
  const clusters = buildClusters(labels);

  // Phase 2: Stack each cluster
  for (const cluster of clusters) {
    stackCluster(cluster);
  }

  // Early exit if no overlaps
  if (!hasAnyOverlaps(labels)) {
    return labels;
  }

  // Phase 3: Priority-based placement
  const byPriorityDesc = [...labels].sort((a, b) => {
    const aPrio = a.priority ?? 0;
    const bPrio = b.priority ?? 0;
    if (bPrio !== aPrio) return bPrio - aPrio;
    return a.adjustedY - b.adjustedY;
  });

  const locked: T[] = [];

  for (const label of byPriorityDesc) {
    let minTop = Infinity;
    let maxBottom = -Infinity;
    let hasOverlap = false;

    for (const l of locked) {
      if (overlapsAdjusted(label, l)) {
        hasOverlap = true;
        const top = l.adjustedY - l.height / 2;
        const bottom = l.adjustedY + l.height / 2;
        if (top < minTop) minTop = top;
        if (bottom > maxBottom) maxBottom = bottom;
      }
    }

    if (hasOverlap) {
      const abovePos = minTop - label.height / 2;
      const belowPos = maxBottom + label.height / 2;

      const aboveDist = Math.abs(abovePos - label.originalY);
      const belowDist = Math.abs(belowPos - label.originalY);

      label.adjustedY = aboveDist <= belowDist ? abovePos : belowPos;

      const goingUp = label.adjustedY < label.originalY;
      for (let iter = 0; iter < 20; iter++) {
        let stillOverlapping: T | undefined;
        for (const l of locked) {
          if (overlapsAdjusted(label, l)) {
            stillOverlapping = l;
            break;
          }
        }
        if (!stillOverlapping) break;

        if (goingUp) {
          label.adjustedY = stillOverlapping.adjustedY - stillOverlapping.height / 2 - label.height / 2;
        } else {
          label.adjustedY = stillOverlapping.adjustedY + stillOverlapping.height / 2 + label.height / 2;
        }
      }
    }

    locked.push(label);
  }

  return labels;
}

/**
 * Hook to resolve label collisions for price line labels
 *
 * @param inputLabels - Array of labels with id, originalY, height, and optional priority
 * @returns Array of same labels with adjustedY computed
 */
export function useLabelCollision<T extends LabelBounds>(
  inputLabels: T[]
): T[] {
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  return useMemo(() => {
    if (inputLabels.length === 0) return inputLabels;

    // Generate cache key from input positions
    const cacheKey = inputLabels
      .map(l => `${l.id}:${Math.round(l.originalY * 10)}:${Math.round(l.height * 10)}`)
      .join('|');

    const now = Date.now();
    const cached = cacheRef.current.get(cacheKey);

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      // Apply cached results
      return inputLabels.map(label => ({
        ...label,
        adjustedY: cached.result.get(label.id) ?? label.originalY,
      }));
    }

    // Create mutable copies for resolution
    const labels = inputLabels.map(label => ({
      ...label,
      adjustedY: label.originalY,
    }));

    // Resolve collisions
    resolveLabelCollisions(labels);

    // Cache results
    if (cacheRef.current.size >= CACHE_SIZE) {
      // Remove oldest entries
      const entries = Array.from(cacheRef.current.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      for (let i = 0; i < 10 && i < entries.length; i++) {
        cacheRef.current.delete(entries[i][0]);
      }
    }

    const resultMap = new Map<string, number>();
    for (const label of labels) {
      resultMap.set(label.id, label.adjustedY);
    }
    cacheRef.current.set(cacheKey, { result: resultMap, timestamp: now });

    return labels as T[];
  }, [inputLabels]);
}

export default useLabelCollision;
