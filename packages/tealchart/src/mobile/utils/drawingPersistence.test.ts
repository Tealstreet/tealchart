import type { UserDrawingState } from '../../drawings';

import { describe, expect, it } from 'vitest';

import { USER_DRAWING_LAYOUT_SCHEMA_VERSION } from '../../drawings';
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
      name: 'Mobile rectangle',
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

    expect(exported?.version).toBe(USER_DRAWING_LAYOUT_SCHEMA_VERSION);
    expect(exported?.drawings).toHaveLength(1);
    expect(exported?.drawings[0]?.name).toBe('Mobile rectangle');
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

  it('imports versionless legacy drawing payloads through the shared schema', () => {
    const imported = importMobileUserDrawingStateFromLayout({
      drawings: [
        {
          id: 'legacy_ray',
          name: ' Legacy ray ',
          kind: 'horizontalRay',
          paneId: 'main',
          style: {
            lineColor: '#f5c542',
            lineWidth: 1,
            lineStyle: 'solid',
          },
          point: { time: 1, price: 10 },
        },
      ],
    });

    expect(imported).toMatchObject({
      version: USER_DRAWING_LAYOUT_SCHEMA_VERSION,
      drawings: [
        {
          id: 'legacy_ray',
          name: 'Legacy ray',
          visible: true,
          locked: false,
          createdAt: 0,
          updatedAt: 0,
        },
      ],
      activeTool: 'select',
      selection: null,
      draft: null,
      textEdit: null,
    });
  });

  it('imports future schema payloads as an idle mobile drawing state', () => {
    const imported = importMobileUserDrawingStateFromLayout({
      version: USER_DRAWING_LAYOUT_SCHEMA_VERSION + 1,
      drawings: [
        {
          id: 'future',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {
            lineColor: '#f5c542',
            lineWidth: 1,
            lineStyle: 'solid',
          },
          price: 10,
        },
      ],
    });

    expect(imported).toMatchObject({
      version: USER_DRAWING_LAYOUT_SCHEMA_VERSION,
      drawings: [],
      activeTool: 'select',
      selection: null,
      draft: null,
      textEdit: null,
    });
  });
});
