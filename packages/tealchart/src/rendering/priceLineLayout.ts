import type { ComputedPane, PriceLine, PriceLineLabelBounds } from '../types';

import { resolveLabelCollisionsWithinBounds } from '../utils/labelCollision';

/** Coordinates are CSS pixels in the presentation container, independent of its data/viewport owner. */
export interface PriceLineLayoutProjection {
  panes: readonly ComputedPane[];
  priceToY: (price: number, pane: ComputedPane) => number;
  mainPaneTop?: number;
}

export interface PriceLineLayoutMeasurements {
  font: (line: PriceLine) => string;
  width: (line: PriceLine, font: string) => number;
  height: (line: PriceLine, secondaryText: unknown) => number;
}

/** Shared existing Tealchart label measurement/collision/clipping pass. */
export function computeProjectedPriceLineLabelBounds(
  priceLines: PriceLine[],
  projection: PriceLineLayoutProjection,
  measurements: PriceLineLayoutMeasurements,
): PriceLineLabelBounds[] {
  const computedPanes = projection.panes;
  const mainPane = computedPanes.find((pane) => pane.type === 'main');
  if (!mainPane) return [];
  // Calculate bounds using pane coordinate system
  const bounds: PriceLineLabelBounds[] = priceLines.map((line) => {
    const labelFont = measurements.font(line);
    // Find the target pane (default to main if not specified)
    const targetPaneId = line.targetPaneId || 'main';
    const targetPane = computedPanes.find((p) => p.id === targetPaneId) || mainPane;

    // Use valueToY with the correct pane
    const originalY = projection.priceToY(line.price, targetPane);
    // Check for secondary text or countdown (countdown renders as secondary text)
    const hasSecondaryText = line.label.secondaryText || line.countdownToTime;
    const width = measurements.width(line, labelFont);
    const height = measurements.height(line, hasSecondaryText);

    return {
      lineId: line.id,
      price: line.price,
      originalY,
      adjustedY: originalY,
      width,
      height,
      color: line.color,
      label: line.label,
      lineStyle: line.lineStyle,
      type: line.type,
      chartLabel: line.chartLabel,
      lineLength: line.lineLength,
      lineLengthUnit: line.lineLengthUnit,
      extendLeft: line.extendLeft,
      lineWidth: line.lineWidth,
      floatingLabel: line.floatingLabel,
      priority: line.priority,
      fixed: line.id === 'last-trade',
      renderLineOnCanvas: line.renderLineOnCanvas,
      countdownToTime: line.countdownToTime,
      draggable: line.draggable,
      actionState: line.actionState,
      targetPaneId: line.targetPaneId,
      // Trading object identity for OEMS callbacks
      orderId: line.orderId,
      positionId: line.positionId,
      partialEnabled: line.partialEnabled,
      positionData: line.positionData,
      // Adapter callbacks carried through for direct invocation
      callbacks: line.callbacks,
    };
  });

  // Separate floating labels (they don't participate in collision detection)
  const floatingBounds = bounds.filter((b) => b.floatingLabel);
  const staticBounds = bounds.filter((b) => !b.floatingLabel);

  // Resolve collisions within each target pane. A global resolve followed by
  // per-label pane clamps can collapse labels onto pane edges.
  const staticBoundsByPane = new Map<string, PriceLineLabelBounds[]>();
  for (const bound of staticBounds) {
    const targetPaneId = bound.targetPaneId || 'main';
    const paneBounds = staticBoundsByPane.get(targetPaneId) ?? [];
    paneBounds.push(bound);
    staticBoundsByPane.set(targetPaneId, paneBounds);
  }
  for (const [targetPaneId, paneBounds] of staticBoundsByPane) {
    const targetPane = computedPanes.find((p) => p.id === targetPaneId) || mainPane;
    const paneTop = targetPane.type === 'main' ? (projection.mainPaneTop ?? mainPane.top) : targetPane.top;
    resolveLabelCollisionsWithinBounds(paneBounds, paneTop, targetPane.bottom);
  }

  // Sort by Y for rendering order
  staticBounds.sort((a, b) => a.adjustedY - b.adjustedY);

  const allBounds = [...staticBounds, ...floatingBounds];

  // Floating labels bypass collision, so keep only those inside their target pane here.
  const visibleTop = projection.mainPaneTop ?? mainPane.top;
  for (const bound of floatingBounds) {
    const targetPaneId = bound.targetPaneId || 'main';
    const targetPane = computedPanes.find((p) => p.id === targetPaneId) || mainPane;

    const labelTop = bound.adjustedY - bound.height / 2;
    const labelBottom = bound.adjustedY + bound.height / 2;

    // For main pane, respect top bar safe zone
    const paneTop = targetPane.type === 'main' ? visibleTop : targetPane.top;

    if (labelTop < paneTop) {
      bound.adjustedY = paneTop + bound.height / 2;
    }
    if (labelBottom > targetPane.bottom) {
      bound.adjustedY = targetPane.bottom - bound.height / 2;
    }
  }

  // Filter to visible area within each line's target pane
  return allBounds.filter((b) => {
    const targetPaneId = b.targetPaneId || 'main';
    const targetPane = computedPanes.find((p) => p.id === targetPaneId) || mainPane;
    return b.originalY >= targetPane.top && b.originalY <= targetPane.bottom;
  });
}
