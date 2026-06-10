import { describe, expect, it } from 'vitest';

import {
  getUserDrawingToolbarStateKey,
  getUserDrawingToolDescriptor,
  isUserDrawingToolbarActionEnabled,
  USER_DRAWING_TOOL_DESCRIPTORS,
  USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS,
} from './toolbar';
import type { UserDrawingState } from './types';

const state: UserDrawingState = {
  version: 1,
  activeTool: 'select',
  selection: null,
  draft: null,
  drawings: [],
};

describe('user drawing toolbar descriptors', () => {
  it('orders every supported drawing tool once', () => {
    expect(USER_DRAWING_TOOL_DESCRIPTORS.map((descriptor) => descriptor.tool)).toEqual([
      'select',
      'trendLine',
      'ray',
      'horizontalLine',
      'verticalLine',
      'rectangle',
      'textLabel',
    ]);
    expect(new Set(USER_DRAWING_TOOL_DESCRIPTORS.map((descriptor) => descriptor.tool)).size).toBe(
      USER_DRAWING_TOOL_DESCRIPTORS.length,
    );
  });

  it('provides compact icons and accessible labels for tools and actions', () => {
    for (const descriptor of [...USER_DRAWING_TOOL_DESCRIPTORS, ...USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS]) {
      expect(descriptor.icon.length).toBeGreaterThan(0);
      expect(descriptor.label.length).toBeGreaterThan(0);
    }
  });

  it('resolves tool descriptors by tool id', () => {
    expect(getUserDrawingToolDescriptor('rectangle')).toEqual(
      expect.objectContaining({ tool: 'rectangle', label: 'Rectangle' }),
    );
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
  });
});
