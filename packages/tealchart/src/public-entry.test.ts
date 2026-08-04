import type {
  AnchoredVolumeProfileDrawing,
  AnchoredVwapDrawing,
  AddUserDrawingOptions,
  ArcDrawing,
  ArrowLineDrawing,
  ArrowMarkDownDrawing,
  ArrowMarkerDrawing,
  ArrowMarkUpDrawing,
  BalloonDrawing,
  BarsPatternDrawing,
  BrushDrawing,
  CalloutDrawing,
  CircleDrawing,
  CommentDrawing,
  CurveDrawing,
  CyclicLinesDrawing,
  DatePriceRangeDrawing,
  DateRangeDrawing,
  DisjointChannelDrawing,
  DrawingPitchforkVariant,
  DrawingScreenBarsPattern,
  DrawingScreenFixedRangeVolumeProfile,
  DrawingScreenRiskRewardPosition,
  DrawingScreenTable,
  DrawingScreenVolumeProfileGuide,
  DrawingScreenVolumeProfileGuideKind,
  ChartGeometrySnapshot,
  Rect,
  EllipseDrawing,
  ExtendedLineDrawing,
  FibChannelDrawing,
  FibCirclesDrawing,
  FibFanDrawing,
  FibSpeedResistanceArcsDrawing,
  FibSpeedResistanceFanDrawing,
  FibSpiralDrawing,
  FibTimeZoneDrawing,
  FibWedgeDrawing,
  FlatTopBottomDrawing,
  ForecastDrawing,
  GannBoxDrawing,
  GannFanDrawing,
  GannSquareDrawing,
  GannSquareFixedDrawing,
  HighlighterDrawing,
  IconDrawing,
  InfoLineDrawing,
  LongPositionDrawing,
  NoteDrawing,
  ParallelChannelDrawing,
  PathDrawing,
  PinDrawing,
  PitchfanDrawing,
  PitchforkDrawing,
  PitchforkDrawingKind,
  PriceNoteDrawing,
  PriceRangeDrawing,
  ProjectionDrawing,
  RegressionTrendDrawing,
  RotatedRectangleDrawing,
  SectorDrawing,
  ShortPositionDrawing,
  SineLineDrawing,
  TableDrawing,
  TimeCyclesDrawing,
  TrendAngleDrawing,
  TrendBasedFibTimeDrawing,
  TriangleDrawing,
  UserDrawingDateRangeMetrics,
  UserDrawingFontFamily,
  UserDrawingFontFamilyDescriptor,
  UserDrawingFontSize,
  UserDrawingFontStyle,
  UserDrawingFontStyleDescriptor,
  UserDrawingFontWeight,
  UserDrawingFontWeightDescriptor,
  UserDrawingHitTestTextMeasure,
  UserDrawingIconNameDescriptor,
  UserDrawingInfoLineMetrics,
  UserDrawingMagnetMode,
  UserDrawingMeasurementLabelPosition,
  UserDrawingMeasurementLabelPositionDescriptor,
  UserDrawingMeasuredTextLine,
  UserDrawingOpacityDescriptor,
  UserDrawingBrushTemplateDescriptor,
  NudgeUserDrawingSelectionOptions,
  ResolveUserDrawingEditIntentOptions,
  ResolveUserDrawingObjectTreeRowDispatchActionOptions,
  ResolveUserDrawingPropertiesIntentOptions,
  UserDrawingEditIntent,
  UserDrawingEditIntentKind,
  UserDrawingObjectTreeAction,
  UserDrawingObjectTreeGroup,
  UserDrawingObjectTreeModel,
  UserDrawingObjectTreeRow,
  UserDrawingObjectTreeRowAction,
  UserDrawingObjectTreeRowActionType,
  UserDrawingObjectTreeSelectionActionDescriptor,
  UserDrawingObjectTreeSelectionActionType,
  UserDrawingCommandEvent,
  UserDrawingPropertiesIntent,
  UserDrawingVisualEvidenceMatrix,
  UserDrawingVisualEvidenceState,
  UserDrawingVisualEvidenceStateStatus,
  UserDrawingVisualEvidenceViewport,
  UserDrawingBarsPatternColorDescriptor,
  UserDrawingBarsPatternDisplayMode,
  UserDrawingBarsPatternDisplayModeDescriptor,
  UserDrawingMeasurementLabelAlignment,
  UserDrawingMeasurementLabelAlignmentDescriptor,
  UserDrawingPriceRangeMetrics,
  UserDrawingRiskRewardLabelAlignment,
  UserDrawingRiskRewardLabelAlignmentDescriptor,
  UserDrawingRiskRewardMetrics,
  UserDrawingRiskRewardStatsMode,
  UserDrawingRiskRewardStatsModeDescriptor,
  UserDrawingStyleToggleDescriptor,
  UserDrawingTableCellInput,
  UserDrawingTableCellsInput,
  UserDrawingTableColumnInput,
  UserDrawingTableRowInput,
  UserDrawingTextDecorationDescriptor,
  UserDrawingTextLabelLayout,
  UserDrawingTextMaxWidth,
  UserDrawingTextMaxWidthDescriptor,
  UserDrawingTextWrapDescriptor,
  UserDrawingVolumeProfileRowCount,
  UserDrawingVolumeProfileRowCountDescriptor,
  UserDrawingVolumeProfileValueAreaRatio,
  UserDrawingVolumeProfileValueAreaRatioDescriptor,
  UserDrawingVolumeProfileWidthRatio,
  UserDrawingVolumeProfileWidthRatioDescriptor,
  TealchartWidgetOptions,
  UserDrawingCommandEventListener,
  WidgetEventCallback,
  WidgetEventMap,
} from './index';

import { afterEach, describe, expect, it } from 'vitest';

