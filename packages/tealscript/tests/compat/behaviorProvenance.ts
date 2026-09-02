export const EXPECTED_VALUE_PROVENANCE_KINDS = [
  'independently-derived',
  'published-worked-example',
  'tealscript-regression-pin',
] as const;

export type ExpectedValueProvenance = (typeof EXPECTED_VALUE_PROVENANCE_KINDS)[number];

export interface ExpectedValueProvenanceDeclaration {
  expectedValueProvenance: ExpectedValueProvenance;
  expectedValueProvenanceNote: string;
}

export type ExpectedValueProvenanceCounts = Record<ExpectedValueProvenance, number>;

export function emptyExpectedValueProvenanceCounts(): ExpectedValueProvenanceCounts {
  return {
    'independently-derived': 0,
    'published-worked-example': 0,
    'tealscript-regression-pin': 0,
  };
}

export function countExpectedPlotValues(expectedPlots?: Record<string, unknown | readonly unknown[]>): number {
  if (!expectedPlots) return 0;
  let count = 0;
  for (const expected of Object.values(expectedPlots)) {
    count += Array.isArray(expected) ? expected.length : 1;
  }
  return count;
}

export function countExpectedErrors(expectedErrors?: readonly string[]): number {
  return expectedErrors?.length ?? 0;
}

export function addExpectedValueProvenanceCount(
  counts: ExpectedValueProvenanceCounts,
  provenance: ExpectedValueProvenance,
  expectedValueCount: number,
): void {
  counts[provenance] += expectedValueCount;
}

export function assertExpectedValueProvenanceDeclared(entry: ExpectedValueProvenanceDeclaration): void {
  if (!EXPECTED_VALUE_PROVENANCE_KINDS.includes(entry.expectedValueProvenance)) {
    throw new Error(`Unknown expected-value provenance: ${entry.expectedValueProvenance}`);
  }
  if (entry.expectedValueProvenanceNote.trim().length === 0) {
    throw new Error('Expected-value provenance note must explain the source of the literals');
  }
}
