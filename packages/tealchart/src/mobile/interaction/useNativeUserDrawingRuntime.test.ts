import { describe, expect, it } from 'vitest';

import {
  createUserDrawingCommandEvent,
  createUserDrawingState,
  DEFAULT_USER_DRAWING_STYLE,
  dispatchUserDrawingCommand,
} from '../../drawings';
import {
  createNativeUserDrawingDuplicateSelectedToolbarCommand,
  createNativeUserDrawingNoAffectedToolbarCommandMetadata,
  createNativeUserDrawingSelectedToolbarCommandMetadata,
  resolveNativeUserDrawingExternalState,
} from './useNativeUserDrawingRuntime';

describe('native user drawing command metadata', () => {
  it('marks drawing-independent toolbar commands as affecting no drawing ids', () => {
    expect(createNativeUserDrawingNoAffectedToolbarCommandMetadata()).toEqual({
      source: 'toolbar',
      affectedIds: [],
    });
  });

  it('marks selected toolbar commands with the current selected drawing ids', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'drawing-2', drawingIds: ['drawing-2', 'drawing-1', 'drawing-2'] },
    });

    expect(createNativeUserDrawingSelectedToolbarCommandMetadata(state)).toEqual({
      source: 'toolbar',
      affectedIds: ['drawing-2', 'drawing-1'],
    });
  });

  it('emits selected and generated duplicate ids without falling back to event derivation', () => {
    const state = createUserDrawingState({
      drawings: [
        {
          id: 'trend-line',
          kind: 'trendLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: DEFAULT_USER_DRAWING_STYLE,
          points: [
            { time: 1_000, price: 64_000 },
            { time: 2_000, price: 64_200 },
          ],
          extend: 'none',
        },
      ],
      selection: { drawingId: 'trend-line' },
    });
    const command = createNativeUserDrawingDuplicateSelectedToolbarCommand(state, () => 'trend-line-copy', () => 10);
    const result = dispatchUserDrawingCommand(state, command);
    const event = createUserDrawingCommandEvent(state, result);

    expect(result.changed).toBe(true);
    expect(event?.affectedIds).toEqual(['trend-line', 'trend-line-copy']);
  });
});

describe('resolveNativeUserDrawingExternalState', () => {
  it('ignores controlled echoes without clearing drawing command history', () => {
    const previousState = createUserDrawingState({ activeTool: 'rectangle' });
    const echoedState = createUserDrawingState({ activeTool: 'rectangle' });

    expect(resolveNativeUserDrawingExternalState(previousState, echoedState)).toEqual({
      changed: false,
      layoutChanged: false,
      state: previousState,
    });
  });

  it('accepts externally controlled active-tool updates without treating them as layout replacements', () => {
    const previousState = createUserDrawingState({ activeTool: 'select' });
    const nextState = createUserDrawingState({ activeTool: 'trendLine' });

    expect(resolveNativeUserDrawingExternalState(previousState, nextState)).toEqual({
      changed: true,
      layoutChanged: false,
      state: nextState,
    });
  });

  it('marks persisted drawing setting changes as layout replacements', () => {
    const previousState = createUserDrawingState();
    const nextState = createUserDrawingState({ stayInDrawingMode: true });

    expect(resolveNativeUserDrawingExternalState(previousState, nextState)).toEqual({
      changed: true,
      layoutChanged: true,
      state: nextState,
    });
  });

  it('marks persisted favorite toolbar position changes as layout replacements', () => {
    const previousState = createUserDrawingState();
    const nextState = createUserDrawingState({ favoriteToolbarPosition: { x: 20, y: 40 } });

    expect(resolveNativeUserDrawingExternalState(previousState, nextState)).toEqual({
      changed: true,
      layoutChanged: true,
      state: nextState,
    });
  });

  it('ignores controlled echoes with equivalent transient selection state', () => {
    const previousState = createUserDrawingState({
      selection: { drawingId: 'drawing-1', drawingIds: ['drawing-1', 'drawing-2'], handle: 'start', pointIndex: 0 },
    });
    const echoedState = createUserDrawingState({
      selection: { drawingId: 'drawing-1', drawingIds: ['drawing-1', 'drawing-2'], handle: 'start', pointIndex: 0 },
    });

    expect(resolveNativeUserDrawingExternalState(previousState, echoedState)).toEqual({
      changed: false,
      layoutChanged: false,
      state: previousState,
    });
  });

  it('ignores controlled echoes with equivalent draft state', () => {
    const previousState = createUserDrawingState({
      activeTool: 'trendLine',
      draft: {
        tool: 'trendLine',
        paneId: 'main',
        anchors: [{ time: 100, price: 64_000 }],
        positions: [{ x: 12, y: 24 }],
        style: DEFAULT_USER_DRAWING_STYLE,
        startedAt: 123,
      },
    });
    const echoedState = createUserDrawingState({
      activeTool: 'trendLine',
      draft: {
        tool: 'trendLine',
        paneId: 'main',
        anchors: [{ time: 100, price: 64_000 }],
        positions: [{ x: 12, y: 24 }],
        style: { ...DEFAULT_USER_DRAWING_STYLE },
        startedAt: 123,
      },
    });

    expect(resolveNativeUserDrawingExternalState(previousState, echoedState)).toEqual({
      changed: false,
      layoutChanged: false,
      state: previousState,
    });
  });

  it('ignores controlled draft echoes that only differ by explicit undefined style keys', () => {
    const previousState = createUserDrawingState({
      activeTool: 'trendLine',
      draft: {
        tool: 'trendLine',
        paneId: 'main',
        anchors: [{ time: 100, price: 64_000 }],
        style: { lineColor: '#00aaff', lineWidth: 1, lineStyle: 'solid', fillColor: undefined },
        startedAt: 123,
      },
    });
    const echoedState = createUserDrawingState({
      activeTool: 'trendLine',
      draft: {
        tool: 'trendLine',
        paneId: 'main',
        anchors: [{ time: 100, price: 64_000 }],
        style: { lineColor: '#00aaff', lineWidth: 1, lineStyle: 'solid' },
        startedAt: 123,
      },
    });

    expect(resolveNativeUserDrawingExternalState(previousState, echoedState)).toEqual({
      changed: false,
      layoutChanged: false,
      state: previousState,
    });
  });

  it('accepts externally controlled draft updates without treating them as layout replacements', () => {
    const previousState = createUserDrawingState({
      activeTool: 'trendLine',
      draft: {
        tool: 'trendLine',
        paneId: 'main',
        anchors: [{ time: 100, price: 64_000 }],
        positions: [{ x: 12, y: 24 }],
        style: DEFAULT_USER_DRAWING_STYLE,
        startedAt: 123,
      },
    });
    const nextState = createUserDrawingState({
      activeTool: 'trendLine',
      draft: {
        tool: 'trendLine',
        paneId: 'main',
        anchors: [{ time: 105, price: 64_100 }],
        positions: [{ x: 18, y: 28 }],
        style: DEFAULT_USER_DRAWING_STYLE,
        startedAt: 123,
      },
    });

    expect(resolveNativeUserDrawingExternalState(previousState, nextState)).toEqual({
      changed: true,
      layoutChanged: false,
      state: nextState,
    });
  });
});