import {
  WEB_CHART_CHROME_METRICS,
  addUserDrawing,
  computeChartGeometry,
  computeTopLeftLegendRect,
  createUserDrawingClipboard,
  createUserDrawingState,
  createUserDrawingVisualEvidencePrNoteTemplate,
  duplicateUserDrawing,
  formatTrendAngleDegrees,
  formatUserDrawingDateRangeBars,
  getUserDrawingSelectionIds,
  normalizeUserDrawingFontFamily,
  normalizeUserDrawingFontStyle,
  normalizeUserDrawingFontWeight,
  normalizeUserDrawingIconName,
  normalizeUserDrawingOpacity,
  normalizeUserDrawingTextMaxWidth,
  pasteUserDrawingClipboard,
  resolveAnchoredVwapFromAnchor,
  resolveArcFromAnchors,
  resolveBarsPatternFromAnchors,
  resolveCircleFromAnchors,
  resolveCurveFromAnchors,
  resolveCyclicLinesFromAnchors,
  resolveDisjointChannelFromAnchors,
  resolveEllipseFromAnchors,
  resolveFibChannelFromAnchors,
  resolveFibCirclesFromAnchors,
  resolveFibFanFromAnchors,
  resolveFibSpeedResistanceArcsFromAnchors,
  resolveFibSpeedResistanceFanFromAnchors,
  resolveFibSpiralFromAnchors,
  resolveFibTimeZoneFromAnchors,
  resolveFibWedgeFromAnchors,
  resolveFlatTopBottomFromAnchors,
  resolveForecastFromAnchors,
  resolveGannBoxFromAnchors,
  resolveGannFanFromAnchors,
  resolveGannSquareFromAnchors,
  resolvePitchfanFromAnchors,
  resolvePitchforkFromAnchors,
  resolveProjectionFromAnchors,
  resolveSectorFromAnchors,
  resolveTableFromAnchor,
  resolveRegressionTrendFromAnchors,
  resolveRiskRewardPositionFromAnchors,
  resolveSineLineFromAnchors,
  resolveTimeCyclesFromAnchors,
  resolveTrendBasedFibTimeFromAnchors,
  resolveUserDrawingDateRangeMetrics,
  resolveUserDrawingEditIntentAtPoint,
  resolveUserDrawingInfoLineMetrics,
  resolveUserDrawingObjectTreeActionCommands,
  resolveUserDrawingObjectTreeDrawingDispatchAction,
  resolveUserDrawingObjectTreeModel,
  resolveUserDrawingObjectTreeRowDispatchAction,
  resolveUserDrawingObjectTreeSelectionDispatchAction,
  resolveUserDrawingPropertiesIntent,
  resolveUserDrawingPropertiesSurface,
  resolveUserDrawingPropertiesSurfaceCommand,
  USER_DRAWING_VISUAL_EVIDENCE_MATRIX,
  resolveUserDrawingKeyboardAction,
  nudgeUserDrawingSelection,
  resolveUserDrawingPriceRangeMetrics,
  resolveUserDrawingRiskRewardMetrics,
  resolveAnchoredVolumeProfileFromAnchor,
  measureUserDrawingTextLines,
  resolveUserDrawingTextEditMetrics,
  resolveUserDrawingTextLabelLayout,
  resolveUserDrawingVisualPriceRangeMetrics,
  deleteUserDrawingTableColumn,
  deleteUserDrawingTableRow,
  selectUserDrawingsById,
  insertUserDrawingTableColumn,
  insertUserDrawingTableRow,
  setUserDrawingIconName,
  setUserDrawingImageSource,
  setUserDrawingName,
  setUserDrawingTableCell,
  setUserDrawingTableCells,
  setUserDrawingTableDimensions,
  setUserDrawingTextContent,
  setUserDrawingTextAlign,
  setUserDrawingTrendLineExtend,
  splitUserDrawingTextLines,
  getUserDrawingBrushTemplateDescriptors,
  USER_DRAWING_BARS_PATTERN_DOWN_COLOR_DESCRIPTORS,
  USER_DRAWING_BARS_PATTERN_DISPLAY_MODE_DESCRIPTORS,
  USER_DRAWING_BARS_PATTERN_DISPLAY_MODES,
  USER_DRAWING_BARS_PATTERN_UP_COLOR_DESCRIPTORS,
  USER_DRAWING_BRUSH_TEMPLATE_DESCRIPTORS,
  USER_DRAWING_FONT_FAMILIES,
  USER_DRAWING_FONT_FAMILY_DESCRIPTORS,
  USER_DRAWING_FONT_STYLE_DESCRIPTORS,
  USER_DRAWING_FONT_STYLES,
  USER_DRAWING_FONT_WEIGHT_DESCRIPTORS,
  USER_DRAWING_FONT_WEIGHTS,
  USER_DRAWING_ICON_NAME_DESCRIPTORS,
  USER_DRAWING_ICON_NAMES,
  USER_DRAWING_MEASUREMENT_LABEL_ALIGNMENT_DESCRIPTORS,
  USER_DRAWING_MEASUREMENT_LABEL_ALIGNMENTS,
  USER_DRAWING_MEASUREMENT_LABEL_POSITION_DESCRIPTORS,
  USER_DRAWING_MEASUREMENT_LABEL_POSITIONS,
  USER_DRAWING_OPACITY_DESCRIPTORS,
  USER_DRAWING_RISK_REWARD_LABEL_ALIGNMENT_DESCRIPTORS,
  USER_DRAWING_RISK_REWARD_LABEL_ALIGNMENTS,
  USER_DRAWING_RISK_REWARD_STATS_MODE_DESCRIPTORS,
  USER_DRAWING_RISK_REWARD_STATS_MODES,
  USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS,
  USER_DRAWING_TEXT_DECORATION_DESCRIPTORS,
  USER_DRAWING_TEXT_MAX_WIDTH_DESCRIPTORS,
  USER_DRAWING_TEXT_MAX_WIDTHS,
  USER_DRAWING_TEXT_WRAP_DESCRIPTORS,
  USER_DRAWING_TREND_LINE_EXTEND_DESCRIPTORS,
  USER_DRAWING_TREND_LINE_EXTENDS,
  USER_DRAWING_VOLUME_PROFILE_ROW_COUNT_DESCRIPTORS,
  USER_DRAWING_VOLUME_PROFILE_ROW_COUNTS,
  USER_DRAWING_VOLUME_PROFILE_VALUE_AREA_RATIO_DESCRIPTORS,
  USER_DRAWING_VOLUME_PROFILE_VALUE_AREA_RATIOS,
  USER_DRAWING_VOLUME_PROFILE_WIDTH_RATIO_DESCRIPTORS,
  USER_DRAWING_VOLUME_PROFILE_WIDTH_RATIOS,
  normalizeUserDrawingBarsPatternDisplayMode,
  normalizeUserDrawingMeasurementLabelAlignment,
  normalizeUserDrawingMeasurementLabelPosition,
  normalizeUserDrawingRiskRewardLabelAlignment,
  normalizeUserDrawingRiskRewardStatsMode,
  normalizeUserDrawingVolumeProfileRowCount,
  normalizeUserDrawingVolumeProfileValueAreaRatio,
  normalizeUserDrawingVolumeProfileWidthRatio,
} from './index';
import { clearChartStoreCache } from './state/chartState';

type NonNever<T> = [T] extends [never] ? never : T;

