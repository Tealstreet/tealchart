import type { UserDrawingDraft } from './types';

import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import {
  createUserDrawingFromDraft,
  DEFAULT_USER_DRAWING_STATE,
  DEFAULT_USER_DRAWING_STYLE,
  getRequiredAnchorCount,
  getUserDrawingPaneId,
  isDrawingDraftReady,
  USER_DRAWING_SCHEMA_VERSION,
} from './types';

const anchorA = { time: 1_000, price: 100 };
const anchorB = { time: 2_000, price: 110 };

function draft(overrides: Partial<UserDrawingDraft>): UserDrawingDraft {
  return {
    tool: 'trendLine',
    paneId: 'main',
    anchors: [anchorA, anchorB],
    style: DEFAULT_USER_DRAWING_STYLE,
    startedAt: 10,
    ...overrides,
  };
}

describe('user drawing types', () => {
  afterEach(() => {
    clearChartStoreCache();
  });

  it('defines an empty default state for new chart instances', () => {
    expect(DEFAULT_USER_DRAWING_STATE).toEqual({
      version: USER_DRAWING_SCHEMA_VERSION,
      drawings: [],
      activeTool: 'select',
      selection: null,
      draft: null,
    });
  });

  it('reports required anchor counts by tool', () => {
    expect(getRequiredAnchorCount('select')).toBe(0);
    expect(getRequiredAnchorCount('horizontalLine')).toBe(1);
    expect(getRequiredAnchorCount('verticalLine')).toBe(1);
    expect(getRequiredAnchorCount('textLabel')).toBe(1);
    expect(getRequiredAnchorCount('trendLine')).toBe(2);
    expect(getRequiredAnchorCount('ray')).toBe(2);
    expect(getRequiredAnchorCount('rectangle')).toBe(2);
  });

  it('identifies complete drafts', () => {
    expect(isDrawingDraftReady(draft({ tool: 'trendLine', anchors: [anchorA] }))).toBe(false);
    expect(isDrawingDraftReady(draft({ tool: 'trendLine', anchors: [anchorA, anchorB] }))).toBe(true);
    expect(isDrawingDraftReady(draft({ tool: 'horizontalLine', anchors: [anchorA] }))).toBe(true);
  });

  it('creates two-anchor drawings from a ready draft', () => {
    const drawing = createUserDrawingFromDraft(draft({ tool: 'trendLine' }), { id: 'drawing-1', now: 20 });

    expect(drawing).toMatchObject({
      id: 'drawing-1',
      kind: 'trendLine',
      paneId: 'main',
      points: [anchorA, anchorB],
      extend: 'none',
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
  });

  it('creates single-anchor drawings from a ready draft', () => {
    expect(
      createUserDrawingFromDraft(draft({ tool: 'horizontalLine', anchors: [anchorA] }), { id: 'h' }),
    ).toMatchObject({
      kind: 'horizontalLine',
      price: anchorA.price,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'verticalLine', anchors: [anchorA] }), { id: 'v' })).toMatchObject({
      kind: 'verticalLine',
      time: anchorA.time,
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'textLabel', anchors: [anchorA], text: 'Note' }), { id: 't' }),
    ).toMatchObject({
      kind: 'textLabel',
      point: anchorA,
      text: 'Note',
      textAlign: 'center',
    });
  });

  it('does not create drawings from incomplete or selection drafts', () => {
    expect(
      createUserDrawingFromDraft(draft({ tool: 'trendLine', anchors: [anchorA] }), { id: 'incomplete' }),
    ).toBeNull();
    expect(createUserDrawingFromDraft(draft({ tool: 'select', anchors: [] }), { id: 'select' })).toBeNull();
  });

  it('keeps pane lookup independent from drawing shape', () => {
    const drawing = createUserDrawingFromDraft(draft({ tool: 'rectangle' }), { id: 'rect' });

    expect(drawing && getUserDrawingPaneId(drawing)).toBe('main');
  });
});
