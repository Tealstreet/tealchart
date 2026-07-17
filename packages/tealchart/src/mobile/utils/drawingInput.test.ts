import type { DrawingCoordinateSpace, UserDrawingTool } from '../../drawings';
import type { ChartDimensions, PaneInfo } from './coordinates';

import { afterEach, describe, expect, it } from 'vitest';

import { resolveUserDrawingPlacementConstraint } from '../../drawings';
import { clearChartStoreCache } from '../../state/chartState';
import {
  resolveMobileUserDrawingDuplicateEditDragEnabled,
  resolveMobileUserDrawingInputPoint,
  resolveMobileUserDrawingPlacementConstraintEnabled,
} from './drawingInput';

const dimensions: ChartDimensions = {
  width: 320,
  height: 240,
  margins: {
    top: 0,
    right: 40,
    bottom: 24,
    left: 8,
  },
};

const panes: PaneInfo[] = [
  {
    id: 'main',
    type: 'main',
    top: 0,
    height: 144,
    yMin: 90,
    yMax: 110,
  },
  {
    id: 'macd',
    type: 'indicator',
    top: 144,
    height: 72,
    yMin: -10,
    yMax: 10,
  },
];

function createSpacesByPaneId(viewport: {
  startTime: number;
  endTime: number;
  priceMin: number;
  priceMax: number;
}): Map<string, DrawingCoordinateSpace> {
  return new Map<string, DrawingCoordinateSpace>(
    panes.map((pane) => [
      pane.id,
      {
        viewport,
        pane: {
          id: pane.id,
          top: pane.top,
          height: pane.height,
          bottom: pane.top + pane.height,
          yMin: pane.yMin,
          yMax: pane.yMax,
        },
        chartLeft: dimensions.margins.left,
        chartRight: dimensions.width,
      },
    ]),
  );
}

