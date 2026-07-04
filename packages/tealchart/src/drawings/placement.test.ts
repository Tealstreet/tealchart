import { describe, expect, it } from 'vitest';

import type { DrawingCoordinateSpace } from './coordinates';
import type { UserDrawingInputPoint } from './input';
import type { UserDrawingTool } from './types';

import { getUserDrawingPlacementMode, resolveUserDrawingPlacementConstraint } from './placement';
import { USER_DRAWING_TOOL_DESCRIPTORS } from './toolbar';
import { getRequiredAnchorCount, isUserDrawingPathFamilyTool } from './types';

const space: DrawingCoordinateSpace = {
  viewport: { startTime: 0, endTime: 100, priceMin: 0, priceMax: 100 },
  pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 100 },
  chartLeft: 0,
  chartRight: 100,
};

const twoAnchorTools: UserDrawingTool[] = [
  'trendLine',
  'trendAngle',
  'extendedLine',
  'infoLine',
  'arrowLine',
  'arrowMarker',
  'ray',
  'rectangle',
  'circle',
  'ellipse',
  'priceRange',
  'dateRange',
  'datePriceRange',
  'forecast',
  'fixedRangeVolumeProfile',
  'callout',
  'priceNote',
  'image',
  'fibRetracement',
  'fibExtension',
  'fibFan',
  'fibSpeedResistanceFan',
  'fibArcs',
  'fibSpeedResistanceArcs',
  'fibCircles',
  'fibSpiral',
  'gannFan',
  'gannBox',
  'gannSquare',
  'gannSquareFixed',
  'fibTimeZone',
  'cyclicLines',
  'timeCycles',
  'sineLine',
];
const multiAnchorTools: UserDrawingTool[] = [
  'triangle',
  'curve',
  'arc',
  'polyline',
  'rotatedRectangle',
  'parallelChannel',
  'regressionTrend',
  'flatTopBottom',
  'pitchfork',
  'schiffPitchfork',
  'modifiedSchiffPitchfork',
  'insidePitchfork',
  'pitchfan',
  'trendBasedFibExtension',
  'fibWedge',
  'fibChannel',
  'trendBasedFibTime',
  'projection',
  'sector',
  'longPosition',
  'shortPosition',
  'barsPattern',
  'elliottCorrectiveWave',
  'elliottDoubleComboWave',
  'doubleCurve',
  'disjointChannel',
  'trianglePattern',
  'abcdPattern',
  'xabcdPattern',
  'cypherPattern',
  'threeDrivesPattern',
  'headShouldersPattern',
  'elliottImpulseWave',
  'elliottTripleComboWave',
  'elliottTriangleWave',
];

function point(time: number, price: number): UserDrawingInputPoint {
  return {
    paneId: 'main',
    anchor: { time, price },
  };
}

describe('user drawing placement modes', () => {
  it('classifies select, click, and path-drag placement families', () => {
    expect(getUserDrawingPlacementMode('select')).toBe('select');
    expect(getUserDrawingPlacementMode('horizontalLine')).toBe('click');
    expect(getUserDrawingPlacementMode('path')).toBe('pathDrag');
    expect(getUserDrawingPlacementMode('brush')).toBe('pathDrag');
    expect(getUserDrawingPlacementMode('highlighter')).toBe('pathDrag');
  });

  it('places every two-anchor shape by clicking each anchor in turn', () => {
    for (const tool of twoAnchorTools) {
      expect(getUserDrawingPlacementMode(tool), tool).toBe('click');
    }
  });

  it('places every multi-anchor shape by clicking each anchor in turn', () => {
    for (const tool of multiAnchorTools) {
      expect(getUserDrawingPlacementMode(tool), tool).toBe('click');
    }
  });

  it('keeps every registered multi-point tool on click placement (path tools excepted)', () => {
    for (const { tool } of USER_DRAWING_TOOL_DESCRIPTORS) {
      const anchorCount = getRequiredAnchorCount(tool);
      if (tool === 'select' || anchorCount <= 1) {
        continue;
      }

      const expectedMode = isUserDrawingPathFamilyTool(tool) ? 'pathDrag' : 'click';
      expect(getUserDrawingPlacementMode(tool), tool).toBe(expectedMode);
    }
  });

  it.each(['rectangle', 'fibCircles', 'fibSpiral', 'gannSquare', 'gannSquareFixed'] satisfies UserDrawingTool[])(
    'constrains %s placement drags to a visual square',
    (tool) => {
      const constrained = resolveUserDrawingPlacementConstraint({
        tool,
        startPoint: point(10, 90),
        currentPoint: point(30, 80),
        spacesByPaneId: new Map([['main', space]]),
        options: { constrainedPlacement: true },
      });

      expect(constrained.anchor).toEqual({ time: 30, price: 70 });
    },
  );

  it.each(['trendLine', 'trendAngle'] satisfies UserDrawingTool[])(
    'snaps %s placement drags to 45-degree visual increments',
    (tool) => {
      const constrained = resolveUserDrawingPlacementConstraint({
        tool,
        startPoint: point(10, 90),
        currentPoint: point(40, 80),
        spacesByPaneId: new Map([['main', space]]),
        options: { constrainedPlacement: true },
      });

      expect(constrained.anchor.time).toBeCloseTo(41.6227766);
      expect(constrained.anchor.price).toBeCloseTo(90);
    },
  );

  it('constrains cyclic line placement drags to a horizontal interval baseline', () => {
    const constrained = resolveUserDrawingPlacementConstraint({
      tool: 'cyclicLines',
      startPoint: point(10, 90),
      currentPoint: point(30, 80),
      spacesByPaneId: new Map([['main', space]]),
      options: { constrainedPlacement: true },
    });

    expect(constrained.anchor).toEqual({ time: 30, price: 90 });
  });

  it.each(['timeCycles', 'sineLine'] satisfies UserDrawingTool[])(
    'keeps %s placement unconstrained until amplitude-safe semantics exist',
    (tool) => {
      const current = point(30, 80);
      expect(
        resolveUserDrawingPlacementConstraint({
          tool,
          startPoint: point(10, 90),
          currentPoint: current,
          spacesByPaneId: new Map([['main', space]]),
          options: { constrainedPlacement: true },
        }),
      ).toBe(current);
    },
  );

  it('leaves placement unchanged when constraints are disabled or unsupported', () => {
    const current = point(30, 80);
    expect(
      resolveUserDrawingPlacementConstraint({
        tool: 'rectangle',
        startPoint: point(10, 90),
        currentPoint: current,
        spacesByPaneId: new Map([['main', space]]),
      }),
    ).toBe(current);
    expect(
      resolveUserDrawingPlacementConstraint({
        tool: 'horizontalLine',
        startPoint: point(10, 90),
        currentPoint: current,
        spacesByPaneId: new Map([['main', space]]),
        options: { constrainedPlacement: true },
      }),
    ).toBe(current);
  });
});
