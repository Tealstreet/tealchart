import type { CompiledFallbackBaseline, CompiledFallbackBaselineGroup, CompiledFallbackReasonSummary } from './compiledFallbackBaseline';

export interface ProductionWorkerFallbackBaselineGroup extends CompiledFallbackBaselineGroup {
  executionModes: Record<string, number>;
  liveUpdates: {
    updatesPerScript: number;
    total: number;
    compiled: number;
    fallback: number;
    fallbackRate: number;
    executionModes: Record<string, number>;
    knownFallbackReasons: CompiledFallbackReasonSummary[];
  };
  realtimeParity: {
    totalUpdates: number;
    workerMatched: number;
    workerMismatches: CompiledFallbackReasonSummary[];
  };
}

export interface ProductionWorkerFallbackBaseline extends Omit<CompiledFallbackBaseline, 'groups' | 'overall'> {
  groups: ProductionWorkerFallbackBaselineGroup[];
  overall: CompiledFallbackBaseline['overall'] & {
    executionModes: Record<string, number>;
    knownFallbackReasons: CompiledFallbackReasonSummary[];
    liveUpdates: {
      updatesPerScript: number;
      total: number;
      compiled: number;
      fallback: number;
      fallbackRate: number;
      executionModes: Record<string, number>;
      knownFallbackReasons: CompiledFallbackReasonSummary[];
    };
    realtimeParity: {
      totalUpdates: number;
      workerMatched: number;
      workerMismatches: CompiledFallbackReasonSummary[];
    };
  };
}
export const PINE_PRODUCTION_WORKER_FALLBACK_BASELINE: ProductionWorkerFallbackBaseline = {
  schemaVersion: 1,
  measuredAt: '2026-08-31',
  scope: 'External reduced corpus plus 200+ line public-style composite indicators through the real worker bridge and host-provided library registry',
  groups: [
    {
      id: 'external-corpus',
      title: 'Reduced external public-style corpus expected to pass through worker',
      scriptCount: 85,
      eligible: 77,
      compiled: 77,
      fallback: 0,
      fallbackRate: 0,
      executionModes: { compiled: 77 },
      knownFallbackReasons: [],
      liveUpdates: {
        updatesPerScript: 3,
        total: 231,
        compiled: 231,
        fallback: 0,
        fallbackRate: 0,
        executionModes: { compiled: 231 },
        knownFallbackReasons: [],
      },
      realtimeParity: {
        totalUpdates: 231,
        workerMatched: 231,
        workerMismatches: [],
      },
    },
    {
      id: 'true-length-composites',
      title: 'True-length 200-300 line composite parity scripts through worker',
      scriptCount: 3,
      eligible: 3,
      compiled: 3,
      fallback: 0,
      fallbackRate: 0,
      executionModes: { compiled: 3 },
      knownFallbackReasons: [],
      liveUpdates: {
        updatesPerScript: 3,
        total: 9,
        compiled: 9,
        fallback: 0,
        fallbackRate: 0,
        executionModes: { compiled: 9 },
        knownFallbackReasons: [],
      },
      realtimeParity: {
        totalUpdates: 9,
        workerMatched: 9,
        workerMismatches: [],
      },
    },
    {
      id: 'awkward-composites',
      title: 'Awkward but valid public-style composite parity scripts through worker',
      scriptCount: 6,
      eligible: 6,
      compiled: 6,
      fallback: 0,
      fallbackRate: 0,
      executionModes: { compiled: 6 },
      knownFallbackReasons: [],
      liveUpdates: {
        updatesPerScript: 3,
        total: 18,
        compiled: 18,
        fallback: 0,
        fallbackRate: 0,
        executionModes: { compiled: 18 },
        knownFallbackReasons: [],
      },
      realtimeParity: {
        totalUpdates: 18,
        workerMatched: 18,
        workerMismatches: [],
      },
    },
    {
      id: 'performance-composites',
      title: 'Performance 200+ line composite benchmark scripts through worker',
      scriptCount: 3,
      eligible: 3,
      compiled: 3,
      fallback: 0,
      fallbackRate: 0,
      executionModes: { compiled: 3 },
      knownFallbackReasons: [],
      liveUpdates: {
        updatesPerScript: 3,
        total: 9,
        compiled: 9,
        fallback: 0,
        fallbackRate: 0,
        executionModes: { compiled: 9 },
        knownFallbackReasons: [],
      },
      realtimeParity: {
        totalUpdates: 9,
        workerMatched: 9,
        workerMismatches: [],
      },
    },
  ],
  overall: {
    eligible: 89,
    compiled: 89,
    fallback: 0,
    fallbackRate: 0,
    executionModes: { compiled: 89 },
    knownFallbackReasons: [],
    liveUpdates: {
      updatesPerScript: 3,
      total: 267,
      compiled: 267,
      fallback: 0,
      fallbackRate: 0,
      executionModes: { compiled: 267 },
      knownFallbackReasons: [],
    },
    realtimeParity: {
      totalUpdates: 267,
      workerMatched: 267,
      workerMismatches: [],
    },
  },
};

export function getProductionWorkerFallbackBaselineGroup(id: string): ProductionWorkerFallbackBaselineGroup {
  const group = PINE_PRODUCTION_WORKER_FALLBACK_BASELINE.groups.find((candidate) => candidate.id === id);
  if (!group) throw new Error(`Unknown production worker fallback baseline group ${id}`);
  return group;
}

export function summarizeProductionWorkerExecutionModes(
  measurements: Array<{ executionMode: string; fallbackReason?: string; error?: string }>,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const measurement of measurements) {
    const mode = isProductionWorkerFallbackMeasurement(measurement) && measurement.executionMode === 'compiled'
      ? 'compiled-unsupported'
      : measurement.executionMode;
    counts[mode] = (counts[mode] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

export function isProductionWorkerFallbackMeasurement(
  measurement: { executionMode: string; fallbackReason?: string; error?: string },
): boolean {
  return measurement.executionMode !== 'compiled' || Boolean(measurement.fallbackReason) || Boolean(measurement.error);
}

export function summarizeProductionWorkerFallbackReasons(
  measurements: Array<{ scriptId: string; executionMode: string; fallbackReason?: string; error?: string }>,
): CompiledFallbackReasonSummary[] {
  const grouped = new Map<string, string[]>();
  for (const measurement of measurements) {
    if (!isProductionWorkerFallbackMeasurement(measurement)) continue;
    const reason = measurement.fallbackReason ?? (measurement.error ? `worker-error: ${measurement.error}` : 'unsupported script shape');
    const scriptIds = grouped.get(reason) ?? [];
    scriptIds.push(measurement.scriptId);
    grouped.set(reason, scriptIds);
  }

  return [...grouped.entries()]
    .map(([reason, scriptIds]) => ({ reason, count: scriptIds.length, scriptIds: [...scriptIds].sort() }))
    .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason));
}

export function summarizeRealtimeParityMismatches(
  mismatches: Array<{ scriptId: string; reason: string; updateIndex?: number }>,
): CompiledFallbackReasonSummary[] {
  const grouped = new Map<string, string[]>();
  for (const mismatch of mismatches) {
    const scriptIds = grouped.get(mismatch.reason) ?? [];
    scriptIds.push(mismatch.updateIndex === undefined ? mismatch.scriptId : `${mismatch.scriptId}#tick${mismatch.updateIndex + 1}`);
    grouped.set(mismatch.reason, scriptIds);
  }

  return [...grouped.entries()]
    .map(([reason, scriptIds]) => ({ reason, count: scriptIds.length, scriptIds: [...scriptIds].sort() }))
    .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason));
}
