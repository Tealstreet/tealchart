import type { UserDrawingState } from '../../drawings';

import { describe, expect, it } from 'vitest';

import { createUserDrawingCommandHistory, dispatchUserDrawingCommandWithHistory, USER_DRAWING_LAYOUT_SCHEMA_VERSION } from '../../drawings';
import {
  createMobileUserDrawingReplaceStateCommandEvent,
  exportMobileUserDrawingStateForLayout,
  importMobileUserDrawingStateFromLayout,
  replaceMobileUserDrawingState,
} from './drawingPersistence';

const state: UserDrawingState = {
  version: 1,
  activeTool: 'rectangle',
  stayInDrawingMode: false,
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
    expect(exported?.stayInDrawingMode).toBe(false);
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

  it('exports and imports disabled stay-in-drawing-mode without drawings', () => {
    const exported = exportMobileUserDrawingStateForLayout({
      ...state,
      drawings: [],
      selection: null,
      draft: null,
      textEdit: null,
      stayInDrawingMode: false,
    });

    expect(exported).toMatchObject({
      drawings: [],
      stayInDrawingMode: false,
    });
    expect(importMobileUserDrawingStateFromLayout(exported)).toMatchObject({
      drawings: [],
      activeTool: 'select',
      stayInDrawingMode: false,
      selection: null,
      draft: null,
      textEdit: null,
    });
  });

  it('creates mobile replace-state command events for imperative import and set flows', () => {
    const previousState = importMobileUserDrawingStateFromLayout(undefined);
    const event = createMobileUserDrawingReplaceStateCommandEvent(previousState, state, 'layout');

    expect(event).toMatchObject({
      command: { type: 'replaceState' },
      source: 'layout',
      previousState,
      state,
      affectedIds: ['rect_1'],
    });
    expect(createMobileUserDrawingReplaceStateCommandEvent(state, state, 'api')).toBeNull();
  });

  it('clears mobile command history when replacing drawing state through imperative handle flows', () => {
    const previousState = importMobileUserDrawingStateFromLayout(undefined);
    const { history } = dispatchUserDrawingCommandWithHistory(previousState, createUserDrawingCommandHistory(), {
      type: 'add',
      drawing: state.drawings[0]!,
      meta: { source: 'api' },
    });

    expect(history.undoStack).toHaveLength(1);

    const result = replaceMobileUserDrawingState(previousState, history, state, 'api');

    expect(result.state).toBe(state);
    expect(result.changed).toBe(true);
    expect(result.layoutChanged).toBe(true);
    expect(result.event).toMatchObject({
      command: { type: 'replaceState' },
      source: 'api',
      affectedIds: ['rect_1'],
    });
    expect(result.history.undoStack).toEqual([]);
    expect(result.history.redoStack).toEqual([]);

    const unchanged = replaceMobileUserDrawingState(state, result.history, state, 'layout');
    expect(unchanged.state).toBe(state);
    expect(unchanged.changed).toBe(false);
    expect(unchanged.layoutChanged).toBe(false);
    expect(unchanged.event).toBeNull();
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
      stayInDrawingMode: true,
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
