/**
 * Label Collision Resolution - Cluster-Based Stacking
 *
 * Algorithm:
 * 1. Build clusters of overlapping labels (optimized: sort by Y, check adjacent only)
 * 2. For each cluster, stack labels from an anchor point (highest priority label)
 *
 * This makes gaps impossible by construction - each label is positioned
 * relative to the previous with explicit flush calculations.
 *
 * Performance optimizations:
 * - O(n log n) clustering via sorted adjacency check (was O(n²))
 * - Memoization based on input positions
 * - Early exit when no adjustments needed
 * - Iteration limits on all loops
 */

export interface LabelBounds {
  /** Optional identifier (used by mobile hook for caching) */
  id?: string;
  /** Original Y position (center of label) - never changes */
  originalY: number;
  /** Adjusted Y position after collision resolution */
  adjustedY: number;
  /** Label height in pixels */
  height: number;
  /** Priority for placement (higher = anchor, keeps exact position) */
  priority?: number;
}

// Memoization cache - keyed by hash of input positions
const collisionCache = new Map<string, { result: LabelBounds[]; timestamp: number }>();
const CACHE_MAX_SIZE = 50;
const CACHE_TTL_MS = 100; // Cache valid for 100ms (covers rapid re-renders)

/**
 * Clear the collision cache - call on component mount or significant state changes
 */
export function clearCollisionCache(): void {
  collisionCache.clear();
}

/**
 * Generate a cache key from label bounds
 */
function getCacheKey(labels: LabelBounds[]): string {
  // Include id (if present) so different sets of lines with same geometry produce different keys.
  const segments = labels.map((l) => `${l.id || ''}:${Math.round(l.originalY * 10)}:${Math.round(l.height * 10)}`);
  // Only sort when all labels have IDs — otherwise keep positional order
  // so index-based fallback in collision resolution stays consistent.
  if (labels.every((l) => l.id)) {
    segments.sort();
  }
  return segments.join('|');
}

/**
 * Check if two labels overlap, touch, or are very close based on their original positions
 * Uses margin to ensure nearby labels get clustered together
 */
function overlapsOrTouches(a: LabelBounds, b: LabelBounds): boolean {
  const margin = 2; // Cluster labels within 2px of each other
  const aTop = a.originalY - a.height / 2;
  const aBottom = a.originalY + a.height / 2;
  const bTop = b.originalY - b.height / 2;
  const bBottom = b.originalY + b.height / 2;
  // Overlap OR within margin of each other
  return aBottom >= bTop - margin && aTop <= bBottom + margin;
}

/**
 * Build clusters of overlapping labels using sorted adjacency check
 * O(n log n) for sort + O(n) for clustering = O(n log n) total
 * (Previously O(n²) with pairwise comparisons)
 */
function buildClusters<T extends LabelBounds>(labels: T[]): T[][] {
  if (labels.length === 0) return [];
  if (labels.length === 1) return [[labels[0]]];

  // Sort by originalY for efficient adjacent-only checking
  const sorted = [...labels].sort((a, b) => a.originalY - b.originalY);

  // Build clusters by checking only adjacent labels
  // Labels that overlap must be adjacent in Y-sorted order
  const clusters: T[][] = [];
  let currentCluster: T[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    // Check if current overlaps with ANY label in the current cluster
    // Since cluster is contiguous in Y, we only need to check the last few
    let overlapsCluster = false;

    // Check against cluster members from bottom up (most likely to overlap)
    for (let j = currentCluster.length - 1; j >= 0; j--) {
      if (overlapsOrTouches(currentCluster[j], current)) {
        overlapsCluster = true;
        break;
      }
      // Early exit: if current is completely below this cluster member, it won't overlap earlier ones
      const memberBottom = currentCluster[j].originalY + currentCluster[j].height / 2;
      const currentTop = current.originalY - current.height / 2;
      if (currentTop > memberBottom + 2) break;
    }

    if (overlapsCluster) {
      currentCluster.push(current);
    } else {
      // Start new cluster
      clusters.push(currentCluster);
      currentCluster = [current];
    }
  }

  // Don't forget the last cluster
  clusters.push(currentCluster);

  return clusters;
}

/**
 * Stack a cluster of labels from an anchor point
 * Anchor = highest priority label, stays at original position
 * Other labels stack above/below, flush against each other
 */
