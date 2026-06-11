import type { UserDrawingState } from '../../drawings';

import { describe, expect, it } from 'vitest';

import {
  exportMobileUserDrawingStateForLayout,
  importMobileUserDrawingStateFromLayout,
} from './drawingPersistence';

const state: UserDrawingState = {
  version: 1,
  activeTool: 'rectangle',
  selection: { drawingId: 'rect_1' },
  draft: {
    tool: 'trendLine',
    paneId: 'main',
    anchors: [{ time: 1, price: 10 }],
    style: {
      lineColor: '#f5c542',
      lineWidth: 1,
      lineStyle: 'solid',
    },
    startedAt: 1,
  },
  textEdit: {
    drawingId: 'rect_1',
    value: 'draft',
    originalValue: '',
    startedAt: 2,
  },
  drawings: [
    {
      id: 'rect_1',
      kind: 'rectangle',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 2,
      style: {
        lineColor: '#f5c542',
        lineWidth: 1,
        lineStyle: 'solid',
      },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 20 },
      ],
    },
  ],
};

describe('mobile drawing persistence', () => {
  it('exports committed drawings and clears transient mobile edit state', () => {
    const exported = exportMobileUserDrawingStateForLayout(state);

    expect(exported?.drawings).toHaveLength(1);
    expect(exported?.activeTool).toBe('select');
    expect(exported?.selection).toBeNull();
    expect(exported?.draft).toBeNull();
    expect(exported?.textEdit).toBeNull();
  });

  it('imports empty layout drawing state as an idle selectable state', () => {
    expect(importMobileUserDrawingStateFromLayout(undefined)).toMatchObject({
      drawings: [],
      activeTool: 'select',
      selection: null,
      draft: null,
      textEdit: null,
    });
  });
});
