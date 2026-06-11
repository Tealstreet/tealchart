import { describe, expect, it } from 'vitest';

import {
  getUserDrawingToolbarStateKey,
  getUserDrawingToolDescriptor,
  isUserDrawingStyleToolbarActionEnabled,
  isUserDrawingFillToolbarEnabled,
  isUserDrawingStyleToolbarEnabled,
  isUserDrawingTextToolbarEnabled,
  isUserDrawingToolbarActionEnabled,
  resolveUserDrawingStyleToolbarAction,
  supportsUserDrawingFillControls,
  supportsUserDrawingTextControls,
  USER_DRAWING_FILL_COLOR_DESCRIPTORS,
  USER_DRAWING_FONT_FAMILY_DESCRIPTORS,
  USER_DRAWING_FONT_SIZE_DESCRIPTORS,
  USER_DRAWING_LINE_COLOR_DESCRIPTORS,
  USER_DRAWING_LINE_STYLE_DESCRIPTORS,
  USER_DRAWING_LINE_WIDTH_DESCRIPTORS,
  USER_DRAWING_OPACITY_DESCRIPTORS,
  USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS,
  USER_DRAWING_STYLE_TOOLBAR_ACTION_DESCRIPTORS,
  USER_DRAWING_TEXT_ALIGN_DESCRIPTORS,
  USER_DRAWING_TEXT_COLOR_DESCRIPTORS,
  USER_DRAWING_TOOL_DESCRIPTORS,
  USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS,
} from './toolbar';
import type { UserDrawingState } from './types';

const state: UserDrawingState = {
  version: 1,
  activeTool: 'select',
  selection: null,
  draft: null,
  textEdit: null,
  drawings: [],
};

