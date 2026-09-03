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
    interpreterMatched: number;
    interpreterMismatches: CompiledFallbackReasonSummary[];
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
      interpreterMatched: number;
      interpreterMismatches: CompiledFallbackReasonSummary[];
    };
  };
}

export interface RealtimeSafetyForcedCompiledAudit {
  measuredAt: string;
  scope: string;
  method: string;
  population: {
    scripts: {
      total: number;
      genuineDivergence: number;
      overtriggerMatched: number;
      compiledUnavailable: number;
    };
    liveUpdates: {
      total: number;
      genuineDivergence: number;
      overtriggerMatched: number;
      compiledUnavailable: number;
    };
  };
  genuineDivergenceScriptIds: string[];
  overtriggerMatchedScriptIds: string[];
}

export const PINE_REALTIME_SAFETY_FORCED_COMPILED_AUDIT: RealtimeSafetyForcedCompiledAudit = {
  measuredAt: '2026-08-31',
  scope: 'The 18 scripts and 54 same-bar tick updates rejected by the first conservative compiled realtime safety classifier',
  method: 'Force each rejected script through stateless compiled realtime execution, compare plots/drawings/alerts/logs to the interpreter updateBar path, and normalize implicit plot metadata defaults before classification.',
  population: {
    scripts: {
      total: 18,
      genuineDivergence: 4,
      overtriggerMatched: 14,
      compiledUnavailable: 0,
    },
    liveUpdates: {
      total: 54,
      genuineDivergence: 12,
      overtriggerMatched: 42,
      compiledUnavailable: 0,
    },
  },
  genuineDivergenceScriptIds: [
    'Awkward Interleaved Drawings',
    'True Length Structure Lifecycle',
    'drawing lifecycle composite',
    'request fanout composite',
  ],
  overtriggerMatchedScriptIds: [
    'Awkward Collections',
    'Awkward Multiline Request',
    'Awkward Tuple Branches',
    'Awkward UDT Chains',
    'True Length MTF Confluence Dashboard',
    'True Length Volume Signal Matrix',
    'dense computation composite',
    'external-request-data-table',
    'external-request-mtf-wrapper-computed-ta',
    'external-request-mtf-wrapper-root-input',
    'external-request-mtf-wrapper-tuple',
    'external-security-lower-tf-root-input-wrapper',
    'external-seed-request',
    'external-seed-root-input-wrapper',
  ],
};

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
        interpreterMatched: 231,
        interpreterMismatches: [],
      },
    },
    {
      id: 'true-length-composites',
      title: 'True-length 200-300 line composite parity scripts through worker',
      scriptCount: 3,
      eligible: 3,
      compiled: 0,
      fallback: 3,
      fallbackRate: 1,
      executionModes: { interpreter: 3 },
      knownFallbackReasons: [
        {
          reason: 'compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation; persistent-compound-mutation',
          count: 2,
          scriptIds: ['True Length MTF Confluence Dashboard', 'True Length Structure Lifecycle'],
        },
        {
          reason: 'compiled-worker-stateless-intrabar-reentry: collection-mutation; persistent-collection-mutation; persistent-compound-mutation',
          count: 1,
          scriptIds: ['True Length Volume Signal Matrix'],
        },
      ],
      liveUpdates: {
        updatesPerScript: 3,
        total: 9,
        compiled: 0,
        fallback: 9,
        fallbackRate: 1,
        executionModes: { interpreter: 9 },
        knownFallbackReasons: [
          {
            reason: 'compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation; persistent-compound-mutation',
            count: 6,
            scriptIds: [
              'True Length MTF Confluence Dashboard',
              'True Length MTF Confluence Dashboard',
              'True Length MTF Confluence Dashboard',
              'True Length Structure Lifecycle',
              'True Length Structure Lifecycle',
              'True Length Structure Lifecycle',
            ],
          },
          {
            reason: 'compiled-worker-stateless-intrabar-reentry: collection-mutation; persistent-collection-mutation; persistent-compound-mutation',
            count: 3,
            scriptIds: [
              'True Length Volume Signal Matrix',
              'True Length Volume Signal Matrix',
              'True Length Volume Signal Matrix',
            ],
          },
        ],
      },
      realtimeParity: {
        totalUpdates: 9,
        workerMatched: 9,
        workerMismatches: [],
        interpreterMatched: 9,
        interpreterMismatches: [],
      },
    },
    {
      id: 'awkward-composites',
      title: 'Awkward but valid public-style composite parity scripts through worker',
      scriptCount: 6,
      eligible: 6,
      compiled: 4,
      fallback: 2,
      fallbackRate: 2 / 6,
      executionModes: { compiled: 4, interpreter: 2 },
      knownFallbackReasons: [
        {
          reason: 'compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation',
          count: 2,
          scriptIds: ['Awkward Collections', 'Awkward Interleaved Drawings'],
        },
      ],
      liveUpdates: {
        updatesPerScript: 3,
        total: 18,
        compiled: 12,
        fallback: 6,
        fallbackRate: 6 / 18,
        executionModes: { compiled: 12, interpreter: 6 },
        knownFallbackReasons: [
          {
            reason: 'compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation',
            count: 6,
            scriptIds: [
              'Awkward Collections',
              'Awkward Collections',
              'Awkward Collections',
              'Awkward Interleaved Drawings',
              'Awkward Interleaved Drawings',
              'Awkward Interleaved Drawings',
            ],
          },
        ],
      },
      realtimeParity: {
        totalUpdates: 18,
        workerMatched: 18,
        workerMismatches: [],
        interpreterMatched: 18,
        interpreterMismatches: [],
      },
    },
    {
      id: 'performance-composites',
      title: 'Performance 200+ line composite benchmark scripts through worker',
      scriptCount: 3,
      eligible: 3,
      compiled: 0,
      fallback: 3,
      fallbackRate: 1,
      executionModes: { interpreter: 3 },
      knownFallbackReasons: [
        {
          reason: 'compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation; persistent-compound-mutation',
          count: 3,
          scriptIds: ['dense computation composite', 'drawing lifecycle composite', 'request fanout composite'],
        },
      ],
      liveUpdates: {
        updatesPerScript: 3,
        total: 9,
        compiled: 0,
        fallback: 9,
        fallbackRate: 1,
        executionModes: { interpreter: 9 },
        knownFallbackReasons: [
          {
            reason: 'compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation; persistent-compound-mutation',
            count: 9,
            scriptIds: [
              'dense computation composite',
              'dense computation composite',
              'dense computation composite',
              'drawing lifecycle composite',
              'drawing lifecycle composite',
              'drawing lifecycle composite',
              'request fanout composite',
              'request fanout composite',
              'request fanout composite',
            ],
          },
        ],
      },
      realtimeParity: {
        totalUpdates: 9,
        workerMatched: 9,
        workerMismatches: [],
        interpreterMatched: 9,
        interpreterMismatches: [],
      },
    },
  ],
  overall: {
    eligible: 89,
    compiled: 81,
    fallback: 8,
    fallbackRate: 8 / 89,
    executionModes: { compiled: 81, interpreter: 8 },
    knownFallbackReasons: [
      {
        reason: 'compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation; persistent-compound-mutation',
        count: 5,
        scriptIds: [
          'True Length MTF Confluence Dashboard',
          'dense computation composite',
          'drawing lifecycle composite',
          'request fanout composite',
          'True Length Structure Lifecycle',
        ],
      },
      {
        reason: 'compiled-worker-stateless-intrabar-reentry: collection-mutation; persistent-collection-mutation; persistent-compound-mutation',
        count: 1,
        scriptIds: ['True Length Volume Signal Matrix'],
      },
      {
        reason: 'compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation',
        count: 2,
        scriptIds: ['Awkward Collections', 'Awkward Interleaved Drawings'],
      },
    ],
    liveUpdates: {
      updatesPerScript: 3,
      total: 267,
      compiled: 243,
      fallback: 24,
      fallbackRate: 24 / 267,
      executionModes: { compiled: 243, interpreter: 24 },
      knownFallbackReasons: [
        {
          reason: 'compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation; persistent-compound-mutation',
          count: 15,
          scriptIds: [
            'True Length MTF Confluence Dashboard',
            'True Length MTF Confluence Dashboard',
            'True Length MTF Confluence Dashboard',
            'dense computation composite',
            'dense computation composite',
            'dense computation composite',
            'drawing lifecycle composite',
            'drawing lifecycle composite',
            'drawing lifecycle composite',
            'request fanout composite',
            'request fanout composite',
            'request fanout composite',
            'True Length Structure Lifecycle',
            'True Length Structure Lifecycle',
            'True Length Structure Lifecycle',
          ],
        },
        {
          reason: 'compiled-worker-stateless-intrabar-reentry: collection-mutation; history-with-intrabar-state; persistent-collection-mutation',
          count: 6,
          scriptIds: [
            'Awkward Collections',
            'Awkward Collections',
            'Awkward Collections',
            'Awkward Interleaved Drawings',
            'Awkward Interleaved Drawings',
            'Awkward Interleaved Drawings',
          ],
        },
        {
          reason: 'compiled-worker-stateless-intrabar-reentry: collection-mutation; persistent-collection-mutation; persistent-compound-mutation',
          count: 3,
          scriptIds: [
            'True Length Volume Signal Matrix',
            'True Length Volume Signal Matrix',
            'True Length Volume Signal Matrix',
          ],
        },
      ],
    },
    realtimeParity: {
      totalUpdates: 267,
      workerMatched: 267,
      workerMismatches: [],
      interpreterMatched: 267,
      interpreterMismatches: [],
    },
  },
};

export function getProductionWorkerFallbackBaselineGroup(id: string): ProductionWorkerFallbackBaselineGroup {
  const group = PINE_PRODUCTION_WORKER_FALLBACK_BASELINE.groups.find((candidate) => candidate.id === id);
  if (!group) throw new Error(`Unknown production worker fallback baseline group ${id}`);
  return group;
}

export function summarizeProductionWorkerExecutionModes(
  measurements: Array<{ executionMode: string }>,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const measurement of measurements) {
    counts[measurement.executionMode] = (counts[measurement.executionMode] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

export function summarizeProductionWorkerFallbackReasons(
  measurements: Array<{ scriptId: string; executionMode: string; fallbackReason?: string; error?: string }>,
): CompiledFallbackReasonSummary[] {
  const grouped = new Map<string, string[]>();
  for (const measurement of measurements) {
    if (measurement.executionMode === 'compiled') continue;
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
