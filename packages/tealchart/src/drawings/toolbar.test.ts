import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import {
  getUserDrawingToolbarStateKey,
  getUserDrawingToolDescriptor,
  getUserDrawingZOrderAction,
  isUserDrawingFillToolbarEnabled,
  isUserDrawingIconToolbarEnabled,
  isUserDrawingStyleToolbarActionEnabled,
  isUserDrawingStyleToolbarEnabled,
  isUserDrawingTextToolbarEnabled,
  isUserDrawingToolbarActionEnabled,
  resolveUserDrawingStyleToolbarAction,
  supportsUserDrawingFillControls,
  supportsUserDrawingIconControls,
  supportsUserDrawingTextAlignControls,
  supportsUserDrawingTextControls,
  supportsUserDrawingTextStyleControls,
  supportsUserDrawingTextWrapControls,
  supportsUserDrawingTrendLineExtendControls,
  USER_DRAWING_FILL_COLOR_DESCRIPTORS,
  USER_DRAWING_FONT_FAMILY_DESCRIPTORS,
  USER_DRAWING_FONT_SIZE_DESCRIPTORS,
  USER_DRAWING_FONT_STYLE_DESCRIPTORS,
  USER_DRAWING_ICON_NAME_DESCRIPTORS,
  USER_DRAWING_LINE_COLOR_DESCRIPTORS,
  USER_DRAWING_LINE_STYLE_DESCRIPTORS,
  USER_DRAWING_LINE_WIDTH_DESCRIPTORS,
  USER_DRAWING_OPACITY_DESCRIPTORS,
  USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS,
  USER_DRAWING_STYLE_TOOLBAR_ACTION_DESCRIPTORS,
  USER_DRAWING_TEXT_ALIGN_DESCRIPTORS,
  USER_DRAWING_TEXT_COLOR_DESCRIPTORS,
  USER_DRAWING_TEXT_DECORATION_DESCRIPTORS,
  USER_DRAWING_TEXT_MAX_WIDTH_DESCRIPTORS,
  USER_DRAWING_TEXT_WRAP_DESCRIPTORS,
  USER_DRAWING_TREND_LINE_EXTEND_DESCRIPTORS,
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
  afterEach(() => {
    clearChartStoreCache();
  });

  it('orders every supported drawing tool once', () => {
    expect(USER_DRAWING_TOOL_DESCRIPTORS.map((descriptor) => descriptor.tool)).toEqual([
      'select',
      'trendLine',
      'trendAngle',
      'extendedLine',
      'infoLine',
      'arrowLine',
      'arrowMarker',
      'arrowMarkLeft',
      'arrowMarkRight',
      'arrowMarkUp',
      'arrowMarkDown',
      'ray',
      'horizontalRay',
      'crossLine',
      'horizontalLine',
      'verticalLine',
      'rectangle',
      'circle',
      'ellipse',
      'rotatedRectangle',
      'priceRange',
      'dateRange',
      'datePriceRange',
      'longPosition',
      'shortPosition',
      'forecast',
      'projection',
      'sector',
      'barsPattern',
      'trianglePattern',
      'abcdPattern',
      'xabcdPattern',
      'cypherPattern',
      'threeDrivesPattern',
      'headShouldersPattern',
      'elliottImpulseWave',
      'elliottCorrectiveWave',
      'elliottDoubleComboWave',
      'elliottTripleComboWave',
      'elliottTriangleWave',
      'anchoredVwap',
      'anchoredVolumeProfile',
      'fixedRangeVolumeProfile',
      'fibRetracement',
      'fibExtension',
      'trendBasedFibExtension',
      'fibFan',
      'fibSpeedResistanceFan',
      'fibArcs',
      'fibSpeedResistanceArcs',
      'fibCircles',
      'fibWedge',
      'fibSpiral',
      'fibChannel',
      'fibTimeZone',
      'trendBasedFibTime',
      'cyclicLines',
      'timeCycles',
      'sineLine',
      'gannFan',
      'gannBox',
      'gannSquare',
      'gannSquareFixed',
      'triangle',
      'curve',
      'doubleCurve',
      'arc',
      'polyline',
      'pitchfork',
      'schiffPitchfork',
      'modifiedSchiffPitchfork',
      'insidePitchfork',
      'pitchfan',
      'parallelChannel',
      'regressionTrend',
      'flatTopBottom',
      'disjointChannel',
      'path',
      'brush',
      'highlighter',
      'note',
      'anchoredText',
      'anchoredNote',
      'callout',
      'comment',
      'priceLabel',
      'priceNote',
      'pin',
      'icon',
      'flagMark',
      'image',
      'emoji',
      'sticker',
      'balloon',
      'signpost',
      'table',
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
      ...USER_DRAWING_ICON_NAME_DESCRIPTORS,
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
    expect(USER_DRAWING_ICON_NAME_DESCRIPTORS.map((descriptor) => descriptor.iconName)).toEqual([
      'star',
      'circle',
      'square',
      'triangle',
      'flag',
      'arrowUp',
      'arrowDown',
    ]);
  });

  it('resolves tool descriptors by tool id', () => {
    expect(getUserDrawingToolDescriptor('rectangle')).toEqual(
      expect.objectContaining({ tool: 'rectangle', label: 'Rectangle' }),
    );
    expect(getUserDrawingToolDescriptor('trendAngle')).toEqual(
      expect.objectContaining({ tool: 'trendAngle', label: 'Trend angle' }),
    );
    expect(getUserDrawingToolDescriptor('circle')).toEqual(
      expect.objectContaining({ tool: 'circle', label: 'Circle' }),
    );
    expect(getUserDrawingToolDescriptor('ellipse')).toEqual(
      expect.objectContaining({ tool: 'ellipse', label: 'Ellipse' }),
    );
    expect(getUserDrawingToolDescriptor('rotatedRectangle')).toEqual(
      expect.objectContaining({ tool: 'rotatedRectangle', label: 'Rotated rectangle' }),
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
    expect(getUserDrawingToolDescriptor('datePriceRange')).toEqual(
      expect.objectContaining({ tool: 'datePriceRange', label: 'Date and price range' }),
    );
    expect(getUserDrawingToolDescriptor('forecast')).toEqual(
      expect.objectContaining({ tool: 'forecast', label: 'Forecast' }),
    );
    expect(getUserDrawingToolDescriptor('projection')).toEqual(
      expect.objectContaining({ tool: 'projection', label: 'Projection' }),
    );
    expect(getUserDrawingToolDescriptor('sector')).toEqual(expect.objectContaining({ tool: 'sector', label: 'Sector' }));
    expect(getUserDrawingToolDescriptor('signpost')).toEqual(
      expect.objectContaining({ tool: 'signpost', label: 'Signpost' }),
    );
    expect(getUserDrawingToolDescriptor('trianglePattern')).toEqual(
      expect.objectContaining({ tool: 'trianglePattern', label: 'Triangle pattern' }),
    );
    expect(getUserDrawingToolDescriptor('abcdPattern')).toEqual(
      expect.objectContaining({ tool: 'abcdPattern', label: 'ABCD pattern' }),
    );
    expect(getUserDrawingToolDescriptor('xabcdPattern')).toEqual(
      expect.objectContaining({ tool: 'xabcdPattern', label: 'XABCD pattern' }),
    );
    expect(getUserDrawingToolDescriptor('cypherPattern')).toEqual(
      expect.objectContaining({ tool: 'cypherPattern', label: 'Cypher pattern' }),
    );
    expect(getUserDrawingToolDescriptor('threeDrivesPattern')).toEqual(
      expect.objectContaining({ tool: 'threeDrivesPattern', label: 'Three drives pattern' }),
    );
    expect(getUserDrawingToolDescriptor('headShouldersPattern')).toEqual(
      expect.objectContaining({ tool: 'headShouldersPattern', label: 'Head and shoulders pattern' }),
    );
    expect(getUserDrawingToolDescriptor('elliottImpulseWave')).toEqual(
      expect.objectContaining({ tool: 'elliottImpulseWave', label: 'Elliott impulse wave' }),
    );
    expect(getUserDrawingToolDescriptor('elliottCorrectiveWave')).toEqual(
      expect.objectContaining({ tool: 'elliottCorrectiveWave', label: 'Elliott corrective wave' }),
    );
    expect(getUserDrawingToolDescriptor('elliottDoubleComboWave')).toEqual(
      expect.objectContaining({ tool: 'elliottDoubleComboWave', label: 'Elliott double combo wave' }),
    );
    expect(getUserDrawingToolDescriptor('elliottTripleComboWave')).toEqual(
      expect.objectContaining({ tool: 'elliottTripleComboWave', label: 'Elliott triple combo wave' }),
    );
    expect(getUserDrawingToolDescriptor('elliottTriangleWave')).toEqual(
      expect.objectContaining({ tool: 'elliottTriangleWave', label: 'Elliott triangle wave' }),
    );
    expect(getUserDrawingToolDescriptor('brush')).toEqual(expect.objectContaining({ tool: 'brush', label: 'Brush' }));
    expect(getUserDrawingToolDescriptor('highlighter')).toEqual(
      expect.objectContaining({ tool: 'highlighter', label: 'Highlighter' }),
    );
    expect(getUserDrawingToolDescriptor('horizontalRay')).toEqual(
      expect.objectContaining({ tool: 'horizontalRay', label: 'Horizontal ray' }),
    );
    expect(getUserDrawingToolDescriptor('crossLine')).toEqual(
      expect.objectContaining({ tool: 'crossLine', label: 'Cross line' }),
    );
    expect(getUserDrawingToolDescriptor('fibRetracement')).toEqual(
      expect.objectContaining({ tool: 'fibRetracement', label: 'Fib retracement' }),
    );
    expect(getUserDrawingToolDescriptor('anchoredVwap')).toEqual(
      expect.objectContaining({ tool: 'anchoredVwap', label: 'Anchored VWAP' }),
    );
    expect(getUserDrawingToolDescriptor('anchoredVolumeProfile')).toEqual(
      expect.objectContaining({ tool: 'anchoredVolumeProfile', label: 'Anchored volume profile' }),
    );
    expect(getUserDrawingToolDescriptor('fibExtension')).toEqual(
      expect.objectContaining({ tool: 'fibExtension', label: 'Fib extension' }),
    );
    expect(getUserDrawingToolDescriptor('trendBasedFibExtension')).toEqual(
      expect.objectContaining({ tool: 'trendBasedFibExtension', label: 'Trend-based fib extension' }),
    );
    expect(getUserDrawingToolDescriptor('fixedRangeVolumeProfile')).toEqual(
      expect.objectContaining({ tool: 'fixedRangeVolumeProfile', label: 'Fixed range volume profile' }),
    );
    expect(getUserDrawingToolDescriptor('fibFan')).toEqual(
      expect.objectContaining({ tool: 'fibFan', label: 'Fib fan' }),
    );
    expect(getUserDrawingToolDescriptor('fibSpeedResistanceFan')).toEqual(
      expect.objectContaining({ tool: 'fibSpeedResistanceFan', label: 'Fib speed resistance fan' }),
    );
    expect(getUserDrawingToolDescriptor('fibArcs')).toEqual(
      expect.objectContaining({ tool: 'fibArcs', label: 'Fib arcs' }),
    );
    expect(getUserDrawingToolDescriptor('fibSpeedResistanceArcs')).toEqual(
      expect.objectContaining({ tool: 'fibSpeedResistanceArcs', label: 'Fib speed resistance arcs' }),
    );
    expect(getUserDrawingToolDescriptor('fibCircles')).toEqual(
      expect.objectContaining({ tool: 'fibCircles', label: 'Fib circles' }),
    );
    expect(getUserDrawingToolDescriptor('fibWedge')).toEqual(
      expect.objectContaining({ tool: 'fibWedge', label: 'Fib wedge' }),
    );
    expect(getUserDrawingToolDescriptor('fibSpiral')).toEqual(
      expect.objectContaining({ tool: 'fibSpiral', label: 'Fib spiral' }),
    );
    expect(getUserDrawingToolDescriptor('fibChannel')).toEqual(
      expect.objectContaining({ tool: 'fibChannel', label: 'Fib channel' }),
    );
    expect(getUserDrawingToolDescriptor('fibTimeZone')).toEqual(
      expect.objectContaining({ tool: 'fibTimeZone', label: 'Fib time zone' }),
    );
    expect(getUserDrawingToolDescriptor('trendBasedFibTime')).toEqual(
      expect.objectContaining({ tool: 'trendBasedFibTime', label: 'Trend-based fib time' }),
    );
    expect(getUserDrawingToolDescriptor('cyclicLines')).toEqual(
      expect.objectContaining({ tool: 'cyclicLines', label: 'Cyclic lines' }),
    );
    expect(getUserDrawingToolDescriptor('timeCycles')).toEqual(
      expect.objectContaining({ tool: 'timeCycles', label: 'Time cycles' }),
    );
    expect(getUserDrawingToolDescriptor('sineLine')).toEqual(
      expect.objectContaining({ tool: 'sineLine', label: 'Sine line' }),
    );
    expect(getUserDrawingToolDescriptor('gannFan')).toEqual(
      expect.objectContaining({ tool: 'gannFan', label: 'Gann fan' }),
    );
    expect(getUserDrawingToolDescriptor('gannBox')).toEqual(
      expect.objectContaining({ tool: 'gannBox', label: 'Gann box' }),
    );
    expect(getUserDrawingToolDescriptor('gannSquare')).toEqual(
      expect.objectContaining({ tool: 'gannSquare', label: 'Gann square' }),
    );
    expect(getUserDrawingToolDescriptor('gannSquareFixed')).toEqual(
      expect.objectContaining({ tool: 'gannSquareFixed', label: 'Gann square fixed' }),
    );
    expect(getUserDrawingToolDescriptor('triangle')).toEqual(
      expect.objectContaining({ tool: 'triangle', label: 'Triangle' }),
    );
    expect(getUserDrawingToolDescriptor('curve')).toEqual(expect.objectContaining({ tool: 'curve', label: 'Curve' }));
    expect(getUserDrawingToolDescriptor('doubleCurve')).toEqual(
      expect.objectContaining({ tool: 'doubleCurve', label: 'Double curve' }),
    );
    expect(getUserDrawingToolDescriptor('arc')).toEqual(expect.objectContaining({ tool: 'arc', label: 'Arc' }));
    expect(getUserDrawingToolDescriptor('polyline')).toEqual(
      expect.objectContaining({ tool: 'polyline', label: 'Polyline' }),
    );
    expect(getUserDrawingToolDescriptor('note')).toEqual(expect.objectContaining({ tool: 'note', label: 'Note' }));
    expect(getUserDrawingToolDescriptor('anchoredText')).toEqual(
      expect.objectContaining({ tool: 'anchoredText', label: 'Anchored text' }),
    );
    expect(getUserDrawingToolDescriptor('anchoredNote')).toEqual(
      expect.objectContaining({ tool: 'anchoredNote', label: 'Anchored note' }),
    );
    expect(getUserDrawingToolDescriptor('callout')).toEqual(
      expect.objectContaining({ tool: 'callout', label: 'Callout' }),
    );
    expect(getUserDrawingToolDescriptor('comment')).toEqual(
      expect.objectContaining({ tool: 'comment', label: 'Comment' }),
    );
    expect(getUserDrawingToolDescriptor('priceLabel')).toEqual(
      expect.objectContaining({ tool: 'priceLabel', label: 'Price label' }),
    );
    expect(getUserDrawingToolDescriptor('priceNote')).toEqual(
      expect.objectContaining({ tool: 'priceNote', label: 'Price note' }),
    );
    expect(getUserDrawingToolDescriptor('pin')).toEqual(expect.objectContaining({ tool: 'pin', label: 'Pin' }));
    expect(getUserDrawingToolDescriptor('icon')).toEqual(expect.objectContaining({ tool: 'icon', label: 'Icon' }));
    expect(getUserDrawingToolDescriptor('flagMark')).toEqual(
      expect.objectContaining({ tool: 'flagMark', label: 'Flag mark' }),
    );
    expect(getUserDrawingToolDescriptor('image')).toEqual(expect.objectContaining({ tool: 'image', label: 'Image' }));
    expect(getUserDrawingToolDescriptor('emoji')).toEqual(expect.objectContaining({ tool: 'emoji', label: 'Emoji' }));
    expect(getUserDrawingToolDescriptor('sticker')).toEqual(
      expect.objectContaining({ tool: 'sticker', label: 'Sticker' }),
    );
    expect(getUserDrawingToolDescriptor('balloon')).toEqual(
      expect.objectContaining({ tool: 'balloon', label: 'Balloon' }),
    );
    expect(getUserDrawingToolDescriptor('pitchfork')).toEqual(
      expect.objectContaining({ tool: 'pitchfork', label: 'Pitchfork' }),
    );
    expect(getUserDrawingToolDescriptor('schiffPitchfork')).toEqual(
      expect.objectContaining({ tool: 'schiffPitchfork', label: 'Schiff pitchfork' }),
    );
    expect(getUserDrawingToolDescriptor('modifiedSchiffPitchfork')).toEqual(
      expect.objectContaining({ tool: 'modifiedSchiffPitchfork', label: 'Modified Schiff pitchfork' }),
    );
    expect(getUserDrawingToolDescriptor('insidePitchfork')).toEqual(
      expect.objectContaining({ tool: 'insidePitchfork', label: 'Inside pitchfork' }),
    );
    expect(getUserDrawingToolDescriptor('pitchfan')).toEqual(
      expect.objectContaining({ tool: 'pitchfan', label: 'Pitchfan' }),
    );
    expect(getUserDrawingToolDescriptor('parallelChannel')).toEqual(
      expect.objectContaining({ tool: 'parallelChannel', label: 'Parallel channel' }),
    );
    expect(getUserDrawingToolDescriptor('regressionTrend')).toEqual(
      expect.objectContaining({ tool: 'regressionTrend', label: 'Regression trend' }),
    );
    expect(getUserDrawingToolDescriptor('flatTopBottom')).toEqual(
      expect.objectContaining({ tool: 'flatTopBottom', label: 'Flat top/bottom' }),
    );
    expect(getUserDrawingToolDescriptor('disjointChannel')).toEqual(
      expect.objectContaining({ tool: 'disjointChannel', label: 'Disjoint channel' }),
    );
    expect(getUserDrawingToolDescriptor('arrowMarker')).toEqual(
      expect.objectContaining({ tool: 'arrowMarker', label: 'Arrow marker' }),
    );
    expect(getUserDrawingToolDescriptor('arrowMarkLeft')).toEqual(
      expect.objectContaining({ tool: 'arrowMarkLeft', label: 'Arrow mark left' }),
    );
    expect(getUserDrawingToolDescriptor('arrowMarkRight')).toEqual(
      expect.objectContaining({ tool: 'arrowMarkRight', label: 'Arrow mark right' }),
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
    expect(USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS.map((descriptor) => descriptor.action)).toEqual([
      'duplicateSelected',
      'deleteSelected',
      'bringForward',
      'sendBackward',
      'bringToFront',
      'sendToBack',
      'cancelDraft',
      'clearAll',
    ]);
    expect(getUserDrawingZOrderAction('bringForward')).toBe('bringForward');
    expect(getUserDrawingZOrderAction('deleteSelected')).toBeNull();
    expect(isUserDrawingToolbarActionEnabled(state, 'deleteSelected')).toBe(false);
    expect(isUserDrawingToolbarActionEnabled({ ...state, selection: { drawingId: 'h' } }, 'deleteSelected')).toBe(true);
    expect(isUserDrawingToolbarActionEnabled(state, 'duplicateSelected')).toBe(false);
    expect(
      isUserDrawingToolbarActionEnabled(
        {
          ...state,
          selection: { drawingId: 'h' },
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
        'duplicateSelected',
      ),
    ).toBe(true);
    expect(
      isUserDrawingToolbarActionEnabled(
        {
          ...state,
          selection: { drawingId: 'h' },
          drawings: [
            {
              id: 'h',
              kind: 'horizontalLine',
              paneId: 'main',
              visible: true,
              locked: true,
              createdAt: 1,
              updatedAt: 1,
              style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
              price: 10,
            },
          ],
        },
        'duplicateSelected',
      ),
    ).toBe(false);
    const layeredState: UserDrawingState = {
      ...state,
      selection: { drawingId: 'middle' },
      drawings: [
        {
          id: 'back',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          price: 8,
        },
        {
          id: 'middle',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          price: 10,
        },
        {
          id: 'front',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          price: 12,
        },
      ],
    };
    expect(isUserDrawingToolbarActionEnabled(layeredState, 'bringForward')).toBe(true);
    expect(isUserDrawingToolbarActionEnabled(layeredState, 'sendBackward')).toBe(true);
    expect(isUserDrawingToolbarActionEnabled(layeredState, 'bringToFront')).toBe(true);
    expect(isUserDrawingToolbarActionEnabled(layeredState, 'sendToBack')).toBe(true);
    expect(
      isUserDrawingToolbarActionEnabled({ ...layeredState, selection: { drawingId: 'front' } }, 'bringForward'),
    ).toBe(false);
    expect(isUserDrawingToolbarActionEnabled({ ...layeredState, selection: { drawingId: 'back' } }, 'sendBackward')).toBe(
      false,
    );
    expect(
      isUserDrawingToolbarActionEnabled(
        {
          ...layeredState,
          selection: { drawingId: 'middle' },
          drawings: layeredState.drawings.map((drawing) =>
            drawing.id === 'middle' ? { ...drawing, locked: true } : drawing,
          ),
        },
        'bringForward',
      ),
    ).toBe(false);
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
      '#f97316',
      '#a855f7',
      '#d1d4dc',
    ]);
    expect(USER_DRAWING_LINE_WIDTH_DESCRIPTORS.map((descriptor) => descriptor.width)).toEqual([1, 2, 3, 4, 5]);
    expect(USER_DRAWING_LINE_STYLE_DESCRIPTORS.map((descriptor) => descriptor.lineStyle)).toEqual([
      'solid',
      'dashed',
      'dotted',
    ]);
    expect(USER_DRAWING_OPACITY_DESCRIPTORS.map((descriptor) => descriptor.opacity)).toEqual([
      1,
      0.75,
      0.5,
      0.25,
      0.1,
    ]);
    expect(USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS.map((descriptor) => descriptor.style)).toEqual([
      'lineVisible',
      'fillVisible',
    ]);
    expect(USER_DRAWING_FILL_COLOR_DESCRIPTORS.map((descriptor) => descriptor.fillColor)).toEqual([
      'rgba(245, 197, 66, 0.12)',
      'rgba(34, 197, 94, 0.12)',
      'rgba(56, 189, 248, 0.12)',
      'rgba(244, 63, 94, 0.12)',
      'rgba(249, 115, 22, 0.12)',
      'rgba(168, 85, 247, 0.12)',
      'rgba(209, 212, 220, 0.12)',
    ]);
    expect(USER_DRAWING_TEXT_COLOR_DESCRIPTORS.map((descriptor) => descriptor.textColor)).toEqual([
      '#f5c542',
      '#22c55e',
      '#38bdf8',
      '#f43f5e',
      '#f97316',
      '#a855f7',
      '#d1d4dc',
    ]);
    expect(USER_DRAWING_FONT_FAMILY_DESCRIPTORS.map((descriptor) => descriptor.fontFamily)).toEqual([
      'sans-serif',
      'serif',
      'monospace',
    ]);
    expect(USER_DRAWING_FONT_SIZE_DESCRIPTORS.map((descriptor) => descriptor.fontSize)).toEqual([
      8,
      10,
      12,
      14,
      16,
      20,
      24,
      28,
      32,
      40,
    ]);
    expect(USER_DRAWING_FONT_STYLE_DESCRIPTORS.map((descriptor) => descriptor.fontStyle)).toEqual(['normal', 'italic']);
    expect(USER_DRAWING_TEXT_DECORATION_DESCRIPTORS.map((descriptor) => descriptor.label)).toEqual([
      'Underline text',
      'Strike-through text',
    ]);
    expect(USER_DRAWING_TEXT_DECORATION_DESCRIPTORS.map((descriptor) => descriptor.textUnderline ?? false)).toEqual([
      true,
      false,
    ]);
    expect(USER_DRAWING_TEXT_DECORATION_DESCRIPTORS.map((descriptor) => descriptor.textLineThrough ?? false)).toEqual([
      false,
      true,
    ]);
    expect(USER_DRAWING_TEXT_WRAP_DESCRIPTORS.map((descriptor) => descriptor.textWrap)).toEqual([false, true]);
    expect(USER_DRAWING_TEXT_MAX_WIDTH_DESCRIPTORS.map((descriptor) => descriptor.textMaxWidth)).toEqual([
      120,
      180,
      240,
      320,
      480,
    ]);
    expect(USER_DRAWING_TEXT_ALIGN_DESCRIPTORS.map((descriptor) => descriptor.textAlign)).toEqual([
      'left',
      'center',
      'right',
    ]);
    expect(USER_DRAWING_STYLE_TOOLBAR_ACTION_DESCRIPTORS.map((descriptor) => descriptor.action)).toEqual([
      'hideSelected',
      'lockSelected',
      'unlockSelected',
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
    expect(isUserDrawingStyleToolbarActionEnabled(locked, 'unlockSelected')).toBe(true);
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
    const trendLine = {
      id: 'trend',
      kind: 'trendLine' as const,
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
      extend: 'none' as const,
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
    const datePriceRange = {
      ...rectangle,
      id: 'dp',
      kind: 'datePriceRange' as const,
    };
    const icon = {
      ...horizontal,
      id: 'icon',
      kind: 'icon' as const,
      point: { time: 1, price: 10 },
      iconName: 'star' as const,
    };

    expect(supportsUserDrawingFillControls(horizontal)).toBe(false);
    expect(supportsUserDrawingFillControls(icon)).toBe(true);
    expect(supportsUserDrawingIconControls(horizontal)).toBe(false);
    expect(supportsUserDrawingIconControls(icon)).toBe(true);
    expect(supportsUserDrawingFillControls(rectangle)).toBe(true);
    expect(supportsUserDrawingFillControls({ ...rectangle, id: 'e', kind: 'ellipse' as const })).toBe(true);
    expect(
      supportsUserDrawingFillControls({
        ...rectangle,
        id: 'rotated',
        kind: 'rotatedRectangle' as const,
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
        id: 'triangle-pattern',
        kind: 'trianglePattern' as const,
        points: [
          { time: 1, price: 10 },
          { time: 2, price: 12 },
          { time: 3, price: 11 },
          { time: 4, price: 9 },
        ],
      }),
    ).toBe(true);
    expect(
      supportsUserDrawingFillControls({
        ...rectangle,
        id: 'fib-wedge',
        kind: 'fibWedge' as const,
        points: [
          { time: 1, price: 10 },
          { time: 2, price: 12 },
          { time: 3, price: 11 },
        ],
      }),
    ).toBe(true);
    expect(supportsUserDrawingFillControls({ ...rectangle, id: 'gann-box', kind: 'gannBox' as const })).toBe(true);
    expect(supportsUserDrawingFillControls({ ...rectangle, id: 'gann-square', kind: 'gannSquare' as const })).toBe(true);
    expect(
      supportsUserDrawingFillControls({ ...rectangle, id: 'gann-square-fixed', kind: 'gannSquareFixed' as const }),
    ).toBe(true);
    expect(
      supportsUserDrawingFillControls({
        ...rectangle,
        id: 'sector',
        kind: 'sector' as const,
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
    expect(
      supportsUserDrawingFillControls({
        ...rectangle,
        id: 'regression',
        kind: 'regressionTrend' as const,
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
        id: 'flat',
        kind: 'flatTopBottom' as const,
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
        id: 'disjoint',
        kind: 'disjointChannel' as const,
        points: [
          { time: 1, price: 10 },
          { time: 2, price: 12 },
          { time: 3, price: 11 },
          { time: 4, price: 9 },
        ],
      }),
    ).toBe(true);
    expect(supportsUserDrawingFillControls(priceRange)).toBe(true);
    expect(supportsUserDrawingFillControls(dateRange)).toBe(true);
    expect(supportsUserDrawingFillControls(datePriceRange)).toBe(true);
    expect(supportsUserDrawingFillControls(textLabel)).toBe(true);
    expect(
      supportsUserDrawingFillControls({
        ...textLabel,
        id: 'table',
        kind: 'table',
        point: { time: 1, price: 10 },
        textAlign: 'left',
        cells: [['Metric', 'Value']],
      }),
    ).toBe(true);
    expect(supportsUserDrawingFillControls({ ...textLabel, id: 'note', kind: 'note' })).toBe(true);
    expect(supportsUserDrawingFillControls({ ...textLabel, id: 'comment', kind: 'comment' })).toBe(true);
    expect(
      supportsUserDrawingFillControls({
        ...textLabel,
        id: 'anchored-text',
        kind: 'anchoredText',
        position: { x: 0.5, y: 0.5 },
      }),
    ).toBe(true);
    expect(
      supportsUserDrawingFillControls({
        ...textLabel,
        id: 'anchored-note',
        kind: 'anchoredNote',
        position: { x: 0.5, y: 0.5 },
      }),
    ).toBe(true);
    expect(supportsUserDrawingFillControls({ ...textLabel, id: 'price-label', kind: 'priceLabel' })).toBe(true);
    expect(supportsUserDrawingFillControls({ ...textLabel, id: 'emoji', kind: 'emoji', text: '👍' })).toBe(true);
    expect(supportsUserDrawingFillControls({ ...textLabel, id: 'sticker', kind: 'sticker', text: '★' })).toBe(true);
    expect(
      supportsUserDrawingFillControls({
        ...textLabel,
        id: 'callout',
        kind: 'callout',
        points: [
          { time: 1, price: 2 },
          { time: 2, price: 3 },
        ],
      }),
    ).toBe(true);
    expect(
      supportsUserDrawingFillControls({
        ...textLabel,
        id: 'price-note',
        kind: 'priceNote',
        points: [
          { time: 1, price: 2 },
          { time: 2, price: 3 },
        ],
      }),
    ).toBe(true);
    expect(supportsUserDrawingTextControls(horizontal)).toBe(false);
    expect(supportsUserDrawingTrendLineExtendControls(horizontal)).toBe(false);
    expect(supportsUserDrawingTrendLineExtendControls(trendLine)).toBe(true);
    expect(USER_DRAWING_TREND_LINE_EXTEND_DESCRIPTORS.map((descriptor) => descriptor.extend)).toEqual([
      'none',
      'left',
      'right',
      'both',
    ]);
    expect(supportsUserDrawingTextControls(priceRange)).toBe(false);
    expect(supportsUserDrawingTextControls(dateRange)).toBe(false);
    expect(supportsUserDrawingTextControls(datePriceRange)).toBe(false);
    expect(
      supportsUserDrawingTextControls({
        ...textLabel,
        id: 'table',
        kind: 'table',
        point: { time: 1, price: 10 },
        textAlign: 'left',
        cells: [['Metric', 'Value']],
      }),
    ).toBe(true);
    expect(
      supportsUserDrawingTextStyleControls({
        ...textLabel,
        id: 'table',
        kind: 'table',
        point: { time: 1, price: 10 },
        textAlign: 'left',
        cells: [['Metric', 'Value']],
      }),
    ).toBe(true);
    expect(
      supportsUserDrawingTextAlignControls({
        ...textLabel,
        id: 'table',
        kind: 'table',
        point: { time: 1, price: 10 },
        textAlign: 'left',
        cells: [['Metric', 'Value']],
      }),
    ).toBe(true);
    expect(
      supportsUserDrawingTextWrapControls({
        ...textLabel,
        id: 'table',
        kind: 'table',
        point: { time: 1, price: 10 },
        textAlign: 'left',
        cells: [['Metric', 'Value']],
      }),
    ).toBe(false);
    expect(supportsUserDrawingTextControls(textLabel)).toBe(true);
    expect(supportsUserDrawingTextAlignControls(textLabel)).toBe(true);
    expect(supportsUserDrawingTextWrapControls(textLabel)).toBe(true);
    expect(supportsUserDrawingTextControls({ ...textLabel, id: 'note', kind: 'note' })).toBe(true);
    expect(supportsUserDrawingTextControls({ ...textLabel, id: 'comment', kind: 'comment' })).toBe(true);
    expect(
      supportsUserDrawingTextControls({
        ...textLabel,
        id: 'anchored-text',
        kind: 'anchoredText',
        position: { x: 0.5, y: 0.5 },
      }),
    ).toBe(true);
    expect(
      supportsUserDrawingTextControls({
        ...textLabel,
        id: 'anchored-note',
        kind: 'anchoredNote',
        position: { x: 0.5, y: 0.5 },
      }),
    ).toBe(true);
    expect(supportsUserDrawingTextControls({ ...textLabel, id: 'price-label', kind: 'priceLabel' })).toBe(true);
    expect(supportsUserDrawingTextControls({ ...textLabel, id: 'emoji', kind: 'emoji', text: '👍' })).toBe(true);
    expect(supportsUserDrawingTextControls({ ...textLabel, id: 'sticker', kind: 'sticker', text: '★' })).toBe(true);
    expect(
      supportsUserDrawingTextControls({
        ...textLabel,
        id: 'callout',
        kind: 'callout',
        points: [
          { time: 1, price: 2 },
          { time: 2, price: 3 },
        ],
      }),
    ).toBe(true);
    expect(
      supportsUserDrawingTextControls({
        ...textLabel,
        id: 'price-note',
        kind: 'priceNote',
        points: [
          { time: 1, price: 2 },
          { time: 2, price: 3 },
        ],
      }),
    ).toBe(true);

    expect(
      isUserDrawingFillToolbarEnabled({ ...state, selection: { drawingId: 'r' }, drawings: [rectangle] }),
    ).toBe(true);
    expect(isUserDrawingTextToolbarEnabled({ ...state, selection: { drawingId: 'r' }, drawings: [rectangle] })).toBe(
      false,
    );
    expect(
      isUserDrawingTextToolbarEnabled({
        ...state,
        selection: { drawingId: 'table' },
        drawings: [
          {
            ...textLabel,
            id: 'table',
            kind: 'table',
            point: { time: 1, price: 10 },
            textAlign: 'left',
            cells: [['Metric', 'Value']],
          },
        ],
      }),
    ).toBe(true);
    expect(isUserDrawingTextToolbarEnabled({ ...state, selection: { drawingId: 't' }, drawings: [textLabel] })).toBe(
      true,
    );
    expect(isUserDrawingIconToolbarEnabled({ ...state, selection: { drawingId: 'icon' }, drawings: [icon] })).toBe(
      true,
    );
    expect(
      isUserDrawingIconToolbarEnabled({
        ...state,
        selection: { drawingId: 'icon' },
        drawings: [{ ...icon, locked: true }],
      }),
    ).toBe(false);
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
    const locked = { ...selected, drawings: [{ ...selected.drawings[0]!, locked: true }] };

    expect(resolveUserDrawingStyleToolbarAction(state, 'hideSelected')).toEqual({ enabled: false });
    expect(resolveUserDrawingStyleToolbarAction(selected, 'hideSelected')).toEqual({ enabled: true, visible: false });
    expect(resolveUserDrawingStyleToolbarAction(selected, 'lockSelected')).toEqual({ enabled: true, locked: true });
    expect(resolveUserDrawingStyleToolbarAction(selected, 'unlockSelected')).toEqual({ enabled: false });
    expect(resolveUserDrawingStyleToolbarAction(locked, 'unlockSelected')).toEqual({
      enabled: true,
      locked: false,
      includeLocked: true,
    });
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
    expect(
      getUserDrawingToolbarStateKey({
        ...first,
        drawings: [
          {
            id: 'other',
            kind: 'horizontalLine' as const,
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const },
            price: 8,
          },
          first.drawings[0]!,
        ],
      }),
    ).not.toBe(getUserDrawingToolbarStateKey(first));
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

    const iconDrawing = {
      id: 'icon',
      kind: 'icon' as const,
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const },
      point: { time: 1, price: 10 },
      iconName: 'star' as const,
    };
    const iconState: UserDrawingState = {
      ...state,
      selection: { drawingId: 'icon' },
      drawings: [iconDrawing],
    };
    expect(getUserDrawingToolbarStateKey({ ...iconState, drawings: [{ ...iconDrawing, iconName: 'flag' }] })).not.toBe(
      getUserDrawingToolbarStateKey(iconState),
    );
  });
});
