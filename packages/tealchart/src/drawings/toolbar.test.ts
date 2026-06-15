import type { UserDrawing, UserDrawingState } from './types';

import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import { resolveUserDrawingPropertiesSurface, resolveUserDrawingPropertiesSurfaceCommand } from './propertiesSurface';
import {
  getUserDrawingAllDrawingsUpdateOptions,
  getUserDrawingLineWidthPreviewFontSize,
  getUserDrawingToolbarStateKey,
  getUserDrawingToolCategoryDescriptorForTool,
  getUserDrawingToolDescriptor,
  getUserDrawingZOrderAction,
  isUserDrawingFillToolbarEnabled,
  isUserDrawingFillVisibilityToolbarEnabled,
  isUserDrawingGlobalToolbarAction,
  isUserDrawingIconToolbarEnabled,
  isUserDrawingStyleToolbarActionEnabled,
  isUserDrawingStyleToolbarEnabled,
  isUserDrawingTextToolbarEnabled,
  isUserDrawingToolbarActionEnabled,
  resolveUserDrawingActionSurfacePosition,
  resolveUserDrawingSelectedActionSurface,
  resolveUserDrawingStyleToolbarAction,
  resolveUserDrawingToolCategoryButtonTool,
  shouldRenderUserDrawingSelectedActionSurface,
  supportsUserDrawingFillColorControls,
  supportsUserDrawingFillControls,
  supportsUserDrawingFillVisibilityControls,
  supportsUserDrawingIconControls,
  supportsUserDrawingRichTextControls,
  supportsUserDrawingTextAlignControls,
  supportsUserDrawingTextAppearanceControls,
  supportsUserDrawingTextControls,
  supportsUserDrawingTextStyleControls,
  supportsUserDrawingTextWrapControls,
  supportsUserDrawingTrendLineExtendControls,
  USER_DRAWING_FILL_COLOR_DESCRIPTORS,
  USER_DRAWING_FILL_OPACITY_DESCRIPTORS,
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
  USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS,
  USER_DRAWING_TOOL_DESCRIPTORS,
  USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS,
  USER_DRAWING_TREND_LINE_EXTEND_DESCRIPTORS,
} from './toolbar';

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

  it('groups every supported drawing tool into sidebar categories once', () => {
    const categorizedTools = USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS.flatMap((category) => category.tools);
    expect(categorizedTools).toHaveLength(USER_DRAWING_TOOL_DESCRIPTORS.length);
    expect(new Set(categorizedTools).size).toBe(categorizedTools.length);
    expect(new Set(categorizedTools)).toEqual(
      new Set(USER_DRAWING_TOOL_DESCRIPTORS.map((descriptor) => descriptor.tool)),
    );
    expect(USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS.map((category) => category.label)).toEqual([
      'Cursor',
      'Lines',
      'Channels',
      'Pitchforks',
      'Gann and Fibonacci',
      'Patterns',
      'Forecasting and Measurement',
      'Geometric Shapes',
      'Brushes',
      'Annotations',
      'Icons',
    ]);
    expect(USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS.find((category) => category.id === 'lines')?.tools).toEqual([
      'trendLine',
      'ray',
      'infoLine',
      'extendedLine',
      'trendAngle',
      'horizontalLine',
      'horizontalRay',
      'verticalLine',
      'crossLine',
      'arrowLine',
    ]);
  });

  it('resolves category button tools from active tool, recent tool, then category default', () => {
    const linesCategory = USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS.find((category) => category.id === 'lines')!;
    const shapesCategory = USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS.find(
      (category) => category.id === 'geometric-shapes',
    )!;

    expect(getUserDrawingToolCategoryDescriptorForTool('horizontalLine')).toBe(linesCategory);
    expect(getUserDrawingToolCategoryDescriptorForTool('rectangle')).toBe(shapesCategory);
    expect(resolveUserDrawingToolCategoryButtonTool(linesCategory, 'horizontalLine')).toBe('horizontalLine');
    expect(
      resolveUserDrawingToolCategoryButtonTool(linesCategory, 'rectangle', {
        lines: 'horizontalRay',
      }),
    ).toBe('horizontalRay');
    expect(
      resolveUserDrawingToolCategoryButtonTool(linesCategory, 'rectangle', {
        lines: 'rectangle',
      }),
    ).toBe('trendLine');
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
      ...USER_DRAWING_FILL_OPACITY_DESCRIPTORS,
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
    expect(getUserDrawingToolDescriptor('sector')).toEqual(
      expect.objectContaining({ tool: 'sector', label: 'Sector' }),
    );
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

  it('separates fill color controls from fill visibility controls for risk/reward positions', () => {
    const longPosition: UserDrawing = {
      id: 'long',
      kind: 'longPosition' as const,
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 2, price: 8 },
      ],
    };
    const state: UserDrawingState = {
      version: 1 as const,
      activeTool: 'select' as const,
      selection: { drawingId: 'long' },
      drawings: [longPosition],
      draft: null,
      textEdit: null,
    };

    expect(supportsUserDrawingFillColorControls(longPosition)).toBe(false);
    expect(supportsUserDrawingFillControls(longPosition)).toBe(false);
    expect(supportsUserDrawingFillVisibilityControls(longPosition)).toBe(true);
    expect(isUserDrawingFillToolbarEnabled(state)).toBe(false);
    expect(isUserDrawingFillVisibilityToolbarEnabled(state)).toBe(true);
    expect(
      supportsUserDrawingFillVisibilityControls({
        ...longPosition,
        id: 'short',
        kind: 'shortPosition',
      }),
    ).toBe(true);
  });

  it('separates generated-label text appearance controls from rich text controls', () => {
    const forecast: UserDrawing = {
      id: 'forecast',
      kind: 'forecast',
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
    };
    const projection: UserDrawing = {
      ...forecast,
      id: 'projection',
      kind: 'projection',
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    };
    const generatedLabelKinds = [
      'infoLine',
      'trendAngle',
      'priceRange',
      'dateRange',
      'datePriceRange',
      'longPosition',
      'shortPosition',
      'fibRetracement',
      'fibExtension',
      'trendBasedFibExtension',
      'fibFan',
      'fibSpeedResistanceFan',
      'fibChannel',
      'fibTimeZone',
      'trendBasedFibTime',
      'cyclicLines',
      'timeCycles',
      'gannFan',
      'gannBox',
      'gannSquare',
      'gannSquareFixed',
      'fibCircles',
      'fibArcs',
      'fibSpeedResistanceArcs',
      'fibWedge',
      'fibSpiral',
    ] as const;

    expect(supportsUserDrawingTextAppearanceControls(forecast)).toBe(true);
    expect(supportsUserDrawingTextAppearanceControls(projection)).toBe(true);
    for (const kind of generatedLabelKinds) {
      const drawing = { ...projection, id: kind, kind } as UserDrawing;
      expect(supportsUserDrawingTextAppearanceControls(drawing)).toBe(true);
      expect(supportsUserDrawingRichTextControls(drawing)).toBe(false);
    }
    expect(supportsUserDrawingTextControls(forecast)).toBe(true);
    expect(supportsUserDrawingRichTextControls(forecast)).toBe(false);
    expect(supportsUserDrawingRichTextControls(projection)).toBe(false);
    expect(supportsUserDrawingTextAlignControls(forecast)).toBe(false);
    expect(supportsUserDrawingTextWrapControls(projection)).toBe(false);
  });

  it('resolves action availability from toolbar-relevant state', () => {
    expect(USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS.map((descriptor) => descriptor.action)).toEqual([
      'duplicateSelected',
      'deleteSelected',
      'bringForward',
      'sendBackward',
      'bringToFront',
      'sendToBack',
      'measure',
      'zoomIn',
      'cancelDraft',
      'clearAll',
      'hideAll',
      'showAll',
      'lockAll',
      'unlockAll',
    ]);
    expect(getUserDrawingZOrderAction('bringForward')).toBe('bringForward');
    expect(getUserDrawingZOrderAction('deleteSelected')).toBeNull();
    expect(
      USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS.filter((descriptor) =>
        isUserDrawingGlobalToolbarAction(descriptor.action),
      ).map((descriptor) => descriptor.action),
    ).toEqual(['measure', 'zoomIn', 'cancelDraft', 'clearAll', 'hideAll', 'showAll', 'lockAll', 'unlockAll']);
    expect(isUserDrawingToolbarActionEnabled(state, 'measure')).toBe(true);
    expect(isUserDrawingToolbarActionEnabled(state, 'zoomIn')).toBe(true);
    expect(isUserDrawingToolbarActionEnabled(state, 'deleteSelected')).toBe(false);
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
        'deleteSelected',
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
        'deleteSelected',
      ),
    ).toBe(false);
    expect(
      isUserDrawingToolbarActionEnabled(
        {
          ...state,
          selection: { drawingId: 'h', drawingIds: ['h', 'r'] },
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
            {
              id: 'r',
              kind: 'rectangle',
              paneId: 'main',
              visible: true,
              locked: false,
              createdAt: 2,
              updatedAt: 2,
              style: {
                lineColor: '#fff',
                lineWidth: 1,
                lineStyle: 'solid',
                fillColor: 'rgba(255,255,255,0.12)',
              },
              points: [
                { time: 1, price: 10 },
                { time: 2, price: 12 },
              ],
            },
          ],
        },
        'deleteSelected',
      ),
    ).toBe(true);
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
    expect(
      isUserDrawingToolbarActionEnabled({ ...layeredState, selection: { drawingId: 'back' } }, 'sendBackward'),
    ).toBe(false);
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
    const globalActionState: UserDrawingState = {
      ...state,
      drawings: [
        {
          id: 'visible',
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
          id: 'hidden-locked',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: false,
          locked: true,
          createdAt: 2,
          updatedAt: 2,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          price: 12,
        },
      ],
    };
    expect(isUserDrawingToolbarActionEnabled(globalActionState, 'hideAll')).toBe(true);
    expect(isUserDrawingToolbarActionEnabled(globalActionState, 'showAll')).toBe(true);
    expect(isUserDrawingToolbarActionEnabled(globalActionState, 'lockAll')).toBe(true);
    expect(isUserDrawingToolbarActionEnabled(globalActionState, 'unlockAll')).toBe(true);
    expect(
      isUserDrawingToolbarActionEnabled(
        {
          ...globalActionState,
          drawings: globalActionState.drawings.map((drawing) => ({ ...drawing, visible: false })),
        },
        'hideAll',
      ),
    ).toBe(false);
    expect(
      isUserDrawingToolbarActionEnabled(
        {
          ...globalActionState,
          drawings: globalActionState.drawings.map((drawing) => ({ ...drawing, visible: true })),
        },
        'showAll',
      ),
    ).toBe(false);
    expect(
      isUserDrawingToolbarActionEnabled(
        { ...globalActionState, drawings: globalActionState.drawings.map((drawing) => ({ ...drawing, locked: true })) },
        'lockAll',
      ),
    ).toBe(false);
    expect(
      isUserDrawingToolbarActionEnabled(
        {
          ...globalActionState,
          drawings: globalActionState.drawings.map((drawing) => ({ ...drawing, locked: false })),
        },
        'unlockAll',
      ),
    ).toBe(false);
  });

  it('builds all-drawings update options for shared web and mobile actions', () => {
    const globalActionState: UserDrawingState = {
      ...state,
      drawings: [
        {
          id: 'line',
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
          id: 'locked-hidden',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: false,
          locked: true,
          createdAt: 2,
          updatedAt: 2,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          price: 12,
        },
      ],
    };

    expect(getUserDrawingAllDrawingsUpdateOptions(globalActionState)).toEqual({
      drawingIds: ['line', 'locked-hidden'],
    });
    expect(getUserDrawingAllDrawingsUpdateOptions(globalActionState, { includeLocked: true })).toEqual({
      drawingIds: ['line', 'locked-hidden'],
      includeLocked: true,
    });
    expect(getUserDrawingAllDrawingsUpdateOptions(state)).toEqual({ drawingIds: [] });
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
    expect([1, 8, 28].map(getUserDrawingLineWidthPreviewFontSize)).toEqual([11, 18, 20]);
    expect(USER_DRAWING_LINE_STYLE_DESCRIPTORS.map((descriptor) => descriptor.lineStyle)).toEqual([
      'solid',
      'dashed',
      'dotted',
    ]);
    expect(USER_DRAWING_OPACITY_DESCRIPTORS.map((descriptor) => descriptor.opacity)).toEqual([1, 0.75, 0.5, 0.25, 0.1]);
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
      8, 10, 12, 14, 16, 20, 24, 28, 32, 40,
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
      120, 180, 240, 320, 480,
    ]);
    expect(USER_DRAWING_TEXT_ALIGN_DESCRIPTORS.map((descriptor) => descriptor.textAlign)).toEqual([
      'left',
      'center',
      'right',
    ]);
    expect(USER_DRAWING_STYLE_TOOLBAR_ACTION_DESCRIPTORS.map((descriptor) => descriptor.action)).toEqual([
      'hideSelected',
      'showSelected',
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
    expect(isUserDrawingStyleToolbarActionEnabled(locked, 'showSelected')).toBe(false);
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
    expect(supportsUserDrawingFillControls({ ...rectangle, id: 'gann-square', kind: 'gannSquare' as const })).toBe(
      true,
    );
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
    expect(
      supportsUserDrawingFillControls({
        ...rectangle,
        id: 'projection',
        kind: 'projection' as const,
        points: [
          { time: 1, price: 10 },
          { time: 2, price: 12 },
          { time: 3, price: 11 },
        ],
      }),
    ).toBe(true);
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
    expect(supportsUserDrawingTextControls(priceRange)).toBe(true);
    expect(supportsUserDrawingTextControls(dateRange)).toBe(true);
    expect(supportsUserDrawingTextControls(datePriceRange)).toBe(true);
    expect(supportsUserDrawingRichTextControls(priceRange)).toBe(false);
    expect(supportsUserDrawingRichTextControls(dateRange)).toBe(false);
    expect(supportsUserDrawingRichTextControls(datePriceRange)).toBe(false);
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

    expect(isUserDrawingFillToolbarEnabled({ ...state, selection: { drawingId: 'r' }, drawings: [rectangle] })).toBe(
      true,
    );
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
    const hidden = { ...selected, drawings: [{ ...selected.drawings[0]!, visible: false }] };

    expect(resolveUserDrawingStyleToolbarAction(state, 'hideSelected')).toEqual({ enabled: false });
    expect(resolveUserDrawingStyleToolbarAction(selected, 'hideSelected')).toEqual({ enabled: true, visible: false });
    expect(resolveUserDrawingStyleToolbarAction(selected, 'showSelected')).toEqual({ enabled: false });
    expect(resolveUserDrawingStyleToolbarAction(hidden, 'hideSelected')).toEqual({ enabled: false });
    expect(resolveUserDrawingStyleToolbarAction(hidden, 'showSelected')).toEqual({ enabled: true, visible: true });
    expect(resolveUserDrawingStyleToolbarAction(selected, 'lockSelected')).toEqual({ enabled: true, locked: true });
    expect(resolveUserDrawingStyleToolbarAction(selected, 'unlockSelected')).toEqual({ enabled: false });
    expect(resolveUserDrawingStyleToolbarAction(locked, 'unlockSelected')).toEqual({
      enabled: true,
      locked: false,
      includeLocked: true,
    });
  });

  it('resolves shared selected drawing action surface groups', () => {
    const selected = {
      ...state,
      selection: { drawingId: 'front' },
      drawings: [
        {
          id: 'back',
          kind: 'horizontalLine' as const,
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const },
          price: 9,
        },
        {
          id: 'front',
          kind: 'horizontalLine' as const,
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 2,
          updatedAt: 2,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const },
          price: 10,
        },
      ],
    } satisfies UserDrawingState;
    const surface = resolveUserDrawingSelectedActionSurface(selected);
    const primary = surface.groups.find((group) => group.id === 'primary')!;
    const style = surface.groups.find((group) => group.id === 'style')!;
    const arrange = surface.groups.find((group) => group.id === 'arrange')!;
    const visibility = surface.groups.find((group) => group.id === 'visibility')!;

    expect(surface.selectedDrawing?.id).toBe('front');
    expect(surface.groups.map((group) => group.id)).toEqual(['primary', 'style', 'arrange', 'visibility']);
    expect(style.presentation).toEqual({
      type: 'popover',
      triggerIcon: '◐',
      triggerLabel: 'Style selected drawing',
      popoverLabel: 'Selected drawing style controls',
      popoverWidth: 296,
    });
    expect(primary.items.map((item) => [item.id, item.enabled, item.destructive ?? false])).toEqual([
      ['openProperties', true, false],
      ['openObjectTree', true, false],
      ['editText', false, false],
      ['duplicateSelected', true, false],
      ['deleteSelected', true, true],
    ]);
    expect(style.items.map((item) => [item.id, item.enabled, item.command, item.swatchColor])).toEqual([
      ['lineColor:#f5c542', true, { type: 'updateStyle', style: { lineColor: '#f5c542' } }, '#f5c542'],
      ['lineWidth:1', true, { type: 'updateStyle', style: { lineWidth: 1 } }, undefined],
      ['lineWidth:2', true, { type: 'updateStyle', style: { lineWidth: 2 } }, undefined],
      ['lineWidth:3', true, { type: 'updateStyle', style: { lineWidth: 3 } }, undefined],
      ['lineWidth:4', true, { type: 'updateStyle', style: { lineWidth: 4 } }, undefined],
      ['lineWidth:5', true, { type: 'updateStyle', style: { lineWidth: 5 } }, undefined],
      ['lineStyle:dashed', true, { type: 'updateStyle', style: { lineStyle: 'dashed' } }, undefined],
      ['opacity:1', true, { type: 'updateStyle', style: { opacity: 1 } }, undefined],
      ['opacity:0.75', true, { type: 'updateStyle', style: { opacity: 0.75 } }, undefined],
      ['opacity:0.5', true, { type: 'updateStyle', style: { opacity: 0.5 } }, undefined],
      ['opacity:0.25', true, { type: 'updateStyle', style: { opacity: 0.25 } }, undefined],
      ['opacity:0.1', true, { type: 'updateStyle', style: { opacity: 0.1 } }, undefined],
      ['lineVisible:toggle', true, { type: 'updateStyle', style: { lineVisible: false } }, undefined],
    ]);
    expect(style.items.find((item) => item.id === 'lineWidth:1')).toMatchObject({ selected: true });
    expect(style.items.find((item) => item.id === 'opacity:1')).toMatchObject({ selected: true });
    const highlighterSurface = resolveUserDrawingSelectedActionSurface({
      ...selected,
      selection: { drawingId: 'marker' },
      drawings: [
        {
          id: 'marker',
          kind: 'highlighter',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 3,
          updatedAt: 3,
          style: { lineColor: '#f5c542', lineWidth: 8, lineStyle: 'solid' as const, opacity: 0.35 },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
            { time: 3, price: 11 },
          ],
        },
      ],
    });
    const highlighterStyle = highlighterSurface.groups.find((group) => group.id === 'style')!;
    expect(highlighterStyle.items.find((item) => item.id === 'lineWidth:12')).toMatchObject({
      enabled: true,
      label: 'Bold highlighter stroke width',
      command: { type: 'updateStyle', style: { lineWidth: 12 } },
    });
    expect(highlighterStyle.items.find((item) => item.id === 'opacity:0.25')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { opacity: 0.25 } },
    });
    expect(highlighterStyle.items.find((item) => item.id === 'lineWidth:8')).toMatchObject({ selected: true });
    expect(highlighterStyle.items.find((item) => item.id === 'opacity:0.35')).toMatchObject({ selected: true });
    const legacyHighlighterSurface = resolveUserDrawingSelectedActionSurface({
      ...selected,
      selection: { drawingId: 'marker' },
      drawings: [
        {
          id: 'marker',
          kind: 'highlighter',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 3,
          updatedAt: 3,
          style: { lineColor: '#f5c542', lineWidth: 1, lineStyle: 'solid' as const, opacity: 0.35 },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
          ],
        },
      ],
    });
    const legacyHighlighterStyle = legacyHighlighterSurface.groups.find((group) => group.id === 'style')!;
    expect(legacyHighlighterStyle.items.find((item) => item.id === 'lineWidth:4')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { lineWidth: 4 } },
    });
    expect(legacyHighlighterStyle.items.some((item) => item.id === 'lineWidth:1' && item.selected)).toBe(false);
    expect(arrange.items.map((item) => [item.id, item.enabled, item.command])).toEqual([
      ['bringForward', false, { type: 'toolbarAction', action: 'bringForward' }],
      ['sendBackward', true, { type: 'toolbarAction', action: 'sendBackward' }],
      ['bringToFront', false, { type: 'toolbarAction', action: 'bringToFront' }],
      ['sendToBack', true, { type: 'toolbarAction', action: 'sendToBack' }],
    ]);
    expect(visibility.items.map((item) => [item.id, item.enabled, item.command])).toEqual([
      ['hideSelected', true, { type: 'styleAction', action: 'hideSelected', visible: false }],
      ['showSelected', false, { type: 'styleAction', action: 'showSelected' }],
      ['lockSelected', true, { type: 'styleAction', action: 'lockSelected', locked: true }],
      ['unlockSelected', false, { type: 'styleAction', action: 'unlockSelected' }],
    ]);
  });

  it('hides selected action surfaces during transient editing states', () => {
    const anchor = {
      anchor: { x: 100, y: 80 },
      bounds: { x: 80, y: 70, width: 40, height: 20 },
      drawingIds: ['front'],
      paneIds: ['main'],
      primaryPaneId: 'main',
    };
    const selected = {
      ...state,
      selection: { drawingId: 'front' },
      drawings: [
        {
          id: 'front',
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
    } satisfies UserDrawingState;

    expect(shouldRenderUserDrawingSelectedActionSurface(selected, anchor)).toBe(true);
    expect(shouldRenderUserDrawingSelectedActionSurface(selected, null)).toBe(false);
    expect(shouldRenderUserDrawingSelectedActionSurface({ ...selected, selection: null }, anchor)).toBe(false);
    expect(
      shouldRenderUserDrawingSelectedActionSurface(
        {
          ...selected,
          draft: {
            tool: 'rectangle',
            paneId: 'main',
            anchors: [{ time: 1, price: 10 }],
            style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
            startedAt: 1,
          },
        },
        anchor,
      ),
    ).toBe(false);
    expect(
      shouldRenderUserDrawingSelectedActionSurface(
        {
          ...selected,
          textEdit: { drawingId: 'front', value: 'note', originalValue: 'note', startedAt: 1 },
        },
        anchor,
      ),
    ).toBe(false);
  });

  it('enables selected text edit actions only for unlocked text drawings', () => {
    const selected = {
      ...state,
      selection: { drawingId: 'label' },
      drawings: [
        {
          id: 'label',
          kind: 'textLabel' as const,
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const },
          point: { time: 1, price: 10 },
          text: 'Note',
          textAlign: 'center' as const,
        },
      ],
    } satisfies UserDrawingState;

    expect(
      resolveUserDrawingSelectedActionSurface(selected)
        .groups.find((group) => group.id === 'primary')!
        .items.find((item) => item.id === 'editText'),
    ).toMatchObject({
      enabled: true,
      command: { type: 'editText', drawingId: 'label' },
    });
    expect(
      resolveUserDrawingSelectedActionSurface({
        ...selected,
        drawings: [{ ...selected.drawings[0]!, locked: true }],
      })
        .groups.find((group) => group.id === 'primary')!
        .items.find((item) => item.id === 'editText'),
    ).toMatchObject({ enabled: false });
  });

  it('resolves selected fill style actions for fill-capable drawings', () => {
    const selected = {
      ...state,
      selection: { drawingId: 'rect' },
      drawings: [
        {
          id: 'rect',
          kind: 'rectangle' as const,
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {
            lineColor: '#fff',
            lineWidth: 1,
            lineStyle: 'solid' as const,
            fillColor: 'rgba(245, 197, 66, 0.12)',
            fillOpacity: 0.5,
          },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
          ],
        },
      ],
    } satisfies UserDrawingState;

    const styleItems = resolveUserDrawingSelectedActionSurface(selected).groups.find(
      (group) => group.id === 'style',
    )!.items;

    expect(styleItems.find((item) => item.id === 'fillColor:rgba(34, 197, 94, 0.12)')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { fillColor: 'rgba(34, 197, 94, 0.12)' } },
      swatchColor: 'rgba(34, 197, 94, 0.12)',
    });
    expect(styleItems.find((item) => item.id === 'opacity:0.75')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { opacity: 0.75 } },
    });
    expect(styleItems.find((item) => item.id === 'fillOpacity:0.5')).toMatchObject({
      enabled: true,
      selected: true,
      command: { type: 'updateStyle', style: { fillOpacity: 0.5 } },
    });
    expect(styleItems.find((item) => item.id === 'lineVisible:toggle')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { lineVisible: false } },
    });
    expect(styleItems.find((item) => item.id === 'fillVisible:toggle')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { fillVisible: false } },
    });
  });

  it('resolves selected trend-line extension actions for trend lines', () => {
    const selected = {
      ...state,
      selection: { drawingId: 'trend' },
      drawings: [
        {
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
          ],
          extend: 'none' as const,
        },
      ],
    } satisfies UserDrawingState;

    const styleItems = resolveUserDrawingSelectedActionSurface(selected).groups.find(
      (group) => group.id === 'style',
    )!.items;

    expect(styleItems.find((item) => item.id === 'extend:left')).toMatchObject({
      enabled: true,
      command: { type: 'setTrendLineExtend', extend: 'left' },
    });

    const nonTrend = {
      ...selected,
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
    } satisfies UserDrawingState;

    expect(
      resolveUserDrawingSelectedActionSurface(nonTrend)
        .groups.find((group) => group.id === 'style')!
        .items.some((item) => item.id.startsWith('extend:')),
    ).toBe(false);
  });

  it('resolves selected icon library actions for icon drawings', () => {
    const selected = {
      ...state,
      selection: { drawingId: 'icon' },
      drawings: [
        {
          id: 'icon',
          kind: 'icon' as const,
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {
            lineColor: '#fff',
            lineWidth: 1,
            lineStyle: 'solid' as const,
            fillColor: 'rgba(245, 197, 66, 0.12)',
          },
          point: { time: 1, price: 10 },
          iconName: 'star' as const,
        },
      ],
    } satisfies UserDrawingState;

    const styleItems = resolveUserDrawingSelectedActionSurface(selected).groups.find(
      (group) => group.id === 'style',
    )!.items;

    expect(styleItems.find((item) => item.id === 'iconName:circle')).toMatchObject({
      enabled: true,
      command: { type: 'setIconName', iconName: 'circle' },
    });

    const nonIcon = {
      ...selected,
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
    } satisfies UserDrawingState;

    expect(
      resolveUserDrawingSelectedActionSurface(nonIcon)
        .groups.find((group) => group.id === 'style')!
        .items.some((item) => item.id.startsWith('iconName:')),
    ).toBe(false);
  });

  it('resolves selected text appearance actions for text-capable drawings', () => {
    const selected = {
      ...state,
      selection: { drawingId: 'label' },
      drawings: [
        {
          id: 'label',
          kind: 'textLabel' as const,
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {
            lineColor: '#fff',
            lineWidth: 1,
            lineStyle: 'solid' as const,
            textColor: '#f5c542',
            fontSize: 14,
            fontFamily: 'sans-serif',
            fontWeight: 'normal',
            fontStyle: 'normal',
          },
          point: { time: 1, price: 10 },
          text: 'Note',
          textAlign: 'center' as const,
        },
      ],
    } satisfies UserDrawingState;

    const styleItems = resolveUserDrawingSelectedActionSurface(selected).groups.find(
      (group) => group.id === 'style',
    )!.items;

    expect(styleItems.find((item) => item.id === 'textColor:#22c55e')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { textColor: '#22c55e' } },
      swatchColor: '#22c55e',
    });
    expect(styleItems.find((item) => item.id === 'fontSize:decrease')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { fontSize: 12 } },
    });
    expect(styleItems.find((item) => item.id === 'fontSize:increase')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { fontSize: 16 } },
    });
    expect(styleItems.find((item) => item.id === 'fontFamily:serif')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { fontFamily: 'serif' } },
    });
    expect(styleItems.find((item) => item.id === 'fontWeight:bold')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { fontWeight: 'bold' } },
    });
    expect(styleItems.find((item) => item.id === 'fontStyle:italic')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { fontStyle: 'italic' } },
    });
    expect(styleItems.find((item) => item.id === 'textUnderline:toggle')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { textUnderline: true } },
    });
    expect(styleItems.find((item) => item.id === 'textLineThrough:toggle')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { textLineThrough: true } },
    });
    expect(styleItems.find((item) => item.id === 'textWrap:toggle')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { textWrap: true, textMaxWidth: 180 } },
    });
    expect(styleItems.find((item) => item.id === 'textAlign:right')).toMatchObject({
      enabled: true,
      command: { type: 'setTextAlign', textAlign: 'right' },
    });
    expect(styleItems.some((item) => item.id.startsWith('textMaxWidth:'))).toBe(false);

    const defaultSized = {
      ...selected,
      drawings: [{ ...selected.drawings[0]!, style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const } }],
    } satisfies UserDrawingState;
    const defaultSizeItems = resolveUserDrawingSelectedActionSurface(defaultSized).groups.find(
      (group) => group.id === 'style',
    )!.items;

    expect(defaultSizeItems.find((item) => item.id === 'fontSize:decrease')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { fontSize: 10 } },
    });
    expect(defaultSizeItems.find((item) => item.id === 'fontSize:increase')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { fontSize: 14 } },
    });
    expect(defaultSizeItems.find((item) => item.id === 'fontFamily:serif')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { fontFamily: 'serif' } },
    });
  });

  it('resolves selected wrapped text width actions for text-capable drawings', () => {
    const selected = {
      ...state,
      selection: { drawingId: 'label' },
      drawings: [
        {
          id: 'label',
          kind: 'textLabel' as const,
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {
            lineColor: '#fff',
            lineWidth: 1,
            lineStyle: 'solid' as const,
            textWrap: true,
            textMaxWidth: 180 as const,
          },
          point: { time: 1, price: 10 },
          text: 'Note',
          textAlign: 'center' as const,
        },
      ],
    } satisfies UserDrawingState;

    const styleItems = resolveUserDrawingSelectedActionSurface(selected).groups.find(
      (group) => group.id === 'style',
    )!.items;

    expect(styleItems.find((item) => item.id === 'textWrap:toggle')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { textWrap: false } },
    });
    expect(styleItems.find((item) => item.id === 'textMaxWidth:decrease')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { textMaxWidth: 120 } },
    });
    expect(styleItems.find((item) => item.id === 'textMaxWidth:increase')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { textMaxWidth: 240 } },
    });
  });

  it('omits rich text weight and style actions for generated-label drawings', () => {
    const selected = {
      ...state,
      selection: { drawingId: 'range' },
      drawings: [
        {
          id: 'range',
          kind: 'priceRange' as const,
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {
            lineColor: '#fff',
            lineWidth: 1,
            lineStyle: 'solid' as const,
            textColor: '#f5c542',
            fontSize: 14,
            fontFamily: 'sans-serif',
            fontWeight: 'normal',
            fontStyle: 'normal',
          },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
          ],
        },
      ],
    } satisfies UserDrawingState;

    const styleItems = resolveUserDrawingSelectedActionSurface(selected).groups.find(
      (group) => group.id === 'style',
    )!.items;

    expect(styleItems.find((item) => item.id === 'textColor:#22c55e')).toMatchObject({
      command: { type: 'updateStyle', style: { textColor: '#22c55e' } },
    });
    expect(styleItems.find((item) => item.id === 'fontSize:increase')).toMatchObject({
      command: { type: 'updateStyle', style: { fontSize: 16 } },
    });
    expect(styleItems.find((item) => item.id === 'fontFamily:serif')).toMatchObject({
      command: { type: 'updateStyle', style: { fontFamily: 'serif' } },
    });
    expect(styleItems.some((item) => item.id.startsWith('fontWeight:'))).toBe(false);
    expect(styleItems.some((item) => item.id.startsWith('fontStyle:'))).toBe(false);
    expect(styleItems.some((item) => item.id.startsWith('textUnderline:'))).toBe(false);
    expect(styleItems.some((item) => item.id.startsWith('textLineThrough:'))).toBe(false);
    expect(styleItems.some((item) => item.id.startsWith('textWrap:'))).toBe(false);
    expect(styleItems.some((item) => item.id.startsWith('textMaxWidth:'))).toBe(false);
    expect(styleItems.some((item) => item.id.startsWith('textAlign:'))).toBe(false);
  });

  it('toggles generated label visibility for selected generated-label drawings', () => {
    const selected = {
      ...state,
      selection: { drawingId: 'range' },
      drawings: [
        {
          id: 'range',
          kind: 'priceRange' as const,
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {
            lineColor: '#fff',
            lineWidth: 1,
            lineStyle: 'solid' as const,
            textColor: '#f5c542',
          },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
          ],
        },
      ],
    } satisfies UserDrawingState;

    const visibleItems = resolveUserDrawingSelectedActionSurface(selected).groups.find(
      (group) => group.id === 'style',
    )!.items;
    expect(visibleItems.find((item) => item.id === 'labelsVisible:toggle')).toMatchObject({
      enabled: true,
      label: 'Hide selected drawing labels',
      command: { type: 'updateStyle', style: { labelsVisible: false } },
    });

    const hiddenItems = resolveUserDrawingSelectedActionSurface({
      ...selected,
      drawings: [
        {
          ...selected.drawings[0]!,
          style: { ...selected.drawings[0]!.style, labelsVisible: false },
        },
      ],
    }).groups.find((group) => group.id === 'style')!.items;
    expect(hiddenItems.find((item) => item.id === 'labelsVisible:toggle')).toMatchObject({
      enabled: true,
      label: 'Show selected drawing labels',
      command: { type: 'updateStyle', style: { labelsVisible: true } },
    });

    const textItems = resolveUserDrawingSelectedActionSurface({
      ...state,
      selection: { drawingId: 'text' },
      drawings: [
        {
          id: 'text',
          kind: 'textLabel' as const,
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const },
          point: { time: 1, price: 10 },
          text: 'Note',
          textAlign: 'left' as const,
        },
      ],
    }).groups.find((group) => group.id === 'style')!.items;
    expect(textItems.some((item) => item.id === 'labelsVisible:toggle')).toBe(false);

    const patternItems = resolveUserDrawingSelectedActionSurface({
      ...state,
      selection: { drawingId: 'abcd' },
      drawings: [
        {
          id: 'abcd',
          kind: 'abcdPattern' as const,
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {
            lineColor: '#fff',
            lineWidth: 1,
            lineStyle: 'solid' as const,
            textColor: '#f5c542',
            fontFamily: 'sans-serif',
          },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
            { time: 3, price: 10 },
            { time: 4, price: 12 },
          ],
        },
      ],
    }).groups.find((group) => group.id === 'style')!.items;
    expect(patternItems.find((item) => item.id === 'labelsVisible:toggle')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { labelsVisible: false } },
    });
    expect(patternItems.find((item) => item.id === 'textColor:#22c55e')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { textColor: '#22c55e' } },
    });
    expect(patternItems.find((item) => item.id === 'fontSize:increase')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { fontSize: 14 } },
    });
    expect(patternItems.find((item) => item.id === 'fontFamily:serif')).toMatchObject({
      enabled: true,
      command: { type: 'updateStyle', style: { fontFamily: 'serif' } },
    });
  });

  it('clamps selected action surfaces inside shared safe viewport insets', () => {
    expect(
      resolveUserDrawingActionSurfacePosition({
        anchor: { x: 10, y: 20 },
        viewport: { width: 320, height: 220 },
        surface: { width: 120, height: 40 },
        inset: { left: 8, right: 8, top: 38, bottom: 8 },
      }),
    ).toEqual({ left: 8, top: 38 });

    expect(
      resolveUserDrawingActionSurfacePosition({
        anchor: { x: 310, y: 218 },
        viewport: { width: 320, height: 220 },
        surface: { width: 120, height: 40 },
        inset: { left: 8, right: 8, top: 38, bottom: 8 },
      }),
    ).toEqual({ left: 192, top: 172 });

    expect(
      resolveUserDrawingActionSurfacePosition({
        anchor: { x: 160, y: 120 },
        viewport: { width: 320, height: 220 },
        surface: { width: 120, height: 40 },
        inset: { left: 8, right: 8, top: 38, bottom: 8 },
      }),
    ).toEqual({ left: 100, top: 78 });

    expect(
      resolveUserDrawingActionSurfacePosition({
        anchor: { x: 318, y: 120 },
        viewport: { width: 320, height: 220 },
        surface: { width: 304, height: 40 },
        inset: { left: 8, right: 8, top: 38, bottom: 8 },
      }),
    ).toEqual({ left: 8, top: 78 });
  });

  it('keeps locked selected action surface mutations disabled except unlock', () => {
    const locked = {
      ...state,
      selection: { drawingId: 'locked' },
      drawings: [
        {
          id: 'locked',
          kind: 'horizontalLine' as const,
          paneId: 'main',
          visible: true,
          locked: true,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const },
          price: 10,
        },
      ],
    } satisfies UserDrawingState;
    const items = resolveUserDrawingSelectedActionSurface(locked).groups.flatMap((group) => group.items);

    expect(items.find((item) => item.id === 'duplicateSelected')?.enabled).toBe(false);
    expect(items.find((item) => item.id === 'deleteSelected')?.enabled).toBe(false);
    expect(items.find((item) => item.id === 'lineColor:#f5c542')?.enabled).toBe(false);
    expect(items.find((item) => item.id === 'lineWidth:2')?.enabled).toBe(false);
    expect(items.find((item) => item.id === 'lineStyle:dashed')?.enabled).toBe(false);
    expect(items.find((item) => item.id === 'hideSelected')?.enabled).toBe(false);
    expect(items.find((item) => item.id === 'lockSelected')?.enabled).toBe(false);
    expect(items.find((item) => item.id === 'unlockSelected')).toMatchObject({
      enabled: true,
      command: {
        type: 'styleAction',
        action: 'unlockSelected',
        locked: false,
        includeLocked: true,
      },
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
        drawings: [{ ...first.drawings[0]!, style: { ...first.drawings[0]!.style, fillOpacity: 0.5 } }],
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

    const noSelectionState: UserDrawingState = {
      ...state,
      selection: null,
      drawings: [
        first.drawings[0]!,
        {
          id: 'locked-hidden',
          kind: 'horizontalLine' as const,
          paneId: 'main',
          visible: false,
          locked: true,
          createdAt: 2,
          updatedAt: 2,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const },
          price: 12,
        },
      ],
    };
    expect(
      getUserDrawingToolbarStateKey({
        ...noSelectionState,
        drawings: noSelectionState.drawings.map((drawing) => ({ ...drawing, visible: false })),
      }),
    ).not.toBe(getUserDrawingToolbarStateKey(noSelectionState));
    expect(
      getUserDrawingToolbarStateKey({
        ...noSelectionState,
        drawings: noSelectionState.drawings.map((drawing) => ({ ...drawing, visible: true })),
      }),
    ).not.toBe(getUserDrawingToolbarStateKey(noSelectionState));
    expect(
      getUserDrawingToolbarStateKey({
        ...noSelectionState,
        drawings: noSelectionState.drawings.map((drawing) => ({ ...drawing, locked: true })),
      }),
    ).not.toBe(getUserDrawingToolbarStateKey(noSelectionState));
    expect(
      getUserDrawingToolbarStateKey({
        ...noSelectionState,
        drawings: noSelectionState.drawings.map((drawing) => ({ ...drawing, locked: false })),
      }),
    ).not.toBe(getUserDrawingToolbarStateKey(noSelectionState));

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
    expect(
      getUserDrawingToolbarStateKey({ ...textState, drawings: [{ ...textDrawing, textAlign: 'right' }] }),
    ).not.toBe(getUserDrawingToolbarStateKey(textState));
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

  it('resolves shared properties surface controls for line drawings', () => {
    const lineState = {
      ...state,
      selection: { drawingId: 'line' },
      drawings: [
        {
          id: 'line',
          kind: 'trendLine' as const,
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#38bdf8', lineWidth: 2, lineStyle: 'dashed' as const, opacity: 0.5 },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
          ],
          extend: 'right' as const,
        },
      ],
    } satisfies UserDrawingState;

    const surface = resolveUserDrawingPropertiesSurface(lineState);

    expect(surface.drawing?.id).toBe('line');
    expect(surface.editable).toBe(true);
    expect(surface.groups.map((group) => group.id)).toEqual(['line', 'geometry']);
    expect(surface.groups[0]!.controls.find((control) => control.id === 'lineColor:#38bdf8')).toMatchObject({
      enabled: true,
      selected: true,
      command: { type: 'updateStyle', style: { lineColor: '#38bdf8' } },
    });
    expect(surface.groups[0]!.controls.find((control) => control.id === 'lineWidth:2')).toMatchObject({
      enabled: true,
      selected: true,
      command: { type: 'updateStyle', style: { lineWidth: 2 } },
    });
    expect(surface.groups[1]!.controls.find((control) => control.id === 'extend:right')).toMatchObject({
      enabled: true,
      selected: true,
      command: { type: 'setTrendLineExtend', extend: 'right' },
    });
  });

  it('resolves freehand stroke presets for shared properties surfaces', () => {
    const highlighterState = {
      ...state,
      selection: { drawingId: 'highlighter' },
      drawings: [
        {
          id: 'highlighter',
          kind: 'highlighter' as const,
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#f5c542', lineWidth: 8, lineStyle: 'solid' as const, opacity: 0.35 },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
          ],
        },
      ],
    } satisfies UserDrawingState;

    const surface = resolveUserDrawingPropertiesSurface(highlighterState);
    const strokeGroup = surface.groups[0]!;

    expect(strokeGroup).toMatchObject({ id: 'line', label: 'Stroke' });
    expect(strokeGroup.controls.find((control) => control.id === 'lineWidth:8')).toMatchObject({
      enabled: true,
      selected: true,
      command: { type: 'updateStyle', style: { lineWidth: 8 } },
    });
    expect(strokeGroup.controls.find((control) => control.id === 'lineWidth:28')).toMatchObject({
      label: 'Extra wide highlighter stroke width',
      command: { type: 'updateStyle', style: { lineWidth: 28 } },
    });
    expect(strokeGroup.controls.find((control) => control.id === 'opacity:0.35')).toMatchObject({
      enabled: true,
      selected: true,
      command: { type: 'updateStyle', style: { opacity: 0.35 } },
    });
  });

  it('resolves shared properties surface controls for text and fill drawings', () => {
    const textState = {
      ...state,
      selection: { drawingId: 'text' },
      drawings: [
        {
          id: 'text',
          kind: 'textLabel' as const,
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {
            lineColor: '#38bdf8',
            lineWidth: 1,
            lineStyle: 'solid' as const,
            fillColor: 'rgba(245, 197, 66, 0.12)',
            fillOpacity: 0.25,
            textColor: '#d1d4dc',
            fontSize: 14,
            textWrap: true,
            textMaxWidth: 160 as const,
          },
          point: { time: 1, price: 10 },
          text: 'note',
          textAlign: 'center' as const,
        },
      ],
    } satisfies UserDrawingState;

    const surface = resolveUserDrawingPropertiesSurface(textState);

    expect(surface.groups.map((group) => group.id)).toEqual(['line', 'fill', 'text']);
    expect(
      surface.groups
        .find((group) => group.id === 'fill')
        ?.controls.find((control) => control.id === 'fillColor:rgba(245, 197, 66, 0.12)'),
    ).toMatchObject({
      selected: true,
      command: { type: 'updateStyle', style: { fillColor: 'rgba(245, 197, 66, 0.12)' } },
    });
    expect(
      surface.groups.find((group) => group.id === 'fill')?.controls.find((control) => control.id === 'fillOpacity:0.25'),
    ).toMatchObject({
      selected: true,
      command: { type: 'updateStyle', style: { fillOpacity: 0.25 } },
    });
    expect(
      surface.groups
        .find((group) => group.id === 'text')
        ?.controls.find((control) => control.id === 'textColor:#d1d4dc'),
    ).toMatchObject({
      selected: true,
      command: { type: 'updateStyle', style: { textColor: '#d1d4dc' } },
    });
    expect(
      surface.groups
        .find((group) => group.id === 'text')
        ?.controls.find((control) => control.id === 'textAlign:center'),
    ).toMatchObject({
      selected: true,
      command: { type: 'setTextAlign', textAlign: 'center' },
    });
    expect(
      surface.groups.find((group) => group.id === 'text')?.controls.find((control) => control.id === 'textWrap:true'),
    ).toMatchObject({
      selected: true,
      command: { type: 'updateStyle', style: { textWrap: true } },
    });
  });

  it('resolves generated label visibility in shared properties surfaces', () => {
    const rangeState = {
      ...state,
      selection: { drawingId: 'range' },
      drawings: [
        {
          id: 'range',
          kind: 'priceRange' as const,
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
          ],
        },
      ],
    } satisfies UserDrawingState;

    const visibleTextGroup = resolveUserDrawingPropertiesSurface(rangeState).groups.find((group) => group.id === 'text');
    expect(visibleTextGroup?.controls.find((control) => control.id === 'labelsVisible')).toMatchObject({
      label: 'Hide generated labels',
      value: true,
      selected: true,
      command: { type: 'updateStyle', style: { labelsVisible: false } },
    });

    const hiddenTextGroup = resolveUserDrawingPropertiesSurface({
      ...rangeState,
      drawings: [
        {
          ...rangeState.drawings[0]!,
          style: { ...rangeState.drawings[0]!.style, labelsVisible: false },
        },
      ],
    }).groups.find((group) => group.id === 'text');
    expect(hiddenTextGroup?.controls.find((control) => control.id === 'labelsVisible')).toMatchObject({
      label: 'Show generated labels',
      value: false,
      selected: false,
      command: { type: 'updateStyle', style: { labelsVisible: true } },
    });

    const patternSurface = resolveUserDrawingPropertiesSurface({
      ...state,
      selection: { drawingId: 'abcd' },
      drawings: [
        {
          id: 'abcd',
          kind: 'abcdPattern' as const,
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {
            lineColor: '#fff',
            lineWidth: 1,
            lineStyle: 'solid' as const,
            textColor: '#f5c542',
            fontFamily: 'sans-serif',
          },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
            { time: 3, price: 10 },
            { time: 4, price: 12 },
          ],
        },
      ],
    });
    const patternTextControls = patternSurface.groups.find((group) => group.id === 'text')?.controls;
    expect(patternTextControls?.find((control) => control.id === 'textColor:#22c55e')).toMatchObject({
      command: { type: 'updateStyle', style: { textColor: '#22c55e' } },
    });
    expect(patternTextControls?.find((control) => control.id === 'fontSize:14')).toMatchObject({
      command: { type: 'updateStyle', style: { fontSize: 14 } },
    });
    expect(patternTextControls?.find((control) => control.id === 'fontFamily:serif')).toMatchObject({
      command: { type: 'updateStyle', style: { fontFamily: 'serif' } },
    });
    expect(patternTextControls?.find((control) => control.id === 'labelsVisible')).toMatchObject({
      label: 'Hide generated labels',
      command: { type: 'updateStyle', style: { labelsVisible: false } },
    });
  });

  it('resolves locked and targeted properties surfaces', () => {
    const lockedState = {
      ...state,
      selection: { drawingId: 'selected' },
      drawings: [
        {
          id: 'selected',
          kind: 'horizontalLine' as const,
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const },
          price: 10,
        },
        {
          id: 'locked',
          kind: 'horizontalLine' as const,
          paneId: 'main',
          visible: true,
          locked: true,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#f23645', lineWidth: 1, lineStyle: 'solid' as const },
          price: 11,
        },
      ],
    } satisfies UserDrawingState;

    const lockedSurface = resolveUserDrawingPropertiesSurface(lockedState, 'locked');
    expect(lockedSurface).toMatchObject({
      drawing: { id: 'locked' },
      editable: false,
    });
    expect(lockedSurface.groups.flatMap((group) => group.controls).every((control) => control.enabled === false)).toBe(
      true,
    );
    expect(resolveUserDrawingPropertiesSurface(lockedState, 'missing')).toEqual({
      drawing: null,
      editable: false,
      groups: [],
    });
  });

  it('keeps properties surface fill color and fill visibility support separate', () => {
    const riskRewardState = {
      ...state,
      selection: { drawingId: 'long' },
      drawings: [
        {
          id: 'long',
          kind: 'longPosition' as const,
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {
            lineColor: '#38bdf8',
            lineWidth: 1,
            lineStyle: 'solid' as const,
            fillVisible: true,
          },
          points: [
            { time: 1, price: 100 },
            { time: 2, price: 110 },
            { time: 2, price: 95 },
          ],
        },
      ],
    } satisfies UserDrawingState;

    const fillControls = resolveUserDrawingPropertiesSurface(riskRewardState)
      .groups.find((group) => group.id === 'fill')
      ?.controls.map((control) => control.id);

    expect(fillControls).toEqual([
      'fillOpacity:1',
      'fillOpacity:0.75',
      'fillOpacity:0.5',
      'fillOpacity:0.25',
      'fillOpacity:0.1',
      'lineVisible:true',
      'fillVisible:true',
    ]);
    expect(
      resolveUserDrawingPropertiesSurface(riskRewardState)
        .groups.find((group) => group.id === 'fill')
        ?.controls.find((control) => control.id === 'fillOpacity:1'),
    ).toMatchObject({ selected: true });
  });

  it('matches properties surface colors case-insensitively', () => {
    const colorState = {
      ...state,
      selection: { drawingId: 'text' },
      drawings: [
        {
          id: 'text',
          kind: 'textLabel' as const,
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {
            lineColor: '#38BDF8',
            lineWidth: 1,
            lineStyle: 'solid' as const,
            fillColor: 'RGBA(245, 197, 66, 0.12)',
            textColor: '#D1D4DC',
          },
          point: { time: 1, price: 10 },
          text: 'note',
          textAlign: 'center' as const,
        },
      ],
    } satisfies UserDrawingState;

    const surface = resolveUserDrawingPropertiesSurface(colorState);

    expect(surface.groups[0]!.controls.find((control) => control.id === 'lineColor:#38bdf8')).toMatchObject({
      selected: true,
    });
    expect(
      surface.groups
        .find((group) => group.id === 'fill')
        ?.controls.find((control) => control.id === 'fillColor:rgba(245, 197, 66, 0.12)'),
    ).toMatchObject({
      selected: true,
    });
    expect(
      surface.groups
        .find((group) => group.id === 'text')
        ?.controls.find((control) => control.id === 'textColor:#d1d4dc'),
    ).toMatchObject({
      selected: true,
    });
  });

  it('converts properties surface controls to drawing commands', () => {
    expect(
      resolveUserDrawingPropertiesSurfaceCommand(
        { type: 'updateStyle', style: { lineColor: '#38bdf8' } },
        { drawingId: 'line', source: 'api' },
      ),
    ).toEqual({
      type: 'updateStyle',
      style: { lineColor: '#38bdf8' },
      options: { drawingId: 'line' },
      meta: { source: 'api' },
    });
    expect(
      resolveUserDrawingPropertiesSurfaceCommand({ type: 'setTextAlign', textAlign: 'right' }, { drawingId: 'text' }),
    ).toEqual({
      type: 'setTextAlign',
      textAlign: 'right',
      options: { drawingId: 'text' },
      meta: { source: 'toolbar' },
    });
    expect(resolveUserDrawingPropertiesSurfaceCommand({ type: 'setTrendLineExtend', extend: 'both' })).toMatchObject({
      type: 'setTrendLineExtend',
      extend: 'both',
      meta: { source: 'toolbar' },
    });
    expect(resolveUserDrawingPropertiesSurfaceCommand({ type: 'setIconName', iconName: 'flag' })).toMatchObject({
      type: 'setIconName',
      iconName: 'flag',
      meta: { source: 'toolbar' },
    });
  });
});
