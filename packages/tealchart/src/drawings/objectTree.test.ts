import { describe, expect, it } from 'vitest';

import { createUserDrawingState } from './input';
import { resolveUserDrawingObjectTreeModel } from './objectTree';
import type { UserDrawing, UserDrawingStyle } from './types';

const style: UserDrawingStyle = {
  lineColor: '#fff',
  lineWidth: 1,
  lineStyle: 'solid',
};

const anchorA = { time: 1_000, price: 100 };
const anchorB = { time: 2_000, price: 110 };

function createTrendLine(overrides: Partial<Extract<UserDrawing, { kind: 'trendLine' }>> = {}): UserDrawing {
  return {
    id: 'trend',
    kind: 'trendLine',
    paneId: 'main',
    visible: true,
    locked: false,
    createdAt: 1,
    updatedAt: 1,
    style,
    points: [anchorA, anchorB],
    extend: 'none',
    ...overrides,
  };
}

function createRectangle(overrides: Partial<Extract<UserDrawing, { kind: 'rectangle' }>> = {}): UserDrawing {
  return {
    id: 'rect',
    kind: 'rectangle',
    paneId: 'main',
    visible: true,
    locked: false,
    createdAt: 1,
    updatedAt: 1,
    style,
    points: [anchorA, anchorB],
    ...overrides,
  };
}

function createHorizontalLine(overrides: Partial<Extract<UserDrawing, { kind: 'horizontalLine' }>> = {}): UserDrawing {
  return {
    id: 'hline',
    kind: 'horizontalLine',
    paneId: 'volume',
    visible: true,
    locked: false,
    createdAt: 1,
    updatedAt: 1,
    style,
    price: 105,
    ...overrides,
  };
}

describe('user drawing object tree model', () => {
  it('resolves committed drawings in front-to-back order by default', () => {
    const state = createUserDrawingState({
      drawings: [createTrendLine(), createRectangle(), createHorizontalLine()],
    });

    const model = resolveUserDrawingObjectTreeModel(state);

    expect(model.drawingCount).toBe(3);
    expect(model.rows.map((row) => row.drawingId)).toEqual(['hline', 'rect', 'trend']);
    expect(model.rows.map((row) => row.zIndex)).toEqual([2, 1, 0]);
    expect(model.rows.map((row) => row.orderIndex)).toEqual([0, 1, 2]);
    expect(model.rows[0]).toMatchObject({
      id: 'hline',
      kind: 'horizontalLine',
      tool: 'horizontalLine',
      label: 'Horizontal line',
      defaultLabel: 'Horizontal line',
      customName: null,
      paneId: 'volume',
      visible: true,
      locked: false,
      selected: false,
      editable: true,
    });
    expect(model.rows[0]?.groupIds).toEqual([]);
  });

  it('can resolve drawings in back-to-front order', () => {
    const state = createUserDrawingState({
      drawings: [createTrendLine(), createRectangle(), createHorizontalLine()],
    });

    const model = resolveUserDrawingObjectTreeModel(state, { order: 'backToFront' });

    expect(model.rows.map((row) => row.drawingId)).toEqual(['trend', 'rect', 'hline']);
    expect(model.rows.map((row) => row.zIndex)).toEqual([0, 1, 2]);
  });

  it('includes selection, visibility, lock, and editability metadata', () => {
    const state = createUserDrawingState({
      drawings: [
        createTrendLine({ id: 'trend', visible: false }),
        createRectangle({ id: 'rect', locked: true }),
        createHorizontalLine({ id: 'hline' }),
      ],
      selection: { drawingId: 'trend', drawingIds: ['trend', 'rect'] },
    });

    const model = resolveUserDrawingObjectTreeModel(state);

    expect(model.selectedIds).toEqual(['trend', 'rect']);
    expect(model.rows.map((row) => [row.drawingId, row.selected, row.visible, row.locked, row.editable])).toEqual([
      ['hline', false, true, false, true],
      ['rect', true, true, true, false],
      ['trend', true, false, false, true],
    ]);
  });

  it('returns stable empty metadata for an empty drawing state', () => {
    const model = resolveUserDrawingObjectTreeModel(createUserDrawingState());

    expect(model).toEqual({
      rows: [],
      selectedIds: [],
      drawingCount: 0,
    });
  });
});
