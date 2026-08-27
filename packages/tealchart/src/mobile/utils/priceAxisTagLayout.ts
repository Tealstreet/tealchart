export const NATIVE_PRICE_AXIS_COUNTDOWN_SAMPLE = '888:88:88';

export interface NativePriceAxisTagTextLayout {
  text: string;
  x: number;
}

export interface NativePriceAxisTagLayout {
  x: number;
  width: number;
  text: string;
  textX: number;
}

export interface NativePriceAxisTagFrame {
  dimensions: {
    width: number;
  };
}

export interface NativePriceAxisTagLayoutInput {
  frame: NativePriceAxisTagFrame;
  text: string;
  textWidth: (text: string) => number;
  minWidth: number;
  paddingX: number;
  rightInset: number;
}

export interface NativePriceAxisTagCollisionSource {
  id: string;
  originalY: number;
  height: number;
  priority?: number;
  fixed?: boolean;
}

export interface NativeResolvedPriceAxisTag {
  id: string;
  originalY: number;
  centerY: number;
  height: number;
  fixed?: boolean;
}

export function fitNativePriceAxisTextToWidth(
  text: string,
  maxWidth: number,
  textWidth: (text: string) => number,
): string {
  if (maxWidth <= 0) return '';
  if (textWidth(text) <= maxWidth) return text;

  const suffix = '...';
  const suffixWidth = textWidth(suffix);
  if (suffixWidth > maxWidth) return '';

  let end = text.length;
  while (end > 0 && textWidth(`${text.slice(0, end)}${suffix}`) > maxWidth) {
    end -= 1;
  }

  return end > 0 ? `${text.slice(0, end)}${suffix}` : suffix;
}

export function createNativePriceAxisTagTextLayout(
  x: number,
  width: number,
  text: string,
  textWidth: (text: string) => number,
  paddingX: number,
): NativePriceAxisTagTextLayout {
  const availableWidth = Math.max(0, width - paddingX * 2);
  const displayText = fitNativePriceAxisTextToWidth(text, availableWidth, textWidth);
  const displayWidth = Math.min(availableWidth, textWidth(displayText));

  return {
    text: displayText,
    x: x + Math.max(0, (width - displayWidth) / 2),
  };
}

export function createNativePriceAxisTagLayout(input: NativePriceAxisTagLayoutInput): NativePriceAxisTagLayout {
  const axisRight = input.frame.dimensions.width - input.rightInset;
  const measuredWidth = input.textWidth(input.text) + input.paddingX * 2;
  const width = Math.max(0, Math.max(input.minWidth, measuredWidth));
  const x = axisRight - width;
  const label = createNativePriceAxisTagTextLayout(x, width, input.text, input.textWidth, input.paddingX);

  return {
    x,
    width,
    text: label.text,
    textX: label.x,
  };
}

export function getNativeCountdownLayoutText(label: string): string {
  return label.length <= 5 ? '88:88' : NATIVE_PRICE_AXIS_COUNTDOWN_SAMPLE;
}

export function getNativePriceLineMeasurementText(
  primaryLabel: string,
  secondaryLabel: string | undefined,
  textWidth: (text: string) => number,
): string {
  if (!secondaryLabel) return primaryLabel;
  return textWidth(primaryLabel) >= textWidth(secondaryLabel) ? primaryLabel : secondaryLabel;
}

export function getNativePriceAxisSingleLineTextBaselineOffset(tagHeight: number): number {
  return Math.round(tagHeight / 2 + 4);
}

export function getNativePriceAxisPrimaryTextBaselineOffset(tagHeight: number): number {
  return Math.round(tagHeight * 0.41);
}

export function getNativePriceAxisSecondaryTextBaselineOffset(tagHeight: number): number {
  return Math.round(tagHeight * 0.79);
}

/**
 * Keep a tag's whole box inside the plot, whatever its priority.
 *
 * `fixed` means the other tags give way to this one - the last-trade tag holds
 * the price while the rest stack around it. It has never meant the tag may
 * leave the chart, but it was reading that way: a two-line countdown tag near
 * the low of the range spilled past the plot into the time axis, where the
 * settings gear then drew over its countdown.
 *
 * Web bounds every label this way already, in
 * `TealchartRenderer.calculatePriceLineLabelBounds`.
 */
export function clampNativePriceAxisTagCenterY(centerY: number, height: number, minY: number, maxY: number): number {
  'worklet';
  return Math.max(minY + height / 2, Math.min(maxY - height / 2, centerY));
}

