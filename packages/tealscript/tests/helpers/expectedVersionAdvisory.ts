import type { SemanticDiagnostic } from '../../src/semantic';

export function expectedVersionAdvisories(version: number): SemanticDiagnostic[] {
  // V85 trace series/zero-control, attempts 1–5, witness the same LF version-header shape.
  if (version === 3) return [{
    code: 'PINE_VERSION_OUTDATED',
    message: 'Version 3 of Pine Script® is outdated. We recommend using the current version, which is 6.',
    severity: 'warning', line: 1, column: 3,
  }];
  if (version === 4) return [{
    code: 'PINE_VERSION_OUTDATED',
    message: 'Version 4 of Pine Script® is outdated. We recommend using the current version, which is 6.',
    severity: 'warning', line: 1, column: 3,
  }];
  if (version === 5) return [{
    code: 'PINE_VERSION_OUTDATED',
    message: 'Version 5 of Pine Script® is outdated. We recommend using the current version, which is 6.',
    severity: 'warning', line: 1, column: 3,
  }];
  return [];
}

export function withVersionAdvisory<T>(expected: readonly T[], version: number): (T | SemanticDiagnostic)[] {
  return [...expectedVersionAdvisories(version), ...expected];
}
