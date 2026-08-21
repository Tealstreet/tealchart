import type { ReactElement, ReactNode } from 'react';

import { describe, expect, it } from 'vitest';

import type { UserDrawingState } from '../../drawings';

import {
  createUserDrawingState,
  DEFAULT_USER_DRAWING_STYLE,
  resolveUserDrawingRenderEntriesFromSlices,
} from '../../drawings';
import { AnimatedNativeDraftAnchors, NativeUserDrawingLayerImpl } from './NativeUserDrawingLayer';
import { createNativeChartFrameFromPanes } from './nativeChartFrame';

function shared<T>(value: T) {
  return { value };
}

function flattenElements(node: ReactNode): ReactElement[] {
  if (!node) return [];
  if (Array.isArray(node)) return node.flatMap(flattenElements);
  if (typeof node === 'object' && 'type' in node && 'props' in node) return [node as ReactElement];
  return [];
}

const frame = createNativeChartFrameFromPanes({
  dimensions: {
    width: 390,
    height: 480,
    margins: { bottom: 32, left: 62, right: 76, top: 36 },
  },
  panes: [{ id: 'main', type: 'main', top: 36, height: 412, yMin: 62000, yMax: 66000 }],
});

const sharedViewport = {
  startTime: shared(0),
  endTime: shared(100),
  priceMin: shared(62000),
  priceMax: shared(66000),
};

const plotPrimitiveClip = {
  value: {
    x: frame.contentLeft,
    y: frame.mainPane.top,
    width: frame.contentWidth,
    height: frame.mainPane.height,
  },
};

function createLayerProps(state: UserDrawingState) {
  return {
    draftAnchorColor: state.draft?.style.lineColor,
    draftAnchors: state.draft?.anchors ?? [],
    entries: resolveUserDrawingRenderEntriesFromSlices({
      draft: state.draft,
      drawings: state.drawings,
      measure: state.measure,
      selection: state.selection,
    }),
    frame,
    plotPrimitiveClip,
    sharedViewport,
  };
}

describe('NativeUserDrawingLayer', () => {
  it('renders a draft anchor marker before a two-point drawing has preview geometry', () => {
    const anchor = { time: 25, price: 63500 };
    const layer = NativeUserDrawingLayerImpl(
      createLayerProps(createUserDrawingState({
        activeTool: 'trendLine',
        draft: {
          tool: 'trendLine',
          paneId: 'main',
          anchors: [anchor],
          style: DEFAULT_USER_DRAWING_STYLE,
          startedAt: 1,
        },
      })),
    ) as ReactElement;

    const draftAnchorLayer = flattenElements(layer.props.children).find(
      (child) => child.type === AnimatedNativeDraftAnchors,
    );

    expect(draftAnchorLayer?.props).toMatchObject({
      anchors: [anchor],
      color: DEFAULT_USER_DRAWING_STYLE.lineColor,
    });
  });

  it('keeps each placed draft anchor visible for multi-point drawing tools', () => {
    const anchors = [
      { time: 25, price: 63500 },
      { time: 50, price: 64500 },
    ];
    const layer = NativeUserDrawingLayerImpl(
      createLayerProps(createUserDrawingState({
        activeTool: 'triangle',
        draft: {
          tool: 'triangle',
          paneId: 'main',
          anchors,
          style: DEFAULT_USER_DRAWING_STYLE,
          startedAt: 1,
        },
      })),
    ) as ReactElement;

    const draftAnchorLayer = flattenElements(layer.props.children).find(
      (child) => child.type === AnimatedNativeDraftAnchors,
    );

    expect(draftAnchorLayer?.props.anchors).toEqual(anchors);
  });
});
