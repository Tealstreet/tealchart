export interface CompiledFallbackReasonSummary {
  reason: string;
  count: number;
  scriptIds: string[];
}

export interface CompiledFallbackBaselineGroup {
  id: string;
  title: string;
  scriptCount: number;
  eligible: number;
  compiled: number;
  fallback: number;
  fallbackRate: number;
  knownFallbackReasons: CompiledFallbackReasonSummary[];
}

export interface CompiledFallbackBaseline {
  schemaVersion: 1;
  measuredAt: string;
  scope: string;
  groups: CompiledFallbackBaselineGroup[];
  overall: {
    eligible: number;
    compiled: number;
    fallback: number;
    fallbackRate: number;
  };
}

export const PINE_COMPILED_FALLBACK_BASELINE: CompiledFallbackBaseline = {
  schemaVersion: 1,
  measuredAt: '2026-08-30',
  scope: 'External reduced corpus plus 200+ line public-style composite indicators',
  groups: [
    {
      id: 'external-corpus',
      title: 'Reduced external public-style corpus expected to pass',
      scriptCount: 85,
      eligible: 77,
      compiled: 77,
      fallback: 0,
      fallbackRate: 0,
      knownFallbackReasons: [],
    },
    {
      id: 'true-length-composites',
      title: 'True-length 200-300 line composite parity scripts',
      scriptCount: 3,
      eligible: 3,
      compiled: 3,
      fallback: 0,
      fallbackRate: 0,
      knownFallbackReasons: [],
    },
    {
      id: 'awkward-composites',
      title: 'Awkward but valid public-style composite parity scripts',
      scriptCount: 6,
      eligible: 6,
      compiled: 6,
      fallback: 0,
      fallbackRate: 0,
      knownFallbackReasons: [],
    },
    {
      id: 'performance-composites',
      title: 'Performance 200+ line composite benchmark scripts',
      scriptCount: 3,
      eligible: 3,
      compiled: 3,
      fallback: 0,
      fallbackRate: 0,
      knownFallbackReasons: [],
    },
  ],
  overall: {
    eligible: 89,
    compiled: 89,
    fallback: 0,
    fallbackRate: 0,
  },
};

export function getCompiledFallbackBaselineGroup(id: string): CompiledFallbackBaselineGroup {
  const group = PINE_COMPILED_FALLBACK_BASELINE.groups.find((candidate) => candidate.id === id);
  if (!group) throw new Error(`Unknown compiled fallback baseline group ${id}`);
  return group;
}

export function summarizeCompiledFallbackReasons(
  fallbacks: Array<{ scriptId: string; reasons: readonly string[] }>,
): CompiledFallbackReasonSummary[] {
  const grouped = new Map<string, string[]>();
  for (const fallback of fallbacks) {
    const reasons = fallback.reasons.length > 0 ? fallback.reasons : ['unsupported script shape'];
    for (const reason of reasons) {
      const scriptIds = grouped.get(reason) ?? [];
      scriptIds.push(fallback.scriptId);
      grouped.set(reason, scriptIds);
    }
  }

  return [...grouped.entries()]
    .map(([reason, scriptIds]) => ({ reason, count: scriptIds.length, scriptIds: [...scriptIds].sort() }))
    .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason));
}