function stackCluster<T extends LabelBounds>(cluster: T[]): void {
  if (cluster.length === 0) return;

  if (cluster.length === 1) {
    // Single label - no collision, use original position
    cluster[0].adjustedY = cluster[0].originalY;
    return;
  }

  // Find anchor: highest priority, then lowest originalY as tiebreaker
  const anchor = cluster.reduce((best, curr) => {
    const bestPrio = best.priority ?? 0;
    const currPrio = curr.priority ?? 0;
    if (currPrio > bestPrio) return curr;
    if (currPrio < bestPrio) return best;
    // Same priority - use lower originalY (higher on screen)
    return curr.originalY < best.originalY ? curr : best;
  });

  // Anchor stays at original position
  anchor.adjustedY = anchor.originalY;

  // Split into above and below anchor (by originalY)
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

  // Sort above by originalY descending (closest to anchor first)
  above.sort((a, b) => b.originalY - a.originalY);

  // Sort below by originalY ascending (closest to anchor first)
  below.sort((a, b) => a.originalY - b.originalY);

  // Stack above (going upward from anchor)
  let currentTop = anchor.adjustedY - anchor.height / 2;
  for (const label of above) {
    label.adjustedY = currentTop - label.height / 2;
    currentTop = label.adjustedY - label.height / 2;
  }

  // Stack below (going downward from anchor)
  let currentBottom = anchor.adjustedY + anchor.height / 2;
  for (const label of below) {
    label.adjustedY = currentBottom + label.height / 2;
    currentBottom = label.adjustedY + label.height / 2;
  }
}

/**
 * Check if two labels overlap (more than just touching)
 * Uses tiny epsilon for floating-point precision
 */
function overlapsAdjusted(a: LabelBounds, b: LabelBounds): boolean {
  const epsilon = 0.1; // Tiny tolerance for floating-point
  const aTop = a.adjustedY - a.height / 2;
  const aBottom = a.adjustedY + a.height / 2;
  const bTop = b.adjustedY - b.height / 2;
  const bBottom = b.adjustedY + b.height / 2;
  // Overlap if labels are more than epsilon into each other's space
  return aBottom > bTop + epsilon && aTop < bBottom - epsilon;
}

/**
 * Check if any labels in array overlap with each other
 */
function hasAnyOverlaps<T extends LabelBounds>(labels: T[]): boolean {
  if (labels.length < 2) return false;

  // Sort by adjustedY for efficient adjacent checking
  const sorted = [...labels].sort((a, b) => a.adjustedY - b.adjustedY);

  for (let i = 0; i < sorted.length - 1; i++) {
    if (overlapsAdjusted(sorted[i], sorted[i + 1])) {
      return true;
    }
  }
  return false;
}

/**
 * Enforce monotonic ordering: labels sorted by originalY must have non-decreasing adjustedY.
 * When de-overlap pushes labels around, two labels can swap relative positions.
 * This pass detects inversions and re-stacks to fix them while maintaining no-overlap.
 */
function enforceOrdering<T extends LabelBounds>(labels: T[]): void {
  if (labels.length < 2) return;

  // Sort by originalY to get the "correct" ordering
  const sorted = [...labels].sort((a, b) => a.originalY - b.originalY);

  // Find inversions and fix by re-stacking downward
  for (let iter = 0; iter < 5; iter++) {
    let fixed = false;

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      // Inversion: prev should be above (lower adjustedY) but isn't
      if (prev.adjustedY > curr.adjustedY) {
        // Swap their adjustedY values
        const tmp = prev.adjustedY;
        prev.adjustedY = curr.adjustedY;
        curr.adjustedY = tmp;
        fixed = true;
      }

      // Also fix overlaps while maintaining order
      const prevBottom = prev.adjustedY + prev.height / 2;
      const currTop = curr.adjustedY - curr.height / 2;
      if (prevBottom > currTop + 0.1) {
        // Push current down to be flush below prev
        curr.adjustedY = prevBottom + curr.height / 2;
        fixed = true;
      }
    }

    if (!fixed) break;
  }
}

/**
 * Prune old entries from cache
 */