describe('user drawing toolbar descriptors', () => {
  it('orders every supported drawing tool once', () => {
    expect(USER_DRAWING_TOOL_DESCRIPTORS.map((descriptor) => descriptor.tool)).toEqual([
      'select',
      'trendLine',
      'extendedLine',
      'infoLine',
      'arrowLine',
      'arrowMarker',
      'arrowMarkUp',
      'arrowMarkDown',
      'ray',
      'horizontalLine',
      'verticalLine',
      'rectangle',
      'circle',
      'ellipse',
      'priceRange',
      'dateRange',
      'triangle',
      'parallelChannel',
      'path',
      'textLabel',
    ]);
    expect(new Set(USER_DRAWING_TOOL_DESCRIPTORS.map((descriptor) => descriptor.tool)).size).toBe(
      USER_DRAWING_TOOL_DESCRIPTORS.length,
    );
  });

  it('provides compact icons and accessible labels for tools and actions', () => {
    for (const descriptor of [
      ...USER_DRAWING_TOOL_DESCRIPTORS,
      ...USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS,
      ...USER_DRAWING_LINE_STYLE_DESCRIPTORS,
      ...USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS,
      ...USER_DRAWING_STYLE_TOOLBAR_ACTION_DESCRIPTORS,
      ...USER_DRAWING_TEXT_ALIGN_DESCRIPTORS,
    ]) {
      expect(descriptor.icon.length).toBeGreaterThan(0);
      expect(descriptor.label.length).toBeGreaterThan(0);
    }
    for (const descriptor of [...USER_DRAWING_LINE_COLOR_DESCRIPTORS, ...USER_DRAWING_LINE_WIDTH_DESCRIPTORS]) {
      expect(descriptor.label.length).toBeGreaterThan(0);
    }
    for (const descriptor of [
      ...USER_DRAWING_FILL_COLOR_DESCRIPTORS,
      ...USER_DRAWING_TEXT_COLOR_DESCRIPTORS,
      ...USER_DRAWING_FONT_FAMILY_DESCRIPTORS,
      ...USER_DRAWING_FONT_SIZE_DESCRIPTORS,
      ...USER_DRAWING_OPACITY_DESCRIPTORS,
    ]) {
      expect(descriptor.label.length).toBeGreaterThan(0);
    }
  });

  it('resolves tool descriptors by tool id', () => {
    expect(getUserDrawingToolDescriptor('rectangle')).toEqual(
      expect.objectContaining({ tool: 'rectangle', label: 'Rectangle' }),
    );
    expect(getUserDrawingToolDescriptor('circle')).toEqual(
      expect.objectContaining({ tool: 'circle', label: 'Circle' }),
    );
    expect(getUserDrawingToolDescriptor('ellipse')).toEqual(
      expect.objectContaining({ tool: 'ellipse', label: 'Ellipse' }),
    );
    expect(getUserDrawingToolDescriptor('priceRange')).toEqual(
      expect.objectContaining({ tool: 'priceRange', label: 'Price range' }),
    );
    expect(getUserDrawingToolDescriptor('infoLine')).toEqual(
      expect.objectContaining({ tool: 'infoLine', label: 'Info line' }),
    );
    expect(getUserDrawingToolDescriptor('dateRange')).toEqual(
      expect.objectContaining({ tool: 'dateRange', label: 'Date range' }),
    );
    expect(getUserDrawingToolDescriptor('triangle')).toEqual(
      expect.objectContaining({ tool: 'triangle', label: 'Triangle' }),
    );
    expect(getUserDrawingToolDescriptor('parallelChannel')).toEqual(
      expect.objectContaining({ tool: 'parallelChannel', label: 'Parallel channel' }),
    );
    expect(getUserDrawingToolDescriptor('arrowMarker')).toEqual(
      expect.objectContaining({ tool: 'arrowMarker', label: 'Arrow marker' }),
    );
    expect(getUserDrawingToolDescriptor('arrowMarkUp')).toEqual(
      expect.objectContaining({ tool: 'arrowMarkUp', label: 'Arrow mark up' }),
    );
    expect(getUserDrawingToolDescriptor('arrowMarkDown')).toEqual(
      expect.objectContaining({ tool: 'arrowMarkDown', label: 'Arrow mark down' }),
    );
    expect(getUserDrawingToolDescriptor('path')).toEqual(expect.objectContaining({ tool: 'path', label: 'Path' }));
  });

  it('enables fill controls for filled drawing types', () => {
    expect(
      supportsUserDrawingFillControls({
        id: 'marker',
        kind: 'arrowMarker',
        paneId: 'main',
        visible: true,
        locked: false,
        createdAt: 1,
        updatedAt: 1,
        style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
        points: [
          { time: 1, price: 10 },
          { time: 2, price: 12 },
        ],
      }),
    ).toBe(true);
    expect(
      supportsUserDrawingFillControls({
        id: 'up',
        kind: 'arrowMarkUp',
        paneId: 'main',
        visible: true,
        locked: false,
        createdAt: 1,
        updatedAt: 1,
        style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
        point: { time: 1, price: 10 },
      }),
    ).toBe(true);
    expect(
      supportsUserDrawingFillControls({
        id: 'circle',
        kind: 'circle',
        paneId: 'main',
        visible: true,
        locked: false,
        createdAt: 1,
        updatedAt: 1,
        style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
        points: [
          { time: 1, price: 10 },
          { time: 2, price: 12 },
        ],
      }),
    ).toBe(true);
    expect(
      supportsUserDrawingFillControls({
        id: 'ellipse',
        kind: 'ellipse',
        paneId: 'main',
        visible: true,
        locked: false,
        createdAt: 1,
        updatedAt: 1,
        style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
        points: [
          { time: 1, price: 10 },
          { time: 2, price: 12 },
        ],
      }),
    ).toBe(true);
  });

  it('resolves action availability from toolbar-relevant state', () => {
    expect(isUserDrawingToolbarActionEnabled(state, 'deleteSelected')).toBe(false);
    expect(isUserDrawingToolbarActionEnabled({ ...state, selection: { drawingId: 'h' } }, 'deleteSelected')).toBe(true);
    expect(
      isUserDrawingToolbarActionEnabled(
        {
          ...state,
          draft: {
            tool: 'trendLine',
            paneId: 'main',
            anchors: [{ time: 1, price: 10 }],
            style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
            startedAt: 1,
          },
        },
        'cancelDraft',
      ),
    ).toBe(true);
    expect(
      isUserDrawingToolbarActionEnabled(
        {
          ...state,
          drawings: [
            {
              id: 'h',
              kind: 'horizontalLine',
              paneId: 'main',
              visible: true,
              locked: false,
              createdAt: 1,
              updatedAt: 1,
              style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
              price: 10,
            },
          ],
        },
        'clearAll',
      ),
    ).toBe(true);
  });

  it('describes selected-drawing style controls in stable order', () => {
    expect(USER_DRAWING_LINE_COLOR_DESCRIPTORS.map((descriptor) => descriptor.color)).toEqual([
      '#f5c542',
      '#22c55e',
      '#38bdf8',
      '#f43f5e',
      '#d1d4dc',
    ]);
    expect(USER_DRAWING_LINE_WIDTH_DESCRIPTORS.map((descriptor) => descriptor.width)).toEqual([1, 2, 3]);
    expect(USER_DRAWING_LINE_STYLE_DESCRIPTORS.map((descriptor) => descriptor.lineStyle)).toEqual([
      'solid',
      'dashed',
      'dotted',
    ]);
    expect(USER_DRAWING_OPACITY_DESCRIPTORS.map((descriptor) => descriptor.opacity)).toEqual([1, 0.75, 0.5, 0.25]);
    expect(USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS.map((descriptor) => descriptor.style)).toEqual([
      'lineVisible',
      'fillVisible',
    ]);
    expect(USER_DRAWING_FILL_COLOR_DESCRIPTORS.map((descriptor) => descriptor.fillColor)).toEqual([
      'rgba(245, 197, 66, 0.12)',
      'rgba(34, 197, 94, 0.12)',
      'rgba(56, 189, 248, 0.12)',
      'rgba(244, 63, 94, 0.12)',
      'rgba(209, 212, 220, 0.12)',
    ]);
    expect(USER_DRAWING_TEXT_COLOR_DESCRIPTORS.map((descriptor) => descriptor.textColor)).toEqual([
      '#f5c542',
      '#22c55e',
      '#38bdf8',
      '#f43f5e',
      '#d1d4dc',
    ]);
    expect(USER_DRAWING_FONT_FAMILY_DESCRIPTORS.map((descriptor) => descriptor.fontFamily)).toEqual([
      'sans-serif',
      'serif',
      'monospace',
    ]);
    expect(USER_DRAWING_FONT_SIZE_DESCRIPTORS.map((descriptor) => descriptor.fontSize)).toEqual([10, 12, 14, 16]);
    expect(USER_DRAWING_TEXT_ALIGN_DESCRIPTORS.map((descriptor) => descriptor.textAlign)).toEqual([
      'left',
      'center',
      'right',
    ]);
    expect(USER_DRAWING_STYLE_TOOLBAR_ACTION_DESCRIPTORS.map((descriptor) => descriptor.action)).toEqual([
      'hideSelected',
      'lockSelected',
    ]);
  });

  it('enables selected drawing style controls only when edits are allowed', () => {
    const selected = {
      ...state,
      selection: { drawingId: 'h' },
      drawings: [
        {
          id: 'h',
          kind: 'horizontalLine' as const,
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const },
          price: 10,
        },
      ],
    };
    const locked = { ...selected, drawings: [{ ...selected.drawings[0]!, locked: true }] };

    expect(isUserDrawingStyleToolbarEnabled(state)).toBe(false);
    expect(isUserDrawingStyleToolbarEnabled(selected)).toBe(true);
    expect(isUserDrawingStyleToolbarEnabled(locked)).toBe(false);
    expect(isUserDrawingStyleToolbarActionEnabled(locked, 'hideSelected')).toBe(false);
    expect(isUserDrawingStyleToolbarActionEnabled(locked, 'lockSelected')).toBe(false);
  });

  it('enables fill and text style controls only for supported selected drawing kinds', () => {
    const horizontal = {
      id: 'h',
      kind: 'horizontalLine' as const,
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const },
      price: 10,
    };
    const rectangle = {
      id: 'r',
      kind: 'rectangle' as const,
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ] as const,
    };
    const textLabel = {
      id: 't',
      kind: 'textLabel' as const,
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const },
      point: { time: 1, price: 10 },
      text: 'note',
      textAlign: 'center' as const,
    };
    const priceRange = {
      ...rectangle,
      id: 'p',
      kind: 'priceRange' as const,
    };
    const dateRange = {
      ...rectangle,
      id: 'd',
      kind: 'dateRange' as const,
    };

    expect(supportsUserDrawingFillControls(horizontal)).toBe(false);
    expect(supportsUserDrawingFillControls(rectangle)).toBe(true);
    expect(supportsUserDrawingFillControls({ ...rectangle, id: 'e', kind: 'ellipse' as const })).toBe(true);
    expect(
      supportsUserDrawingFillControls({
        ...rectangle,
        id: 'tri',
        kind: 'triangle' as const,
        points: [
          { time: 1, price: 10 },
          { time: 2, price: 12 },
          { time: 3, price: 11 },
        ],
      }),
    ).toBe(true);
    expect(
      supportsUserDrawingFillControls({
        ...rectangle,
        id: 'channel',
        kind: 'parallelChannel' as const,
        points: [
          { time: 1, price: 10 },
          { time: 2, price: 12 },
          { time: 3, price: 11 },
        ],
      }),
    ).toBe(true);
    expect(supportsUserDrawingFillControls(priceRange)).toBe(true);
    expect(supportsUserDrawingFillControls(dateRange)).toBe(true);
    expect(supportsUserDrawingFillControls(textLabel)).toBe(true);
    expect(supportsUserDrawingTextControls(horizontal)).toBe(false);
    expect(supportsUserDrawingTextControls(priceRange)).toBe(false);
    expect(supportsUserDrawingTextControls(dateRange)).toBe(false);
    expect(supportsUserDrawingTextControls(textLabel)).toBe(true);

    expect(
      isUserDrawingFillToolbarEnabled({ ...state, selection: { drawingId: 'r' }, drawings: [rectangle] }),
    ).toBe(true);
    expect(isUserDrawingTextToolbarEnabled({ ...state, selection: { drawingId: 'r' }, drawings: [rectangle] })).toBe(
      false,
    );
    expect(isUserDrawingTextToolbarEnabled({ ...state, selection: { drawingId: 't' }, drawings: [textLabel] })).toBe(
      true,
    );
    expect(
      isUserDrawingFillToolbarEnabled({
        ...state,
        selection: { drawingId: 'r' },
        drawings: [{ ...rectangle, locked: true }],
      }),
    ).toBe(false);
  });

  it('resolves selected drawing style action payloads for renderers', () => {
    const selected = {
      ...state,
      selection: { drawingId: 'h' },
      drawings: [
        {
          id: 'h',
          kind: 'horizontalLine' as const,
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const },
          price: 10,
        },
      ],
    };

    expect(resolveUserDrawingStyleToolbarAction(state, 'hideSelected')).toEqual({ enabled: false });
    expect(resolveUserDrawingStyleToolbarAction(selected, 'hideSelected')).toEqual({ enabled: true, visible: false });
    expect(resolveUserDrawingStyleToolbarAction(selected, 'lockSelected')).toEqual({ enabled: true, locked: true });
  });

  it('keeps the toolbar state key stable across geometry-only edits', () => {
    const first = {
      ...state,
      selection: { drawingId: 'h' },
      drawings: [
        {
          id: 'h',
          kind: 'horizontalLine' as const,
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const },
          price: 10,
        },
      ],
    };
    const moved = {
      ...first,
      drawings: [{ ...first.drawings[0]!, price: 12 }],
    };

    expect(getUserDrawingToolbarStateKey(moved)).toBe(getUserDrawingToolbarStateKey(first));
    expect(getUserDrawingToolbarStateKey({ ...first, selection: null })).not.toBe(getUserDrawingToolbarStateKey(first));
    expect(
      getUserDrawingToolbarStateKey({
        ...first,
        drawings: [{ ...first.drawings[0]!, style: { ...first.drawings[0]!.style, lineWidth: 3 } }],
      }),
    ).not.toBe(getUserDrawingToolbarStateKey(first));
    expect(
      getUserDrawingToolbarStateKey({
        ...first,
        drawings: [{ ...first.drawings[0]!, style: { ...first.drawings[0]!.style, fillColor: '#123456' } }],
      }),
    ).not.toBe(getUserDrawingToolbarStateKey(first));
    expect(
      getUserDrawingToolbarStateKey({
        ...first,
        drawings: [{ ...first.drawings[0]!, style: { ...first.drawings[0]!.style, opacity: 0.5 } }],
      }),
    ).not.toBe(getUserDrawingToolbarStateKey(first));
    expect(
      getUserDrawingToolbarStateKey({
        ...first,
        drawings: [{ ...first.drawings[0]!, style: { ...first.drawings[0]!.style, lineVisible: false } }],
      }),
    ).not.toBe(getUserDrawingToolbarStateKey(first));
    expect(
      getUserDrawingToolbarStateKey({
        ...first,
        drawings: [{ ...first.drawings[0]!, style: { ...first.drawings[0]!.style, fillVisible: false } }],
      }),
    ).not.toBe(getUserDrawingToolbarStateKey(first));

    const textDrawing = {
      id: 'text',
      kind: 'textLabel' as const,
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const },
      point: { time: 1, price: 10 },
      text: 'note',
      textAlign: 'left' as const,
    };
    const textState: UserDrawingState = {
      ...state,
      selection: { drawingId: 'text' },
      drawings: [textDrawing],
    };
    expect(getUserDrawingToolbarStateKey({ ...textState, drawings: [{ ...textDrawing, textAlign: 'right' }] })).not.toBe(
      getUserDrawingToolbarStateKey(textState),
    );
    expect(
      getUserDrawingToolbarStateKey({
        ...textState,
        drawings: [{ ...textDrawing, style: { ...textDrawing.style, fontFamily: 'serif' } }],
      }),
    ).not.toBe(getUserDrawingToolbarStateKey(textState));
  });
});
