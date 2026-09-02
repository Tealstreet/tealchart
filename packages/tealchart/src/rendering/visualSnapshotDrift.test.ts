// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { VISUAL_SNAPSHOT_DRIFT_BASELINE } from './visualSnapshotDriftBaseline';
import {
  assertVisualSnapshotDriftMatchesBaseline,
  assertVisualSnapshotHasNoCommittedDrift,
  type VisualSnapshotDriftMeasurement,
} from './visualSnapshotDrift';

const baseline = VISUAL_SNAPSHOT_DRIFT_BASELINE[0]!;
const platformWithoutBaseline =
  (['aix', 'freebsd', 'openbsd', 'sunos', 'win32'] as const).find(
    (platform) => !VISUAL_SNAPSHOT_DRIFT_BASELINE.some((entry) => entry.platform === platform),
  ) ?? 'linux';

function makeMeasurement(name: string): VisualSnapshotDriftMeasurement {
  return {
    name,
    differingPixels: 1,
    totalPixels: 120_000,
    differingPixelRatio: 1 / 120_000,
    channelTolerance: 16,
    maxDifferingPixelRatio: 0.08,
    width: 400,
    height: 300,
  };
}

describe('visual snapshot drift baseline platform handling', () => {
  it('requires a committed drift baseline on platforms with recorded baseline data', () => {
    expect(() => {
      assertVisualSnapshotDriftMatchesBaseline(makeMeasurement('new-drift'), baseline.platform);
    }).toThrow(/no committed drift baseline/);
  });

  it('uses the global threshold only on platforms without committed renderer baselines', () => {
    expect(() => {
      assertVisualSnapshotDriftMatchesBaseline(makeMeasurement('new-drift'), platformWithoutBaseline);
    }).not.toThrow();
  });

  it('does not report stale baseline entries for another renderer platform', () => {
    expect(() => {
      assertVisualSnapshotHasNoCommittedDrift(baseline.name, platformWithoutBaseline);
    }).not.toThrow();
  });
});
