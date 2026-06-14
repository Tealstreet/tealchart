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
  normalizeUserDrawingFontStyle,
  normalizeUserDrawingOpacity,
  normalizeUserDrawingStyle,
  normalizeUserDrawingTextMaxWidth,
  USER_DRAWING_FONT_FAMILIES,
  USER_DRAWING_FONT_STYLES,
  USER_DRAWING_OPACITIES,
  USER_DRAWING_SCHEMA_VERSION,
  USER_DRAWING_TEXT_MAX_WIDTHS,
} from './types';

const anchorA = { time: 1_000, price: 100 };
const anchorB = { time: 2_000, price: 110 };
const anchorC = { time: 3_000, price: 105 };
const anchorD = { time: 4_000, price: 115 };
const anchorE = { time: 5_000, price: 108 };

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
      stayInDrawingMode: true,
      magnetMode: 'off',
      selection: null,
      draft: null,
      textEdit: null,
    });
  });

  it('reports required anchor counts by tool', () => {
    expect(getRequiredAnchorCount('select')).toBe(0);
    expect(getRequiredAnchorCount('horizontalLine')).toBe(1);
    expect(getRequiredAnchorCount('verticalLine')).toBe(1);
    expect(getRequiredAnchorCount('arrowMarkLeft')).toBe(1);
    expect(getRequiredAnchorCount('arrowMarkRight')).toBe(1);
    expect(getRequiredAnchorCount('arrowMarkUp')).toBe(1);
    expect(getRequiredAnchorCount('arrowMarkDown')).toBe(1);
    expect(getRequiredAnchorCount('horizontalRay')).toBe(1);
    expect(getRequiredAnchorCount('crossLine')).toBe(1);
    expect(getRequiredAnchorCount('note')).toBe(1);
    expect(getRequiredAnchorCount('comment')).toBe(1);
    expect(getRequiredAnchorCount('anchoredText')).toBe(1);
    expect(getRequiredAnchorCount('anchoredNote')).toBe(1);
    expect(getRequiredAnchorCount('priceLabel')).toBe(1);
    expect(getRequiredAnchorCount('pin')).toBe(1);
    expect(getRequiredAnchorCount('icon')).toBe(1);
    expect(getRequiredAnchorCount('flagMark')).toBe(1);
    expect(getRequiredAnchorCount('balloon')).toBe(1);
    expect(getRequiredAnchorCount('signpost')).toBe(1);
    expect(getRequiredAnchorCount('textLabel')).toBe(1);
    expect(getRequiredAnchorCount('anchoredVwap')).toBe(1);
    expect(getRequiredAnchorCount('callout')).toBe(2);
    expect(getRequiredAnchorCount('trendLine')).toBe(2);
    expect(getRequiredAnchorCount('trendAngle')).toBe(2);
    expect(getRequiredAnchorCount('extendedLine')).toBe(2);
    expect(getRequiredAnchorCount('infoLine')).toBe(2);
    expect(getRequiredAnchorCount('arrowLine')).toBe(2);
    expect(getRequiredAnchorCount('arrowMarker')).toBe(2);
    expect(getRequiredAnchorCount('ray')).toBe(2);
    expect(getRequiredAnchorCount('rectangle')).toBe(2);
    expect(getRequiredAnchorCount('image')).toBe(2);
    expect(getRequiredAnchorCount('circle')).toBe(2);
    expect(getRequiredAnchorCount('ellipse')).toBe(2);
    expect(getRequiredAnchorCount('priceRange')).toBe(2);
    expect(getRequiredAnchorCount('dateRange')).toBe(2);
    expect(getRequiredAnchorCount('datePriceRange')).toBe(2);
    expect(getRequiredAnchorCount('priceNote')).toBe(2);
    expect(getRequiredAnchorCount('forecast')).toBe(2);
    expect(getRequiredAnchorCount('anchoredVolumeProfile')).toBe(1);
    expect(getRequiredAnchorCount('fixedRangeVolumeProfile')).toBe(2);
    expect(getRequiredAnchorCount('fibRetracement')).toBe(2);
    expect(getRequiredAnchorCount('fibExtension')).toBe(2);
    expect(getRequiredAnchorCount('trendBasedFibExtension')).toBe(3);
    expect(getRequiredAnchorCount('fibFan')).toBe(2);
    expect(getRequiredAnchorCount('fibSpeedResistanceFan')).toBe(2);
    expect(getRequiredAnchorCount('fibArcs')).toBe(2);
    expect(getRequiredAnchorCount('fibSpeedResistanceArcs')).toBe(2);
    expect(getRequiredAnchorCount('fibCircles')).toBe(2);
    expect(getRequiredAnchorCount('fibSpiral')).toBe(2);
    expect(getRequiredAnchorCount('gannFan')).toBe(2);
    expect(getRequiredAnchorCount('gannBox')).toBe(2);
    expect(getRequiredAnchorCount('gannSquare')).toBe(2);
    expect(getRequiredAnchorCount('gannSquareFixed')).toBe(2);
    expect(getRequiredAnchorCount('fibTimeZone')).toBe(2);
    expect(getRequiredAnchorCount('cyclicLines')).toBe(2);
    expect(getRequiredAnchorCount('timeCycles')).toBe(2);
    expect(getRequiredAnchorCount('sineLine')).toBe(2);
    expect(getRequiredAnchorCount('fibWedge')).toBe(3);
    expect(getRequiredAnchorCount('fibChannel')).toBe(3);
    expect(getRequiredAnchorCount('trendBasedFibTime')).toBe(3);
    expect(getRequiredAnchorCount('projection')).toBe(3);
    expect(getRequiredAnchorCount('sector')).toBe(3);
    expect(getRequiredAnchorCount('triangle')).toBe(3);
    expect(getRequiredAnchorCount('curve')).toBe(3);
    expect(getRequiredAnchorCount('doubleCurve')).toBe(4);
    expect(getRequiredAnchorCount('arc')).toBe(3);
    expect(getRequiredAnchorCount('polyline')).toBe(3);
    expect(getRequiredAnchorCount('pitchfork')).toBe(3);
    expect(getRequiredAnchorCount('schiffPitchfork')).toBe(3);
    expect(getRequiredAnchorCount('modifiedSchiffPitchfork')).toBe(3);
    expect(getRequiredAnchorCount('insidePitchfork')).toBe(3);
    expect(getRequiredAnchorCount('pitchfan')).toBe(3);
    expect(getRequiredAnchorCount('rotatedRectangle')).toBe(3);
    expect(getRequiredAnchorCount('parallelChannel')).toBe(3);
    expect(getRequiredAnchorCount('regressionTrend')).toBe(3);
    expect(getRequiredAnchorCount('flatTopBottom')).toBe(3);
    expect(getRequiredAnchorCount('elliottCorrectiveWave')).toBe(3);
    expect(getRequiredAnchorCount('elliottDoubleComboWave')).toBe(3);
    expect(getRequiredAnchorCount('disjointChannel')).toBe(4);
    expect(getRequiredAnchorCount('trianglePattern')).toBe(4);
    expect(getRequiredAnchorCount('abcdPattern')).toBe(4);
    expect(getRequiredAnchorCount('threeDrivesPattern')).toBe(5);
    expect(getRequiredAnchorCount('headShouldersPattern')).toBe(5);
    expect(getRequiredAnchorCount('elliottImpulseWave')).toBe(5);
    expect(getRequiredAnchorCount('elliottTripleComboWave')).toBe(5);
    expect(getRequiredAnchorCount('elliottTriangleWave')).toBe(5);
    expect(getRequiredAnchorCount('xabcdPattern')).toBe(5);
    expect(getRequiredAnchorCount('cypherPattern')).toBe(5);
    expect(getRequiredAnchorCount('path')).toBe(3);
    expect(getRequiredAnchorCount('highlighter')).toBe(3);
    expect(getRequiredAnchorCount('emoji')).toBe(1);
    expect(getRequiredAnchorCount('sticker')).toBe(1);
  });

  it('normalizes drawing font sizes to supported cross-platform values', () => {
    expect(normalizeUserDrawingFontSize(7)).toBe(8);
    expect(normalizeUserDrawingFontSize(15)).toBe(14);
    expect(normalizeUserDrawingFontSize(20)).toBe(20);
    expect(normalizeUserDrawingFontSize(30)).toBe(28);
    expect(normalizeUserDrawingFontSize(38)).toBe(40);
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

  it('normalizes drawing font styles to supported cross-platform values', () => {
    expect(USER_DRAWING_FONT_STYLES).toEqual(['normal', 'italic']);
    expect(normalizeUserDrawingFontStyle('italic')).toBe('italic');
    expect(normalizeUserDrawingFontStyle('oblique')).toBe('normal');
    expect(normalizeUserDrawingStyle({ ...DEFAULT_USER_DRAWING_STYLE, fontStyle: 'oblique' as never })).toMatchObject({
      fontStyle: 'normal',
    });
  });

  it('normalizes drawing opacity to a cross-platform alpha range', () => {
    expect(USER_DRAWING_OPACITIES).toEqual([1, 0.75, 0.5, 0.25, 0.1]);
    expect(normalizeUserDrawingOpacity(-0.5)).toBe(0);
    expect(normalizeUserDrawingOpacity(0.4)).toBe(0.4);
    expect(normalizeUserDrawingOpacity(1.5)).toBe(1);
    expect(normalizeUserDrawingOpacity(Number.NaN)).toBe(1);
    expect(normalizeUserDrawingStyle({ ...DEFAULT_USER_DRAWING_STYLE, opacity: 1.4 })).toMatchObject({
      opacity: 1,
    });
  });

  it('normalizes drawing text wrap widths to supported cross-platform values', () => {
    expect(USER_DRAWING_TEXT_MAX_WIDTHS).toEqual([120, 180, 240, 320, 480]);
    expect(normalizeUserDrawingTextMaxWidth(90)).toBe(120);
    expect(normalizeUserDrawingTextMaxWidth(190)).toBe(180);
    expect(normalizeUserDrawingTextMaxWidth(260)).toBe(240);
    expect(normalizeUserDrawingTextMaxWidth(340)).toBe(320);
    expect(normalizeUserDrawingTextMaxWidth(440)).toBe(480);
    expect(normalizeUserDrawingStyle({ ...DEFAULT_USER_DRAWING_STYLE, textMaxWidth: 190 })).toMatchObject({
      textMaxWidth: 180,
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
    expect(createUserDrawingFromDraft(draft({ tool: 'trendAngle' }), { id: 'angle', now: 20 })).toMatchObject({
      id: 'angle',
      kind: 'trendAngle',
      points: [anchorA, anchorB],
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
    expect(createUserDrawingFromDraft(draft({ tool: 'ellipse' }), { id: 'ellipse', now: 20 })).toMatchObject({
      id: 'ellipse',
      kind: 'ellipse',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'rotatedRectangle', anchors: [anchorA, anchorB, anchorC] }), {
        id: 'rotated',
        now: 20,
      }),
    ).toMatchObject({
      id: 'rotated',
      kind: 'rotatedRectangle',
      points: [anchorA, anchorB, anchorC],
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
    expect(createUserDrawingFromDraft(draft({ tool: 'datePriceRange' }), { id: 'date-price-range', now: 20 })).toMatchObject({
      id: 'date-price-range',
      kind: 'datePriceRange',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'image', text: 'https://example.test/chart.png' }), { id: 'image', now: 20 })).toMatchObject({
      id: 'image',
      kind: 'image',
      points: [anchorA, anchorB],
      src: 'https://example.test/chart.png',
      alt: 'Image',
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'forecast' }), { id: 'forecast', now: 20 })).toMatchObject({
      id: 'forecast',
      kind: 'forecast',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'anchoredVolumeProfile', anchors: [anchorA] }), {
        id: 'anchored-volume-profile',
        now: 20,
      }),
    ).toMatchObject({
      id: 'anchored-volume-profile',
      kind: 'anchoredVolumeProfile',
      point: anchorA,
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'fixedRangeVolumeProfile' }), { id: 'volume-profile', now: 20 }),
    ).toMatchObject({
      id: 'volume-profile',
      kind: 'fixedRangeVolumeProfile',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'fibRetracement' }), { id: 'fib', now: 20 })).toMatchObject({
      id: 'fib',
      kind: 'fibRetracement',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'fibExtension' }), { id: 'fib-ext', now: 20 })).toMatchObject({
      id: 'fib-ext',
      kind: 'fibExtension',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'trendBasedFibExtension', anchors: [anchorA, anchorB, anchorC] }), {
        id: 'trend-fib-ext',
        now: 20,
      }),
    ).toMatchObject({
      id: 'trend-fib-ext',
      kind: 'trendBasedFibExtension',
      points: [anchorA, anchorB, anchorC],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'fibFan' }), { id: 'fib-fan', now: 20 })).toMatchObject({
      id: 'fib-fan',
      kind: 'fibFan',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'fibSpeedResistanceFan' }), { id: 'fib-speed-fan', now: 20 }),
    ).toMatchObject({
      id: 'fib-speed-fan',
      kind: 'fibSpeedResistanceFan',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'fibArcs' }), { id: 'fib-arcs', now: 20 }),
    ).toMatchObject({
      id: 'fib-arcs',
      kind: 'fibArcs',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'fibSpeedResistanceArcs' }), { id: 'fib-speed-arcs', now: 20 }),
    ).toMatchObject({
      id: 'fib-speed-arcs',
      kind: 'fibSpeedResistanceArcs',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'fibCircles' }), { id: 'fib-circles', now: 20 })).toMatchObject({
      id: 'fib-circles',
      kind: 'fibCircles',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'fibSpiral' }), { id: 'fib-spiral', now: 20 })).toMatchObject({
      id: 'fib-spiral',
      kind: 'fibSpiral',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'fibWedge', anchors: [anchorA, anchorB, anchorC] }), {
        id: 'fib-wedge',
        now: 20,
      }),
    ).toMatchObject({
      id: 'fib-wedge',
      kind: 'fibWedge',
      points: [anchorA, anchorB, anchorC],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'trendBasedFibTime', anchors: [anchorA, anchorB, anchorC] }), {
        id: 'trend-fib-time',
        now: 20,
      }),
    ).toMatchObject({
      id: 'trend-fib-time',
      kind: 'trendBasedFibTime',
      points: [anchorA, anchorB, anchorC],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'gannFan' }), { id: 'gann-fan', now: 20 })).toMatchObject({
      id: 'gann-fan',
      kind: 'gannFan',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'gannBox' }), { id: 'gann-box', now: 20 })).toMatchObject({
      id: 'gann-box',
      kind: 'gannBox',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'gannSquare' }), { id: 'gann-square', now: 20 })).toMatchObject({
      id: 'gann-square',
      kind: 'gannSquare',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'gannSquareFixed' }), { id: 'gann-square-fixed', now: 20 }),
    ).toMatchObject({
      id: 'gann-square-fixed',
      kind: 'gannSquareFixed',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'fibTimeZone' }), { id: 'fib-time-zone', now: 20 })).toMatchObject({
      id: 'fib-time-zone',
      kind: 'fibTimeZone',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'cyclicLines' }), { id: 'cyclic-lines', now: 20 })).toMatchObject({
      id: 'cyclic-lines',
      kind: 'cyclicLines',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'timeCycles' }), { id: 'time-cycles', now: 20 })).toMatchObject({
      id: 'time-cycles',
      kind: 'timeCycles',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'sineLine' }), { id: 'sine-line', now: 20 })).toMatchObject({
      id: 'sine-line',
      kind: 'sineLine',
      points: [anchorA, anchorB],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'fibChannel', anchors: [anchorA, anchorB, anchorC] }), { id: 'fib-channel', now: 20 })).toMatchObject({
      id: 'fib-channel',
      kind: 'fibChannel',
      points: [anchorA, anchorB, anchorC],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'projection', anchors: [anchorA, anchorB, anchorC] }), { id: 'projection', now: 20 })).toMatchObject({
      id: 'projection',
      kind: 'projection',
      points: [anchorA, anchorB, anchorC],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'sector', anchors: [anchorA, anchorB, anchorC] }), { id: 'sector', now: 20 })).toMatchObject({
      id: 'sector',
      kind: 'sector',
      points: [anchorA, anchorB, anchorC],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'anchoredVwap', anchors: [anchorA] }), { id: 'vwap', now: 20 })).toMatchObject({
      id: 'vwap',
      kind: 'anchoredVwap',
      point: anchorA,
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'triangle', anchors: [anchorA, anchorB, anchorC] }), { id: 'triangle', now: 20 })).toMatchObject({
      id: 'triangle',
      kind: 'triangle',
      points: [anchorA, anchorB, anchorC],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'pitchfork', anchors: [anchorA, anchorB, anchorC] }), { id: 'pitchfork', now: 20 })).toMatchObject({
      id: 'pitchfork',
      kind: 'pitchfork',
      points: [anchorA, anchorB, anchorC],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    for (const tool of ['schiffPitchfork', 'modifiedSchiffPitchfork', 'insidePitchfork'] as const) {
      expect(createUserDrawingFromDraft(draft({ tool, anchors: [anchorA, anchorB, anchorC] }), { id: tool, now: 20 })).toMatchObject({
        id: tool,
        kind: tool,
        points: [anchorA, anchorB, anchorC],
        visible: true,
        locked: false,
        createdAt: 20,
        updatedAt: 20,
      });
    }
    expect(createUserDrawingFromDraft(draft({ tool: 'pitchfan', anchors: [anchorA, anchorB, anchorC] }), { id: 'pitchfan', now: 20 })).toMatchObject({
      id: 'pitchfan',
      kind: 'pitchfan',
      points: [anchorA, anchorB, anchorC],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'parallelChannel', anchors: [anchorA, anchorB, anchorC] }), { id: 'channel', now: 20 })).toMatchObject({
      id: 'channel',
      kind: 'parallelChannel',
      points: [anchorA, anchorB, anchorC],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'regressionTrend', anchors: [anchorA, anchorB, anchorC] }), {
        id: 'regression',
        now: 20,
      }),
    ).toMatchObject({
      id: 'regression',
      kind: 'regressionTrend',
      points: [anchorA, anchorB, anchorC],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'flatTopBottom', anchors: [anchorA, anchorB, anchorC] }), {
        id: 'flat',
        now: 20,
      }),
    ).toMatchObject({
      id: 'flat',
      kind: 'flatTopBottom',
      points: [anchorA, anchorB, anchorC],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'disjointChannel', anchors: [anchorA, anchorB, anchorC, { time: 4_000, price: 95 }] }), {
        id: 'disjoint',
        now: 20,
      }),
    ).toMatchObject({
      id: 'disjoint',
      kind: 'disjointChannel',
      points: [anchorA, anchorB, anchorC, { time: 4_000, price: 95 }],
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
    expect(
      createUserDrawingFromDraft(draft({ tool: 'highlighter', anchors: [anchorA, anchorB, anchorC] }), {
        id: 'highlighter',
        now: 20,
      }),
    ).toMatchObject({
      id: 'highlighter',
      kind: 'highlighter',
      points: [anchorA, anchorB, anchorC],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'polyline', anchors: [anchorA, anchorB, anchorC] }), {
        id: 'polyline',
        now: 20,
      }),
    ).toMatchObject({
      id: 'polyline',
      kind: 'polyline',
      points: [anchorA, anchorB, anchorC],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'trianglePattern', anchors: [anchorA, anchorB, anchorC, anchorD] }), {
        id: 'triangle-pattern',
        now: 22,
      }),
    ).toEqual({
      id: 'triangle-pattern',
      kind: 'trianglePattern',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 22,
      updatedAt: 22,
      style: DEFAULT_USER_DRAWING_STYLE,
      points: [anchorA, anchorB, anchorC, anchorD],
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'abcdPattern', anchors: [anchorA, anchorB, anchorC, anchorD] }), {
        id: 'abcd',
        now: 20,
      }),
    ).toMatchObject({
      id: 'abcd',
      kind: 'abcdPattern',
      points: [anchorA, anchorB, anchorC, anchorD],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'elliottCorrectiveWave', anchors: [anchorA, anchorB, anchorC] }), {
        id: 'elliott-corrective',
        now: 23,
      }),
    ).toMatchObject({
      id: 'elliott-corrective',
      kind: 'elliottCorrectiveWave',
      points: [anchorA, anchorB, anchorC],
      visible: true,
      locked: false,
      createdAt: 23,
      updatedAt: 23,
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'elliottDoubleComboWave', anchors: [anchorA, anchorB, anchorC] }), {
        id: 'elliott-double-combo',
        now: 24,
      }),
    ).toMatchObject({
      id: 'elliott-double-combo',
      kind: 'elliottDoubleComboWave',
      points: [anchorA, anchorB, anchorC],
      visible: true,
      locked: false,
      createdAt: 24,
      updatedAt: 24,
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'xabcdPattern', anchors: [anchorA, anchorB, anchorC, anchorD, anchorE] }), {
        id: 'xabcd',
        now: 20,
      }),
    ).toMatchObject({
      id: 'xabcd',
      kind: 'xabcdPattern',
      points: [anchorA, anchorB, anchorC, anchorD, anchorE],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(
      createUserDrawingFromDraft(
        draft({ tool: 'cypherPattern', anchors: [anchorA, anchorB, anchorC, anchorD, anchorE] }),
        {
          id: 'cypher',
          now: 20,
        },
      ),
    ).toMatchObject({
      id: 'cypher',
      kind: 'cypherPattern',
      points: [anchorA, anchorB, anchorC, anchorD, anchorE],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(
      createUserDrawingFromDraft(
        draft({ tool: 'threeDrivesPattern', anchors: [anchorA, anchorB, anchorC, anchorD, anchorE] }),
        {
          id: 'three-drives',
          now: 24,
        },
      ),
    ).toMatchObject({
      id: 'three-drives',
      kind: 'threeDrivesPattern',
      points: [anchorA, anchorB, anchorC, anchorD, anchorE],
      visible: true,
      locked: false,
      createdAt: 24,
      updatedAt: 24,
    });
    expect(
      createUserDrawingFromDraft(
        draft({ tool: 'elliottTripleComboWave', anchors: [anchorA, anchorB, anchorC, anchorD, anchorE] }),
        {
          id: 'elliott-triple-combo',
          now: 24,
        },
      ),
    ).toMatchObject({
      id: 'elliott-triple-combo',
      kind: 'elliottTripleComboWave',
      points: [anchorA, anchorB, anchorC, anchorD, anchorE],
      visible: true,
      locked: false,
      createdAt: 24,
      updatedAt: 24,
    });
    expect(
      createUserDrawingFromDraft(
        draft({ tool: 'headShouldersPattern', anchors: [anchorA, anchorB, anchorC, anchorD, anchorE] }),
        {
          id: 'head-shoulders',
          now: 25,
        },
      ),
    ).toMatchObject({
      id: 'head-shoulders',
      kind: 'headShouldersPattern',
      points: [anchorA, anchorB, anchorC, anchorD, anchorE],
      visible: true,
      locked: false,
      createdAt: 25,
      updatedAt: 25,
    });
    expect(
      createUserDrawingFromDraft(
        draft({ tool: 'elliottImpulseWave', anchors: [anchorA, anchorB, anchorC, anchorD, anchorE] }),
        {
          id: 'elliott-impulse',
          now: 26,
        },
      ),
    ).toMatchObject({
      id: 'elliott-impulse',
      kind: 'elliottImpulseWave',
      points: [anchorA, anchorB, anchorC, anchorD, anchorE],
      visible: true,
      locked: false,
      createdAt: 26,
      updatedAt: 26,
    });
    expect(
      createUserDrawingFromDraft(
        draft({ tool: 'elliottTriangleWave', anchors: [anchorA, anchorB, anchorC, anchorD, anchorE] }),
        {
          id: 'elliott-triangle',
          now: 27,
        },
      ),
    ).toMatchObject({
      id: 'elliott-triangle',
      kind: 'elliottTriangleWave',
      points: [anchorA, anchorB, anchorC, anchorD, anchorE],
      visible: true,
      locked: false,
      createdAt: 27,
      updatedAt: 27,
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'curve', anchors: [anchorA, anchorB, anchorC] }), {
        id: 'curve',
        now: 20,
      }),
    ).toMatchObject({
      id: 'curve',
      kind: 'curve',
      points: [anchorA, anchorB, anchorC],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'doubleCurve', anchors: [anchorA, anchorB, anchorC, anchorD] }), {
        id: 'double-curve',
        now: 20,
      }),
    ).toMatchObject({
      id: 'double-curve',
      kind: 'doubleCurve',
      points: [anchorA, anchorB, anchorC, anchorD],
      visible: true,
      locked: false,
      createdAt: 20,
      updatedAt: 20,
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'arc', anchors: [anchorA, anchorB, anchorC] }), {
        id: 'arc',
        now: 20,
      }),
    ).toMatchObject({
      id: 'arc',
      kind: 'arc',
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
    expect(createUserDrawingFromDraft(draft({ tool: 'horizontalRay', anchors: [anchorA] }), { id: 'hr' })).toMatchObject({
      kind: 'horizontalRay',
      point: anchorA,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'crossLine', anchors: [anchorA] }), { id: 'cross' })).toMatchObject({
      kind: 'crossLine',
      point: anchorA,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'arrowMarkLeft', anchors: [anchorA] }), { id: 'left' })).toMatchObject({
      kind: 'arrowMarkLeft',
      point: anchorA,
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'arrowMarkRight', anchors: [anchorA] }), { id: 'right' }),
    ).toMatchObject({
      kind: 'arrowMarkRight',
      point: anchorA,
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
    expect(
      createUserDrawingFromDraft(
        draft({
          tool: 'note',
          anchors: [anchorA],
          text: 'Chart note',
        }),
        { id: 'note' },
      ),
    ).toMatchObject({
      kind: 'note',
      point: anchorA,
      text: 'Chart note',
      textAlign: 'center',
    });
    expect(
      createUserDrawingFromDraft(
        draft({
          tool: 'comment',
          anchors: [anchorA],
          text: 'Comment',
        }),
        { id: 'comment' },
      ),
    ).toMatchObject({
      kind: 'comment',
      point: anchorA,
      text: 'Comment',
      textAlign: 'center',
    });
    expect(
      createUserDrawingFromDraft(
        draft({
          tool: 'priceLabel',
          anchors: [anchorA],
          text: 'Price label',
        }),
        { id: 'price-label' },
      ),
    ).toMatchObject({
      kind: 'priceLabel',
      point: anchorA,
      text: 'Price label',
      textAlign: 'center',
    });
    expect(
      createUserDrawingFromDraft(
        draft({
          tool: 'signpost',
          anchors: [anchorA],
          text: 'Signal',
        }),
        { id: 'signpost' },
      ),
    ).toMatchObject({
      kind: 'signpost',
      point: anchorA,
      text: 'Signal',
      textAlign: 'center',
    });
    expect(
      createUserDrawingFromDraft(
        draft({
          tool: 'anchoredText',
          anchors: [anchorA],
          positions: [{ x: 0.25, y: 0.75 }],
          text: 'Anchored',
        }),
        { id: 'anchored-text' },
      ),
    ).toMatchObject({
      kind: 'anchoredText',
      position: { x: 0.25, y: 0.75 },
      text: 'Anchored',
      textAlign: 'center',
    });
    expect(
      createUserDrawingFromDraft(
        draft({
          tool: 'anchoredNote',
          anchors: [anchorA],
          positions: [{ x: 2, y: -1 }],
          text: 'Pinned',
        }),
        { id: 'anchored-note' },
      ),
    ).toMatchObject({
      kind: 'anchoredNote',
      position: { x: 1, y: 0 },
      text: 'Pinned',
      textAlign: 'center',
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'pin', anchors: [anchorA] }), { id: 'pin' })).toMatchObject({
      kind: 'pin',
      point: anchorA,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'icon', anchors: [anchorA] }), { id: 'icon' })).toMatchObject({
      kind: 'icon',
      point: anchorA,
      iconName: 'star',
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'flagMark', anchors: [anchorA] }), { id: 'flag' })).toMatchObject({
      kind: 'flagMark',
      point: anchorA,
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'emoji', anchors: [anchorA] }), { id: 'emoji' })).toMatchObject({
      kind: 'emoji',
      point: anchorA,
      text: '👍',
      textAlign: 'center',
    });
    expect(
      createUserDrawingFromDraft(draft({ tool: 'emoji', anchors: [anchorA], text: '🔥' }), { id: 'emoji-fire' }),
    ).toMatchObject({
      kind: 'emoji',
      point: anchorA,
      text: '🔥',
      textAlign: 'center',
    });
    expect(createUserDrawingFromDraft(draft({ tool: 'sticker', anchors: [anchorA] }), { id: 'sticker' })).toMatchObject({
      kind: 'sticker',
      point: anchorA,
      text: '★',
      textAlign: 'center',
    });
    expect(
      createUserDrawingFromDraft(
        draft({
          tool: 'balloon',
          anchors: [anchorA],
          text: 'Balloon',
        }),
        { id: 'balloon' },
      ),
    ).toMatchObject({
      kind: 'balloon',
      point: anchorA,
      text: 'Balloon',
      textAlign: 'center',
    });
    expect(
      createUserDrawingFromDraft(
        draft({
          tool: 'callout',
          anchors: [anchorA, anchorB],
          text: 'Callout',
        }),
        { id: 'callout' },
      ),
    ).toMatchObject({
      kind: 'callout',
      points: [anchorA, anchorB],
      text: 'Callout',
      textAlign: 'center',
    });
    expect(
      createUserDrawingFromDraft(
        draft({
          tool: 'priceNote',
          anchors: [anchorA, anchorB],
          text: 'Price note',
        }),
        { id: 'price-note' },
      ),
    ).toMatchObject({
      kind: 'priceNote',
      points: [anchorA, anchorB],
      text: 'Price note',
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