/**
 * The floor only. Deliberately not the ceiling: a stack that cannot fit above a
 * fixed tag is allowed to run past the top, and the existing overflow passes
 * depend on that to avoid overlapping the tag they are stacking around. Below
 * is different - that is where the time axis is.
 */
export function clampNativePriceAxisTagBottom(centerY: number, height: number, maxY: number): number {
  'worklet';
  return Math.min(centerY, maxY - height / 2);
}

/**
 * Two tags are in the same run when the lower one is already sitting on the
 * upper one's edge, which is what the stacking passes leave behind.
 */
function isNativePriceAxisTagPackedAgainst(
  previous: { centerY: number; height: number },
  current: { centerY: number; height: number },
  gap: number,
): boolean {
  'worklet';
  return current.centerY - current.height / 2 <= previous.centerY + previous.height / 2 + gap + 0.001;
}

export function resolveNativePriceAxisTagStack(
  sources: readonly NativePriceAxisTagCollisionSource[],
  minY: number,
  maxY: number,
  gap = 2,
): NativeResolvedPriceAxisTag[] {
  'worklet';
  if (sources.length === 0) return [];

  const sorted = sources
    .filter((source) => source.originalY >= minY && source.originalY <= maxY)
    .map((source) => ({
      id: source.id,
      originalY: source.originalY,
      centerY:
        source.fixed === true
          ? clampNativePriceAxisTagBottom(source.originalY, source.height, maxY)
          : clampNativePriceAxisTagCenterY(source.originalY, source.height, minY, maxY),
      height: source.height,
      priority: source.priority ?? 0,
      fixed: source.fixed === true,
    }))
    .sort((a, b) => {
      if (a.centerY !== b.centerY) return a.centerY - b.centerY;
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  if (sorted.length === 0) return [];

  const resolved: typeof sorted = [];
  let cluster: typeof sorted = [];

  const flushCluster = () => {
    if (cluster.length === 0) return;
    if (cluster.length === 1) {
      resolved.push(cluster[0]);
      cluster = [];
      return;
    }

    let anchorIndex = 0;
    for (let index = 1; index < cluster.length; index += 1) {
      const anchor = cluster[anchorIndex];
      const candidate = cluster[index];
      if (
        (candidate.fixed && !anchor.fixed) ||
        (candidate.fixed === anchor.fixed &&
          (candidate.priority > anchor.priority ||
            (candidate.priority === anchor.priority && candidate.centerY < anchor.centerY)))
      ) {
        anchorIndex = index;
      }
    }

    const anchor = cluster[anchorIndex];
    const above = cluster.slice(0, anchorIndex).reverse();
    const below = cluster.slice(anchorIndex + 1);

    let currentTop = anchor.centerY - anchor.height / 2;
    for (let index = 0; index < above.length; index += 1) {
      const tag = above[index];
      if (!tag.fixed) tag.centerY = currentTop - gap - tag.height / 2;
      currentTop = tag.centerY - tag.height / 2;
    }

    let currentBottom = anchor.centerY + anchor.height / 2;
    for (let index = 0; index < below.length; index += 1) {
      const tag = below[index];
      if (!tag.fixed) tag.centerY = currentBottom + gap + tag.height / 2;
      currentBottom = tag.centerY + tag.height / 2;
    }

    resolved.push(...cluster);
    cluster = [];
  };

  for (let index = 0; index < sorted.length; index += 1) {
    const tag = sorted[index];
    if (cluster.length === 0) {
      cluster.push(tag);
      continue;
    }

    let clusterBottom = cluster[0].originalY + cluster[0].height / 2;
    for (let clusterIndex = 1; clusterIndex < cluster.length; clusterIndex += 1) {
      clusterBottom = Math.max(clusterBottom, cluster[clusterIndex].originalY + cluster[clusterIndex].height / 2);
    }
    const tagTop = tag.originalY - tag.height / 2;
    if (tagTop <= clusterBottom + gap) {
      cluster.push(tag);
    } else {
      flushCluster();
      cluster.push(tag);
    }
  }
  flushCluster();

  resolved.sort((a, b) => a.centerY - b.centerY || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  for (let index = 1; index < resolved.length; index += 1) {
    const previous = resolved[index - 1];
    const current = resolved[index];
    const minCenter = previous.centerY + previous.height / 2 + current.height / 2 + gap;
    if (current.centerY < minCenter && !current.fixed) current.centerY = minCenter;
  }

  for (let index = 0; index < resolved.length; index += 1) {
    if (resolved[index].fixed) continue;

    let segmentTop = minY;
    let segmentBottom = maxY;
    for (let fixedIndex = index - 1; fixedIndex >= 0; fixedIndex -= 1) {
      if (resolved[fixedIndex].fixed) {
        segmentTop = resolved[fixedIndex].centerY + resolved[fixedIndex].height / 2 + gap;
        break;
      }
    }
    for (let fixedIndex = index + 1; fixedIndex < resolved.length; fixedIndex += 1) {
      if (resolved[fixedIndex].fixed) {
        segmentBottom = resolved[fixedIndex].centerY - resolved[fixedIndex].height / 2 - gap;
        break;
      }
    }

    const minCenter = segmentTop + resolved[index].height / 2;
    const maxCenter = segmentBottom - resolved[index].height / 2;
    resolved[index].centerY = Math.min(Math.max(resolved[index].centerY, minCenter), maxCenter);
  }

  // Only the run packed against the overflowing edge gives way. Shifting every
  // tag moved ones that had the axis to themselves, so a lone order tag ended
  // up a slot below its own line because something else was crowded elsewhere.
  const last = resolved[resolved.length - 1];
  const bottomOverflow = last.centerY + last.height / 2 - maxY;
  if (bottomOverflow > 0) {
    for (let index = resolved.length - 1; index >= 0; index -= 1) {
      if (index < resolved.length - 1 && !isNativePriceAxisTagPackedAgainst(resolved[index], resolved[index + 1], gap))
        break;
      if (!resolved[index].fixed) resolved[index].centerY -= bottomOverflow;
    }
  }

  for (let index = resolved.length - 2; index >= 0; index -= 1) {
    const next = resolved[index + 1];
    const current = resolved[index];
    const maxCenter = next.centerY - next.height / 2 - current.height / 2 - gap;
    if (current.centerY > maxCenter && !current.fixed) current.centerY = maxCenter;
  }

  const first = resolved[0];
  const topOverflow = minY - (first.centerY - first.height / 2);
  if (topOverflow > 0) {
    for (let index = 0; index < resolved.length; index += 1) {
      if (index > 0 && !isNativePriceAxisTagPackedAgainst(resolved[index - 1], resolved[index], gap)) break;
      if (!resolved[index].fixed) resolved[index].centerY += topOverflow;
    }
  }

  for (let index = 1; index < resolved.length; index += 1) {
    const previous = resolved[index - 1];
    const current = resolved[index];
    const minCenter = previous.centerY + previous.height / 2 + current.height / 2 + gap;
    if (current.centerY < minCenter && !current.fixed) {
      current.centerY = minCenter;
    }
  }

  for (let pass = 0; pass < resolved.length; pass += 1) {
    let changed = false;

    resolved.sort((a, b) => a.centerY - b.centerY || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

    for (let index = 1; index < resolved.length; index += 1) {
      const previous = resolved[index - 1];
      const current = resolved[index];
      const minCurrentCenter = previous.centerY + previous.height / 2 + current.height / 2 + gap;
      if (current.centerY >= minCurrentCenter) continue;

      if (!current.fixed) {
        current.centerY = minCurrentCenter;
        changed = true;
      } else if (!previous.fixed) {
        previous.centerY = current.centerY - current.height / 2 - gap - previous.height / 2;
        changed = true;
      }
    }

    resolved.sort((a, b) => a.centerY - b.centerY || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

    for (let index = resolved.length - 2; index >= 0; index -= 1) {
      const current = resolved[index];
      const next = resolved[index + 1];
      const maxCurrentCenter = next.centerY - next.height / 2 - gap - current.height / 2;
      if (current.centerY <= maxCurrentCenter) continue;

      if (!current.fixed) {
        current.centerY = maxCurrentCenter;
        changed = true;
      } else if (!next.fixed) {
        next.centerY = current.centerY + current.height / 2 + gap + next.height / 2;
        changed = true;
      }
    }

    if (!changed) break;
  }

  // Deliberately not floor-clamped here. A movable tag stacked under a fixed
  // one can need a few pixels more than the plot has, and clamping it would
  // close the gap that keeps the two readable. Pinning the fixed tag at the
  // source is what keeps the common case off the time axis; the rest is a
  // crowded-stack trade-off the tests below pin down.
  return resolved.map((source) => ({
    id: source.id,
    originalY: source.originalY,
    centerY: source.centerY,
    height: source.height,
    ...(source.fixed ? { fixed: true } : {}),
  }));
}

export function findNativeResolvedPriceAxisTagCenterY(
  resolved: readonly NativeResolvedPriceAxisTag[],
  id: string,
  fallbackCenterY: number,
): number {
  'worklet';
  for (let index = 0; index < resolved.length; index += 1) {
    if (resolved[index].id === id) return resolved[index].centerY;
  }
  return fallbackCenterY;
}