describe('mobile user drawing input resolver', () => {
  afterEach(() => {
    clearChartStoreCache();
  });

  it('normalizes mobile pane info before resolving anchors', () => {
    expect(
      resolveMobileUserDrawingInputPoint({
        point: { x: 164, y: 180 },
        viewport: {
          startTime: 1_000,
          endTime: 3_000,
          priceMin: 90,
          priceMax: 110,
        },
        dimensions,
        panes,
      }),
    ).toEqual({
      paneId: 'macd',
      anchor: { time: 2_000, price: 0 },
      position: { x: 0.5, y: 0.5 },
      bars: undefined,
    });
  });

  it('attaches normalized pressure metadata to resolved mobile anchors', () => {
    expect(
      resolveMobileUserDrawingInputPoint({
        point: { x: 164, y: 180 },
        viewport: {
          startTime: 1_000,
          endTime: 3_000,
          priceMin: 90,
          priceMax: 110,
        },
        dimensions,
        panes,
        pressure: 1.4,
      }),
    ).toEqual({
      paneId: 'macd',
      anchor: { time: 2_000, price: 0, pressure: 1 },
      position: { x: 0.5, y: 0.5 },
      bars: undefined,
    });
  });

  it('applies strong magnet mode to main-pane OHLC anchors', () => {
    expect(
      resolveMobileUserDrawingInputPoint({
        point: { x: 143, y: 37 },
        viewport: {
          startTime: 1_000,
          endTime: 3_000,
          priceMin: 90,
          priceMax: 110,
        },
        dimensions,
        panes,
        bars: [{ time: 2_000, open: 96, high: 105, low: 94, close: 102, volume: 1 }],
        magnetMode: 'strong',
        pressure: 0.4,
      }),
    ).toEqual({
      paneId: 'main',
      anchor: { time: 2_000, price: 105, pressure: 0.4 },
      position: { x: 0.5, y: 0.25 },
      bars: [{ time: 2_000, open: 96, high: 105, low: 94, close: 102, volume: 1 }],
    });
  });

  it('can leave path-family tap anchors unsnapped when callers disable magnet mode', () => {
    const point = resolveMobileUserDrawingInputPoint({
      point: { x: 143, y: 37 },
      viewport: {
        startTime: 1_000,
        endTime: 3_000,
        priceMin: 90,
        priceMax: 110,
      },
      dimensions,
      panes,
      bars: [{ time: 2_000, open: 96, high: 105, low: 94, close: 102, volume: 1 }],
      magnetMode: 'off',
      pressure: 0.4,
    });

    expect(point).toMatchObject({
      paneId: 'main',
      anchor: { pressure: 0.4 },
      bars: [{ time: 2_000, open: 96, high: 105, low: 94, close: 102, volume: 1 }],
    });
    expect(point?.anchor).not.toEqual({ time: 2_000, price: 105, pressure: 0.4 });
  });

  it('rejects points outside the mobile chart width', () => {
    expect(
      resolveMobileUserDrawingInputPoint({
        point: { x: 320, y: 180 },
        viewport: {
          startTime: 1_000,
          endTime: 3_000,
          priceMin: 90,
          priceMax: 110,
        },
        dimensions,
        panes,
      }),
    ).toBeNull();
  });

  it('resolves mobile placement constraint override state for host toolbars', () => {
    expect(resolveMobileUserDrawingPlacementConstraintEnabled({})).toBe(false);
    expect(resolveMobileUserDrawingPlacementConstraintEnabled({ propConstrained: true })).toBe(true);
    expect(
      resolveMobileUserDrawingPlacementConstraintEnabled({
        propConstrained: true,
        overrideConstrained: false,
      }),
    ).toBe(false);
    expect(
      resolveMobileUserDrawingPlacementConstraintEnabled({
        propConstrained: false,
        overrideConstrained: true,
      }),
    ).toBe(true);
    expect(
      resolveMobileUserDrawingPlacementConstraintEnabled({
        propConstrained: true,
        overrideConstrained: null,
      }),
    ).toBe(true);
  });

  it('resolves mobile duplicate edit-drag override state for host toolbars', () => {
    expect(resolveMobileUserDrawingDuplicateEditDragEnabled({})).toBe(false);
    expect(resolveMobileUserDrawingDuplicateEditDragEnabled({ propDuplicate: true })).toBe(true);
    expect(
      resolveMobileUserDrawingDuplicateEditDragEnabled({
        propDuplicate: true,
        overrideDuplicate: false,
      }),
    ).toBe(false);
    expect(
      resolveMobileUserDrawingDuplicateEditDragEnabled({
        propDuplicate: false,
        overrideDuplicate: true,
      }),
    ).toBe(true);
    expect(
      resolveMobileUserDrawingDuplicateEditDragEnabled({
        propDuplicate: true,
        overrideDuplicate: null,
      }),
    ).toBe(true);
  });

  it.each(['rectangle', 'fibCircles', 'fibSpiral', 'gannSquare', 'gannSquareFixed'] satisfies UserDrawingTool[])(
    'feeds constrained %s placement geometry from resolved mobile touch anchors',
    (tool) => {
      const viewport = {
        startTime: 1_000,
        endTime: 3_000,
        priceMin: 90,
        priceMax: 110,
      };
      const startPoint = resolveMobileUserDrawingInputPoint({
        point: { x: 48, y: 32 },
        viewport,
        dimensions,
        panes,
      });
      const currentPoint = resolveMobileUserDrawingInputPoint({
        point: { x: 88, y: 52 },
        viewport,
        dimensions,
        panes,
      });
      const spacesByPaneId = createSpacesByPaneId(viewport);

      expect(startPoint).not.toBeNull();
      expect(currentPoint).not.toBeNull();

      const constrained = resolveUserDrawingPlacementConstraint({
        tool,
        startPoint,
        currentPoint: currentPoint!,
        spacesByPaneId,
        options: { constrainedPlacement: true },
      });

      expect(constrained.anchor.time).toBeCloseTo(1_512.820513);
      expect(constrained.anchor.price).toBeCloseTo(100);
    },
  );

  it('feeds constrained cyclic line horizontal interval geometry from resolved mobile touch anchors', () => {
    const viewport = {
      startTime: 1_000,
      endTime: 3_000,
      priceMin: 90,
      priceMax: 110,
    };
    const startPoint = resolveMobileUserDrawingInputPoint({
      point: { x: 48, y: 32 },
      viewport,
      dimensions,
      panes,
    });
    const currentPoint = resolveMobileUserDrawingInputPoint({
      point: { x: 88, y: 52 },
      viewport,
      dimensions,
      panes,
    });
    const spacesByPaneId = createSpacesByPaneId(viewport);

    expect(startPoint).not.toBeNull();
    expect(currentPoint).not.toBeNull();

    const constrained = resolveUserDrawingPlacementConstraint({
      tool: 'cyclicLines',
      startPoint,
      currentPoint: currentPoint!,
      spacesByPaneId,
      options: { constrainedPlacement: true },
    });

    expect(constrained.anchor.time).toBeCloseTo(1_512.820513);
    expect(constrained.anchor.price).toBeCloseTo(105.555555);
  });

  it.each(['timeCycles', 'sineLine'] satisfies UserDrawingTool[])(
    'keeps mobile %s placement unconstrained until amplitude-safe semantics exist',
    (tool) => {
      const viewport = {
        startTime: 1_000,
        endTime: 3_000,
        priceMin: 90,
        priceMax: 110,
      };
      const startPoint = resolveMobileUserDrawingInputPoint({
        point: { x: 48, y: 32 },
        viewport,
        dimensions,
        panes,
      });
      const currentPoint = resolveMobileUserDrawingInputPoint({
        point: { x: 88, y: 52 },
        viewport,
        dimensions,
        panes,
      });

      expect(startPoint).not.toBeNull();
      expect(currentPoint).not.toBeNull();
      expect(
        resolveUserDrawingPlacementConstraint({
          tool,
          startPoint,
          currentPoint: currentPoint!,
          spacesByPaneId: createSpacesByPaneId(viewport),
          options: { constrainedPlacement: true },
        }),
      ).toBe(currentPoint);
    },
  );
});
