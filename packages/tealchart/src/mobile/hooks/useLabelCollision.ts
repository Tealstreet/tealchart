/**
 * useLabelCollision - React hook wrapping shared label collision resolution
 *
 * The collision algorithm lives in utils/labelCollision.ts (shared with web).
 * This hook adds React memoization and per-id caching for RN re-renders.
 */

import { useMemo, useRef } from 'react';

import { resolveLabelCollisions } from '../../utils/labelCollision';

export type { LabelBounds } from '../../utils/labelCollision';

// Simple memoization cache
const CACHE_SIZE = 50;
const CACHE_TTL_MS = 100;

interface CacheEntry {
  result: Map<string, number>; // id -> adjustedY
  timestamp: number;
}

/** Mobile LabelBounds requires id for caching */
interface MobileLabelBounds {
  id: string;
  originalY: number;
  adjustedY: number;
  height: number;
  priority?: number;
}

/**
 * Hook to resolve label collisions for price line labels
 *
 * @param inputLabels - Array of labels with id, originalY, height, and optional priority
 * @returns Array of same labels with adjustedY computed
 */
export function useLabelCollision<T extends MobileLabelBounds>(inputLabels: T[]): T[] {
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  return useMemo(() => {
    if (inputLabels.length === 0) return inputLabels;

    // Generate cache key from input positions
    const cacheKey = inputLabels
      .map((l) => `${l.id}:${Math.round(l.originalY * 10)}:${Math.round(l.height * 10)}`)
      .join('|');

    const now = Date.now();
    const cached = cacheRef.current.get(cacheKey);

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      // Apply cached results
      return inputLabels.map((label) => ({
        ...label,
        adjustedY: cached.result.get(label.id) ?? label.originalY,
      }));
    }

    // Create mutable copies for resolution
    const labels = inputLabels.map((label) => ({
      ...label,
      adjustedY: label.originalY,
    }));

    // Resolve collisions using shared algorithm
    resolveLabelCollisions(labels);

    // Cache results
    if (cacheRef.current.size >= CACHE_SIZE) {
      // Remove oldest entries
      const entries = Array.from(cacheRef.current.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
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
