import { describe, expect, it } from 'vitest';

import type { DrawingCoordinateSpace } from './coordinates';
import type { UserDrawingInputPoint } from './input';
import type { UserDrawingTool } from './types';

import {
  getUserDrawingPlacementMode,
  isUserDrawingDragPlacementTool,
  resolveUserDrawingPlacementConstraint,
} from './placement';

const space: DrawingCoordinateSpace = {
  viewport: { startTime: 0, endTime: 100, priceMin: 0, priceMax: 100 },
  pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 100 },
  chartLeft: 0,
  chartRight: 100,
};

const dragTwoAnchorTools: UserDrawingTool[] = [
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
const dragSeedTools: UserDrawingTool[] = [
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
];

function point(time: number, price: number): UserDrawingInputPoint {
  return {
    paneId: 'main',
    anchor: { time, price },
  };
}

describe('user drawing placement modes', () => {
  it('classifies select, click, path drag, two-anchor drag, and drag-seeded tools', () => {
    expect(getUserDrawingPlacementMode('select')).toBe('select');
    expect(getUserDrawingPlacementMode('horizontalLine')).toBe('click');
    expect(getUserDrawingPlacementMode('path')).toBe('pathDrag');
    expect(getUserDrawingPlacementMode('rectangle')).toBe('dragTwoAnchor');
    expect(getUserDrawingPlacementMode('trendLine')).toBe('dragTwoAnchor');
    expect(getUserDrawingPlacementMode('ellipse')).toBe('dragTwoAnchor');
    expect(getUserDrawingPlacementMode('triangle')).toBe('dragSeed');
    expect(getUserDrawingPlacementMode('parallelChannel')).toBe('dragSeed');
    expect(getUserDrawingPlacementMode('pitchfork')).toBe('dragSeed');
  });

  it('classifies supported two-anchor tools as drag placement tools', () => {
    for (const tool of dragTwoAnchorTools) {
      expect(isUserDrawingDragPlacementTool(tool), tool).toBe(true);
      expect(getUserDrawingPlacementMode(tool), tool).toBe('dragTwoAnchor');
    }
  });

  it('classifies supported multi-anchor tools as drag-seeded placement tools', () => {
    for (const tool of dragSeedTools) {
      expect(isUserDrawingDragPlacementTool(tool), tool).toBe(true);
      expect(getUserDrawingPlacementMode(tool), tool).toBe('dragSeed');
    }
  });

  it('keeps unsupported multi-anchor tools in click placement until they get dedicated gesture semantics', () => {
    expect(isUserDrawingDragPlacementTool('disjointChannel')).toBe(false);
    expect(getUserDrawingPlacementMode('disjointChannel')).toBe('click');
  });

  it('constrains shape placement drags to a visual square', () => {
    const constrained = resolveUserDrawingPlacementConstraint({
      tool: 'rectangle',
      startPoint: point(10, 90),
      currentPoint: point(30, 80),
      spacesByPaneId: new Map([['main', space]]),
      options: { constrainedPlacement: true },
    });

    expect(constrained.anchor).toEqual({ time: 30, price: 70 });
  });

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