function pruneCache(): void {
  if (collisionCache.size <= CACHE_MAX_SIZE) return;

  const now = Date.now();
  const toDelete: string[] = [];

  collisionCache.forEach((entry, key) => {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      toDelete.push(key);
    }
  });

  toDelete.forEach((key) => {
    collisionCache.delete(key);
  });

  // If still too large, delete oldest entries
  if (collisionCache.size > CACHE_MAX_SIZE) {
    const entries = Array.from(collisionCache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);

    const deleteCount = collisionCache.size - CACHE_MAX_SIZE + 10;
    for (let i = 0; i < deleteCount && i < entries.length; i++) {
      collisionCache.delete(entries[i][0]);
    }
  }
}

/**
 * Resolve label collisions using cluster-based stacking
 *
 * @param labels - Array of labels with originalY, height, and optional priority
 * @returns The same array with adjustedY set to non-overlapping positions
 */
export function resolveLabelCollisions<T extends LabelBounds>(labels: T[]): T[] {
  if (labels.length === 0) return labels;
  if (labels.length === 1) {
    labels[0].adjustedY = labels[0].originalY;
    return labels;
  }

  // Check memoization cache
  const cacheKey = getCacheKey(labels);
  const now = Date.now();
  const cached = collisionCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    // Apply cached adjustedY values by ID when possible, fall back to index
    if (labels.every((l) => l.id)) {
      const cachedMap = new Map<string, number>();
      for (const r of cached.result) {
        if (r.id) cachedMap.set(r.id, r.adjustedY);
      }
      for (const label of labels) {
        const cachedY = cachedMap.get(label.id!);
        if (cachedY !== undefined) label.adjustedY = cachedY;
        else label.adjustedY = label.originalY;
      }
    } else {
      // Fallback to index-based for labels without IDs
      for (let i = 0; i < labels.length && i < cached.result.length; i++) {
        labels[i].adjustedY = cached.result[i].adjustedY;
      }
    }
    return labels;
  }

  // Phase 1: Build clusters of overlapping labels (based on original positions)
  // O(n log n) - sort + linear scan
  const clusters = buildClusters(labels);

  // Phase 2: Stack each cluster from its anchor
  for (const cluster of clusters) {
    stackCluster(cluster);
  }

  // Enforce ordering after cluster stacking (clusters can also produce inversions)
  enforceOrdering(labels);

  // Early exit: if no overlaps after cluster stacking, skip Phase 3
  if (!hasAnyOverlaps(labels)) {
    // Cache the result
    pruneCache();
    collisionCache.set(cacheKey, {
      result: labels.map((l) => ({ ...l })),
      timestamp: now,
    });
    return labels;
  }

  // Phase 3: Place labels by priority, highest first
  // Locked labels never move, lower priority labels adjust around them
  const byPriorityDesc = [...labels].sort((a, b) => {
    const aPrio = a.priority ?? 0;
    const bPrio = b.priority ?? 0;
    if (bPrio !== aPrio) return bPrio - aPrio;
    return a.adjustedY - b.adjustedY;
  });

  // Use sorted array for efficient overlap detection
  const locked: T[] = [];

  for (const label of byPriorityDesc) {
    // Find overlapping locked labels - check from closest first
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
      // Try placing above or below the group
      const abovePos = minTop - label.height / 2;
      const belowPos = maxBottom + label.height / 2;

      // Pick whichever is closer to original position
      const aboveDist = Math.abs(abovePos - label.originalY);
      const belowDist = Math.abs(belowPos - label.originalY);

      label.adjustedY = aboveDist <= belowDist ? abovePos : belowPos;

      // Check if new position overlaps with OTHER locked labels, keep pushing same direction
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

        // Keep pushing in same direction
        if (goingUp) {
          label.adjustedY = stillOverlapping.adjustedY - stillOverlapping.height / 2 - label.height / 2;
        } else {
          label.adjustedY = stillOverlapping.adjustedY + stillOverlapping.height / 2 + label.height / 2;
        }
      }
    }

    locked.push(label);
  }

  // Phase 4: Enforce monotonic ordering
  // Labels sorted by originalY must have non-decreasing adjustedY.
  // Phase 3 can violate this when pushing labels by "closest to original" direction.
  enforceOrdering(labels);

  // Cache the result
  pruneCache();
  collisionCache.set(cacheKey, {
    result: labels.map((l) => ({ ...l })),
    timestamp: now,
  });

  return labels;
}