describe('tealchart public entries', () => {
  afterEach(() => {
    clearChartStoreCache();
  });

  it('exports shared chart geometry helpers for external chrome layout', () => {
    const snapshot: ChartGeometrySnapshot = computeChartGeometry({
      width: 500,
      height: 320,
      margins: { top: WEB_CHART_CHROME_METRICS.topBarHeight, right: 60, bottom: 26, left: 0 },
      paneLayout: {
        timeAxisHeight: 26,
        panes: [{ id: 'main', type: 'main', heightRatio: 1, yMin: 0, yMax: 100, fixedRange: false }],
      },
      topBarHeight: WEB_CHART_CHROME_METRICS.topBarHeight,
      leftToolRailWidth: WEB_CHART_CHROME_METRICS.leftToolRailWidth,
      topLeftLegend: true,
      chromeMetrics: WEB_CHART_CHROME_METRICS,
    });
    const legendRect: Rect | null = computeTopLeftLegendRect(WEB_CHART_CHROME_METRICS, snapshot.root, 0, {
      avoidLeftTools: true,
    });

    expect(snapshot.chrome.topBar).toEqual({ x: 0, y: 0, width: 500, height: 32 });
    expect(snapshot.chrome.leftTools).toEqual({ x: 0, y: 32, width: 50, height: 288 });
    expect(snapshot.chrome.topLeftLegend).toEqual({ x: 70, y: 40, width: 430, height: 44 });
    expect(legendRect).toEqual(snapshot.chrome.topLeftLegend);
  });

  it('exports typed drawing command event callbacks for web and mobile surfaces', () => {
    const webSubscriptionCallback = ((event) => event.source) satisfies WidgetEventCallback<'user_drawing_command'>;
    const webOptionCallback = ((event) => event.state.drawings.length) satisfies NonNullable<
      TealchartWidgetOptions['onUserDrawingCommand']
    >;
    const crossPlatformCallback = ((event) => event.command.type) satisfies UserDrawingCommandEventListener;
    const acceptsCommandTuple = (_tuple: WidgetEventMap['user_drawing_command']) => true;
    const magnetMode: UserDrawingMagnetMode = 'strong';
    const commandEvent: UserDrawingCommandEvent = {
      command: { type: 'setActiveTool', tool: 'trendLine' },
      previousState: createUserDrawingState(),
      state: createUserDrawingState({ activeTool: 'trendLine' }),
      source: 'api',
    };

    expect(webSubscriptionCallback).toBeTypeOf('function');
    expect(webOptionCallback).toBeTypeOf('function');
    expect(crossPlatformCallback).toBeTypeOf('function');
    expect(acceptsCommandTuple).toBeTypeOf('function');
    expect(magnetMode).toBe('strong');
    expect(commandEvent.command.type).toBe('setActiveTool');
    expect(commandEvent.state.activeTool).toBe('trendLine');
    expect(commandEvent.source).toBe('api');
  });

  it('exports shared and native drawing text alignment helpers', () => {
    expect(setUserDrawingTextAlign).toBeTypeOf('function');
    expect(setUserDrawingIconName).toBeTypeOf('function');
    expect(setUserDrawingImageSource).toBeTypeOf('function');
    expect(setUserDrawingName).toBeTypeOf('function');
    expect(setUserDrawingTableCell).toBeTypeOf('function');
    expect(setUserDrawingTableCells).toBeTypeOf('function');
    expect(setUserDrawingTableDimensions).toBeTypeOf('function');
    expect(insertUserDrawingTableRow).toBeTypeOf('function');
    expect(deleteUserDrawingTableRow).toBeTypeOf('function');
    expect(insertUserDrawingTableColumn).toBeTypeOf('function');
    expect(deleteUserDrawingTableColumn).toBeTypeOf('function');
    expect(setUserDrawingTextContent).toBeTypeOf('function');
    expect(setUserDrawingTrendLineExtend).toBeTypeOf('function');
    expect(USER_DRAWING_TREND_LINE_EXTENDS).toEqual(['none', 'left', 'right', 'both']);
    expect(USER_DRAWING_TREND_LINE_EXTEND_DESCRIPTORS.map((descriptor) => descriptor.extend)).toEqual([
      'none',
      'left',
      'right',
      'both',
    ]);
    const addOptions: NonNever<AddUserDrawingOptions> = { select: false };
    expect(addUserDrawing).toBeTypeOf('function');
    expect(addOptions.select).toBe(false);
    expect(duplicateUserDrawing).toBeTypeOf('function');
    expect(createUserDrawingClipboard).toBeTypeOf('function');
    expect(pasteUserDrawingClipboard).toBeTypeOf('function');
    expect(getUserDrawingSelectionIds).toBeTypeOf('function');
    expect(resolveUserDrawingEditIntentAtPoint).toBeTypeOf('function');
    expect(resolveUserDrawingObjectTreeModel).toBeTypeOf('function');
    expect(resolveUserDrawingObjectTreeActionCommands).toBeTypeOf('function');
    expect(resolveUserDrawingPropertiesIntent).toBeTypeOf('function');
    expect(resolveUserDrawingPropertiesSurface).toBeTypeOf('function');
    expect(resolveUserDrawingPropertiesSurfaceCommand).toBeTypeOf('function');
    expect(createUserDrawingVisualEvidencePrNoteTemplate).toBeTypeOf('function');
    expect(USER_DRAWING_VISUAL_EVIDENCE_MATRIX.states.length).toBeGreaterThan(0);
    expect(resolveUserDrawingKeyboardAction).toBeTypeOf('function');
    expect(nudgeUserDrawingSelection).toBeTypeOf('function');
    expect(selectUserDrawingsById).toBeTypeOf('function');
    expect(resolveRegressionTrendFromAnchors).toBeTypeOf('function');
    expect(resolveFlatTopBottomFromAnchors).toBeTypeOf('function');
    expect(resolveDisjointChannelFromAnchors).toBeTypeOf('function');
    expect(resolvePitchforkFromAnchors).toBeTypeOf('function');
    expect(resolvePitchfanFromAnchors).toBeTypeOf('function');
    expect(resolveAnchoredVolumeProfileFromAnchor).toBeTypeOf('function');
    expect(resolveTableFromAnchor).toBeTypeOf('function');
    expect(resolveAnchoredVwapFromAnchor).toBeTypeOf('function');
  });

  it('exports drawing object tree public types', () => {
    const row: NonNever<UserDrawingObjectTreeRow> = {
      id: 'trend',
      drawingId: 'trend',
      kind: 'trendLine',
      tool: 'trendLine',
      label: 'Trend line',
      defaultLabel: 'Trend line',
      customName: null,
      icon: '╱',
      paneId: 'main',
      visible: true,
      locked: false,
      selected: false,
      editable: true,
      zIndex: 0,
      orderIndex: 0,
      groupIds: ['pane:main'],
      actions: [{ type: 'rename', label: 'Rename drawing', enabled: true }],
    };
    const rowAction: NonNever<UserDrawingObjectTreeRowAction> = row.actions![0]!;
    const rowActionType: NonNever<UserDrawingObjectTreeRowActionType> = 'rename';
    const selectionAction: NonNever<UserDrawingObjectTreeSelectionActionDescriptor> = {
      type: 'hide',
      label: 'Hide selected drawings',
      enabled: true,
      selectedCount: 1,
    };
    const selectionActionType: NonNever<UserDrawingObjectTreeSelectionActionType> = 'hide';
    const rowDispatchOptions: NonNever<ResolveUserDrawingObjectTreeRowDispatchActionOptions> = { name: 'Breakout' };
    const group: NonNever<UserDrawingObjectTreeGroup> = {
      id: 'pane:main',
      label: 'Main chart',
      paneId: 'main',
      rowIds: ['trend'],
      drawingIds: ['trend'],
      orderIndex: 0,
      drawingCount: 1,
    };
    const model: NonNever<UserDrawingObjectTreeModel> = {
      rows: [row],
      groups: [group],
      selectionActions: [selectionAction],
      selectedIds: ['trend'],
      drawingCount: 1,
    };
    const action: NonNever<UserDrawingObjectTreeAction> = {
      type: 'duplicate',
      drawingIds: ['trend'],
      createId: () => 'copy',
    };

    expect(model.rows[0]).toBe(row);
    expect(model.groups?.[0]).toBe(group);
    expect(rowAction.type).toBe(rowActionType);
    expect(model.selectionActions?.[0]).toBe(selectionAction);
    expect(selectionAction.type).toBe(selectionActionType);
    expect(resolveUserDrawingObjectTreeRowDispatchAction(row, rowActionType, rowDispatchOptions)).toEqual({
      type: 'rename',
      drawingId: 'trend',
      name: 'Breakout',
      includeLocked: undefined,
    });
    expect(resolveUserDrawingObjectTreeSelectionDispatchAction(model, selectionActionType)).toEqual({
      type: 'hide',
      drawingIds: ['trend'],
      includeLocked: true,
    });
    expect(resolveUserDrawingObjectTreeDrawingDispatchAction(model, 'trend', rowActionType, rowDispatchOptions)).toEqual({
      type: 'rename',
      drawingId: 'trend',
      name: 'Breakout',
      includeLocked: undefined,
    });
    expect(action.type).toBe('duplicate');
  });

  it('exports drawing edit intent public types', () => {
    const kind: NonNever<UserDrawingEditIntentKind> = 'properties';
    const options: NonNever<ResolveUserDrawingEditIntentOptions> = {
      source: 'pointer',
    };
    const nudgeOptions: NonNever<NudgeUserDrawingSelectionOptions> = {
      delta: { x: 1, y: 0 },
    };
    const intent: NonNever<UserDrawingEditIntent> = {
      type: 'pane',
      commands: [],
    };

    expect(kind).toBe('properties');
    expect(options.source).toBe('pointer');
    expect(nudgeOptions.delta.x).toBe(1);
    expect(intent.type).toBe('pane');
  });

  it('exports drawing properties intent public types', () => {
    const options: NonNever<ResolveUserDrawingPropertiesIntentOptions> = {
      drawingId: 'line',
    };
    const intent: NonNever<UserDrawingPropertiesIntent> = {
      type: 'properties',
      drawingId: 'line',
      drawing: {
        id: 'line',
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
        price: 50,
      },
      selected: true,
      editable: true,
    };

    expect(options.drawingId).toBe('line');
    expect(intent.editable).toBe(true);
  });

  it('exports drawing visual evidence public types', () => {
    const viewport: NonNever<UserDrawingVisualEvidenceViewport> = {
      id: 'desktop',
      label: 'Desktop',
      width: 1280,
      height: 900,
      target: 'web',
      notes: 'Include chart chrome',
    };
    const status: NonNever<UserDrawingVisualEvidenceStateStatus> = 'ready';
    const mobileStatus: NonNever<UserDrawingVisualEvidenceStateStatus> = 'known-gap';
    const visualState: NonNever<UserDrawingVisualEvidenceState> = {
      id: 'selectedDrawing',
      label: 'Selected drawing',
      webEvidence: 'Canvas handles',
      mobileEvidence: 'Native drawing renderer intentionally absent pending rebuild',
      status: {
        web: status,
        mobile: mobileStatus,
        notes: 'Native drawing surfaces are intentionally blank during the Skia runtime rebuild',
      },
      expectedChecks: ['Web handles are stable'],
    };
    const matrix: NonNever<UserDrawingVisualEvidenceMatrix> = {
      viewports: [viewport],
      states: [visualState],
      regressionChecks: ['Web and mobile remain paired'],
    };

    expect(matrix.viewports[0]?.target).toBe('web');
    expect(matrix.states[0]?.id).toBe('selectedDrawing');
  });

  it('exports shared drawing opacity helpers', () => {
    const descriptor: UserDrawingOpacityDescriptor = USER_DRAWING_OPACITY_DESCRIPTORS[0]!;
    expect(normalizeUserDrawingOpacity(0.5)).toBe(0.5);
    expect(descriptor.label).toBe('100 percent opacity');
    expect(USER_DRAWING_OPACITY_DESCRIPTORS.map((descriptor) => descriptor.opacity)).toEqual([
      1,
      0.75,
      0.5,
      0.25,
      0.1,
    ]);
  });

  it('exports shared drawing brush template helpers', () => {
    const descriptor: UserDrawingBrushTemplateDescriptor = USER_DRAWING_BRUSH_TEMPLATE_DESCRIPTORS.find(
      (template) => template.template === 'brush-marker',
    )!;
    const drawing: BrushDrawing = {
      id: 'brush',
      kind: 'brush',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: descriptor.style,
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
      ],
    };

    expect(USER_DRAWING_BRUSH_TEMPLATE_DESCRIPTORS.map((template) => template.template)).toContain('brush-marker');
    expect(getUserDrawingBrushTemplateDescriptors(drawing).map((template) => template.tool)).toEqual([
      'brush',
      'brush',
    ]);
  });

  it('exports shared drawing icon-name helpers', () => {
    const descriptor: UserDrawingIconNameDescriptor = USER_DRAWING_ICON_NAME_DESCRIPTORS[0]!;
    expect(descriptor.iconName).toBe('star');
    expect(normalizeUserDrawingIconName('flag')).toBe('flag');
    expect(normalizeUserDrawingIconName('unknown')).toBe('star');
    expect(USER_DRAWING_ICON_NAMES).toEqual(['star', 'circle', 'square', 'triangle', 'flag', 'arrowUp', 'arrowDown']);
    expect(USER_DRAWING_ICON_NAME_DESCRIPTORS.map((descriptor) => descriptor.iconName)).toEqual(
      USER_DRAWING_ICON_NAMES,
    );
  });

  it('exports shared drawing style toggle descriptors', () => {
    const descriptor: UserDrawingStyleToggleDescriptor = USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS[0]!;
    expect(descriptor.style).toBe('lineVisible');
    expect(USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS.map((descriptor) => descriptor.style)).toEqual([
      'lineVisible',
      'fillVisible',
    ]);
  });

  it('exports shared drawing font-family helpers', () => {
    const fontSize: UserDrawingFontSize = 12;
    const fontFamily: UserDrawingFontFamily = USER_DRAWING_FONT_FAMILIES[0]!;
    const fontStyle: UserDrawingFontStyle = USER_DRAWING_FONT_STYLES[1]!;
    const fontWeight: UserDrawingFontWeight = USER_DRAWING_FONT_WEIGHTS[1]!;
    const descriptor: UserDrawingFontFamilyDescriptor = USER_DRAWING_FONT_FAMILY_DESCRIPTORS[0]!;
    const styleDescriptor: UserDrawingFontStyleDescriptor = USER_DRAWING_FONT_STYLE_DESCRIPTORS[1]!;
    const weightDescriptor: UserDrawingFontWeightDescriptor = USER_DRAWING_FONT_WEIGHT_DESCRIPTORS[1]!;
    const underlineDescriptor: UserDrawingTextDecorationDescriptor = USER_DRAWING_TEXT_DECORATION_DESCRIPTORS[0]!;
    const strikeDescriptor: UserDrawingTextDecorationDescriptor = USER_DRAWING_TEXT_DECORATION_DESCRIPTORS[1]!;
    const unwrapDescriptor: UserDrawingTextWrapDescriptor = USER_DRAWING_TEXT_WRAP_DESCRIPTORS[0]!;
    const wrapDescriptor: UserDrawingTextWrapDescriptor = USER_DRAWING_TEXT_WRAP_DESCRIPTORS[1]!;
    const maxWidth: UserDrawingTextMaxWidth = USER_DRAWING_TEXT_MAX_WIDTHS[1]!;
    const maxWidthDescriptor: UserDrawingTextMaxWidthDescriptor = USER_DRAWING_TEXT_MAX_WIDTH_DESCRIPTORS[1]!;
    const barsPatternDisplayMode: UserDrawingBarsPatternDisplayMode = USER_DRAWING_BARS_PATTERN_DISPLAY_MODES[1]!;
    const barsPatternDisplayModeDescriptor: UserDrawingBarsPatternDisplayModeDescriptor =
      USER_DRAWING_BARS_PATTERN_DISPLAY_MODE_DESCRIPTORS[1]!;
    const barsPatternUpColorDescriptor: UserDrawingBarsPatternColorDescriptor =
      USER_DRAWING_BARS_PATTERN_UP_COLOR_DESCRIPTORS[1]!;
    const barsPatternDownColorDescriptor: UserDrawingBarsPatternColorDescriptor =
      USER_DRAWING_BARS_PATTERN_DOWN_COLOR_DESCRIPTORS[1]!;
    const measurementLabelAlignment: UserDrawingMeasurementLabelAlignment =
      USER_DRAWING_MEASUREMENT_LABEL_ALIGNMENTS[2]!;
    const measurementLabelAlignmentDescriptor: UserDrawingMeasurementLabelAlignmentDescriptor =
      USER_DRAWING_MEASUREMENT_LABEL_ALIGNMENT_DESCRIPTORS[2]!;
    const measurementLabelPosition: UserDrawingMeasurementLabelPosition = USER_DRAWING_MEASUREMENT_LABEL_POSITIONS[1]!;
    const measurementLabelPositionDescriptor: UserDrawingMeasurementLabelPositionDescriptor =
      USER_DRAWING_MEASUREMENT_LABEL_POSITION_DESCRIPTORS[1]!;
    const riskRewardLabelAlignment: UserDrawingRiskRewardLabelAlignment =
      USER_DRAWING_RISK_REWARD_LABEL_ALIGNMENTS[2]!;
    const riskRewardLabelAlignmentDescriptor: UserDrawingRiskRewardLabelAlignmentDescriptor =
      USER_DRAWING_RISK_REWARD_LABEL_ALIGNMENT_DESCRIPTORS[2]!;
    const riskRewardStatsMode: UserDrawingRiskRewardStatsMode = USER_DRAWING_RISK_REWARD_STATS_MODES[1]!;
    const riskRewardStatsModeDescriptor: UserDrawingRiskRewardStatsModeDescriptor =
      USER_DRAWING_RISK_REWARD_STATS_MODE_DESCRIPTORS[1]!;
    const volumeProfileRowCount: UserDrawingVolumeProfileRowCount = USER_DRAWING_VOLUME_PROFILE_ROW_COUNTS[1]!;
    const volumeProfileRowCountDescriptor: UserDrawingVolumeProfileRowCountDescriptor =
      USER_DRAWING_VOLUME_PROFILE_ROW_COUNT_DESCRIPTORS[1]!;
    const volumeProfileValueAreaRatio: UserDrawingVolumeProfileValueAreaRatio =
      USER_DRAWING_VOLUME_PROFILE_VALUE_AREA_RATIOS[1]!;
    const volumeProfileValueAreaRatioDescriptor: UserDrawingVolumeProfileValueAreaRatioDescriptor =
      USER_DRAWING_VOLUME_PROFILE_VALUE_AREA_RATIO_DESCRIPTORS[1]!;
    const volumeProfileWidthRatio: UserDrawingVolumeProfileWidthRatio =
      USER_DRAWING_VOLUME_PROFILE_WIDTH_RATIOS[1]!;
    const volumeProfileWidthRatioDescriptor: UserDrawingVolumeProfileWidthRatioDescriptor =
      USER_DRAWING_VOLUME_PROFILE_WIDTH_RATIO_DESCRIPTORS[1]!;
    expect(fontSize).toBe(12);
    expect(fontFamily).toBe('sans-serif');
    expect(fontStyle).toBe('italic');
    expect(fontWeight).toBe('bold');
    expect(descriptor.fontFamily).toBe('sans-serif');
    expect(styleDescriptor.fontStyle).toBe('italic');
    expect(weightDescriptor.fontWeight).toBe('bold');
    expect(underlineDescriptor.textUnderline).toBe(true);
    expect(strikeDescriptor.textLineThrough).toBe(true);
    expect(unwrapDescriptor.textWrap).toBe(false);
    expect(wrapDescriptor.textWrap).toBe(true);
    expect(maxWidth).toBe(180);
    expect(maxWidthDescriptor.textMaxWidth).toBe(180);
    expect(barsPatternDisplayMode).toBe('line');
    expect(barsPatternDisplayModeDescriptor.displayMode).toBe('line');
    expect(barsPatternUpColorDescriptor.color).toBe('#38bdf8');
    expect(barsPatternDownColorDescriptor.color).toBe('#f97316');
    expect(measurementLabelAlignment).toBe('right');
    expect(measurementLabelAlignmentDescriptor.alignment).toBe('right');
    expect(measurementLabelPosition).toBe('top');
    expect(measurementLabelPositionDescriptor.position).toBe('top');
    expect(riskRewardLabelAlignment).toBe('right');
    expect(riskRewardLabelAlignmentDescriptor.alignment).toBe('right');
    expect(riskRewardStatsMode).toBe('compact');
    expect(riskRewardStatsModeDescriptor.statsMode).toBe('compact');
    expect(volumeProfileRowCount).toBe(24);
    expect(volumeProfileRowCountDescriptor.rowCount).toBe(24);
    expect(volumeProfileValueAreaRatio).toBe(0.7);
    expect(volumeProfileValueAreaRatioDescriptor.valueAreaRatio).toBe(0.7);
    expect(volumeProfileWidthRatio).toBe(0.5);
    expect(volumeProfileWidthRatioDescriptor.widthRatio).toBe(0.5);
    expect(normalizeUserDrawingFontFamily('serif')).toBe('serif');
    expect(normalizeUserDrawingFontStyle('oblique')).toBe('normal');
    expect(normalizeUserDrawingFontWeight('heavy')).toBe('normal');
    expect(normalizeUserDrawingTextMaxWidth(190)).toBe(180);
    expect(normalizeUserDrawingBarsPatternDisplayMode('future')).toBe('candles');
    expect(normalizeUserDrawingMeasurementLabelAlignment('future')).toBe('center');
    expect(normalizeUserDrawingMeasurementLabelPosition('future')).toBe('center');
    expect(normalizeUserDrawingRiskRewardLabelAlignment('future')).toBe('center');
    expect(normalizeUserDrawingRiskRewardStatsMode('future')).toBe('full');
    expect(normalizeUserDrawingVolumeProfileRowCount(24.4)).toBe(24);
    expect(normalizeUserDrawingVolumeProfileValueAreaRatio(1.5)).toBe(1);
    expect(normalizeUserDrawingVolumeProfileWidthRatio(-1)).toBe(0.05);
  });

  it('exports shared drawing text layout helpers', () => {
    const measureTextLabelLine: UserDrawingHitTestTextMeasure = (_drawing, line) => line.length;
    const layout: UserDrawingTextLabelLayout = resolveUserDrawingTextLabelLayout({
      text: 'A\nB',
      point: { x: 10, y: 10 },
      textAlign: 'center',
      lineWidths: [6, 6],
    });
    const measuredLine: UserDrawingMeasuredTextLine = measureUserDrawingTextLines('Alpha beta', (line) => line.length, 6)[0]!;

    expect(splitUserDrawingTextLines('A\nB')).toEqual(['A', 'B']);
    expect(measuredLine.text).toBe('Alpha');
    expect(measureTextLabelLine).toBeTypeOf('function');
    expect(resolveUserDrawingTextEditMetrics('A\nB').longestLineLength).toBe(1);
    expect(layout.lines).toHaveLength(2);
  });

  it('exports shared drawing price range helpers', () => {
    const metrics: UserDrawingPriceRangeMetrics = resolveUserDrawingPriceRangeMetrics(100, 125);
    const drawing: PriceRangeDrawing = {
      id: 'range',
      kind: 'priceRange',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 100 },
        { time: 2, price: 125 },
      ],
    };

    expect(metrics.label).toBe('+25.00 (+25.00%)');
    expect(resolveUserDrawingVisualPriceRangeMetrics({ time: 1, price: 125 }, { time: 2, price: 100 }).label).toBe(
      '+25.00 (+25.00%)',
    );
    expect(drawing.kind).toBe('priceRange');
  });

  it('exports shared drawing date range helpers', () => {
    const metrics: UserDrawingDateRangeMetrics = resolveUserDrawingDateRangeMetrics(
      { time: 0, price: 10 },
      { time: 60_000, price: 20 },
    );
    const drawing: DateRangeDrawing = {
      id: 'range',
      kind: 'dateRange',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 0, price: 10 },
        { time: 60_000, price: 20 },
      ],
    };

    expect(metrics.label).toBe('1 minute');
    expect(formatUserDrawingDateRangeBars(2)).toBe('2 bars');
    expect(drawing.kind).toBe('dateRange');
  });

  it('exports shared drawing date and price range types', () => {
    const drawing: DatePriceRangeDrawing = {
      id: 'date-price-range',
      kind: 'datePriceRange',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 0, price: 10 },
        { time: 60_000, price: 20 },
      ],
    };

    expect(drawing.kind).toBe('datePriceRange');
  });

  it('exports shared risk reward position helpers and types', () => {
    const metrics: UserDrawingRiskRewardMetrics = resolveUserDrawingRiskRewardMetrics(
      'longPosition',
      { time: 0, price: 100 },
      { time: 1, price: 110 },
      { time: 1, price: 95 },
    );
    const geometry: DrawingScreenRiskRewardPosition = resolveRiskRewardPositionFromAnchors(
      'longPosition',
      { time: 0, price: 100 },
      { time: 1, price: 110 },
      { time: 2, price: 95 },
      {
        viewport: { startTime: 0, endTime: 2, priceMin: 90, priceMax: 110 },
        pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 90, yMax: 110 },
        chartLeft: 0,
        chartRight: 200,
      },
    );
    const longDrawing: LongPositionDrawing = {
      id: 'long',
      kind: 'longPosition',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 0, price: 100 },
        { time: 1, price: 110 },
        { time: 2, price: 95 },
      ],
    };
    const shortDrawing: ShortPositionDrawing = { ...longDrawing, id: 'short', kind: 'shortPosition' };

    expect(metrics.ratioLabel).toBe('R:R 2.00');
    expect(geometry.entryLine.end.x).toBe(200);
    expect(longDrawing.kind).toBe('longPosition');
    expect(shortDrawing.kind).toBe('shortPosition');
  });

  it('exports shared bars pattern helpers and types', () => {
    const pattern: DrawingScreenBarsPattern = resolveBarsPatternFromAnchors(
      { time: 0, price: 100 },
      { time: 1, price: 100 },
      { time: 1, price: 101 },
      {
        viewport: { startTime: 0, endTime: 2, priceMin: 90, priceMax: 110 },
        pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 90, yMax: 110 },
        chartLeft: 0,
        chartRight: 200,
        bars: [
          { time: 0, open: 100, high: 104, low: 99, close: 102, volume: 1 },
          { time: 1, open: 102, high: 105, low: 101, close: 101, volume: 1 },
        ],
      },
    );
    const drawing: BarsPatternDrawing = {
      id: 'bars',
      kind: 'barsPattern',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 0, price: 100 },
        { time: 1, price: 100 },
        { time: 1, price: 101 },
      ],
      bars: [
        { time: 0, open: 100, high: 104, low: 99, close: 102 },
        { time: 1, open: 102, high: 105, low: 101, close: 101 },
      ],
    };

    expect(pattern.bars).toHaveLength(2);
    expect(pattern.bounds.width).toBeGreaterThan(0);
    expect(drawing.kind).toBe('barsPattern');
  });

  it('exports shared fixed range volume profile guide types', () => {
    const guideKind: DrawingScreenVolumeProfileGuideKind = 'pointOfControl';
    const guide: DrawingScreenVolumeProfileGuide = {
      kind: guideKind,
      price: 100,
      volume: 25,
      segment: { start: { x: 0, y: 10 }, end: { x: 100, y: 10 } },
    };
    const profile: DrawingScreenFixedRangeVolumeProfile = {
      bounds: { x: 0, y: 0, width: 100, height: 50 },
      bins: [],
      guides: [guide],
      maxVolume: 25,
      totalVolume: 25,
    };

    expect(profile.guides[0]).toMatchObject({ kind: 'pointOfControl', price: 100 });
  });

  it('exports shared table drawing and screen geometry types', () => {
    const drawing: TableDrawing = {
      id: 'table',
      kind: 'table',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      point: { time: 1, price: 100 },
      textAlign: 'left',
      cells: [['Metric', 'Value']],
    };
    const table: DrawingScreenTable = resolveTableFromAnchor(drawing.point, drawing.cells, {
      viewport: { startTime: 0, endTime: 2, priceMin: 90, priceMax: 110 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 90, yMax: 110 },
      chartLeft: 0,
      chartRight: 200,
    });

    expect(table.bounds).toMatchObject({ x: 100, y: 50, width: 118, height: 24 });
    expect(table.cells[0]?.text).toBe('Metric');

    const cells: UserDrawingTableCellsInput = [['Metric', 101.25]];
    const cell: UserDrawingTableCellInput = null;
    const row: UserDrawingTableRowInput = ['Price', 101.25];
    const column: UserDrawingTableColumnInput = ['Type', 'Spot'];
    const state = {
      version: 1 as const,
      drawings: [drawing],
      activeTool: 'select' as const,
      selection: { drawingId: 'table' },
      draft: null,
      textEdit: null,
    };

    expect(setUserDrawingTableCells(state, cells).drawings[0]).toMatchObject({ cells: [['Metric', '101.25']] });
    expect(setUserDrawingTableCell(state, 0, 1, cell).drawings[0]).toMatchObject({ cells: [['Metric', '']] });
    expect(setUserDrawingTableDimensions(state, 2, 2).drawings[0]).toMatchObject({
      cells: [
        ['Metric', 'Value'],
        ['', ''],
      ],
    });
    expect(insertUserDrawingTableRow(state, 1, row).drawings[0]).toMatchObject({
      cells: [
        ['Metric', 'Value'],
        ['Price', '101.25'],
      ],
    });
    expect(deleteUserDrawingTableRow(insertUserDrawingTableRow(state, 1, row), 0).drawings[0])
      .toMatchObject({ cells: [['Price', '101.25']] });
    expect(insertUserDrawingTableColumn(state, 1, column).drawings[0])
      .toMatchObject({ cells: [['Metric', 'Type', 'Value']] });
    expect(deleteUserDrawingTableColumn(insertUserDrawingTableColumn(state, 1, column), 1).drawings[0])
      .toMatchObject({ cells: [['Metric', 'Value']] });
  });

  it('exports shared drawing info line helpers', () => {
    const metrics: UserDrawingInfoLineMetrics = resolveUserDrawingInfoLineMetrics(
      { time: 0, price: 100 },
      { time: 60_000, price: 125 },
    );
    const drawing: InfoLineDrawing = {
      id: 'info',
      kind: 'infoLine',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 0, price: 100 },
        { time: 60_000, price: 125 },
      ],
    };

    expect(metrics.label).toBe('+25.00 (+25.00%) / 1 minute');
    expect(metrics.barCount).toBeNull();
    expect(drawing.kind).toBe('infoLine');
  });

  it('exports shared drawing arrow line types', () => {
    const drawing: ArrowLineDrawing = {
      id: 'arrow',
      kind: 'arrowLine',
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

    expect(drawing.kind).toBe('arrowLine');
  });

  it('exports shared drawing arrow marker types', () => {
    const drawing: ArrowMarkerDrawing = {
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
    };

    expect(drawing.kind).toBe('arrowMarker');
  });

  it('exports shared drawing arrow mark types', () => {
    const up: ArrowMarkUpDrawing = {
      id: 'up',
      kind: 'arrowMarkUp',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      point: { time: 1, price: 10 },
    };
    const down: ArrowMarkDownDrawing = {
      ...up,
      id: 'down',
      kind: 'arrowMarkDown',
    };

    expect(up.kind).toBe('arrowMarkUp');
    expect(down.kind).toBe('arrowMarkDown');
  });

  it('exports shared drawing circle types', () => {
    const drawing: CircleDrawing = {
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
    };

    expect(drawing.kind).toBe('circle');
    expect(
      resolveCircleFromAnchors(
        { time: 1_000, price: 100 },
        { time: 1_200, price: 104 },
        {
          viewport: {
            startTime: 1_000,
            endTime: 3_000,
            priceMin: 90,
            priceMax: 110,
          },
          pane: {
            id: 'main',
            top: 20,
            height: 100,
            bottom: 120,
            yMin: 90,
            yMax: 110,
          },
          chartLeft: 10,
          chartRight: 210,
        },
      ).radius,
    ).toBe(10);
  });

  it('exports shared drawing ellipse types', () => {
    const drawing: EllipseDrawing = {
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
    };

    expect(drawing.kind).toBe('ellipse');
    expect(
      resolveEllipseFromAnchors(
        { time: 1_000, price: 100 },
        { time: 1_200, price: 104 },
        {
          viewport: {
            startTime: 1_000,
            endTime: 3_000,
            priceMin: 90,
            priceMax: 110,
          },
          pane: {
            id: 'main',
            top: 20,
            height: 100,
            bottom: 120,
            yMin: 90,
            yMax: 110,
          },
          chartLeft: 10,
          chartRight: 210,
        },
      ),
    ).toMatchObject({ radiusX: 10, radiusY: 10 });
  });

  it('exports shared drawing extended line types', () => {
    const drawing: ExtendedLineDrawing = {
      id: 'extended',
      kind: 'extendedLine',
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

    expect(drawing.kind).toBe('extendedLine');
  });

  it('exports shared drawing trend angle types and helpers', () => {
    const drawing: TrendAngleDrawing = {
      id: 'angle',
      kind: 'trendAngle',
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

    expect(drawing.kind).toBe('trendAngle');
    expect(formatTrendAngleDegrees(26.565)).toBe('26.6°');
  });

  it('exports shared drawing path types', () => {
    const drawing: PathDrawing = {
      id: 'path',
      kind: 'path',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    };
    const brush: BrushDrawing = {
      ...drawing,
      id: 'brush',
      kind: 'brush',
    };
    const highlighter: HighlighterDrawing = {
      ...drawing,
      id: 'highlighter',
      kind: 'highlighter',
    };
    const note: NoteDrawing = {
      ...drawing,
      id: 'note',
      kind: 'note',
      point: drawing.points[0]!,
      text: 'Note',
      textAlign: 'center',
    };
    const callout: CalloutDrawing = {
      ...drawing,
      id: 'callout',
      kind: 'callout',
      points: [drawing.points[0]!, drawing.points[1]!],
      text: 'Callout',
      textAlign: 'center',
    };
    const comment: CommentDrawing = {
      ...drawing,
      id: 'comment',
      kind: 'comment',
      point: drawing.points[0]!,
      text: 'Comment',
      textAlign: 'center',
    };
    const priceNote: PriceNoteDrawing = {
      ...drawing,
      id: 'price-note',
      kind: 'priceNote',
      points: [drawing.points[0]!, drawing.points[1]!],
      text: 'Price note',
      textAlign: 'center',
    };
    const pin: PinDrawing = {
      ...drawing,
      id: 'pin',
      kind: 'pin',
      point: drawing.points[0]!,
    };
    const icon: IconDrawing = {
      ...drawing,
      id: 'icon',
      kind: 'icon',
      point: drawing.points[0]!,
      iconName: 'star',
    };
    const balloon: BalloonDrawing = {
      ...drawing,
      id: 'balloon',
      kind: 'balloon',
      point: drawing.points[0]!,
      text: 'Balloon',
      textAlign: 'center',
    };

    expect(drawing.kind).toBe('path');
    expect(brush.kind).toBe('brush');
    expect(highlighter.kind).toBe('highlighter');
    expect(note.kind).toBe('note');
    expect(callout.kind).toBe('callout');
    expect(comment.kind).toBe('comment');
    expect(priceNote.kind).toBe('priceNote');
    expect(pin.kind).toBe('pin');
    expect(icon.kind).toBe('icon');
    expect(balloon.kind).toBe('balloon');
  });

  it('exports shared drawing curve types and resolver', () => {
    const drawing: CurveDrawing = {
      id: 'curve',
      kind: 'curve',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 10 },
      ],
    };
    const curve = resolveCurveFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], {
      viewport: { startTime: 1, endTime: 3, priceMin: 8, priceMax: 12 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 8, yMax: 12 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('curve');
    expect(curve.control).toEqual({ x: 50, y: 0 });
    expect(curve.points).toHaveLength(49);
  });

  it('exports shared drawing arc types and resolver', () => {
    const drawing: ArcDrawing = {
      id: 'arc',
      kind: 'arc',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 10 },
      ],
    };
    const arc = resolveArcFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], {
      viewport: { startTime: 1, endTime: 3, priceMin: 8, priceMax: 12 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 8, yMax: 12 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('arc');
    expect(arc.through).toEqual({ x: 50, y: 0 });
    expect(arc.points).toHaveLength(97);
  });

  it('exports shared drawing triangle types', () => {
    const drawing: TriangleDrawing = {
      id: 'triangle',
      kind: 'triangle',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    };

    expect(drawing.kind).toBe('triangle');
  });

  it('exports shared drawing parallel channel types', () => {
    const drawing: ParallelChannelDrawing = {
      id: 'channel',
      kind: 'parallelChannel',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    };

    expect(drawing.kind).toBe('parallelChannel');
  });

  it('exports shared drawing pitchfork types', () => {
    const kind: PitchforkDrawingKind = 'modifiedSchiffPitchfork';
    const variant: DrawingPitchforkVariant = 'modifiedSchiff';
    const drawing: PitchforkDrawing = {
      id: 'pitchfork',
      kind,
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    };

    expect(variant).toBe('modifiedSchiff');
    expect(drawing.kind).toBe('modifiedSchiffPitchfork');
  });

  it('exports shared drawing pitchfan types', () => {
    const drawing: PitchfanDrawing = {
      id: 'pitchfan',
      kind: 'pitchfan',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    };

    expect(drawing.kind).toBe('pitchfan');
  });

  it('exports shared drawing fib fan types and resolver', () => {
    const drawing: FibFanDrawing = {
      id: 'fib-fan',
      kind: 'fibFan',
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
    const fan = resolveFibFanFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('fibFan');
    expect(fan.rays).toHaveLength(7);
  });

  it('exports shared drawing fib speed resistance fan types and resolver', () => {
    const drawing: FibSpeedResistanceFanDrawing = {
      id: 'fib-speed-fan',
      kind: 'fibSpeedResistanceFan',
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
    const fan = resolveFibSpeedResistanceFanFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('fibSpeedResistanceFan');
    expect(fan.rays.map((ray) => ray.ratio)).toEqual([1 / 3, 2 / 3, 1]);
  });

  it('exports shared drawing fib speed resistance arc types and resolver', () => {
    const drawing: FibSpeedResistanceArcsDrawing = {
      id: 'fib-speed-arcs',
      kind: 'fibSpeedResistanceArcs',
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
    const arcs = resolveFibSpeedResistanceArcsFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('fibSpeedResistanceArcs');
    expect(arcs.arcs.map((arc) => arc.ratio)).toEqual([1 / 3, 2 / 3, 1]);
    expect(arcs.arcs[0]).toMatchObject({
      label: '0.333',
      labelPoint: { x: expect.any(Number), y: expect.any(Number) },
    });
  });

  it('exports shared drawing fib circle types and resolver', () => {
    const drawing: FibCirclesDrawing = {
      id: 'fib-circles',
      kind: 'fibCircles',
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
    const circles = resolveFibCirclesFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('fibCircles');
    expect(circles.circles.map((circle) => circle.ratio)).toEqual([0.236, 0.382, 0.5, 0.618, 1, 1.618, 2.618]);
    expect(circles.circles[4]).toMatchObject({
      label: '1',
      labelPoint: { x: expect.any(Number), y: expect.any(Number) },
    });
  });

  it('exports shared drawing fib wedge types and resolver', () => {
    const drawing: FibWedgeDrawing = {
      id: 'fib-wedge',
      kind: 'fibWedge',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 10 },
        { time: 2, price: 12 },
      ],
    };
    const wedge = resolveFibWedgeFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('fibWedge');
    expect(wedge.arcs.map((arc) => arc.ratio)).toEqual([0.236, 0.382, 0.5, 0.618, 1, 1.618, 2.618]);
  });

  it('exports shared drawing fib spiral types and resolver', () => {
    const drawing: FibSpiralDrawing = {
      id: 'fib-spiral',
      kind: 'fibSpiral',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 10 },
      ],
    };
    const spiral = resolveFibSpiralFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('fibSpiral');
    expect(spiral.points[0]).toEqual({ x: 100, y: 50 });
    expect(spiral.points.length).toBeGreaterThan(100);
  });

  it('exports shared drawing gann fan types and resolver', () => {
    const drawing: GannFanDrawing = {
      id: 'gann-fan',
      kind: 'gannFan',
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
    const fan = resolveGannFanFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('gannFan');
    expect(fan.rays).toHaveLength(9);
  });

  it('exports shared drawing gann box types and resolver', () => {
    const drawing: GannBoxDrawing = {
      id: 'gann-box',
      kind: 'gannBox',
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
    const box = resolveGannBoxFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('gannBox');
    expect(box.levels).toHaveLength(9);
    expect(box.angles).toHaveLength(6);
  });

  it('exports shared drawing gann square types and resolver', () => {
    const drawing: GannSquareDrawing = {
      id: 'gann-square',
      kind: 'gannSquare',
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
    const square = resolveGannSquareFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('gannSquare');
    expect(square.rect.width).toBe(square.rect.height);
    expect(square.levels).toHaveLength(9);
    expect(square.angles).toHaveLength(6);
  });

  it('exports shared drawing fixed gann square types and resolver', () => {
    const drawing: GannSquareFixedDrawing = {
      id: 'gann-square-fixed',
      kind: 'gannSquareFixed',
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
    const square = resolveGannSquareFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('gannSquareFixed');
    expect(square.rect.width).toBe(square.rect.height);
    expect(square.levels).toHaveLength(9);
    expect(square.angles).toHaveLength(6);
  });

  it('exports shared drawing fib channel types and resolver', () => {
    const drawing: FibChannelDrawing = {
      id: 'fib-channel',
      kind: 'fibChannel',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 10 },
        { time: 1, price: 12 },
      ],
    };
    const channel = resolveFibChannelFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('fibChannel');
    expect(channel.levels).toHaveLength(11);
  });

  it('exports shared drawing fib time zone types and resolver', () => {
    const drawing: FibTimeZoneDrawing = {
      id: 'fib-time-zone',
      kind: 'fibTimeZone',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 10 },
      ],
    };
    const zones = resolveFibTimeZoneFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('fibTimeZone');
    expect(zones.levels).toHaveLength(10);
  });

  it('exports shared drawing cyclic line types and resolver', () => {
    const drawing: CyclicLinesDrawing = {
      id: 'cyclic-lines',
      kind: 'cyclicLines',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 10 },
      ],
    };
    const lines = resolveCyclicLinesFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('cyclicLines');
    expect(lines.levels).toEqual(
      expect.arrayContaining([
        {
          ratio: 0,
          label: '0',
          time: 1,
          x: 50,
          segment: { start: { x: 50, y: 0 }, end: { x: 50, y: 100 } },
          labelPoint: { x: 50, y: 96 },
        },
        {
          ratio: 1,
          label: '1',
          time: 2,
          x: 100,
          segment: { start: { x: 100, y: 0 }, end: { x: 100, y: 100 } },
          labelPoint: { x: 100, y: 96 },
        },
      ]),
    );
  });

  it('exports shared drawing time cycle types and resolver', () => {
    const drawing: TimeCyclesDrawing = {
      id: 'time-cycles',
      kind: 'timeCycles',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 20 },
      ],
    };
    const cycles = resolveTimeCyclesFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('timeCycles');
    expect(cycles.cycles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ratio: 0,
          startTime: 1,
          endTime: 2,
          points: expect.arrayContaining([{ x: 75, y: 0 }]),
        }),
      ]),
    );
  });

  it('exports shared drawing sine line types and resolver', () => {
    const drawing: SineLineDrawing = {
      id: 'sine-line',
      kind: 'sineLine',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 20 },
      ],
    };
    const sineLine = resolveSineLineFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('sineLine');
    expect(sineLine.points).toEqual(
      expect.arrayContaining([
        { x: 50, y: 50 },
        { x: 100, y: 0 },
      ]),
    );
  });

  it('exports shared drawing forecast types and resolver', () => {
    const drawing: ForecastDrawing = {
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
        { time: 2, price: 20 },
      ],
    };
    const forecast = resolveForecastFromAnchors(drawing.points[0], drawing.points[1], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('forecast');
    expect(forecast).toMatchObject({
      source: { x: 50, y: 50 },
      target: { x: 100, y: 0 },
      sourceLabel: 'Source 10.00',
      targetLabel: 'Target 20.00',
      changeLabel: '+10.00 (+100.00%) / 1 ms',
    });
  });

  it('exports shared drawing projection types and resolver', () => {
    const drawing: ProjectionDrawing = {
      id: 'projection',
      kind: 'projection',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 15 },
        { time: 3, price: 20 },
      ],
    };
    const projection = resolveProjectionFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], {
      viewport: { startTime: 0, endTime: 3, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 150,
    });

    expect(drawing.kind).toBe('projection');
    expect(projection).toMatchObject({
      start: { x: 50, y: 50 },
      pivot: { x: 100, y: 25 },
      target: { x: 150, y: 0 },
      startLabel: 'Start 10.00',
      pivotLabel: 'Pivot 15.00',
      targetLabel: 'Target 20.00',
      changeLabel: '+5.00 (+33.33%) / 1 ms',
    });
  });

  it('exports shared drawing sector types and resolver', () => {
    const drawing: SectorDrawing = {
      id: 'sector',
      kind: 'sector',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 3, price: 10 },
        { time: 3, price: 20 },
      ],
    };
    const sector = resolveSectorFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], {
      viewport: { startTime: 0, endTime: 3, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 150,
    });

    expect(drawing.kind).toBe('sector');
    expect(sector).toMatchObject({
      origin: { x: 50, y: 50 },
      future: { x: 150, y: 50 },
      radius: 100,
    });
    expect(sector.polygon.points[0]).toEqual({ x: 50, y: 50 });
  });

  it('exports shared drawing trend-based fib time types and resolver', () => {
    const drawing: TrendBasedFibTimeDrawing = {
      id: 'trend-fib-time',
      kind: 'trendBasedFibTime',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 10 },
        { time: 3, price: 12 },
      ],
    };
    const zones = resolveTrendBasedFibTimeFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], {
      viewport: { startTime: 0, endTime: 2, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 100,
    });

    expect(drawing.kind).toBe('trendBasedFibTime');
    expect(zones.levels[0]).toMatchObject({ ratio: 0, time: 3 });
  });

  it('exports shared drawing regression trend types', () => {
    const drawing: RegressionTrendDrawing = {
      id: 'regression',
      kind: 'regressionTrend',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    };

    expect(drawing.kind).toBe('regressionTrend');
  });

  it('exports shared drawing flat top and bottom types', () => {
    const drawing: FlatTopBottomDrawing = {
      id: 'flat',
      kind: 'flatTopBottom',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    };

    expect(drawing.kind).toBe('flatTopBottom');
  });

  it('exports shared drawing rotated rectangle types', () => {
    const drawing: RotatedRectangleDrawing = {
      id: 'rotated',
      kind: 'rotatedRectangle',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
      ],
    };

    expect(drawing.kind).toBe('rotatedRectangle');
  });

  it('exports shared drawing disjoint channel types', () => {
    const drawing: DisjointChannelDrawing = {
      id: 'disjoint',
      kind: 'disjointChannel',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      points: [
        { time: 1, price: 10 },
        { time: 2, price: 12 },
        { time: 3, price: 11 },
        { time: 4, price: 9 },
      ],
    };

    expect(drawing.kind).toBe('disjointChannel');
  });

  it('exports shared drawing anchored VWAP types', () => {
    const drawing: AnchoredVwapDrawing = {
      id: 'vwap',
      kind: 'anchoredVwap',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      point: { time: 1, price: 10 },
    };

    expect(drawing.kind).toBe('anchoredVwap');
  });

  it('exports shared drawing anchored volume profile types and resolver', () => {
    const drawing: AnchoredVolumeProfileDrawing = {
      id: 'anchored-volume-profile',
      kind: 'anchoredVolumeProfile',
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
      point: { time: 1, price: 10 },
    };
    const profile = resolveAnchoredVolumeProfileFromAnchor(drawing.point, {
      viewport: { startTime: 0, endTime: 3, priceMin: 0, priceMax: 20 },
      pane: { id: 'main', top: 0, height: 100, bottom: 100, yMin: 0, yMax: 20 },
      chartLeft: 0,
      chartRight: 150,
      bars: [
        { time: 1, open: 10, high: 12, low: 8, close: 11, volume: 20 },
        { time: 2, open: 12, high: 16, low: 10, close: 14, volume: 10 },
      ],
    });

    expect(drawing.kind).toBe('anchoredVolumeProfile');
    expect(profile).toMatchObject({
      bounds: { x: 50, y: 20, width: 100, height: 40 },
      maxVolume: 20,
      totalVolume: 30,
    });
  });
});
