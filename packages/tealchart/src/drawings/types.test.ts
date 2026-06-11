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
  normalizeUserDrawingFontFamily,
  normalizeUserDrawingFontSize,
  normalizeUserDrawingOpacity,
  normalizeUserDrawingStyle,
  USER_DRAWING_FONT_FAMILIES,
  USER_DRAWING_OPACITIES,
  USER_DRAWING_SCHEMA_VERSION,
} from './types';

const anchorA = { time: 1_000, price: 100 };
const anchorB = { time: 2_000, price: 110 };
const anchorC = { time: 3_000, price: 105 };

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
      textEdit: null,
    });
  });

  it('reports required anchor counts by tool', () => {
    expect(getRequiredAnchorCount('select')).toBe(0);
    expect(getRequiredAnchorCount('horizontalLine')).toBe(1);
    expect(getRequiredAnchorCount('verticalLine')).toBe(1);
    expect(getRequiredAnchorCount('arrowMarkUp')).toBe(1);
    expect(getRequiredAnchorCount('arrowMarkDown')).toBe(1);
    expect(getRequiredAnchorCount('textLabel')).toBe(1);
    expect(getRequiredAnchorCount('trendLine')).toBe(2);
    expect(getRequiredAnchorCount('extendedLine')).toBe(2);
    expect(getRequiredAnchorCount('infoLine')).toBe(2);
    expect(getRequiredAnchorCount('arrowLine')).toBe(2);
    expect(getRequiredAnchorCount('arrowMarker')).toBe(2);
    expect(getRequiredAnchorCount('ray')).toBe(2);
    expect(getRequiredAnchorCount('rectangle')).toBe(2);
    expect(getRequiredAnchorCount('circle')).toBe(2);
    expect(getRequiredAnchorCount('priceRange')).toBe(2);
    expect(getRequiredAnchorCount('dateRange')).toBe(2);
    expect(getRequiredAnchorCount('path')).toBe(3);
  });

  it('normalizes drawing font sizes to supported cross-platform values', () => {
    expect(normalizeUserDrawingFontSize(8)).toBe(10);
    expect(normalizeUserDrawingFontSize(15)).toBe(14);
    expect(normalizeUserDrawingFontSize(20)).toBe(16);
    expect(normalizeUserDrawingStyle({ ...DEFAULT_USER_DRAWING_STYLE, fontSize: 15 })).toMatchObject({
      fontSize: 14,
    });
  });

  it('normalizes drawing font families to supported cross-platform values', () => {
    expect(USER_DRAWING_FONT_FAMILIES).toEqual(['sans-serif', 'serif', 'monospace']);
    expect(normalizeUserDrawingFontFamily('serif')).toBe('serif');
    expect(normalizeUserDrawingFontFamily('Papyrus')).toBe('sans-serif');
    expect(normalizeUserDrawingStyle({ ...DEFAULT_USER_DRAWING_STYLE, fontFamily: 'fantasy' })).toMatchObject({
      fontFamily: 'sans-serif',
    });
  });

  it('normalizes drawing opacity to a cross-platform alpha range', () => {
    expect(USER_DRAWING_OPACITIES).toEqual([1, 0.75, 0.5, 0.25]);
    expect(normalizeUserDrawingOpacity(-0.5)).toBe(0);
    expect(normalizeUserDrawingOpacity(0.4)).toBe(0.4);
    expect(normalizeUserDrawingOpacity(1.5)).toBe(1);
    expect(normalizeUserDrawingOpacity(Number.NaN)).toBe(1);
    expect(normalizeUserDrawingStyle({ ...DEFAULT_USER_DRAWING_STYLE, opacity: 1.4 })).toMatchObject({
      opacity: 1,
    });
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
    expect(createUserDrawingFromDraft(draft({ tool: 'arrowLine' }), { id: 'arrow', now: 20 })).toMatchObject({
      id: 'arrow',
      kind: 'arrowLine',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'arrowMarker' }), { id: 'marker', now: 20 })).toMatchObject({
      id: 'marker',
      kind: 'arrowMarker',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'extendedLine' }), { id: 'extended', now: 20 })).toMatchObject({
      id: 'extended',
      kind: 'extendedLine',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'infoLine' }), { id: 'info', now: 20 })).toMatchObject({
      id: 'info',
      kind: 'infoLine',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'priceRange' }), { id: 'range', now: 20 })).toMatchObject({
      id: 'range',
      kind: 'priceRange',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'circle' }), { id: 'circle', now: 20 })).toMatchObject({
      id: 'circle',
      kind: 'circle',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'dateRange' }), { id: 'date-range', now: 20 })).toMatchObject({
      id: 'date-range',
      kind: 'dateRange',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'path', anchors: [anchorA, anchorB, anchorC] }), { id: 'path', now: 20 })).toMatchObject({
      id: 'path',
      kind: 'path',
      points: [anchorA, anchorB, anchorC],
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
    expect(createUserDrawingFromDraft(draft({ tool: 'arrowMarkUp', anchors: [anchorA] }), { id: 'up' })).toMatchObject({
      kind: 'arrowMarkUp',
      point: anchorA,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'arrowMarkDown', anchors: [anchorA] }), { id: 'down' })).toMatchObject({
      kind: 'arrowMarkDown',
      point: anchorA,
    });
    expect(
      createUserDrawingFromDraft(
        draft({
          tool: 'textLabel',
          anchors: [anchorA],
          style: { ...DEFAULT_USER_DRAWING_STYLE, fontSize: 15, fontFamily: 'monospace' },
          text: 'Note',
        }),
        { id: 't' },
      ),
    ).toMatchObject({
      kind: 'textLabel',
      point: anchorA,
      style: expect.objectContaining({ fontFamily: 'monospace', fontSize: 14 }),
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
