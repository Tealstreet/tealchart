import type { DrawingCoordinateSpace } from './coordinates';
import type { UserDrawingState, UserDrawingStyle } from './types';

import { describe, expect, it } from 'vitest';

import { resolveUserDrawingContextActionsAtPoint } from './contextActions';

const style: UserDrawingStyle = {
  lineColor: '#f5c542',
  lineWidth: 2,
  lineStyle: 'solid',
};

const space: DrawingCoordinateSpace = {
  viewport: {
    startTime: 0,
    endTime: 100,
    priceMin: 0,
    priceMax: 100,
  },
  pane: {
    id: 'main',
    top: 0,
    height: 100,
    bottom: 100,
    yMin: 0,
    yMax: 100,
  },
  chartLeft: 0,
  chartRight: 100,
};

const state: UserDrawingState = {
  version: 1,
  activeTool: 'select',
  selection: null,
  drawings: [
    {
      id: 'back',
      kind: 'horizontalLine',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style,
      price: 40,
    },
    {
      id: 'front',
      kind: 'horizontalLine',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 2,
      updatedAt: 2,
      style,
      price: 60,
    },
  ],
  draft: null,
  textEdit: null,
};

describe('user drawing context actions', () => {
  it('selects the hit drawing and resolves shared selected action items', () => {
    const result = resolveUserDrawingContextActionsAtPoint(state, { x: 50, y: 40 }, new Map([['main', space]]));

    expect(result.hit).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.drawingId).toBe('front');
    expect(result.state.selection).toEqual({ drawingId: 'front' });
    expect(result.items.map((item) => [item.id, item.groupId, item.enabled, item.command])).toEqual([
      ['openProperties', 'primary', true, { type: 'openProperties' }],
      ['openObjectTree', 'primary', true, { type: 'openObjectTree' }],
      ['editText', 'primary', false, { type: 'editText', drawingId: 'front' }],
      ['duplicateSelected', 'primary', true, { type: 'toolbarAction', action: 'duplicateSelected' }],
      ['deleteSelected', 'primary', true, { type: 'toolbarAction', action: 'deleteSelected' }],
      ['lineColor:#22c55e', 'style', true, { type: 'updateStyle', style: { lineColor: '#22c55e' } }],
      ['lineWidth:decrease', 'style', true, { type: 'updateStyle', style: { lineWidth: 1 } }],
      ['lineWidth:increase', 'style', true, { type: 'updateStyle', style: { lineWidth: 3 } }],
      ['lineStyle:dashed', 'style', true, { type: 'updateStyle', style: { lineStyle: 'dashed' } }],
      ['bringForward', 'arrange', false, { type: 'toolbarAction', action: 'bringForward' }],
      ['sendBackward', 'arrange', true, { type: 'toolbarAction', action: 'sendBackward' }],
      ['bringToFront', 'arrange', false, { type: 'toolbarAction', action: 'bringToFront' }],
      ['sendToBack', 'arrange', true, { type: 'toolbarAction', action: 'sendToBack' }],
      ['hideSelected', 'visibility', true, { type: 'styleAction', action: 'hideSelected', visible: false }],
      ['showSelected', 'visibility', false, { type: 'styleAction', action: 'showSelected' }],
      ['lockSelected', 'visibility', true, { type: 'styleAction', action: 'lockSelected', locked: true }],
      ['unlockSelected', 'visibility', false, { type: 'styleAction', action: 'unlockSelected' }],
    ]);
  });

  it('preserves multi-selection when the hit drawing is already selected', () => {
    const selected = {
      ...state,
      selection: { drawingId: 'back', drawingIds: ['back', 'front'] },
    } satisfies UserDrawingState;

    const result = resolveUserDrawingContextActionsAtPoint(selected, { x: 50, y: 40 }, new Map([['main', space]]));

    expect(result.hit).toBe(true);
    expect(result.changed).toBe(false);
    expect(result.drawingId).toBe('back');
    expect(result.state.selection).toEqual({ drawingId: 'back', drawingIds: ['back', 'front'] });
    expect(result.items.find((item) => item.id === 'deleteSelected')?.enabled).toBe(true);
    expect(result.items.find((item) => item.id === 'sendToBack')?.enabled).toBe(false);
  });

  it('keeps state unchanged when no drawing is hit', () => {
    const result = resolveUserDrawingContextActionsAtPoint(state, { x: 50, y: 5 }, new Map([['main', space]]));

    expect(result).toEqual({
      state,
      hit: false,
      changed: false,
      drawingId: null,
      items: [],
    });
  });
});
