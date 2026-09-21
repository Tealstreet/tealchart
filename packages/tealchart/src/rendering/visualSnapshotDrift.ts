import { createCanvas, loadImage } from '@napi-rs/canvas';

import { VISUAL_SNAPSHOT_DRIFT_BASELINE } from './visualSnapshotDriftBaseline';

export const SNAPSHOT_CHANNEL_TOLERANCE = 16;
export const SNAPSHOT_MAX_DIFFERING_PIXEL_RATIO = 0.08;

export interface SnapshotPixels {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface VisualSnapshotDriftMeasurement {
  name: string;
  differingPixels: number;
  totalPixels: number;
  differingPixelRatio: number;
  channelTolerance: number;
  maxDifferingPixelRatio: number;
  width: number;
  height: number;
}

const baselinePlatforms = new Set(VISUAL_SNAPSHOT_DRIFT_BASELINE.map((entry) => entry.platform));
const driftBaselineByPlatformAndName = new Map(
  VISUAL_SNAPSHOT_DRIFT_BASELINE.map((entry) => [`${entry.platform}:${entry.name}`, entry]),
);

function getDriftBaseline(name: string, platform: NodeJS.Platform) {
  return driftBaselineByPlatformAndName.get(`${platform}:${name}`);
}

export async function readSnapshotPixels(buffer: Buffer): Promise<SnapshotPixels> {
  const image = await loadImage(buffer);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);

  return {
    width: image.width,
    height: image.height,
    data: ctx.getImageData(0, 0, image.width, image.height).data,
  };
}

export function measureVisualSnapshotDrift(
  name: string,
  expected: SnapshotPixels,
  actual: SnapshotPixels,
): VisualSnapshotDriftMeasurement {
  let differingPixels = 0;
  for (let i = 0; i < expected.data.length; i += 4) {
    const channelDelta = Math.max(
      Math.abs(expected.data[i]! - actual.data[i]!),
      Math.abs(expected.data[i + 1]! - actual.data[i + 1]!),
      Math.abs(expected.data[i + 2]! - actual.data[i + 2]!),
      Math.abs(expected.data[i + 3]! - actual.data[i + 3]!),
    );

    if (channelDelta > SNAPSHOT_CHANNEL_TOLERANCE) {
      differingPixels += 1;
    }
  }

  const totalPixels = expected.width * expected.height;
  return {
    name,
    differingPixels,
    totalPixels,
    differingPixelRatio: differingPixels / totalPixels,
    channelTolerance: SNAPSHOT_CHANNEL_TOLERANCE,
    maxDifferingPixelRatio: SNAPSHOT_MAX_DIFFERING_PIXEL_RATIO,
    width: expected.width,
    height: expected.height,
  };
}

export async function measureVisualSnapshotDriftFromBuffers(
  name: string,
  expectedBuffer: Buffer,
  actualBuffer: Buffer,
): Promise<VisualSnapshotDriftMeasurement> {
  const [expected, actual] = await Promise.all([
    readSnapshotPixels(expectedBuffer),
    readSnapshotPixels(actualBuffer),
  ]);

  if (expected.width !== actual.width || expected.height !== actual.height) {
    return {
      name,
      differingPixels: Number.POSITIVE_INFINITY,
      totalPixels: expected.width * expected.height,
      differingPixelRatio: Number.POSITIVE_INFINITY,
      channelTolerance: SNAPSHOT_CHANNEL_TOLERANCE,
      maxDifferingPixelRatio: SNAPSHOT_MAX_DIFFERING_PIXEL_RATIO,
      width: actual.width,
      height: actual.height,
    };
  }

  return measureVisualSnapshotDrift(name, expected, actual);
}

export function assertVisualSnapshotHasNoCommittedDrift(name: string, platform = process.platform): void {
  if (getDriftBaseline(name, platform)) {
    throw new Error(
      `Visual snapshot "${name}" now matches its PNG baseline, but committed drift data still lists it. ` +
      'Run yarn workspace @tealstreet/tealchart visual:snapshot:drift after reviewing the rendered change.',
    );
  }
}

export function assertVisualSnapshotDriftMatchesBaseline(
  measurement: VisualSnapshotDriftMeasurement,
  platform = process.platform,
): void {
  if (measurement.differingPixelRatio > SNAPSHOT_MAX_DIFFERING_PIXEL_RATIO) return;

  const baseline = getDriftBaseline(measurement.name, platform);
  if (!baseline) {
    if (!baselinePlatforms.has(platform)) return;

    throw new Error(
      `Visual snapshot "${measurement.name}" has tolerated drift of ${formatDriftRatio(measurement.differingPixelRatio)}, but no committed drift baseline. ` +
      'Run yarn workspace @tealstreet/tealchart visual:snapshot:drift after reviewing the rendered change.',
    );
  }

  const measuredTheSameFrame =
    measurement.totalPixels === baseline.totalPixels &&
    measurement.channelTolerance === baseline.channelTolerance &&
    measurement.maxDifferingPixelRatio === baseline.maxDifferingPixelRatio &&
    measurement.width === baseline.width &&
    measurement.height === baseline.height;

  if (!measuredTheSameFrame) {
    throw new Error(
      `Visual snapshot "${measurement.name}" was measured at ${measurement.width}x${measurement.height} against a baseline recorded at ${baseline.width}x${baseline.height}. ` +
      'Run yarn workspace @tealstreet/tealchart visual:snapshot:drift after reviewing the rendered change.',
    );
  }

  // A ceiling rather than an equality: `linux` covers two different CI hosts --
  // the monorepo's self-hosted runner and the mirror's ubuntu-latest -- whose
  // font stacks rasterise glyphs differently, so one entry must accept both.
  if (measurement.differingPixels > baseline.differingPixels) {
    throw new Error(
      `Visual snapshot "${measurement.name}" drift rose above its committed ceiling of ${baseline.differingPixels}/${baseline.totalPixels} (${formatDriftRatio(baseline.differingPixelRatio)}) to ${measurement.differingPixels}/${measurement.totalPixels} (${formatDriftRatio(measurement.differingPixelRatio)}). ` +
      'Run yarn workspace @tealstreet/tealchart visual:snapshot:drift after reviewing the rendered change.',
    );
  }
}

export function formatDriftRatio(ratio: number): string {
  return `${(ratio * 100).toFixed(2)}%`;
}
