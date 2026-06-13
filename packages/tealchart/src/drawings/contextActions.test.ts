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

  it('includes selected fill style actions for fill-capable context targets', () => {
    const result = resolveUserDrawingContextActionsAtPoint(
      {
        ...state,
        drawings: [
          {
            id: 'rect',
            kind: 'rectangle',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              ...style,
              fillColor: 'rgba(245, 197, 66, 0.12)',
            },
            points: [
              { time: 25, price: 75 },
              { time: 75, price: 25 },
            ],
          },
        ],
      },
      { x: 25, y: 50 },
      new Map([['main', space]]),
    );

    expect(result.items.find((item) => item.id === 'fillColor:rgba(34, 197, 94, 0.12)')).toMatchObject({
      groupId: 'style',
      enabled: true,
      command: { type: 'updateStyle', style: { fillColor: 'rgba(34, 197, 94, 0.12)' } },
    });
    expect(result.items.find((item) => item.id === 'fillVisible:toggle')).toMatchObject({
      groupId: 'style',
      enabled: true,
      command: { type: 'updateStyle', style: { fillVisible: false } },
    });
  });

  it('includes selected text appearance actions for text-capable context targets', () => {
    const result = resolveUserDrawingContextActionsAtPoint(
      {
        ...state,
        drawings: [
          {
            id: 'label',
            kind: 'textLabel',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              ...style,
              textColor: '#f5c542',
              fontSize: 14,
              fontFamily: 'sans-serif',
              fontWeight: 'normal',
              fontStyle: 'normal',
            },
            point: { time: 50, price: 50 },
            text: 'Note',
            textAlign: 'center',
          },
        ],
      },
      { x: 50, y: 50 },
      new Map([['main', space]]),
      { hitTest: { labelWidth: 80, labelHeight: 24 } },
    );

    expect(result.items.find((item) => item.id === 'textColor:#22c55e')).toMatchObject({
      groupId: 'style',
      enabled: true,
      command: { type: 'updateStyle', style: { textColor: '#22c55e' } },
    });
    expect(result.items.find((item) => item.id === 'fontSize:decrease')).toMatchObject({
      groupId: 'style',
      enabled: true,
      command: { type: 'updateStyle', style: { fontSize: 12 } },
    });
    expect(result.items.find((item) => item.id === 'fontSize:increase')).toMatchObject({
      groupId: 'style',
      enabled: true,
      command: { type: 'updateStyle', style: { fontSize: 16 } },
    });
    expect(result.items.find((item) => item.id === 'fontFamily:serif')).toMatchObject({
      groupId: 'style',
      enabled: true,
      command: { type: 'updateStyle', style: { fontFamily: 'serif' } },
    });
    expect(result.items.find((item) => item.id === 'fontWeight:bold')).toMatchObject({
      groupId: 'style',
      enabled: true,
      command: { type: 'updateStyle', style: { fontWeight: 'bold' } },
    });
    expect(result.items.find((item) => item.id === 'fontStyle:italic')).toMatchObject({
      groupId: 'style',
      enabled: true,
      command: { type: 'updateStyle', style: { fontStyle: 'italic' } },
    });
    expect(result.items.find((item) => item.id === 'textUnderline:toggle')).toMatchObject({
      groupId: 'style',
      enabled: true,
      command: { type: 'updateStyle', style: { textUnderline: true } },
    });
    expect(result.items.find((item) => item.id === 'textLineThrough:toggle')).toMatchObject({
      groupId: 'style',
      enabled: true,
      command: { type: 'updateStyle', style: { textLineThrough: true } },
    });
    expect(result.items.find((item) => item.id === 'textWrap:toggle')).toMatchObject({
      groupId: 'style',
      enabled: true,
      command: { type: 'updateStyle', style: { textWrap: true, textMaxWidth: 180 } },
    });
    expect(result.items.some((item) => item.id.startsWith('textMaxWidth:'))).toBe(false);
  });

  it('includes selected wrapped text width actions for text-capable context targets', () => {
    const result = resolveUserDrawingContextActionsAtPoint(
      {
        ...state,
        drawings: [
          {
            id: 'label',
            kind: 'textLabel',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: {
              ...style,
              textWrap: true,
              textMaxWidth: 180,
            },
            point: { time: 50, price: 50 },
            text: 'Note',
            textAlign: 'center',
          },
        ],
      },
      { x: 50, y: 50 },
      new Map([['main', space]]),
      { hitTest: { labelWidth: 80, labelHeight: 24 } },
    );

    expect(result.items.find((item) => item.id === 'textMaxWidth:decrease')).toMatchObject({
      groupId: 'style',
      enabled: true,
      command: { type: 'updateStyle', style: { textMaxWidth: 120 } },
    });
    expect(result.items.find((item) => item.id === 'textMaxWidth:increase')).toMatchObject({
      groupId: 'style',
      enabled: true,
      command: { type: 'updateStyle', style: { textMaxWidth: 240 } },
    });
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
