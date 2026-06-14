// 📱 MOBILE-PATCHED FILE
// This file has been customized for mobile and will NOT be overwritten by yarn sync.
// Mobile equivalent of TealchartWidget - accepts datafeed and handles all internal logic.

/**
 * SkiaTealchart - React Native Skia implementation of Tealchart
 *
 * Mobile equivalent of TealchartWidget on web:
 * - Accepts datafeed, symbol, interval (like TealchartWidget)
 * - Handles bar fetching, indicators, pane management internally
 * - Renders using Skia instead of canvas
 *
 * Architecture:
 * - Layer 1: Skia Canvas (static) - candles, grid, indicators via Picture recording
 * - Layer 2: Interactive RN Layer - order lines, position lines, crosshair
 * - Layer 3: Base Gesture Layer - pan, pinch, axis scaling with zone detection
 */

import type { WorkerError } from '@tealstreet/tealscript';
import type { IIndicatorManager } from './core/ChartWidgetCore';
import type {
  DrawingCoordinateSpace,
  UpdateUserDrawingOptions,
  UserDrawingClipboard,
  UserDrawingCommandEvent,
  UserDrawingObjectTreeDispatchAction,
  UserDrawingObjectTreeModel,
  UserDrawingObjectTreeOptions,
  UserDrawingPropertiesIntent,
  UserDrawingPropertiesSurface,
  UserDrawingPropertiesSurfaceCommand,
  ResolveUserDrawingPropertiesSurfaceCommandOptions,
  UserDrawingCommandHistory,
  UserDrawingEditDrag,
  UserDrawing,
  UserDrawingAnchor,
  UserDrawingFontFamily,
  UserDrawingHandleRole,
  UserDrawingIconName,
  UserDrawingImageSourceInput,
  UserDrawingInputPoint,
  UserDrawingKeyboardInput,
  UserDrawingLineStyle,
  UserDrawingState,
  UserDrawingStyle,
  UserDrawingTableCellInput,
  UserDrawingTableCellsInput,
  UserDrawingTableColumnInput,
  UserDrawingTableRowInput,
  UserDrawingTextAlign,
  UserDrawingTextAnnotation,
  UserDrawingTrendLineExtend,
  UserDrawingTool,
  UserDrawingZOrderAction,
} from './drawings';
import type { BuiltinIndicator } from './indicators/builtinIndicators';
import type { IndicatorSettingsData } from './mobile/components/IndicatorSettingsModalMobile';
import type { LabelBounds } from './mobile/hooks/useLabelCollision';
import type { MobileTealscriptIndicatorOptions } from './mobile/MobileIndicatorManager';
import type {
  MobileUserDrawingImagePrimitive,
  MobileUserDrawingTextBoxPrimitive,
} from './mobile/utils/drawingRenderModel';
import type { PlotStyleOverride } from './state/chartState';
import type { ChartThemeInput } from './theme';
import type {
  ChartMargins,
  ContextMenuItem,
  IBasicDataFeed,
  OrderLineRenderData,
  PositionLineRenderData,
  PriceLine,
  RenderOptions,
  Viewport,
} from './types';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import {
  Canvas,
  Circle,
  createPicture,
  DashPathEffect,
  Group,
  Oval,
  Picture,
  Rect,
  Skia,
  Image as SkiaImage,
  Line as SkiaLine,
  Path as SkiaPath,
  Text as SkiaText,
  useFont,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import { LayoutChangeEvent, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { LOADING_OPACITY } from './constants';
import { useTealchartCore } from './core/useTealchartCore';
import {
  canRedoUserDrawingCommand as canRedoUserDrawingCommandHistory,
  canUndoUserDrawingCommand as canUndoUserDrawingCommandHistory,
  clearUserDrawingCommandHistory,
  createUserDrawingClipboard,
  createUserDrawingCommandHistory,
  createUserDrawingCommandEvent,
  createUserDrawingHistoryCommandEvent,
  createUserDrawingState,
  dispatchUserDrawingCommand,
  DEFAULT_USER_DRAWING_TEXT_LABEL_PADDING,
  isUserDrawingDragPlacementTool,
  isUserDrawingPathFamilyTool,
  measureUserDrawingTextLines,
  normalizeUserDrawingFontFamily,
  normalizeUserDrawingFontSize,
  redoUserDrawingCommand as redoUserDrawingCommandHistory,
  resolveUserDrawingContextActionsAtPoint,
  resolveUserDrawingObjectTreeDispatchActionCommands,
  resolveUserDrawingObjectTreeModel,
  resolveUserDrawingPropertiesIntent,
  resolveUserDrawingPropertiesSurface,
  resolveUserDrawingPropertiesSurfaceCommand,
  resolveUserDrawingSelectedActionSurface,
  resolveUserDrawingSelectionActionAnchor,
  resolveUserDrawingPlacementConstraint,
  resolveUserDrawingTextEditMetrics,
  undoUserDrawingCommand as undoUserDrawingCommandHistory,
  USER_DRAWING_FONT_FAMILIES,
} from './drawings';
import { computePaneGeometry } from './layout/chartGeometry';
import { ChartTopBarComponent } from './mobile/components/ChartTopBarComponent';
import { ContextMenuComponent } from './mobile/components/ContextMenuComponent';
import { CrosshairComponent } from './mobile/components/CrosshairComponent';
import { IndicatorSettingsModalMobile } from './mobile/components/IndicatorSettingsModalMobile';
import { IndicatorsModalMobile } from './mobile/components/IndicatorsModalMobile';
import { OrderLineComponent } from './mobile/components/OrderLineComponent';
import { PositionLineComponent } from './mobile/components/PositionLineComponent';
import { UserDrawingSelectedActionSurfaceComponent } from './mobile/components/UserDrawingSelectedActionSurface';
import { useChartGestures } from './mobile/hooks/useChartGestures';
import { useLabelCollision } from './mobile/hooks/useLabelCollision';
import { MobileIndicatorManager } from './mobile/MobileIndicatorManager';
import { priceToY, xToTime, yToPrice } from './mobile/utils/coordinates';
import { resolveMobileUserDrawingFontFamily } from './mobile/utils/drawingFonts';
import {
  isMobileChartGestureLayerEnabled,
  isMobileCrosshairPanGestureEnabled,
} from './mobile/utils/drawingGestureMode';
import {
  resolveMobileUserDrawingDuplicateEditDragEnabled,
  resolveMobileUserDrawingInputPoint,
  resolveMobileUserDrawingPlacementConstraintEnabled,
} from './mobile/utils/drawingInput';
import { resolveMobileUserDrawingDoubleTapEditIntent } from './mobile/utils/drawingEditIntent';
import {
  exportMobileUserDrawingStateForLayout,
  importMobileUserDrawingStateFromLayout,
  replaceMobileUserDrawingState,
} from './mobile/utils/drawingPersistence';
import {
  isMobileUserDrawingTextBoxPrimitive,
  resolveMobileUserDrawingBalloonLayout,
  resolveMobileUserDrawingInfoLineLabelPosition,
  resolveMobileUserDrawingMeasurementLabelPosition,
  resolveMobileUserDrawingPriceRangeLabelPosition,
  resolveMobileUserDrawingRenderModel,
  resolveMobileUserDrawingRiskRewardLabelPosition,
  resolveMobileUserDrawingTextLabelLayout,
  resolveMobileUserDrawingTrendAngleLabelPosition,
} from './mobile/utils/drawingRenderModel';
import {
  dispatchMobileUserDrawingHistoryCommand,
  dispatchMobileUserDrawingKeyboardAction as dispatchMobileUserDrawingKeyboardActionToState,
} from './mobile/utils/drawingCommands';
import { dispatchMobileUserDrawingActionCommand } from './mobile/utils/drawingActionDispatch';
import { CollectedTextItem, SkiaCanvasContext } from './rendering/SkiaCanvasContext';
import { TealchartRenderer } from './TealchartRenderer';
import { mergeChartThemeRenderOptions } from './theme';
import { DEFAULT_MARGINS, DEFAULT_RENDER_OPTIONS } from './types';
import { buildLastTradePriceLine } from './utils/buildLastTradePriceLine';
import { safeToFixed } from './utils/safeNumber';
import { ViewportController } from './viewport/ViewportController';
import { intervalToMs } from './viewport/viewScale';

const RESET_BUTTON_HIDE_DELAY_MS = 5000;
const RESET_BUTTON_FADE_MS = 220;
const RESET_BUTTON_REVEAL_THROTTLE_MS = 250;

type UserDrawingTextDecorationLine = 'none' | 'underline' | 'line-through' | 'underline line-through';

function resolveUserDrawingTextDecorationLine(style: UserDrawingStyle): UserDrawingTextDecorationLine {
  if (style.textUnderline && style.textLineThrough) return 'underline line-through';
  if (style.textUnderline) return 'underline';
  if (style.textLineThrough) return 'line-through';
  return 'none';
}

function dashIntervalsForUserDrawingLineStyle(lineStyle: UserDrawingLineStyle): number[] | null {
  switch (lineStyle) {
    case 'dashed':
      return [6, 4];
    case 'dotted':
      return [2, 4];
    case 'solid':
      return null;
  }
}

function LoadedUserDrawingSkiaImage({ primitive }: { primitive: MobileUserDrawingImagePrimitive }) {
  const image = useImage(primitive.src || null);
  if (!image) return null;

  return (
    <SkiaImage
      image={image}
      x={primitive.rect.x}
      y={primitive.rect.y}
      width={primitive.rect.width}
      height={primitive.rect.height}
      fit="fill"
    />
  );
}

function UserDrawingSkiaText({
  x,
  y,
  text,
  font,
  color,
  style,
  underlineWidth,
  fontSize,
}: {
  x: number;
  y: number;
  text: string;
  font: ReturnType<typeof Skia.Font>;
  color: string;
  style: UserDrawingStyle;
  underlineWidth?: number;
  fontSize?: number;
}) {
  const decorationWidth = underlineWidth ?? font.measureText(text).width;
  const resolvedFontSize = fontSize ?? 12;
  const content = (
    <>
      <SkiaText x={x} y={y} text={text} font={font} color={color} />
      {style.fontWeight === 'bold' && <SkiaText x={x + 0.45} y={y} text={text} font={font} color={color} />}
      {style.textUnderline && (
        <SkiaLine
          p1={vec(x, y + resolvedFontSize * 0.18)}
          p2={vec(x + decorationWidth, y + resolvedFontSize * 0.18)}
          color={color}
          strokeWidth={Math.max(1, resolvedFontSize / 14)}
        />
      )}
      {style.textLineThrough && (
        <SkiaLine
          p1={vec(x, y - resolvedFontSize * 0.32)}
          p2={vec(x + decorationWidth, y - resolvedFontSize * 0.32)}
          color={color}
          strokeWidth={Math.max(1, resolvedFontSize / 14)}
        />
      )}
    </>
  );
  if (style.fontStyle !== 'italic') return content;
  return (
    <Group origin={{ x, y }} transform={[{ skewX: -0.16 }]}>
      {content}
    </Group>
  );
}

export type SkiaTealscriptIndicatorOptions = MobileTealscriptIndicatorOptions;

export interface SkiaTealchartHandle {
  addTealscriptIndicator(options: SkiaTealscriptIndicatorOptions): string | null;
  removeTealscriptIndicator(instanceId: string): void;
  changeTheme(theme: ChartThemeInput): void;
  getUserDrawingState(): UserDrawingState;
  exportUserDrawingStateForLayout(): UserDrawingState | undefined;
  importUserDrawingStateFromLayout(state?: UserDrawingState | null): void;
  setUserDrawingState(state: UserDrawingState): void;
  setActiveUserDrawingTool(tool: UserDrawingTool): void;
  canUndoUserDrawingCommand(): boolean;
  canRedoUserDrawingCommand(): boolean;
  undoUserDrawingCommand(): boolean;
  redoUserDrawingCommand(): boolean;
  dispatchUserDrawingKeyboardAction(input: UserDrawingKeyboardInput): boolean;
  selectUserDrawing(drawingId: string | null, handle?: UserDrawingHandleRole): void;
  selectUserDrawings(drawingIds: readonly string[]): void;
  addUserDrawing(drawing: UserDrawing, options?: { select?: boolean }): boolean;
  deleteUserDrawing(drawingId?: string): boolean;
  deleteSelectedUserDrawing(): boolean;
  duplicateUserDrawing(drawingId?: string): boolean;
  duplicateSelectedUserDrawing(): boolean;
  beginDuplicateUserDrawingDragAtPoint(point: DrawingScreenPoint): boolean;
  setUserDrawingDuplicateEditDrag(duplicate: boolean): void;
  clearUserDrawingDuplicateEditDrag(): void;
  isUserDrawingDuplicateEditDragEnabled(): boolean;
  setUserDrawingPlacementConstraint(constrained: boolean): void;
  clearUserDrawingPlacementConstraint(): void;
  isUserDrawingPlacementConstrained(): boolean;
  copySelectedUserDrawing(): boolean;
  pasteUserDrawingClipboard(): boolean;
  clearUserDrawingClipboard(): void;
  clearUserDrawings(): void;
  cancelUserDrawingDraft(): void;
  beginUserDrawingTextEdit(drawingId?: string): boolean;
  updateUserDrawingTextEdit(value: string): boolean;
  commitUserDrawingTextEdit(): boolean;
  cancelUserDrawingTextEdit(): boolean;
  setUserDrawingText(drawingId: string, text: string): boolean;
  setUserDrawingTextContent(text: string, options?: UpdateUserDrawingOptions): boolean;
  setUserDrawingName(drawingId: string, name: string | null, options?: UpdateUserDrawingOptions): boolean;
  setUserDrawingImageSource(source: UserDrawingImageSourceInput, options?: UpdateUserDrawingOptions): boolean;
  setUserDrawingTableCells(cells: UserDrawingTableCellsInput, options?: UpdateUserDrawingOptions): boolean;
  setUserDrawingTableCell(
    row: number,
    column: number,
    value: UserDrawingTableCellInput,
    options?: UpdateUserDrawingOptions,
  ): boolean;
  setUserDrawingTableDimensions(rows: number, columns: number, options?: UpdateUserDrawingOptions): boolean;
  insertUserDrawingTableRow(
    row: number,
    values?: UserDrawingTableRowInput,
    options?: UpdateUserDrawingOptions,
  ): boolean;
  deleteUserDrawingTableRow(row: number, options?: UpdateUserDrawingOptions): boolean;
  insertUserDrawingTableColumn(
    column: number,
    values?: UserDrawingTableColumnInput,
    options?: UpdateUserDrawingOptions,
  ): boolean;
  deleteUserDrawingTableColumn(column: number, options?: UpdateUserDrawingOptions): boolean;
  updateUserDrawingStyle(style: Partial<UserDrawingStyle>, options?: UpdateUserDrawingOptions): boolean;
  setUserDrawingTextAlign(textAlign: UserDrawingTextAlign, options?: UpdateUserDrawingOptions): boolean;
  setUserDrawingTrendLineExtend(extend: UserDrawingTrendLineExtend, options?: UpdateUserDrawingOptions): boolean;
  setUserDrawingIconName(iconName: UserDrawingIconName, options?: UpdateUserDrawingOptions): boolean;
  setUserDrawingVisibility(visible: boolean, options?: UpdateUserDrawingOptions): boolean;
  setUserDrawingLocked(locked: boolean, options?: UpdateUserDrawingOptions): boolean;
  reorderUserDrawings(action: UserDrawingZOrderAction, options?: UpdateUserDrawingOptions): boolean;
  bringUserDrawingForward(options?: UpdateUserDrawingOptions): boolean;
  sendUserDrawingBackward(options?: UpdateUserDrawingOptions): boolean;
  bringUserDrawingToFront(options?: UpdateUserDrawingOptions): boolean;
  sendUserDrawingToBack(options?: UpdateUserDrawingOptions): boolean;
  getUserDrawingObjectTreeModel(options?: UserDrawingObjectTreeOptions): UserDrawingObjectTreeModel;
  openUserDrawingObjectTree(options?: UserDrawingObjectTreeOptions): UserDrawingObjectTreeModel;
  dispatchUserDrawingObjectTreeAction(action: UserDrawingObjectTreeDispatchAction): boolean;
  getUserDrawingPropertiesIntent(drawingId?: string): UserDrawingPropertiesIntent | null;
  getUserDrawingPropertiesSurface(drawingId?: string): UserDrawingPropertiesSurface;
  dispatchUserDrawingPropertiesSurfaceCommand(
    command: UserDrawingPropertiesSurfaceCommand,
    options?: ResolveUserDrawingPropertiesSurfaceCommandOptions,
  ): boolean;
  openUserDrawingProperties(drawingId?: string): UserDrawingPropertiesIntent | null;
}

export interface SkiaTealchartProps {
  /** Datafeed for fetching bars - widget handles bar fetching internally (REQUIRED) */
  datafeed: IBasicDataFeed;
  /** Symbol to display (e.g., "BTC/USDT") */
  symbol: string;
  /** Timeframe interval (e.g., "15", "1h") */
  interval?: string;

  // ===========================================================================
  // Layout & Rendering
  // ===========================================================================
  width?: number;
  height?: number;
  /** Render options for colors and styling */
  renderOptions?: Partial<Omit<RenderOptions, 'width' | 'height' | 'devicePixelRatio'>>;
  /** Built-in or custom chart theme. Explicit renderOptions override theme values. */
  theme?: ChartThemeInput;
  /** Custom margins to override defaults */
  margins?: Partial<ChartMargins>;
  /** Price lines to render (last trade, orders, positions, etc.) */
  priceLines?: PriceLine[];
  /** Order lines to render (limit orders, stops, etc.) */
  orderLines?: OrderLineRenderData[];
  /** Position lines to render (open positions with PnL) */
  positionLines?: PositionLineRenderData[];
  /** Map from plotId to style overrides */
  plotStyleOverrides?: Map<string, PlotStyleOverride>;
  /** Called when viewport changes */
  onViewportChange?: (viewport: Viewport) => void;
  /** Context menu callback */
  onContextMenu?: (unixTime: number, price: number) => ContextMenuItem[];
  /** Called when crosshair position changes */
  onCrossHairMoved?: (price: number, time: number) => void;
  /** Initial user drawing state; later prop changes replace the chart's local drawing state. */
  userDrawingState?: UserDrawingState;
  /** Called when the chart updates user drawing state through input or its public API. */
  onUserDrawingStateChange?: (state: UserDrawingState) => void;
  /**
   * Called after a user drawing command changes state. Direct state replacement and layout import emit
   * a non-undoable `replaceState` command event when the committed drawing layout changes.
   */
  onUserDrawingCommand?: (event: UserDrawingCommandEvent) => void;
  /** Called when app or handle code asks to open the user drawing object tree. */
  onUserDrawingObjectTreeOpen?: (model: UserDrawingObjectTreeModel) => void;
  /** Called when app or handle code asks to open selected drawing properties. */
  onUserDrawingPropertiesOpen?: (intent: UserDrawingPropertiesIntent) => void;
  /** Constrain two-anchor drawing placement drags to square or 45-degree geometry for touch toolbars. */
  constrainUserDrawingPlacement?: boolean;
  /** Duplicate the selected drawing whenever a touch edit drag starts; host toolbars can expose this as a held modifier mode. */
  duplicateUserDrawingOnEditDrag?: boolean;
  /** Called when gesture blocks/unblocks parent scroll */
  onSwipeBlockChange?: (blocked: boolean) => void;
  /** Called when order price is changed via drag */
  onOrderMove?: (orderId: string, newPrice: number) => void;
  /** Called when order is cancelled */
  onOrderCancel?: (orderId: string) => void;
  /** Called when position is closed */
  onPositionClose?: (positionId: string) => void;
  /** Called when position is reversed */
  onPositionReverse?: (positionId: string) => void;
  /** Price precision for display */
  pricePrecision?: number;
  // ===========================================================================
  // Top Bar Props
  // ===========================================================================
  /** Whether to show the top bar (default: true) */
  showTopBar?: boolean;
  /** Exchange name (e.g., "Binance") */
  exchangeName?: string;
  /** Called when timeframe changes */
  onIntervalChange?: (interval: string) => void;
  /** Called when symbol changes */
  onSymbolChange?: (symbol: string) => void;
  // ===========================================================================
  // Indicator Props
  // ===========================================================================
  /** Called when an indicator is selected from the modal */
  onAddIndicator?: (indicator: BuiltinIndicator) => void;
  /** Called to open indicator settings for a given instance ID */
  onOpenIndicatorSettings?: (instanceId: string) => void;
  /** Called when a Tealscript parse/runtime error occurs */
  onTealscriptError?: (scriptId: string, error: WorkerError) => void;
}

export const SkiaTealchart = forwardRef<SkiaTealchartHandle, SkiaTealchartProps>(function SkiaTealchart(
  {
    width: propWidth,
    height: propHeight,
    // Required datafeed prop
    datafeed,
    symbol: propSymbol,
    interval: propInterval = '15',
    // Rendering props
    renderOptions,
    theme = 'Dark',
    margins: marginsProp,
    priceLines,
    orderLines,
    positionLines,
    plotStyleOverrides,
    onViewportChange,
    onContextMenu,
    onCrossHairMoved,
    userDrawingState: propUserDrawingState,
    onUserDrawingStateChange,
    onUserDrawingCommand,
    onUserDrawingObjectTreeOpen,
    onUserDrawingPropertiesOpen,
    constrainUserDrawingPlacement = false,
    duplicateUserDrawingOnEditDrag = false,
    onSwipeBlockChange,
    onOrderMove,
    onOrderCancel,
    onPositionClose,
    onPositionReverse,
    pricePrecision = 2,
    // Top bar props
    showTopBar = true,
    exchangeName,
    onIntervalChange,
    onSymbolChange,
    // Indicator props
    onAddIndicator,
    onTealscriptError,
  },
  ref,
) {
  // ==========================================================================
  // Core Hook + Indicator Management
  // ==========================================================================

  // Force re-render helper for indicator updates
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const [imperativeTheme, setImperativeTheme] = useState<ChartThemeInput | null>(null);
  const [uncontrolledUserDrawingState, setUncontrolledUserDrawingState] = useState<UserDrawingState>(
    () => propUserDrawingState ?? createUserDrawingState(),
  );
  const effectiveUserDrawingState = uncontrolledUserDrawingState;
  const userDrawingStateRef = useRef(effectiveUserDrawingState);
  const userDrawingHistoryRef = useRef<UserDrawingCommandHistory>(createUserDrawingCommandHistory());
  const userDrawingClipboardRef = useRef<UserDrawingClipboard | null>(null);
  const userDrawingSpacesByPaneIdRef = useRef<ReadonlyMap<string, DrawingCoordinateSpace>>(new Map());
  const userDrawingIdCounterRef = useRef(0);
  const userDrawingEditDragRef = useRef<UserDrawingEditDrag | null>(null);
  const userDrawingEditDragTransactionKeyRef = useRef('edit-drag');
  const userDrawingEditDragTransactionCounterRef = useRef(0);
  const [userDrawingDraftPreviewAnchor, setUserDrawingDraftPreviewAnchor] = useState<UserDrawingAnchor | null>(null);
  const userDrawingPlacementDragStartPointRef = useRef<UserDrawingInputPoint | null>(null);
  const userDrawingPlacementDragLastPointRef = useRef<UserDrawingInputPoint | null>(null);
  const userDrawingPlacementConstraintOverrideRef = useRef<boolean | null>(null);
  const userDrawingDuplicateEditDragOverrideRef = useRef<boolean | null>(null);

  const commitUserDrawingState = useCallback(
    (nextState: UserDrawingState) => {
      userDrawingStateRef.current = nextState;
      if (!nextState.draft) {
        userDrawingPlacementDragStartPointRef.current = null;
        userDrawingPlacementDragLastPointRef.current = null;
        setUserDrawingDraftPreviewAnchor(null);
      }
      setUncontrolledUserDrawingState(nextState);
      onUserDrawingStateChange?.(nextState);
    },
    [onUserDrawingStateChange],
  );

  const notifyUserDrawingCommand = useCallback(
    (event: UserDrawingCommandEvent) => {
      try {
        onUserDrawingCommand?.(event);
      } catch {
        // Keep chart input/state flow isolated from app callback failures.
      }
    },
    [onUserDrawingCommand],
  );

  useEffect(() => {
    if (propUserDrawingState) {
      userDrawingHistoryRef.current = clearUserDrawingCommandHistory(userDrawingHistoryRef.current);
      userDrawingPlacementDragStartPointRef.current = null;
      userDrawingPlacementDragLastPointRef.current = null;
      setUserDrawingDraftPreviewAnchor(null);
      userDrawingStateRef.current = propUserDrawingState;
      setUncontrolledUserDrawingState(propUserDrawingState);
    }
  }, [propUserDrawingState]);

  useEffect(() => {
    setImperativeTheme(null);
  }, [theme]);

  const createUserDrawingId = useCallback(() => {
    const existingIds = new Set(userDrawingStateRef.current.drawings.map((drawing) => drawing.id));
    let id = '';
    do {
      id = `drawing_${++userDrawingIdCounterRef.current}`;
    } while (existingIds.has(id));
    return id;
  }, []);

  const dispatchUserDrawingCommandToStateWithResult = useCallback(
    (command: Parameters<typeof dispatchUserDrawingCommand>[1]) => {
      const previousState = userDrawingStateRef.current;
      const result = dispatchMobileUserDrawingHistoryCommand(previousState, userDrawingHistoryRef.current, command);
      userDrawingHistoryRef.current = result.history;
      if (result.changed) {
        commitUserDrawingState(result.state);
        const event = createUserDrawingCommandEvent(previousState, result);
        if (event) {
          notifyUserDrawingCommand(event);
        }
      }
      return result;
    },
    [commitUserDrawingState, notifyUserDrawingCommand],
  );

  const dispatchUserDrawingCommandToState = useCallback(
    (command: Parameters<typeof dispatchUserDrawingCommand>[1]) => dispatchUserDrawingCommandToStateWithResult(command).changed,
    [dispatchUserDrawingCommandToStateWithResult],
  );

  const replaceUserDrawingState = useCallback(
    (nextState: UserDrawingState, source: 'api' | 'layout') => {
      const previousState = userDrawingStateRef.current;
      const result = replaceMobileUserDrawingState(previousState, userDrawingHistoryRef.current, nextState, source);
      userDrawingHistoryRef.current = result.history;
      commitUserDrawingState(result.state);
      if (result.event) notifyUserDrawingCommand(result.event);
    },
    [commitUserDrawingState, notifyUserDrawingCommand],
  );

  // Create indicator manager (stable ref)
  const indicatorManagerRef = useRef<MobileIndicatorManager | null>(null);
  if (!indicatorManagerRef.current) {
    indicatorManagerRef.current = new MobileIndicatorManager();
    indicatorManagerRef.current.setOnUpdate(forceUpdate);
  }

  useLayoutEffect(() => {
    const manager = indicatorManagerRef.current;
    if (!manager || !onTealscriptError) return;
    manager.onErrorSubscribe(onTealscriptError);
    return () => {
      manager.onErrorUnsubscribe(onTealscriptError);
    };
  }, [onTealscriptError]);

  useImperativeHandle(
    ref,
    () => ({
      addTealscriptIndicator(options: SkiaTealscriptIndicatorOptions): string | null {
        return indicatorManagerRef.current?.addTealscriptIndicator(options) ?? null;
      },
      removeTealscriptIndicator(instanceId: string): void {
        indicatorManagerRef.current?.removeIndicator(instanceId);
      },
      changeTheme(nextTheme: ChartThemeInput): void {
        setImperativeTheme(nextTheme);
      },
      getUserDrawingState(): UserDrawingState {
        return userDrawingStateRef.current;
      },
      exportUserDrawingStateForLayout(): UserDrawingState | undefined {
        return exportMobileUserDrawingStateForLayout(userDrawingStateRef.current);
      },
      importUserDrawingStateFromLayout(nextState?: UserDrawingState | null): void {
        replaceUserDrawingState(importMobileUserDrawingStateFromLayout(nextState), 'layout');
      },
      setUserDrawingState(nextState: UserDrawingState): void {
        replaceUserDrawingState(nextState, 'api');
      },
      setActiveUserDrawingTool(tool: UserDrawingTool): void {
        dispatchUserDrawingCommandToState({ type: 'setActiveTool', tool, meta: { source: 'api' } });
      },
      canUndoUserDrawingCommand(): boolean {
        return canUndoUserDrawingCommandHistory(userDrawingHistoryRef.current);
      },
      canRedoUserDrawingCommand(): boolean {
        return canRedoUserDrawingCommandHistory(userDrawingHistoryRef.current);
      },
      undoUserDrawingCommand(): boolean {
        const previousState = userDrawingStateRef.current;
        const result = undoUserDrawingCommandHistory(previousState, userDrawingHistoryRef.current);
        userDrawingHistoryRef.current = result.history;
        if (result.changed) {
          commitUserDrawingState(result.state);
          const event = createUserDrawingHistoryCommandEvent(
            previousState,
            result.state,
            { type: 'undo', meta: { source: 'api' } },
            true,
          );
          if (event) notifyUserDrawingCommand(event);
        }
        return result.changed;
      },
      redoUserDrawingCommand(): boolean {
        const previousState = userDrawingStateRef.current;
        const result = redoUserDrawingCommandHistory(previousState, userDrawingHistoryRef.current);
        userDrawingHistoryRef.current = result.history;
        if (result.changed) {
          commitUserDrawingState(result.state);
          const event = createUserDrawingHistoryCommandEvent(
            previousState,
            result.state,
            { type: 'redo', meta: { source: 'api' } },
            true,
          );
          if (event) notifyUserDrawingCommand(event);
        }
        return result.changed;
      },
      dispatchUserDrawingKeyboardAction(input: UserDrawingKeyboardInput): boolean {
        const previousState = userDrawingStateRef.current;
        const result = dispatchMobileUserDrawingKeyboardActionToState(
          previousState,
          userDrawingHistoryRef.current,
          input,
          {
            clipboard: userDrawingClipboardRef.current,
            createId: createUserDrawingId,
            spacesByPaneId: userDrawingSpacesByPaneIdRef.current,
            setClipboard: (clipboard) => {
              userDrawingClipboardRef.current = clipboard;
            },
          },
        );
        userDrawingHistoryRef.current = result.history;
        if (result.changed && result.state !== userDrawingStateRef.current) {
          commitUserDrawingState(result.state);
          if (result.command) {
            const event = createUserDrawingCommandEvent(previousState, { ...result, command: result.command });
            if (event) {
              notifyUserDrawingCommand(event);
            }
          } else if (result.action?.type === 'undo' || result.action?.type === 'redo') {
            const event = createUserDrawingHistoryCommandEvent(
              previousState,
              result.state,
              {
                type: result.action.type === 'undo' ? 'undo' : 'redo',
                meta: { source: 'keyboard' },
              },
              true,
            );
            if (event) {
              notifyUserDrawingCommand(event);
            }
          }
        }
        return result.changed;
      },
      selectUserDrawing(drawingId: string | null, handle?: UserDrawingHandleRole): void {
        dispatchUserDrawingCommandToState({ type: 'select', drawingId, handle, meta: { source: 'api' } });
      },
      selectUserDrawings(drawingIds: readonly string[]): void {
        dispatchUserDrawingCommandToState({ type: 'selectMany', drawingIds, meta: { source: 'api' } });
      },
      addUserDrawing(drawing: UserDrawing, options: { select?: boolean } = {}): boolean {
        return dispatchUserDrawingCommandToState({
          type: 'add',
          drawing,
          options,
          meta: { source: 'api' },
        });
      },
      deleteUserDrawing(drawingId?: string): boolean {
        return dispatchUserDrawingCommandToState({ type: 'delete', options: { drawingId }, meta: { source: 'api' } });
      },
      deleteSelectedUserDrawing(): boolean {
        return dispatchUserDrawingCommandToState({ type: 'delete', meta: { source: 'api' } });
      },
      duplicateUserDrawing(drawingId?: string): boolean {
        return dispatchUserDrawingCommandToState({
          type: 'duplicate',
          options: {
            drawingId,
            createId: createUserDrawingId,
          },
          meta: { source: 'api' },
        });
      },
      duplicateSelectedUserDrawing(): boolean {
        return dispatchUserDrawingCommandToState({
          type: 'duplicate',
          options: {
            createId: createUserDrawingId,
          },
          meta: { source: 'api' },
        });
      },
      beginDuplicateUserDrawingDragAtPoint(point: DrawingScreenPoint): boolean {
        const transactionKey = `duplicate-drag-${++userDrawingEditDragTransactionCounterRef.current}`;
        const previousState = userDrawingStateRef.current;
        const result = dispatchMobileUserDrawingHistoryCommand(
          previousState,
          userDrawingHistoryRef.current,
          {
            type: 'beginDuplicateEditDragAtPoint',
            point,
            spacesByPaneId: userDrawingSpacesByPaneIdRef.current,
            options: {
              createId: createUserDrawingId,
              hitTest: { labelHeight: 20, measureTextLabelLine: measureUserDrawingTextLabelLine },
            },
            meta: { source: 'api', transactionKey },
          },
        );
        if (!result.hit || !result.editDrag) return false;

        userDrawingHistoryRef.current = result.history;
        if (result.changed) {
          commitUserDrawingState(result.state);
          const event = createUserDrawingCommandEvent(previousState, result);
          if (event) {
            notifyUserDrawingCommand(event);
          }
        }
        userDrawingEditDragRef.current = result.editDrag;
        userDrawingEditDragTransactionKeyRef.current = transactionKey;
        return true;
      },
      setUserDrawingDuplicateEditDrag(duplicate: boolean): void {
        userDrawingDuplicateEditDragOverrideRef.current = duplicate;
      },
      clearUserDrawingDuplicateEditDrag(): void {
        userDrawingDuplicateEditDragOverrideRef.current = null;
      },
      isUserDrawingDuplicateEditDragEnabled(): boolean {
        return resolveMobileUserDrawingDuplicateEditDragEnabled({
          propDuplicate: duplicateUserDrawingOnEditDrag,
          overrideDuplicate: userDrawingDuplicateEditDragOverrideRef.current,
        });
      },
      setUserDrawingPlacementConstraint(constrained: boolean): void {
        userDrawingPlacementConstraintOverrideRef.current = constrained;
      },
      clearUserDrawingPlacementConstraint(): void {
        userDrawingPlacementConstraintOverrideRef.current = null;
      },
      isUserDrawingPlacementConstrained(): boolean {
        return resolveMobileUserDrawingPlacementConstraintEnabled({
          propConstrained: constrainUserDrawingPlacement,
          overrideConstrained: userDrawingPlacementConstraintOverrideRef.current,
        });
      },
      copySelectedUserDrawing(): boolean {
        const clipboard = createUserDrawingClipboard(userDrawingStateRef.current);
        if (!clipboard) return false;
        userDrawingClipboardRef.current = clipboard;
        return true;
      },
      pasteUserDrawingClipboard(): boolean {
        return dispatchUserDrawingCommandToState({
          type: 'paste',
          clipboard: userDrawingClipboardRef.current,
          options: {
            createId: createUserDrawingId,
          },
          meta: { source: 'keyboard' },
        });
      },
      clearUserDrawingClipboard(): void {
        userDrawingClipboardRef.current = null;
      },
      clearUserDrawings(): void {
        dispatchUserDrawingCommandToState({ type: 'clear', meta: { source: 'api' } });
      },
      cancelUserDrawingDraft(): void {
        dispatchUserDrawingCommandToState({ type: 'cancelDraft', meta: { source: 'api' } });
      },
      beginUserDrawingTextEdit(drawingId?: string): boolean {
        return dispatchUserDrawingCommandToState({ type: 'beginTextEdit', drawingId, meta: { source: 'api' } });
      },
      updateUserDrawingTextEdit(value: string): boolean {
        return dispatchUserDrawingCommandToState({ type: 'updateTextEdit', value, meta: { source: 'textEditor' } });
      },
      commitUserDrawingTextEdit(): boolean {
        return dispatchUserDrawingCommandToState({ type: 'commitTextEdit', meta: { source: 'textEditor' } });
      },
      cancelUserDrawingTextEdit(): boolean {
        return dispatchUserDrawingCommandToState({ type: 'cancelTextEdit', meta: { source: 'textEditor' } });
      },
      setUserDrawingText(drawingId: string, text: string): boolean {
        return dispatchUserDrawingCommandToState({ type: 'setText', drawingId, text, meta: { source: 'api' } });
      },
      setUserDrawingTextContent(text: string, options: UpdateUserDrawingOptions = {}): boolean {
        return dispatchUserDrawingCommandToState({ type: 'setTextContent', text, options, meta: { source: 'api' } });
      },
      setUserDrawingName(drawingId: string, name: string | null, options: UpdateUserDrawingOptions = {}): boolean {
        return dispatchUserDrawingCommandToState({ type: 'setName', drawingId, name, options, meta: { source: 'api' } });
      },
      setUserDrawingImageSource(source: UserDrawingImageSourceInput, options: UpdateUserDrawingOptions = {}): boolean {
        return dispatchUserDrawingCommandToState({ type: 'setImageSource', source, options, meta: { source: 'api' } });
      },
      setUserDrawingTableCells(cells: UserDrawingTableCellsInput, options: UpdateUserDrawingOptions = {}): boolean {
        return dispatchUserDrawingCommandToState({ type: 'setTableCells', cells, options, meta: { source: 'api' } });
      },
      setUserDrawingTableCell(
        row: number,
        column: number,
        value: UserDrawingTableCellInput,
        options: UpdateUserDrawingOptions = {},
      ): boolean {
        return dispatchUserDrawingCommandToState({
          type: 'setTableCell',
          row,
          column,
          value,
          options,
          meta: { source: 'api' },
        });
      },
      setUserDrawingTableDimensions(
        rows: number,
        columns: number,
        options: UpdateUserDrawingOptions = {},
      ): boolean {
        return dispatchUserDrawingCommandToState({ type: 'setTableDimensions', rows, columns, options, meta: { source: 'api' } });
      },
      insertUserDrawingTableRow(
        row: number,
        values?: UserDrawingTableRowInput,
        options: UpdateUserDrawingOptions = {},
      ): boolean {
        return dispatchUserDrawingCommandToState({ type: 'insertTableRow', row, values, options, meta: { source: 'api' } });
      },
      deleteUserDrawingTableRow(row: number, options: UpdateUserDrawingOptions = {}): boolean {
        return dispatchUserDrawingCommandToState({ type: 'deleteTableRow', row, options, meta: { source: 'api' } });
      },
      insertUserDrawingTableColumn(
        column: number,
        values?: UserDrawingTableColumnInput,
        options: UpdateUserDrawingOptions = {},
      ): boolean {
        return dispatchUserDrawingCommandToState({
          type: 'insertTableColumn',
          column,
          values,
          options,
          meta: { source: 'api' },
        });
      },
      deleteUserDrawingTableColumn(column: number, options: UpdateUserDrawingOptions = {}): boolean {
        return dispatchUserDrawingCommandToState({ type: 'deleteTableColumn', column, options, meta: { source: 'api' } });
      },
      updateUserDrawingStyle(style: Partial<UserDrawingStyle>, options: UpdateUserDrawingOptions = {}): boolean {
        return dispatchUserDrawingCommandToState({ type: 'updateStyle', style, options, meta: { source: 'api' } });
      },
      setUserDrawingTextAlign(textAlign: UserDrawingTextAlign, options: UpdateUserDrawingOptions = {}): boolean {
        return dispatchUserDrawingCommandToState({ type: 'setTextAlign', textAlign, options, meta: { source: 'api' } });
      },
      setUserDrawingTrendLineExtend(
        extend: UserDrawingTrendLineExtend,
        options: UpdateUserDrawingOptions = {},
      ): boolean {
        return dispatchUserDrawingCommandToState({ type: 'setTrendLineExtend', extend, options, meta: { source: 'api' } });
      },
      setUserDrawingIconName(iconName: UserDrawingIconName, options: UpdateUserDrawingOptions = {}): boolean {
        return dispatchUserDrawingCommandToState({ type: 'setIconName', iconName, options, meta: { source: 'api' } });
      },
      setUserDrawingVisibility(visible: boolean, options: UpdateUserDrawingOptions = {}): boolean {
        return dispatchUserDrawingCommandToState({ type: 'setVisibility', visible, options, meta: { source: 'api' } });
      },
      setUserDrawingLocked(locked: boolean, options: UpdateUserDrawingOptions = {}): boolean {
        return dispatchUserDrawingCommandToState({ type: 'setLocked', locked, options, meta: { source: 'api' } });
      },
      reorderUserDrawings(action: UserDrawingZOrderAction, options: UpdateUserDrawingOptions = {}): boolean {
        return dispatchUserDrawingCommandToState({ type: 'reorder', action, options, meta: { source: 'api' } });
      },
      bringUserDrawingForward(options: UpdateUserDrawingOptions = {}): boolean {
        return dispatchUserDrawingCommandToState({
          type: 'reorder',
          action: 'bringForward',
          options,
          meta: { source: 'api' },
        });
      },
      sendUserDrawingBackward(options: UpdateUserDrawingOptions = {}): boolean {
        return dispatchUserDrawingCommandToState({
          type: 'reorder',
          action: 'sendBackward',
          options,
          meta: { source: 'api' },
        });
      },
      bringUserDrawingToFront(options: UpdateUserDrawingOptions = {}): boolean {
        return dispatchUserDrawingCommandToState({
          type: 'reorder',
          action: 'bringToFront',
          options,
          meta: { source: 'api' },
        });
      },
      sendUserDrawingToBack(options: UpdateUserDrawingOptions = {}): boolean {
        return dispatchUserDrawingCommandToState({
          type: 'reorder',
          action: 'sendToBack',
          options,
          meta: { source: 'api' },
        });
      },
      getUserDrawingObjectTreeModel(options: UserDrawingObjectTreeOptions = {}): UserDrawingObjectTreeModel {
        return resolveUserDrawingObjectTreeModel(userDrawingStateRef.current, options);
      },
      openUserDrawingObjectTree(options: UserDrawingObjectTreeOptions = {}): UserDrawingObjectTreeModel {
        const model = resolveUserDrawingObjectTreeModel(userDrawingStateRef.current, options);
        onUserDrawingObjectTreeOpen?.(model);
        return model;
      },
      dispatchUserDrawingObjectTreeAction(action: UserDrawingObjectTreeDispatchAction): boolean {
        const commands = resolveUserDrawingObjectTreeDispatchActionCommands(userDrawingStateRef.current, action, {
          createId: createUserDrawingId,
          now: () => Date.now(),
        });
        let changed = false;
        for (const command of commands) {
          changed = dispatchUserDrawingCommandToState(command) || changed;
        }
        return changed;
      },
      getUserDrawingPropertiesIntent(drawingId?: string): UserDrawingPropertiesIntent | null {
        return resolveUserDrawingPropertiesIntent(userDrawingStateRef.current, { drawingId });
      },
      getUserDrawingPropertiesSurface(drawingId?: string): UserDrawingPropertiesSurface {
        return resolveUserDrawingPropertiesSurface(userDrawingStateRef.current, drawingId);
      },
      dispatchUserDrawingPropertiesSurfaceCommand(
        command: UserDrawingPropertiesSurfaceCommand,
        options: ResolveUserDrawingPropertiesSurfaceCommandOptions = {},
      ): boolean {
        return dispatchUserDrawingCommandToState(resolveUserDrawingPropertiesSurfaceCommand(command, options));
      },
      openUserDrawingProperties(drawingId?: string): UserDrawingPropertiesIntent | null {
        const intent = resolveUserDrawingPropertiesIntent(userDrawingStateRef.current, { drawingId });
        if (intent) {
          onUserDrawingPropertiesOpen?.(intent);
        }
        return intent;
      },
    }),
    [
      commitUserDrawingState,
      constrainUserDrawingPlacement,
      createUserDrawingId,
      duplicateUserDrawingOnEditDrag,
      dispatchUserDrawingCommandToState,
      dispatchUserDrawingCommandToStateWithResult,
      notifyUserDrawingCommand,
      onUserDrawingObjectTreeOpen,
      onUserDrawingPropertiesOpen,
      replaceUserDrawingState,
    ],
  );

  // Use core hook for bar fetching and state management
  const coreResult = useTealchartCore({
    datafeed,
    symbol: propSymbol,
    interval: propInterval,
    indicatorManager: indicatorManagerRef.current as unknown as IIndicatorManager,
    onSymbolChange,
    onIntervalChange,
  });

  // Get values from core hook
  const { bars, symbol, interval, isLoading, unifiedLayout } = coreResult;

  // Get supported resolutions from core (for filtering timeframe selector)
  const supportedResolutions = coreResult.core?.getSupportedResolutions() ?? null;

  // Get indicator state from manager
  const plots = indicatorManagerRef.current?.getPlots() || [];
  const drawings = indicatorManagerRef.current?.getDrawings() || [];
  const baseUnifiedPaneLayout = indicatorManagerRef.current?.getUnifiedLayout() || unifiedLayout;
  const indicatorPaneInfo = indicatorManagerRef.current?.getIndicatorPaneInfo() || {};

  const activeIndicatorIds = indicatorManagerRef.current?.getIndicators().map((ind) => ind.indicator.id) || [];

  // Handle indicator addition
  const handleAddIndicatorInternal = useCallback(
    (indicator: BuiltinIndicator) => {
      if (indicatorManagerRef.current) {
        console.log('[SkiaTealchart] Adding indicator:', indicator.id);
        indicatorManagerRef.current.addIndicator(indicator);
      }
      // Also call external callback if provided
      onAddIndicator?.(indicator);
    },
    [onAddIndicator],
  );

  // ==========================================================================
  // Dimensions & Layout
  // ==========================================================================

  const [dimensions, setDimensions] = useState({ width: propWidth || 0, height: propHeight || 0 });

  useEffect(() => {
    if (propWidth && propHeight) {
      setDimensions({ width: propWidth, height: propHeight });
    }
  }, [propWidth, propHeight]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (!propWidth || !propHeight) {
        const { width, height } = event.nativeEvent.layout;
        setDimensions({ width, height });
      }
    },
    [propWidth, propHeight],
  );

  // Top bar safe zone - just enough to keep price labels below the toolbar content
  // The top bar is 36px tall but we only need ~26px clearance (content is centered)
  const TOP_BAR_SAFE_ZONE = 26;

  // Increase top margin when top bar is shown to create safe zone for price labels
  const margins: ChartMargins = useMemo(
    () => ({
      ...DEFAULT_MARGINS,
      ...marginsProp,
      // Add safe zone to top margin so price labels don't overlap with top bar
      top: (marginsProp?.top ?? DEFAULT_MARGINS.top) + (showTopBar ? TOP_BAR_SAFE_ZONE : 0),
    }),
    [marginsProp, showTopBar],
  );

  // Chart uses full height (top bar overlays on top, but margins create safe zone)

  // ==========================================================================
  // Viewport State
  // ==========================================================================

  const [viewport, setViewport] = useState<Viewport | null>(() =>
    bars.length > 0 ? TealchartRenderer.calculateViewport(bars) : null,
  );

  const barsLengthRef = useRef(bars.length);
  const viewportControllerRef = useRef(new ViewportController());

  // Track the first bar's time to detect reloads with the same count
  const barsFirstTimeRef = useRef<number | null>(bars.length > 0 ? bars[0].time : null);

  // Compute auto-scale Y ranges for indicator panes (matching TealchartWidget behavior)
  const unifiedPaneLayout = useMemo(() => {
    if (!viewport || plots.length === 0 || !baseUnifiedPaneLayout) return baseUnifiedPaneLayout;

    // Compute auto-scale Y ranges for indicator panes via ViewportController
    const indicatorPanes = baseUnifiedPaneLayout.panes
      .filter((p) => p.type === 'indicator' && p.indicatorIds)
      .map((p) => ({ id: p.id, fixedRange: p.fixedRange, indicatorIds: p.indicatorIds! }));

    const ranges = viewportControllerRef.current.computePaneYRanges(
      indicatorPanes,
      plots,
      bars,
      viewport.startTime,
      viewport.endTime,
    );

    if (ranges.size === 0) return baseUnifiedPaneLayout;

    return {
      ...baseUnifiedPaneLayout,
      panes: baseUnifiedPaneLayout.panes.map((pane) => {
        const range = ranges.get(pane.id);
        if (range) {
          return { ...pane, yMin: range.yMin, yMax: range.yMax };
        }
        return pane;
      }),
    };
  }, [baseUnifiedPaneLayout, viewport, plots, bars]);

  const userDrawingInputPanes = useMemo(() => {
    if (!viewport || !unifiedPaneLayout) return [];

    return computePaneGeometry({
      paneLayout: unifiedPaneLayout,
      height: dimensions.height,
      topOffset: margins.top,
    }).map((pane) => {
      const yRange =
        pane.type === 'main' && !pane.fixedRange
          ? { yMin: viewport.priceMin, yMax: viewport.priceMax }
          : { yMin: pane.yMin, yMax: pane.yMax };
      return {
        id: pane.id,
        top: pane.top,
        height: pane.height,
        bottom: pane.bottom,
        ...yRange,
      };
    });
  }, [dimensions.height, margins.top, unifiedPaneLayout, viewport]);

  const userDrawingSpacesByPaneId = useMemo(() => {
    if (!viewport) return new Map<string, DrawingCoordinateSpace>();

    return new Map(
      userDrawingInputPanes.map((pane) => [
        pane.id,
        {
          viewport,
          pane,
          chartLeft: margins.left,
          chartRight: dimensions.width - margins.right,
          bars: pane.id === 'main' ? bars : undefined,
        },
      ]),
    );
  }, [bars, dimensions.width, margins.left, margins.right, userDrawingInputPanes, viewport]);
  userDrawingSpacesByPaneIdRef.current = userDrawingSpacesByPaneId;

  const userDrawingPrimitives = useMemo(
    () =>
      resolveMobileUserDrawingRenderModel(effectiveUserDrawingState, userDrawingSpacesByPaneId, {
        draftPreviewAnchor: userDrawingDraftPreviewAnchor ?? undefined,
      }),
    [effectiveUserDrawingState, userDrawingDraftPreviewAnchor, userDrawingSpacesByPaneId],
  );
  const userDrawingSelectionActionAnchor = useMemo(
    () => resolveUserDrawingSelectionActionAnchor(effectiveUserDrawingState, userDrawingSpacesByPaneId),
    [effectiveUserDrawingState, userDrawingSpacesByPaneId],
  );
  const userDrawingSelectedActionSurface = useMemo(
    () => resolveUserDrawingSelectedActionSurface(effectiveUserDrawingState),
    [effectiveUserDrawingState],
  );
  const resolveConstrainedUserDrawingPlacementPoint = useCallback(
    (point: UserDrawingInputPoint): UserDrawingInputPoint =>
      resolveUserDrawingPlacementConstraint({
        tool: userDrawingStateRef.current.activeTool,
        startPoint: userDrawingPlacementDragStartPointRef.current,
        currentPoint: point,
        spacesByPaneId: userDrawingSpacesByPaneId,
        options: {
          constrainedPlacement: resolveMobileUserDrawingPlacementConstraintEnabled({
            propConstrained: constrainUserDrawingPlacement,
            overrideConstrained: userDrawingPlacementConstraintOverrideRef.current,
          }),
        },
      }),
    [constrainUserDrawingPlacement, userDrawingSpacesByPaneId],
  );
  const activeUserDrawingTextEditPrimitive = useMemo(
    () =>
      userDrawingPrimitives.find(
        (
          primitive,
        ): primitive is MobileUserDrawingTextBoxPrimitive =>
          isMobileUserDrawingTextBoxPrimitive(primitive) &&
          primitive.editing &&
          primitive.id === effectiveUserDrawingState.textEdit?.drawingId,
      ),
    [effectiveUserDrawingState.textEdit?.drawingId, userDrawingPrimitives],
  );
  const activeUserDrawingTextEditorStyle = useMemo(() => {
    if (!activeUserDrawingTextEditPrimitive) return null;
    const value = activeUserDrawingTextEditPrimitive.editValue ?? activeUserDrawingTextEditPrimitive.text;
    const editMetrics = resolveUserDrawingTextEditMetrics(value);
    const configuredWidth =
      activeUserDrawingTextEditPrimitive.style.textWrap && activeUserDrawingTextEditPrimitive.style.textMaxWidth
        ? activeUserDrawingTextEditPrimitive.style.textMaxWidth
        : undefined;
    const width = configuredWidth ?? Math.max(120, Math.min(260, editMetrics.longestLineLength * 7 + 32));
    const height = Math.max(32, Math.min(160, editMetrics.lines.length * 18 + 14));
    const chartRight = dimensions.width - margins.right;
    const left = Math.max(
      margins.left,
      Math.min(activeUserDrawingTextEditPrimitive.point.x - width / 2, chartRight - width - 8),
    );

    return {
      left,
      top: Math.max(margins.top, activeUserDrawingTextEditPrimitive.point.y - height / 2),
      width,
      height,
      color: activeUserDrawingTextEditPrimitive.style.textColor ?? activeUserDrawingTextEditPrimitive.style.lineColor,
      fontSize: normalizeUserDrawingFontSize(activeUserDrawingTextEditPrimitive.style.fontSize ?? 12),
      fontFamily: resolveMobileUserDrawingFontFamily(activeUserDrawingTextEditPrimitive.style.fontFamily, Platform.OS),
      fontWeight: activeUserDrawingTextEditPrimitive.style.fontWeight === 'bold' ? ('700' as const) : ('400' as const),
      fontStyle: activeUserDrawingTextEditPrimitive.style.fontStyle === 'italic' ? ('italic' as const) : ('normal' as const),
      textDecorationLine: resolveUserDrawingTextDecorationLine(activeUserDrawingTextEditPrimitive.style),
      borderColor: activeUserDrawingTextEditPrimitive.style.lineColor,
    };
  }, [activeUserDrawingTextEditPrimitive, dimensions.width, margins.left, margins.right, margins.top]);

  useEffect(() => {
    if (bars.length === 0) {
      // Reset refs when bars are cleared so next load always triggers
      barsLengthRef.current = 0;
      barsFirstTimeRef.current = null;
      return;
    }

    const firstTime = bars[0].time;
    const lengthChanged = bars.length !== barsLengthRef.current;
    const identityChanged = firstTime !== barsFirstTimeRef.current;

    if (lengthChanged || identityChanged) {
      barsLengthRef.current = bars.length;
      barsFirstTimeRef.current = firstTime;

      const newViewport = viewportControllerRef.current.handleBarsLoaded(bars, intervalToMs(interval));
      setViewport(newViewport);
      onViewportChange?.(newViewport);
    }
  }, [bars, onViewportChange]);

  const handleViewportChange = useCallback(
    (newViewport: Viewport) => {
      const vp = viewportControllerRef.current.handleViewportChange(newViewport, bars, intervalToMs(interval));
      setViewport(vp);
      onViewportChange?.(vp);
    },
    [onViewportChange, bars, interval],
  );

  // ==========================================================================
  // Render Options
  // ==========================================================================

  const fullRenderOptions: RenderOptions = useMemo(() => {
    const themedRenderOptions = mergeChartThemeRenderOptions(imperativeTheme ?? theme, renderOptions);
    return {
      width: dimensions.width,
      height: dimensions.height,
      devicePixelRatio: 1,
      backgroundColor: themedRenderOptions.backgroundColor ?? DEFAULT_RENDER_OPTIONS.backgroundColor,
      upColor: themedRenderOptions.upColor ?? DEFAULT_RENDER_OPTIONS.upColor,
      downColor: themedRenderOptions.downColor ?? DEFAULT_RENDER_OPTIONS.downColor,
      textColor: themedRenderOptions.textColor ?? DEFAULT_RENDER_OPTIONS.textColor,
      gridColor: themedRenderOptions.gridColor ?? DEFAULT_RENDER_OPTIONS.gridColor,
      showVolume: themedRenderOptions.showVolume ?? true,
      volumeHeight: themedRenderOptions.volumeHeight ?? 0.15,
      minCandleWidth: themedRenderOptions.minCandleWidth ?? 1,
      ...themedRenderOptions,
      crosshairColor: themedRenderOptions.crosshairColor ?? DEFAULT_RENDER_OPTIONS.crosshairColor,
      candleSpacing: themedRenderOptions.candleSpacing ?? DEFAULT_RENDER_OPTIONS.candleSpacing,
      maxCandleWidth: themedRenderOptions.maxCandleWidth ?? DEFAULT_RENDER_OPTIONS.maxCandleWidth,
      // Pass margins with top bar offset so price labels have safe zone
      margins,
    };
  }, [dimensions.width, dimensions.height, imperativeTheme, margins, renderOptions, theme]);

  const effectivePriceLines = useMemo(() => {
    const latestBar = bars.length > 0 ? bars[bars.length - 1] : null;
    const lastTradeLine = buildLastTradePriceLine({
      latestBar,
      interval,
      pricePrecision,
      upColor: fullRenderOptions.upColor,
      downColor: fullRenderOptions.downColor,
      renderLineOnCanvas: false,
    });
    const nonLastTradeLines = (priceLines ?? []).filter((line) => line.id !== 'last-trade');

    return lastTradeLine ? [...nonLastTradeLines, lastTradeLine] : nonLastTradeLines;
  }, [bars, interval, priceLines, pricePrecision, fullRenderOptions.upColor, fullRenderOptions.downColor]);

  // ==========================================================================
  // Gestures (using unified hook)
  // ==========================================================================

  const chartDimensions = useMemo(
    () => ({
      width: dimensions.width,
      height: dimensions.height,
      margins,
    }),
    [dimensions.width, dimensions.height, margins],
  );

  const handleAutoScaleDisabled = useCallback((paneId: string) => {
    viewportControllerRef.current.disableAutoScale(paneId);
  }, []);

  const getIsAutoScale = useCallback((paneId: string) => viewportControllerRef.current.isAutoScale(paneId), []);

  const handleResetViewport = useCallback(() => {
    if (bars.length > 0) {
      const vp = viewportControllerRef.current.handleReset(bars, intervalToMs(interval));
      setViewport(vp);
      onViewportChange?.(vp);
    }
  }, [bars, interval, onViewportChange]);

  // ==========================================================================
  // Crosshair State
  // ==========================================================================

  const [crosshairVisible, setCrosshairVisible] = useState(false);
  // Store the crosshair position (updated via runOnJS from gestures)
  const [lastCrosshairPosition, setLastCrosshairPosition] = useState({ x: 0, y: 0 });
  const crosshairDragStartX = useSharedValue(0);
  const crosshairDragStartY = useSharedValue(0);

  const [resetButtonVisible, setResetButtonVisible] = useState(false);
  const resetButtonOpacity = useSharedValue(0);
  const resetButtonHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetButtonFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetButtonLastRevealAtRef = useRef(0);

  const clearResetButtonTimers = useCallback(() => {
    if (resetButtonHideTimerRef.current) {
      clearTimeout(resetButtonHideTimerRef.current);
      resetButtonHideTimerRef.current = null;
    }
    if (resetButtonFadeTimerRef.current) {
      clearTimeout(resetButtonFadeTimerRef.current);
      resetButtonFadeTimerRef.current = null;
    }
  }, []);

  const hideResetButtonOverlay = useCallback(() => {
    resetButtonOpacity.value = withTiming(0, { duration: RESET_BUTTON_FADE_MS });
    resetButtonFadeTimerRef.current = setTimeout(() => {
      setResetButtonVisible(false);
      resetButtonFadeTimerRef.current = null;
    }, RESET_BUTTON_FADE_MS);
  }, [resetButtonOpacity]);

  const revealResetButtonOverlay = useCallback(
    (force = false) => {
      const now = Date.now();
      if (!force && now - resetButtonLastRevealAtRef.current < RESET_BUTTON_REVEAL_THROTTLE_MS) return;
      resetButtonLastRevealAtRef.current = now;

      clearResetButtonTimers();
      setResetButtonVisible(true);
      resetButtonOpacity.value = withTiming(1, { duration: 120 });
      resetButtonHideTimerRef.current = setTimeout(() => {
        resetButtonHideTimerRef.current = null;
        hideResetButtonOverlay();
      }, RESET_BUTTON_HIDE_DELAY_MS);
    },
    [clearResetButtonTimers, hideResetButtonOverlay, resetButtonOpacity],
  );

  const revealResetButtonIfInBottomRegion = useCallback(
    (_x: number, y: number) => {
      if (dimensions.height <= 0) return;
      if (y >= dimensions.height * (2 / 3) && y <= dimensions.height) {
        revealResetButtonOverlay();
      }
    },
    [dimensions.height, revealResetButtonOverlay],
  );

  const handleResetButtonPress = useCallback(() => {
    handleResetViewport();
    revealResetButtonOverlay(true);
  }, [handleResetViewport, revealResetButtonOverlay]);

  const resetButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: resetButtonOpacity.value,
  }));

  useEffect(
    () => () => {
      clearResetButtonTimers();
    },
    [clearResetButtonTimers],
  );

  // Context menu state
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuItems, setContextMenuItems] = useState<ContextMenuItem[]>([]);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0, price: 0, time: 0 });
  const closeContextMenu = useCallback(() => {
    setContextMenuVisible(false);
    setContextMenuItems([]);
  }, []);

  // ==========================================================================
  // Bracket Drag Preview State (TP/SL drag on Skia canvas)
  // ==========================================================================

  const [bracketDragState, setBracketDragState] = useState<{
    type: 'tp' | 'sl';
    positionId: string;
    price: number;
    entryPrice: number;
    isLong: boolean;
    notional: number;
  } | null>(null);

  const handleTPMove = useCallback(
    (positionId: string, price: number) => {
      const pos = positionLines?.find((p) => p.id === positionId || p.positionId === positionId);
      if (pos?.positionData) {
        setBracketDragState({
          type: 'tp',
          positionId,
          price,
          entryPrice: pos.positionData.entryPrice,
          isLong: pos.positionData.isLong,
          notional: pos.positionData.notional,
        });
      }
    },
    [positionLines],
  );

  const handleSLMove = useCallback(
    (positionId: string, price: number) => {
      const pos = positionLines?.find((p) => p.id === positionId || p.positionId === positionId);
      if (pos?.positionData) {
        setBracketDragState({
          type: 'sl',
          positionId,
          price,
          entryPrice: pos.positionData.entryPrice,
          isLong: pos.positionData.isLong,
          notional: pos.positionData.notional,
        });
      }
    },
    [positionLines],
  );

  // Order TP/SL drag move handlers (for Skia bracket preview)
  const handleOrderTPMove = useCallback(
    (orderId: string, price: number) => {
      const order = orderLines?.find((o) => o.id === orderId || o.orderId === orderId);
      if (order) {
        setBracketDragState({
          type: 'tp',
          positionId: orderId,
          price,
          entryPrice: order.price,
          isLong: true, // Approximation — actual side determined by OrderLineManager
          notional: 0,
        });
      }
    },
    [orderLines],
  );

  const handleOrderSLMove = useCallback(
    (orderId: string, price: number) => {
      const order = orderLines?.find((o) => o.id === orderId || o.orderId === orderId);
      if (order) {
        setBracketDragState({
          type: 'sl',
          positionId: orderId,
          price,
          entryPrice: order.price,
          isLong: true, // Approximation — actual side determined by OrderLineManager
          notional: 0,
        });
      }
    },
    [orderLines],
  );

  const handleTPSLDragEnd = useCallback(() => {
    setBracketDragState(null);
  }, []);

  // Indicators modal state
  const [indicatorsModalVisible, setIndicatorsModalVisible] = useState(false);

  const handleIndicatorsPress = useCallback(() => {
    setIndicatorsModalVisible(true);
  }, []);

  const handleIndicatorsModalClose = useCallback(() => {
    setIndicatorsModalVisible(false);
  }, []);

  const handleSelectIndicator = useCallback(
    (indicator: BuiltinIndicator) => {
      console.log('[SkiaTealchart] handleSelectIndicator called:', indicator.id, indicator.name);
      // Use internal handler which manages indicators in datafeed mode
      handleAddIndicatorInternal(indicator);
    },
    [handleAddIndicatorInternal],
  );

  // Indicator settings modal state
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [settingsIndicator, setSettingsIndicator] = useState<IndicatorSettingsData | null>(null);
  const [settingsInputDefs] = useState<import('@tealstreet/tealscript').InputDefinition[]>([]);
  const [settingsPlots] = useState<import('@tealstreet/tealscript').PlotOutput[]>([]);

  const handleSettingsModalClose = useCallback(() => {
    setSettingsModalVisible(false);
    setSettingsIndicator(null);
  }, []);

  const handleSettingsSave = useCallback(
    (inputs: Record<string, unknown>, styleOverrides?: PlotStyleOverride[]) => {
      const manager = indicatorManagerRef.current;
      if (!manager || !settingsIndicator) return;

      manager.updateInputs(settingsIndicator.id, inputs);
      if (styleOverrides) {
        manager.updateStyleOverrides(settingsIndicator.id, styleOverrides);
      }
    },
    [settingsIndicator],
  );

  // Handle crosshair move callback
  const handleCrosshairMove = useCallback(
    (x: number, y: number) => {
      // Update last position for context menu
      setLastCrosshairPosition({ x, y });

      if (!viewport || !onCrossHairMoved) return;
      const price = yToPrice(y, viewport, chartDimensions);
      const time = xToTime(x, viewport, chartDimensions);
      onCrossHairMoved(price, time);
    },
    [viewport, chartDimensions, onCrossHairMoved],
  );

  const isPointInChartArea = useCallback(
    (x: number, y: number) => {
      const chartLeft = chartDimensions.margins.left;
      const chartRight = chartDimensions.width - chartDimensions.margins.right;
      const chartTop = chartDimensions.margins.top;
      const chartBottom = chartDimensions.height - chartDimensions.margins.bottom;

      return x >= chartLeft && x < chartRight && y >= chartTop && y < chartBottom;
    },
    [chartDimensions],
  );

  const measureUserDrawingTextLabelLine = useCallback((drawing: UserDrawingTextAnnotation, line: string): number => {
    const normalizedFontFamily = normalizeUserDrawingFontFamily(drawing.style.fontFamily ?? 'sans-serif');
    const nativeFontFamily = resolveMobileUserDrawingFontFamily(normalizedFontFamily, Platform.OS);
    const typeface = Skia.FontMgr.System().matchFamilyStyle(nativeFontFamily);
    const font = Skia.Font(typeface, normalizeUserDrawingFontSize(drawing.style.fontSize ?? 12));
    return font.measureText(line).width;
  }, []);

  const handleUserDrawingTap = useCallback(
    (x: number, y: number, additive = false) => {
      if (!viewport) return false;

      if (effectiveUserDrawingState.activeTool === 'select') {
        if (!isPointInChartArea(x, y)) return false;

        const selection = dispatchUserDrawingCommand(effectiveUserDrawingState, {
          type: 'selectAtPoint',
          point: { x, y },
          spacesByPaneId: userDrawingSpacesByPaneId,
          options: { additive, hitTest: { labelHeight: 20, measureTextLabelLine: measureUserDrawingTextLabelLine } },
          meta: { source: 'touch' },
        });
        if (selection.changed) {
          commitUserDrawingState(selection.state);
          const event = createUserDrawingCommandEvent(effectiveUserDrawingState, selection);
          if (event) {
            notifyUserDrawingCommand(event);
          }
        }
        return (selection.hit ?? false) || selection.changed;
      }

      const point = resolveMobileUserDrawingInputPoint({
        point: { x, y },
        viewport,
        dimensions: chartDimensions,
        panes: userDrawingInputPanes,
        bars,
      });
      if (!point) return false;

      return dispatchUserDrawingCommandToState({
        type: 'handleInput',
        point,
        options: {
          createId: createUserDrawingId,
        },
        meta: { source: 'touch' },
      });
    },
    [
      chartDimensions,
      createUserDrawingId,
      commitUserDrawingState,
      dispatchUserDrawingCommandToState,
      effectiveUserDrawingState,
      isPointInChartArea,
      measureUserDrawingTextLabelLine,
      notifyUserDrawingCommand,
      userDrawingInputPanes,
      userDrawingSpacesByPaneId,
      bars,
      viewport,
    ],
  );

  const handleUserDrawingEditStart = useCallback(
    (x: number, y: number) => {
      if (!viewport) return false;
      if (!isPointInChartArea(x, y)) return false;

      if (isUserDrawingDragPlacementTool(effectiveUserDrawingState.activeTool)) {
        const point = resolveMobileUserDrawingInputPoint({
          point: { x, y },
          viewport,
          dimensions: chartDimensions,
          panes: userDrawingInputPanes,
          bars,
        });
        if (!point) return false;

        const changed = dispatchUserDrawingCommandToState({
          type: 'beginPlacementDrag',
          point,
          meta: { source: 'touch' },
        });
        if (!changed) return false;

        userDrawingPlacementDragStartPointRef.current = point;
        userDrawingPlacementDragLastPointRef.current = point;
        setUserDrawingDraftPreviewAnchor(resolveConstrainedUserDrawingPlacementPoint(point).anchor);
        return true;
      }

      if (isUserDrawingPathFamilyTool(effectiveUserDrawingState.activeTool)) {
        const point = resolveMobileUserDrawingInputPoint({
          point: { x, y },
          viewport,
          dimensions: chartDimensions,
          panes: userDrawingInputPanes,
          bars,
        });
        if (!point) return false;

        return dispatchUserDrawingCommandToState({
          type: 'beginPathDrag',
          point,
          meta: { source: 'touch', transactionKey: 'path-drag' },
        });
      }

      if (effectiveUserDrawingState.activeTool !== 'select') return false;

      const duplicateEditDrag = resolveMobileUserDrawingDuplicateEditDragEnabled({
        propDuplicate: duplicateUserDrawingOnEditDrag,
        overrideDuplicate: userDrawingDuplicateEditDragOverrideRef.current,
      });
      const transactionKey = `${duplicateEditDrag ? 'duplicate-drag' : 'edit-drag'}-${++userDrawingEditDragTransactionCounterRef.current}`;
      const result = duplicateEditDrag
        ? dispatchUserDrawingCommandToStateWithResult({
            type: 'beginDuplicateEditDragAtPoint',
            point: { x, y },
            spacesByPaneId: userDrawingSpacesByPaneId,
            options: {
              createId: createUserDrawingId,
              hitTest: { labelHeight: 20, measureTextLabelLine: measureUserDrawingTextLabelLine },
            },
            meta: { source: 'touch', transactionKey },
          })
        : dispatchUserDrawingCommand(effectiveUserDrawingState, {
            type: 'beginEditDragAtPoint',
            point: { x, y },
            spacesByPaneId: userDrawingSpacesByPaneId,
            options: {
              hitTest: { labelHeight: 20, measureTextLabelLine: measureUserDrawingTextLabelLine },
            },
            meta: { source: 'touch', transactionKey },
          });
      if (!result.hit || !result.editDrag) return false;

      userDrawingEditDragRef.current = result.editDrag;
      userDrawingEditDragTransactionKeyRef.current = transactionKey;
      if (!duplicateEditDrag && result.changed) {
        commitUserDrawingState(result.state);
        const event = createUserDrawingCommandEvent(effectiveUserDrawingState, result);
        if (event) {
          notifyUserDrawingCommand(event);
        }
      }
      return true;
    },
    [
      chartDimensions,
      commitUserDrawingState,
      createUserDrawingId,
      duplicateUserDrawingOnEditDrag,
      dispatchUserDrawingCommandToState,
      dispatchUserDrawingCommandToStateWithResult,
      effectiveUserDrawingState,
      isPointInChartArea,
      measureUserDrawingTextLabelLine,
      notifyUserDrawingCommand,
      resolveConstrainedUserDrawingPlacementPoint,
      userDrawingInputPanes,
      userDrawingSpacesByPaneId,
      bars,
      viewport,
    ],
  );

  const handleUserDrawingEditMove = useCallback(
    (x: number, y: number) => {
      if (viewport && isUserDrawingPathFamilyTool(effectiveUserDrawingState.activeTool)) {
        const point = resolveMobileUserDrawingInputPoint({
          point: { x, y },
          viewport,
          dimensions: chartDimensions,
          panes: userDrawingInputPanes,
          bars,
        });
        if (!point) return;

        dispatchUserDrawingCommandToState({
          type: 'appendPathDragPoint',
          point,
          meta: { source: 'touch', transactionKey: 'path-drag' },
        });
        return;
      }

      if (viewport && isUserDrawingDragPlacementTool(effectiveUserDrawingState.activeTool)) {
        const point = resolveMobileUserDrawingInputPoint({
          point: { x, y },
          viewport,
          dimensions: chartDimensions,
          panes: userDrawingInputPanes,
          bars,
        });
        if (!point || !userDrawingPlacementDragLastPointRef.current) return;

        const previewPoint = resolveConstrainedUserDrawingPlacementPoint(point);
        userDrawingPlacementDragLastPointRef.current = previewPoint;
        setUserDrawingDraftPreviewAnchor(previewPoint.anchor);
        return;
      }

      const drag = userDrawingEditDragRef.current;
      if (!drag) return;

      dispatchUserDrawingCommandToState({
        type: 'applyEditDrag',
        drag,
        point: { x, y },
        meta: { source: 'touch', transactionKey: userDrawingEditDragTransactionKeyRef.current },
      });
    },
    [
      chartDimensions,
      dispatchUserDrawingCommandToState,
      effectiveUserDrawingState,
      resolveConstrainedUserDrawingPlacementPoint,
      userDrawingInputPanes,
      bars,
      viewport,
    ],
  );

  const handleUserDrawingEditEnd = useCallback(() => {
    if (isUserDrawingDragPlacementTool(userDrawingStateRef.current.activeTool)) {
      const point = userDrawingPlacementDragLastPointRef.current;
      userDrawingPlacementDragStartPointRef.current = null;
      userDrawingPlacementDragLastPointRef.current = null;
      setUserDrawingDraftPreviewAnchor(null);
      if (point) {
        dispatchUserDrawingCommandToState({
          type: 'commitPlacementDrag',
          point,
          options: {
            createId: createUserDrawingId,
          },
          meta: { source: 'touch' },
        });
      }
      return;
    }

    if (isUserDrawingPathFamilyTool(userDrawingStateRef.current.activeTool)) {
      dispatchUserDrawingCommandToState({
        type: 'commitPathDrag',
        options: {
          createId: createUserDrawingId,
        },
        meta: { source: 'touch' },
      });
      return;
    }

    userDrawingEditDragRef.current = null;
    userDrawingEditDragTransactionKeyRef.current = 'edit-drag';
  }, [createUserDrawingId, dispatchUserDrawingCommandToState]);

  const handleUserDrawingEditCancel = useCallback(() => {
    if (
      isUserDrawingDragPlacementTool(userDrawingStateRef.current.activeTool) ||
      isUserDrawingPathFamilyTool(userDrawingStateRef.current.activeTool)
    ) {
      userDrawingPlacementDragStartPointRef.current = null;
      userDrawingPlacementDragLastPointRef.current = null;
      setUserDrawingDraftPreviewAnchor(null);
      dispatchUserDrawingCommandToState({ type: 'cancelDraft', meta: { source: 'touch' } });
      return;
    }

    userDrawingEditDragRef.current = null;
    userDrawingEditDragTransactionKeyRef.current = 'edit-drag';
  }, [dispatchUserDrawingCommandToState]);

  const { composedGesture } = useChartGestures({
    dimensions: chartDimensions,
    bars,
    viewport,
    onViewportChange: handleViewportChange,
    enabled: isMobileChartGestureLayerEnabled(effectiveUserDrawingState.activeTool, crosshairVisible),
    onSwipeBlockChange,
    onAutoScaleDisabled: handleAutoScaleDisabled,
    isAutoScale: getIsAutoScale,
    onInteraction: revealResetButtonIfInBottomRegion,
    onDrawingEditStart: handleUserDrawingEditStart,
    onDrawingEditMove: handleUserDrawingEditMove,
    onDrawingEditEnd: handleUserDrawingEditEnd,
    onDrawingEditCancel: handleUserDrawingEditCancel,
  });

  const handleCrosshairTap = useCallback(
    (x: number, y: number) => {
      revealResetButtonIfInBottomRegion(x, y);

      if (handleUserDrawingTap(x, y)) return;

      if (crosshairVisible) {
        setCrosshairVisible(false);
        return;
      }

      if (!isPointInChartArea(x, y)) return;

      setCrosshairVisible(true);
      handleCrosshairMove(x, y);
    },
    [
      crosshairVisible,
      handleCrosshairMove,
      handleUserDrawingTap,
      isPointInChartArea,
      revealResetButtonIfInBottomRegion,
    ],
  );

  // Pan gesture for moving crosshair (active only while crosshair is visible)
  const crosshairPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isMobileCrosshairPanGestureEnabled(effectiveUserDrawingState.activeTool, crosshairVisible))
        .onStart((event) => {
          runOnJS(revealResetButtonIfInBottomRegion)(event.x, event.y);
          crosshairDragStartX.value = lastCrosshairPosition.x;
          crosshairDragStartY.value = lastCrosshairPosition.y;
        })
        .onUpdate((event) => {
          runOnJS(revealResetButtonIfInBottomRegion)(event.x, event.y);
          runOnJS(handleCrosshairMove)(
            crosshairDragStartX.value + event.translationX,
            crosshairDragStartY.value + event.translationY,
          );
        })
        .onEnd(() => {
          // Keep crosshair visible after pan ends - tap elsewhere to hide
        }),
    [
      crosshairVisible,
      effectiveUserDrawingState.activeTool,
      crosshairDragStartX,
      crosshairDragStartY,
      handleCrosshairMove,
      lastCrosshairPosition,
      revealResetButtonIfInBottomRegion,
    ],
  );

  // Single tap toggles crosshair immediately. Drag gestures win once movement starts.
  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(250)
        .maxDistance(10)
        .onEnd((event) => {
          runOnJS(handleCrosshairTap)(event.x, event.y);
        }),
    [handleCrosshairTap],
  );

  const additiveTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .numberOfPointers(2)
        .maxDuration(250)
        .maxDistance(10)
        .onEnd((event) => {
          runOnJS(handleUserDrawingTap)(event.x, event.y, true);
        }),
    [handleUserDrawingTap],
  );

  // Double-tap handler for pane maximize/restore
  const handleDoubleTap = useCallback(
    (x: number, y: number) => {
      if (effectiveUserDrawingState.activeTool === 'select' && isPointInChartArea(x, y)) {
        const result = resolveMobileUserDrawingDoubleTapEditIntent(effectiveUserDrawingState, { x, y }, userDrawingSpacesByPaneId, {
          source: 'touch',
          hitTest: { labelHeight: 20, measureTextLabelLine: measureUserDrawingTextLabelLine },
        });

        if (result.intent.type !== 'pane') {
          if (result.changed) {
            commitUserDrawingState(result.state);
            for (const event of result.events) {
              notifyUserDrawingCommand(event);
            }
          }
          if (result.propertiesIntent) {
            onUserDrawingPropertiesOpen?.(result.propertiesIntent);
          }
          return;
        }
      }

      if (!unifiedPaneLayout || !coreResult.core) return;
      const panes = unifiedPaneLayout.panes;
      const availableHeight = dimensions.height - (margins.bottom || DEFAULT_MARGINS.bottom);
      let currentTop = margins.top || 0;

      for (const pane of panes) {
        const paneHeight = availableHeight * pane.heightRatio;
        if (y >= currentTop && y < currentTop + paneHeight) {
          coreResult.core.toggleMaximizePane(pane.id);
          return;
        }
        currentTop += paneHeight;
      }
    },
    [
      commitUserDrawingState,
      coreResult.core,
      dimensions.height,
      effectiveUserDrawingState,
      isPointInChartArea,
      margins,
      measureUserDrawingTextLabelLine,
      notifyUserDrawingCommand,
      onUserDrawingPropertiesOpen,
      unifiedPaneLayout,
      userDrawingSpacesByPaneId,
    ],
  );

  const handleUserDrawingContextMenu = useCallback(
    (x: number, y: number) => {
      if (!viewport || effectiveUserDrawingState.activeTool !== 'select' || !isPointInChartArea(x, y)) {
        closeContextMenu();
        return false;
      }

      const result = resolveUserDrawingContextActionsAtPoint(effectiveUserDrawingState, { x, y }, userDrawingSpacesByPaneId, {
        hitTest: { labelHeight: 20, measureTextLabelLine: measureUserDrawingTextLabelLine },
      });
      if (!result.hit) {
        closeContextMenu();
        return false;
      }
      if (result.changed) {
        commitUserDrawingState(result.state);
        const event = createUserDrawingCommandEvent(effectiveUserDrawingState, {
          state: result.state,
          changed: true,
          command: {
            type: 'selectAtPoint',
            point: { x, y },
            spacesByPaneId: userDrawingSpacesByPaneId,
            options: { hitTest: { labelHeight: 20, measureTextLabelLine: measureUserDrawingTextLabelLine } },
            meta: { source: 'contextMenu' },
          },
          meta: { source: 'contextMenu' },
          hit: true,
        });
        if (event) {
          notifyUserDrawingCommand(event);
        }
      }

      if (result.items.length === 0) {
        closeContextMenu();
        return true;
      }

      setContextMenuItems(
        result.items.map((item): ContextMenuItem => ({
          position: item.groupId === 'visibility' ? 'bottom' : 'top',
          text: item.label,
          enabled: item.enabled,
          click: () => {
            if (!item.enabled) return;
            dispatchMobileUserDrawingActionCommand(item.command, {
              state: userDrawingStateRef.current,
              source: 'contextMenu',
              createId: createUserDrawingId,
              dispatchUserDrawingCommand: dispatchUserDrawingCommandToState,
              onUserDrawingPropertiesOpen,
              onUserDrawingObjectTreeOpen,
            });
          },
        })),
      );
      setContextMenuPosition({
        x,
        y,
        price: yToPrice(y, viewport, chartDimensions),
        time: xToTime(x, viewport, chartDimensions),
      });
      setContextMenuVisible(true);
      return true;
    },
    [
      chartDimensions,
      closeContextMenu,
      commitUserDrawingState,
      createUserDrawingId,
      dispatchUserDrawingCommandToState,
      effectiveUserDrawingState,
      isPointInChartArea,
      measureUserDrawingTextLabelLine,
      notifyUserDrawingCommand,
      onUserDrawingObjectTreeOpen,
      onUserDrawingPropertiesOpen,
      userDrawingSpacesByPaneId,
      viewport,
    ],
  );

  // Double-tap gesture for pane maximize/restore
  const doubleTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .onEnd((event) => {
          runOnJS(handleDoubleTap)(event.x, event.y);
        }),
    [handleDoubleTap],
  );

  const tapOrDoubleTapGesture = useMemo(
    () =>
      effectiveUserDrawingState.activeTool === 'select'
        ? Gesture.Exclusive(additiveTapGesture, doubleTapGesture, tapGesture)
        : tapGesture,
    [additiveTapGesture, doubleTapGesture, effectiveUserDrawingState.activeTool, tapGesture],
  );

  const drawingContextMenuGesture = useMemo(
    () =>
      Gesture.LongPress()
        .enabled(effectiveUserDrawingState.activeTool === 'select')
        .minDuration(500)
        .maxDistance(10)
        .onStart((event) => {
          runOnJS(handleUserDrawingContextMenu)(event.x, event.y);
        }),
    [effectiveUserDrawingState.activeTool, handleUserDrawingContextMenu],
  );

  // Combine all gestures
  const allGestures = useMemo(
    () =>
      Gesture.Simultaneous(
        drawingContextMenuGesture,
        Gesture.Race(crosshairPanGesture, tapOrDoubleTapGesture, composedGesture),
      ),
    [composedGesture, crosshairPanGesture, drawingContextMenuGesture, tapOrDoubleTapGesture],
  );

  // ==========================================================================
  // Label Collision Resolution
  // ==========================================================================

  // Build label bounds for collision resolution
  const labelBoundsInput = useMemo(() => {
    if (!viewport) return [];

    const bounds: Array<LabelBounds & { id: string }> = [];
    const labelHeight = 20;

    // Add order line labels
    orderLines?.forEach((order) => {
      bounds.push({
        id: `order-${order.id}`,
        originalY: priceToY(order.price, viewport, chartDimensions),
        adjustedY: 0,
        height: labelHeight,
        priority: 1, // Orders have lower priority than positions
      });
    });

    // Add position line labels
    positionLines?.forEach((pos) => {
      bounds.push({
        id: `position-${pos.id}`,
        originalY: priceToY(pos.price, viewport, chartDimensions),
        adjustedY: 0,
        height: labelHeight,
        priority: 2, // Positions have higher priority
      });
    });

    return bounds;
  }, [viewport, chartDimensions, orderLines, positionLines]);

  // Resolve collisions
  useLabelCollision(labelBoundsInput);

  // ==========================================================================
  // Context Menu Handler
  // ==========================================================================

  const handleContextMenuPress = useCallback(
    (price: number, time: number) => {
      if (!onContextMenu) {
        closeContextMenu();
        return;
      }

      const items = onContextMenu(time, price);
      if (!items || items.length === 0) {
        closeContextMenu();
        return;
      }

      setContextMenuItems(items);
      setContextMenuPosition({
        x: lastCrosshairPosition.x,
        y: lastCrosshairPosition.y,
        price,
        time,
      });
      setContextMenuVisible(true);
    },
    [closeContextMenu, onContextMenu, lastCrosshairPosition],
  );

  const handleContextMenuClose = closeContextMenu;

  // ==========================================================================
  // Skia Picture Rendering (Layer 1: Static)
  // ==========================================================================

  const { picture, textItems } = useMemo(() => {
    if (!viewport || bars.length === 0 || dimensions.width === 0 || dimensions.height === 0) {
      return { picture: null, textItems: [] as CollectedTextItem[] };
    }

    let collectedText: CollectedTextItem[] = [];

    const pic = createPicture(
      (canvas) => {
        const ctx = new SkiaCanvasContext(canvas as any, Skia as any);
        // Pass margins as third parameter (constructor doesn't read from options.margins)
        const renderer = new TealchartRenderer(ctx, fullRenderOptions, margins);

        renderer.renderWithLayout(
          bars,
          viewport,
          unifiedPaneLayout,
          effectivePriceLines,
          plots,
          indicatorPaneInfo,
          undefined,
          plotStyleOverrides,
          undefined,
          undefined,
          drawings,
        );

        collectedText = ctx.getCollectedText();
      },
      { width: dimensions.width, height: dimensions.height },
    );

    return { picture: pic, textItems: collectedText };
  }, [
    bars,
    viewport,
    dimensions,
    fullRenderOptions,
    margins,
    effectivePriceLines,
    plots,
    drawings,
    unifiedPaneLayout,
    indicatorPaneInfo,
    plotStyleOverrides,
  ]);

  // ==========================================================================
  // Text Style Helper
  // ==========================================================================

  const getTextStyle = useCallback((item: CollectedTextItem) => {
    let left = item.x;
    let top = item.y;

    const estimatedWidth = item.text.length * item.fontSize * 0.6;

    if (item.textAlign === 'center') {
      left = item.x - estimatedWidth / 2;
    } else if (item.textAlign === 'right' || item.textAlign === 'end') {
      left = item.x - estimatedWidth;
    }

    if (item.textBaseline === 'top') {
      // top is default in RN
    } else if (item.textBaseline === 'middle') {
      top = item.y - item.fontSize / 2;
    } else if (item.textBaseline === 'bottom') {
      top = item.y - item.fontSize;
    } else {
      // 'alphabetic' - roughly 80% of font size above baseline
      top = item.y - item.fontSize * 0.8;
    }

    return {
      position: 'absolute' as const,
      left,
      top,
      fontSize: item.fontSize,
      color: item.color,
    };
  }, []);

  // ==========================================================================
  // Bracket Drag Preview (Skia rendering data)
  // ==========================================================================

  // Fonts for Skia text rendering in bracket preview and drawing labels.
  const bracketFont = useFont(null, 12);
  const userDrawingTextFonts = useMemo(() => {
    const fontSizes = [10, 12, 14, 16] as const;
    const fonts: Partial<
      Record<UserDrawingFontFamily, Partial<Record<(typeof fontSizes)[number], ReturnType<typeof Skia.Font>>>>
    > = {};

    for (const fontFamily of USER_DRAWING_FONT_FAMILIES) {
      const nativeFontFamily = resolveMobileUserDrawingFontFamily(fontFamily, Platform.OS);
      const typeface = Skia.FontMgr.System().matchFamilyStyle(nativeFontFamily);
      const familyFonts: Partial<Record<(typeof fontSizes)[number], ReturnType<typeof Skia.Font>>> = {};
      for (const fontSize of fontSizes) {
        familyFonts[fontSize] = Skia.Font(typeface, fontSize);
      }
      fonts[fontFamily] = familyFonts;
    }

    return fonts;
  }, []);
  const getUserDrawingTextFont = useCallback(
    (fontSize: number | undefined, fontFamily: string | undefined) => {
      const normalizedFontFamily = normalizeUserDrawingFontFamily(fontFamily ?? 'sans-serif');
      const normalizedFontSize = normalizeUserDrawingFontSize(fontSize ?? 12);
      return userDrawingTextFonts[normalizedFontFamily]?.[normalizedFontSize] ?? bracketFont;
    },
    [bracketFont, userDrawingTextFonts],
  );

  // Compute bracket drag preview rendering data
  const bracketPreview = useMemo(() => {
    if (!bracketDragState || !viewport) return null;

    const { type, price, entryPrice, isLong, notional } = bracketDragState;
    const y = priceToY(price, viewport, chartDimensions);

    // PnL estimate: notional * (price - entry) / entry for long, inverted for short
    const priceDelta = isLong ? price - entryPrice : entryPrice - price;
    const pnl = (priceDelta / entryPrice) * notional;
    const pnlSign = pnl >= 0 ? '+' : '';
    const priceText = safeToFixed(price, pricePrecision);
    const pnlText = `${pnlSign}${safeToFixed(pnl, 2)}`;
    const labelText = `${type.toUpperCase()} ${priceText}  ${pnlText}`;

    const color = type === 'tp' ? '#22c55e' : '#f97316';
    const chartLeft = chartDimensions.margins.left;
    const chartRight = chartDimensions.width - chartDimensions.margins.right;

    return { y, color, labelText, chartLeft, chartRight, pnl };
  }, [bracketDragState, viewport, chartDimensions, pricePrecision]);

  const crosshairOverlay = useMemo(() => {
    if (!viewport || !crosshairVisible) return null;

    const chartLeft = margins.left;
    const chartRight = dimensions.width - margins.right;
    const chartTop = margins.top;
    const chartBottom = dimensions.height - margins.bottom;
    const { x, y } = lastCrosshairPosition;

    if (x < chartLeft || x > chartRight) return null;

    const hasContextMenu = !!onContextMenu;
    const horizontalRight = hasContextMenu ? chartRight - 26 : chartRight;
    const showHorizontal = y >= chartTop && y <= chartBottom;

    return {
      color: fullRenderOptions.crosshairColor,
      x,
      y,
      chartLeft,
      chartRight,
      chartTop,
      chartBottom,
      horizontalRight,
      showHorizontal,
    };
  }, [
    viewport,
    crosshairVisible,
    margins.left,
    margins.right,
    margins.top,
    margins.bottom,
    dimensions.width,
    dimensions.height,
    lastCrosshairPosition,
    onContextMenu,
    fullRenderOptions.crosshairColor,
  ]);

  // ==========================================================================
  // Render
  // ==========================================================================

  if (dimensions.width === 0 || dimensions.height === 0) {
    return (
      <View style={[styles.container, { backgroundColor: fullRenderOptions.backgroundColor }]} onLayout={onLayout} />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: fullRenderOptions.backgroundColor }]} onLayout={onLayout}>
      {/* Layer 1: Skia Canvas (static rendering) */}
      <Canvas
        style={[
          styles.absoluteFill,
          { width: dimensions.width, height: dimensions.height, opacity: isLoading ? LOADING_OPACITY : 1 },
        ]}
      >
        {picture && <Picture picture={picture} />}

        {userDrawingPrimitives.map((primitive) => {
          if (primitive.kind === 'line') {
            if (primitive.style.lineVisible === false) return null;
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);

            return (
              <Group key={primitive.id} clip={primitive.clip}>
                <SkiaLine
                  p1={vec(primitive.start.x, primitive.start.y)}
                  p2={vec(primitive.end.x, primitive.end.y)}
                  color={primitive.style.lineColor}
                  opacity={primitive.opacity}
                  strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  style="stroke"
                >
                  {dash && <DashPathEffect intervals={dash} />}
                </SkiaLine>
                {primitive.arrowHead && (
                  <>
                    <SkiaLine
                      p1={vec(primitive.arrowHead.left.x, primitive.arrowHead.left.y)}
                      p2={vec(primitive.end.x, primitive.end.y)}
                      color={primitive.style.lineColor}
                      opacity={primitive.opacity}
                      strokeWidth={Math.max(1, primitive.style.lineWidth)}
                      style="stroke"
                    >
                      {dash && <DashPathEffect intervals={dash} />}
                    </SkiaLine>
                    <SkiaLine
                      p1={vec(primitive.arrowHead.right.x, primitive.arrowHead.right.y)}
                      p2={vec(primitive.end.x, primitive.end.y)}
                      color={primitive.style.lineColor}
                      opacity={primitive.opacity}
                      strokeWidth={Math.max(1, primitive.style.lineWidth)}
                      style="stroke"
                    >
                      {dash && <DashPathEffect intervals={dash} />}
                    </SkiaLine>
                  </>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'infoLine') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const textBounds = font ? font.measureText(primitive.label) : { width: 0 };
            const labelPosition = resolveMobileUserDrawingInfoLineLabelPosition(primitive, textBounds);

            return (
              <Group key={primitive.id} clip={primitive.clip} opacity={primitive.opacity}>
                {primitive.style.lineVisible !== false && (
                  <SkiaLine
                    p1={vec(primitive.start.x, primitive.start.y)}
                    p2={vec(primitive.end.x, primitive.end.y)}
                    color={primitive.style.lineColor}
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    style="stroke"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaLine>
                )}
                {font && (
                  <SkiaText
                    x={labelPosition.x}
                    y={labelPosition.y}
                    text={primitive.label}
                    font={font}
                    color={primitive.style.textColor ?? primitive.style.lineColor}
                  />
                )}
              </Group>
            );
          }

          if (primitive.kind === 'forecast') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const changeTextBounds = font ? font.measureText(primitive.changeLabel) : { width: 0 };
            const fontSize = normalizeUserDrawingFontSize(primitive.style.fontSize ?? 12);

            return (
              <Group key={primitive.id} clip={primitive.clip} opacity={primitive.opacity}>
                {primitive.style.lineVisible !== false && (
                  <SkiaLine
                    p1={vec(primitive.start.x, primitive.start.y)}
                    p2={vec(primitive.end.x, primitive.end.y)}
                    color={primitive.style.lineColor}
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    style="stroke"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaLine>
                )}
                {font && (
                  <>
                    <SkiaText
                      x={primitive.start.x + 4}
                      y={primitive.start.y - 4}
                      text={primitive.sourceLabel}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                    <SkiaText
                      x={primitive.end.x - font.measureText(primitive.targetLabel).width - 4}
                      y={primitive.end.y - 4}
                      text={primitive.targetLabel}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                    <SkiaText
                      x={primitive.labelPoint.x - changeTextBounds.width / 2}
                      y={primitive.labelPoint.y - fontSize}
                      text={primitive.changeLabel}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                  </>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'projection') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const changeTextBounds = font ? font.measureText(primitive.changeLabel) : { width: 0 };
            const targetTextBounds = font ? font.measureText(primitive.targetLabel) : { width: 0 };
            const fontSize = normalizeUserDrawingFontSize(primitive.style.fontSize ?? 12);
            const strokePath = Skia.Path.Make();
            strokePath.moveTo(primitive.start.x, primitive.start.y);
            strokePath.lineTo(primitive.pivot.x, primitive.pivot.y);
            strokePath.lineTo(primitive.target.x, primitive.target.y);
            const fillPath = Skia.Path.Make();
            fillPath.moveTo(primitive.start.x, primitive.start.y);
            fillPath.lineTo(primitive.pivot.x, primitive.pivot.y);
            fillPath.lineTo(primitive.target.x, primitive.target.y);
            fillPath.close();

            return (
              <Group key={primitive.id} clip={primitive.clip} opacity={primitive.opacity}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <SkiaPath path={fillPath} color={primitive.style.fillColor} style="fill" />
                )}
                {primitive.style.lineVisible !== false && (
                  <SkiaPath
                    path={strokePath}
                    color={primitive.style.lineColor}
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    style="stroke"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaPath>
                )}
                {font && (
                  <>
                    <SkiaText
                      x={primitive.start.x + 4}
                      y={primitive.start.y - 4}
                      text={primitive.startLabel}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                    <SkiaText
                      x={primitive.pivot.x + 4}
                      y={primitive.pivot.y - 4}
                      text={primitive.pivotLabel}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                    <SkiaText
                      x={primitive.target.x - targetTextBounds.width - 4}
                      y={primitive.target.y - 4}
                      text={primitive.targetLabel}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                    <SkiaText
                      x={primitive.labelPoint.x - changeTextBounds.width / 2}
                      y={primitive.labelPoint.y - fontSize}
                      text={primitive.changeLabel}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                  </>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'sector') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const path = Skia.Path.Make();
            const [firstPoint, ...remainingPoints] = primitive.points;
            if (!firstPoint) return null;
            path.moveTo(firstPoint.x, firstPoint.y);
            for (const point of remainingPoints) {
              path.lineTo(point.x, point.y);
            }
            path.close();

            return (
              <Group key={primitive.id} clip={primitive.clip} opacity={primitive.opacity}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <SkiaPath path={path} color={primitive.style.fillColor} style="fill" />
                )}
                {primitive.style.lineVisible !== false && (
                  <SkiaPath
                    path={path}
                    color={primitive.style.lineColor}
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    style="stroke"
                    strokeJoin="round"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaPath>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'trendAngle') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const textBounds = font ? font.measureText(primitive.label) : { width: 0 };
            const labelPosition = resolveMobileUserDrawingTrendAngleLabelPosition(primitive, textBounds);

            return (
              <Group key={primitive.id} clip={primitive.clip} opacity={primitive.opacity}>
                {primitive.style.lineVisible !== false && (
                  <SkiaLine
                    p1={vec(primitive.start.x, primitive.start.y)}
                    p2={vec(primitive.end.x, primitive.end.y)}
                    color={primitive.style.lineColor}
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    style="stroke"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaLine>
                )}
                {font && (
                  <SkiaText
                    x={labelPosition.x}
                    y={labelPosition.y}
                    text={primitive.label}
                    font={font}
                    color={primitive.style.textColor ?? primitive.style.lineColor}
                  />
                )}
              </Group>
            );
          }

          if (primitive.kind === 'crossLine') {
            if (primitive.style.lineVisible === false) return null;
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);

            return (
              <Group key={primitive.id} clip={primitive.clip}>
                <SkiaLine
                  p1={vec(primitive.horizontal.start.x, primitive.horizontal.start.y)}
                  p2={vec(primitive.horizontal.end.x, primitive.horizontal.end.y)}
                  color={primitive.style.lineColor}
                  opacity={primitive.opacity}
                  strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  style="stroke"
                >
                  {dash && <DashPathEffect intervals={dash} />}
                </SkiaLine>
                <SkiaLine
                  p1={vec(primitive.vertical.start.x, primitive.vertical.start.y)}
                  p2={vec(primitive.vertical.end.x, primitive.vertical.end.y)}
                  color={primitive.style.lineColor}
                  opacity={primitive.opacity}
                  strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  style="stroke"
                >
                  {dash && <DashPathEffect intervals={dash} />}
                </SkiaLine>
              </Group>
            );
          }

          if (primitive.kind === 'pitchfork') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const fillPath = Skia.Path.Make();
            const [firstFillPoint, ...remainingFillPoints] = primitive.fill;
            if (firstFillPoint) {
              fillPath.moveTo(firstFillPoint.x, firstFillPoint.y);
              for (const point of remainingFillPoints) {
                fillPath.lineTo(point.x, point.y);
              }
              fillPath.close();
            }
            const linePath = Skia.Path.Make();
            linePath.moveTo(primitive.median.start.x, primitive.median.start.y);
            linePath.lineTo(primitive.median.end.x, primitive.median.end.y);
            linePath.moveTo(primitive.upper.start.x, primitive.upper.start.y);
            linePath.lineTo(primitive.upper.end.x, primitive.upper.end.y);
            linePath.moveTo(primitive.lower.start.x, primitive.lower.start.y);
            linePath.lineTo(primitive.lower.end.x, primitive.lower.end.y);
            for (const parallel of primitive.parallels) {
              linePath.moveTo(parallel.start.x, parallel.start.y);
              linePath.lineTo(parallel.end.x, parallel.end.y);
            }

            return (
              <Group key={primitive.id} clip={primitive.clip} opacity={primitive.opacity}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <SkiaPath path={fillPath} color={primitive.style.fillColor} style="fill" />
                )}
                {primitive.style.lineVisible !== false && (
                  <SkiaPath
                    path={linePath}
                    color={primitive.style.lineColor}
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    style="stroke"
                    strokeCap="round"
                    strokeJoin="round"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaPath>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'pitchfan') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const linePath = Skia.Path.Make();
            for (const ray of primitive.rays) {
              linePath.moveTo(ray.start.x, ray.start.y);
              linePath.lineTo(ray.end.x, ray.end.y);
            }

            return (
              <Group key={primitive.id} clip={primitive.clip} opacity={primitive.opacity}>
                {primitive.style.fillVisible !== false &&
                  primitive.style.fillColor &&
                  primitive.bands.map((band) => {
                    const path = Skia.Path.Make();
                    const [origin, first, second] = band.points;
                    path.moveTo(origin.x, origin.y);
                    path.lineTo(first.x, first.y);
                    path.lineTo(second.x, second.y);
                    path.close();
                    return (
                      <SkiaPath
                        key={`${band.fromRatio}-${band.toRatio}`}
                        path={path}
                        color={primitive.style.fillColor}
                        style="fill"
                      />
                    );
                  })}
                {primitive.style.lineVisible !== false && (
                  <SkiaPath
                    path={linePath}
                    color={primitive.style.lineColor}
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    style="stroke"
                    strokeCap="round"
                    strokeJoin="round"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaPath>
                )}
              </Group>
            );
          }

          if (
            primitive.kind === 'fibFan' ||
            primitive.kind === 'fibSpeedResistanceFan' ||
            primitive.kind === 'gannFan'
          ) {
            if (primitive.style.lineVisible === false) return null;
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);

            return (
              <Group key={primitive.id} clip={primitive.clip} opacity={primitive.opacity}>
                {primitive.rays.map((ray) => (
                  <SkiaLine
                    key={ray.ratio}
                    p1={vec(ray.start.x, ray.start.y)}
                    p2={vec(ray.end.x, ray.end.y)}
                    color={primitive.style.lineColor}
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    style="stroke"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaLine>
                ))}
                {font &&
                  primitive.rays.map((ray) => {
                    if (!ray.label || !ray.labelPoint) return null;
                    const textWidth = font.measureText(ray.label).width;
                    const x = ray.end.x >= ray.start.x ? ray.labelPoint.x - textWidth : ray.labelPoint.x;
                    return (
                      <SkiaText
                        key={`${ray.ratio}:label`}
                        x={x}
                        y={ray.labelPoint.y}
                        text={ray.label}
                        font={font}
                        color={primitive.style.textColor ?? primitive.style.lineColor}
                      />
                    );
                  })}
              </Group>
            );
          }

          if (primitive.kind === 'fibChannel') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const path = Skia.Path.Make();
            const [firstPoint, ...remainingPoints] = primitive.points;
            if (!firstPoint) return null;
            path.moveTo(firstPoint.x, firstPoint.y);
            for (const point of remainingPoints) {
              path.lineTo(point.x, point.y);
            }
            path.close();

            return (
              <Group key={primitive.id} clip={primitive.clip} opacity={primitive.opacity}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <SkiaPath path={path} color={primitive.style.fillColor} />
                )}
                {primitive.style.lineVisible !== false &&
                  primitive.levels.map((level) => (
                    <SkiaLine
                      key={`${primitive.id}:level:${level.ratio}`}
                      p1={vec(level.start.x, level.start.y)}
                      p2={vec(level.end.x, level.end.y)}
                      color={primitive.style.lineColor}
                      strokeWidth={Math.max(1, primitive.style.lineWidth)}
                      style="stroke"
                    >
                      {dash && <DashPathEffect intervals={dash} />}
                    </SkiaLine>
                  ))}
                {primitive.style.lineVisible !== false &&
                  primitive.levels.map((level) => (
                    <SkiaText
                      key={`${primitive.id}:level-label:${level.ratio}`}
                      x={level.labelPoint.x}
                      y={level.labelPoint.y}
                      text={level.label}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                  ))}
              </Group>
            );
          }

          if (
            primitive.kind === 'fibTimeZone' ||
            primitive.kind === 'trendBasedFibTime' ||
            primitive.kind === 'cyclicLines'
          ) {
            if (primitive.style.lineVisible === false) return null;
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const textColor = primitive.style.textColor ?? primitive.style.lineColor;

            return (
              <Group key={primitive.id} clip={primitive.clip} opacity={primitive.opacity}>
                {primitive.levels.map((level) => (
                  <Group key={`${primitive.id}:level:${level.ratio}`}>
                    <SkiaLine
                      p1={vec(level.start.x, level.start.y)}
                      p2={vec(level.end.x, level.end.y)}
                      color={primitive.style.lineColor}
                      strokeWidth={Math.max(1, primitive.style.lineWidth)}
                      style="stroke"
                    >
                      {dash && <DashPathEffect intervals={dash} />}
                    </SkiaLine>
                    {font && (
                      <SkiaText
                        x={level.labelPoint.x - font.measureText(level.label).width / 2}
                        y={level.labelPoint.y}
                        text={level.label}
                        color={textColor}
                        font={font}
                      />
                    )}
                  </Group>
                ))}
              </Group>
            );
          }

          if (primitive.kind === 'timeCycles') {
            if (primitive.style.lineVisible === false) return null;
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const textColor = primitive.style.textColor ?? primitive.style.lineColor;

            return (
              <Group key={primitive.id} clip={primitive.clip} opacity={primitive.opacity}>
                {primitive.cycles.map((cycle) => {
                  const path = Skia.Path.Make();
                  const [firstPoint, ...remainingPoints] = cycle.points;
                  if (firstPoint) {
                    path.moveTo(firstPoint.x, firstPoint.y);
                    for (const point of remainingPoints) {
                      path.lineTo(point.x, point.y);
                    }
                  }

                  return (
                    <Group key={`${primitive.id}:cycle:${cycle.ratio}`}>
                      <SkiaLine
                        p1={vec(cycle.startBoundary.start.x, cycle.startBoundary.start.y)}
                        p2={vec(cycle.startBoundary.end.x, cycle.startBoundary.end.y)}
                        color={primitive.style.lineColor}
                        strokeWidth={Math.max(1, primitive.style.lineWidth)}
                        style="stroke"
                      >
                        {dash && <DashPathEffect intervals={dash} />}
                      </SkiaLine>
                      <SkiaLine
                        p1={vec(cycle.endBoundary.start.x, cycle.endBoundary.start.y)}
                        p2={vec(cycle.endBoundary.end.x, cycle.endBoundary.end.y)}
                        color={primitive.style.lineColor}
                        strokeWidth={Math.max(1, primitive.style.lineWidth)}
                        style="stroke"
                      >
                        {dash && <DashPathEffect intervals={dash} />}
                      </SkiaLine>
                      {firstPoint && (
                        <SkiaPath
                          path={path}
                          color={primitive.style.lineColor}
                          strokeWidth={Math.max(1, primitive.style.lineWidth)}
                          style="stroke"
                        >
                          {dash && <DashPathEffect intervals={dash} />}
                        </SkiaPath>
                      )}
                      {font && (
                        <SkiaText
                          x={cycle.labelPoint.x - font.measureText(cycle.label).width / 2}
                          y={cycle.labelPoint.y}
                          text={cycle.label}
                          color={textColor}
                          font={font}
                        />
                      )}
                    </Group>
                  );
                })}
              </Group>
            );
          }

          if (primitive.kind === 'sineLine') {
            if (primitive.style.lineVisible === false) return null;
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const path = Skia.Path.Make();
            const [firstPoint, ...remainingPoints] = primitive.points;
            if (!firstPoint) return null;
            path.moveTo(firstPoint.x, firstPoint.y);
            for (const point of remainingPoints) {
              path.lineTo(point.x, point.y);
            }

            return (
              <Group key={primitive.id} clip={primitive.clip} opacity={primitive.opacity}>
                <SkiaPath
                  path={path}
                  color={primitive.style.lineColor}
                  strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  style="stroke"
                >
                  {dash && <DashPathEffect intervals={dash} />}
                </SkiaPath>
              </Group>
            );
          }

          if (primitive.kind === 'arrowMarker' || primitive.kind === 'icon') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const path = Skia.Path.Make();
            const [firstPoint, ...remainingPoints] = primitive.points;
            if (!firstPoint) return null;
            path.moveTo(firstPoint.x, firstPoint.y);
            for (const point of remainingPoints) {
              path.lineTo(point.x, point.y);
            }
            path.close();

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && (
                  <SkiaPath path={path} color={primitive.style.fillColor ?? primitive.style.lineColor} style="fill" />
                )}
                {primitive.style.lineVisible !== false && (
                  <SkiaPath
                    path={path}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    strokeJoin="round"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaPath>
                )}
                {primitive.style.lineVisible !== false && primitive.kind !== 'rotatedRectangle' && (
                  <SkiaLine
                    p1={vec(primitive.median.start.x, primitive.median.start.y)}
                    p2={vec(primitive.median.end.x, primitive.median.end.y)}
                    color={primitive.style.lineColor}
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    style="stroke"
                    strokeCap="round"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaLine>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'arrowMark') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const path = Skia.Path.Make();
            const [firstPoint, ...remainingPoints] = primitive.points;
            if (!firstPoint) return null;
            path.moveTo(firstPoint.x, firstPoint.y);
            for (const point of remainingPoints) {
              path.lineTo(point.x, point.y);
            }
            path.close();

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && (
                  <SkiaPath path={path} color={primitive.style.fillColor ?? primitive.style.lineColor} style="fill" />
                )}
                {primitive.style.lineVisible !== false && (
                  <SkiaPath
                    path={path}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    strokeJoin="round"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaPath>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'rectangle') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <Rect
                    x={primitive.rect.x}
                    y={primitive.rect.y}
                    width={primitive.rect.width}
                    height={primitive.rect.height}
                    color={primitive.style.fillColor}
                  />
                )}
                {primitive.style.lineVisible !== false && (
                  <Rect
                    x={primitive.rect.x}
                    y={primitive.rect.y}
                    width={primitive.rect.width}
                    height={primitive.rect.height}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </Rect>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'image') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const label = primitive.src ? primitive.alt || 'Image' : 'Image';
            const textBounds = font ? font.measureText(label) : { width: 0 };

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && (
                  <Rect
                    x={primitive.rect.x}
                    y={primitive.rect.y}
                    width={primitive.rect.width}
                    height={primitive.rect.height}
                    color={primitive.style.fillColor ?? 'rgba(127, 127, 127, 0.12)'}
                    style="fill"
                  />
                )}
                {primitive.style.lineVisible !== false && (
                  <>
                    <SkiaLine
                      p1={vec(primitive.rect.x, primitive.rect.y)}
                      p2={vec(primitive.rect.x + primitive.rect.width, primitive.rect.y + primitive.rect.height)}
                      color={primitive.style.lineColor}
                      strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    >
                      {dash && <DashPathEffect intervals={dash} />}
                    </SkiaLine>
                    <SkiaLine
                      p1={vec(primitive.rect.x + primitive.rect.width, primitive.rect.y)}
                      p2={vec(primitive.rect.x, primitive.rect.y + primitive.rect.height)}
                      color={primitive.style.lineColor}
                      strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    >
                      {dash && <DashPathEffect intervals={dash} />}
                    </SkiaLine>
                  </>
                )}
                {font && (
                  <SkiaText
                    x={primitive.rect.x + primitive.rect.width / 2 - textBounds.width / 2}
                    y={primitive.rect.y + primitive.rect.height / 2 + 4}
                    text={label}
                    font={font}
                    color={primitive.style.textColor ?? primitive.style.lineColor}
                  />
                )}
                <LoadedUserDrawingSkiaImage primitive={primitive} />
                {primitive.style.lineVisible !== false && (
                  <Rect
                    x={primitive.rect.x}
                    y={primitive.rect.y}
                    width={primitive.rect.width}
                    height={primitive.rect.height}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </Rect>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'gannBox' || primitive.kind === 'gannSquare' || primitive.kind === 'gannSquareFixed') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const textColor = primitive.style.textColor ?? primitive.style.lineColor;
            const path = Skia.Path.Make();
            for (const level of primitive.levels) {
              path.moveTo(level.horizontal.start.x, level.horizontal.start.y);
              path.lineTo(level.horizontal.end.x, level.horizontal.end.y);
              path.moveTo(level.vertical.start.x, level.vertical.start.y);
              path.lineTo(level.vertical.end.x, level.vertical.end.y);
            }
            for (const angle of primitive.angles) {
              path.moveTo(angle.start.x, angle.start.y);
              path.lineTo(angle.end.x, angle.end.y);
            }

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <Rect
                    x={primitive.rect.x}
                    y={primitive.rect.y}
                    width={primitive.rect.width}
                    height={primitive.rect.height}
                    color={primitive.style.fillColor}
                  />
                )}
                {primitive.style.lineVisible !== false && (
                  <SkiaPath
                    path={path}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    strokeCap="round"
                    strokeJoin="round"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaPath>
                )}
                {primitive.style.lineVisible !== false &&
                  font &&
                  primitive.levels.map((level) => (
                    <SkiaText
                      key={`${primitive.id}:level:${level.ratio}:label`}
                      x={level.labelPoint.x}
                      y={level.labelPoint.y}
                      text={level.label}
                      color={textColor}
                      font={font}
                    />
                  ))}
              </Group>
            );
          }

          if (primitive.kind === 'circle') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <Circle
                    cx={primitive.center.x}
                    cy={primitive.center.y}
                    r={primitive.radius}
                    color={primitive.style.fillColor}
                  />
                )}
                {primitive.style.lineVisible !== false && (
                  <Circle
                    cx={primitive.center.x}
                    cy={primitive.center.y}
                    r={primitive.radius}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </Circle>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'fibCircles') {
            if (primitive.style.lineVisible === false) return null;
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const textColor = primitive.style.textColor ?? primitive.style.lineColor;

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.circles.map((circle) => (
                  <Group key={`${primitive.id}:circle:${circle.ratio}`}>
                    <Circle
                      cx={primitive.center.x}
                      cy={primitive.center.y}
                      r={circle.radius}
                      color={primitive.style.lineColor}
                      style="stroke"
                      strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    >
                      {dash && <DashPathEffect intervals={dash} />}
                    </Circle>
                    {font && (
                      <SkiaText
                        x={circle.labelPoint.x - font.measureText(circle.label).width / 2}
                        y={circle.labelPoint.y}
                        text={circle.label}
                        color={textColor}
                        font={font}
                      />
                    )}
                  </Group>
                ))}
              </Group>
            );
          }

          if (primitive.kind === 'fibArcs' || primitive.kind === 'fibSpeedResistanceArcs') {
            if (primitive.style.lineVisible === false) return null;
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const textColor = primitive.style.textColor ?? primitive.style.lineColor;

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.arcs.map((arc) => {
                  const path = Skia.Path.Make();
                  const startDeg = (arc.startAngle * 180) / Math.PI;
                  const sweepDeg = ((arc.endAngle - arc.startAngle) * 180) / Math.PI;
                  path.arcToOval(
                    Skia.XYWHRect(
                      primitive.center.x - arc.radius,
                      primitive.center.y - arc.radius,
                      arc.radius * 2,
                      arc.radius * 2,
                    ),
                    startDeg,
                    sweepDeg,
                    false,
                  );
                  return (
                    <Group key={`${primitive.id}:arc:${arc.ratio}`}>
                      <SkiaPath
                        path={path}
                        color={primitive.style.lineColor}
                        style="stroke"
                        strokeWidth={Math.max(1, primitive.style.lineWidth)}
                      >
                        {dash && <DashPathEffect intervals={dash} />}
                      </SkiaPath>
                      {font && (
                        <SkiaText
                          x={arc.labelPoint.x - font.measureText(arc.label).width / 2}
                          y={arc.labelPoint.y}
                          text={arc.label}
                          color={textColor}
                          font={font}
                        />
                      )}
                    </Group>
                  );
                })}
              </Group>
            );
          }

          if (primitive.kind === 'fibWedge') {
            if (primitive.style.lineVisible === false && primitive.style.fillVisible === false) return null;
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const textColor = primitive.style.textColor ?? primitive.style.lineColor;
            const boundaryPath = Skia.Path.Make();
            for (const boundary of primitive.boundaries) {
              boundaryPath.moveTo(boundary.start.x, boundary.start.y);
              boundaryPath.lineTo(boundary.end.x, boundary.end.y);
            }
            const outerArc = primitive.arcs[primitive.arcs.length - 1];
            const fillPath = Skia.Path.Make();
            fillPath.moveTo(primitive.center.x, primitive.center.y);
            if (outerArc) {
              fillPath.lineTo(
                primitive.center.x + Math.cos(outerArc.startAngle) * primitive.baseRadius,
                primitive.center.y + Math.sin(outerArc.startAngle) * primitive.baseRadius,
              );
              fillPath.arcToOval(
                Skia.XYWHRect(
                  primitive.center.x - primitive.baseRadius,
                  primitive.center.y - primitive.baseRadius,
                  primitive.baseRadius * 2,
                  primitive.baseRadius * 2,
                ),
                (outerArc.startAngle * 180) / Math.PI,
                ((outerArc.endAngle - outerArc.startAngle) * 180) / Math.PI,
                false,
              );
              fillPath.close();
            }

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <SkiaPath path={fillPath} color={primitive.style.fillColor} style="fill" />
                )}
                {primitive.style.lineVisible !== false && (
                  <>
                    <SkiaPath
                      path={boundaryPath}
                      color={primitive.style.lineColor}
                      style="stroke"
                      strokeWidth={Math.max(1, primitive.style.lineWidth)}
                      strokeCap="round"
                    >
                      {dash && <DashPathEffect intervals={dash} />}
                    </SkiaPath>
                    {primitive.arcs.map((arc) => {
                      const path = Skia.Path.Make();
                      const startDeg = (arc.startAngle * 180) / Math.PI;
                      const sweepDeg = ((arc.endAngle - arc.startAngle) * 180) / Math.PI;
                      path.arcToOval(
                        Skia.XYWHRect(
                          primitive.center.x - arc.radius,
                          primitive.center.y - arc.radius,
                          arc.radius * 2,
                          arc.radius * 2,
                        ),
                        startDeg,
                        sweepDeg,
                        false,
                      );
                      return (
                        <Group key={`${primitive.id}:arc:${arc.ratio}`}>
                          <SkiaPath
                            path={path}
                            color={primitive.style.lineColor}
                            style="stroke"
                            strokeWidth={Math.max(1, primitive.style.lineWidth)}
                            strokeCap="round"
                          >
                            {dash && <DashPathEffect intervals={dash} />}
                          </SkiaPath>
                          {font && (
                            <SkiaText
                              x={arc.labelPoint.x - font.measureText(arc.label).width / 2}
                              y={arc.labelPoint.y}
                              text={arc.label}
                              color={textColor}
                              font={font}
                            />
                          )}
                        </Group>
                      );
                    })}
                  </>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'ellipse') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <Oval
                    x={primitive.rect.x}
                    y={primitive.rect.y}
                    width={primitive.rect.width}
                    height={primitive.rect.height}
                    color={primitive.style.fillColor}
                  />
                )}
                {primitive.style.lineVisible !== false && (
                  <Oval
                    x={primitive.rect.x}
                    y={primitive.rect.y}
                    width={primitive.rect.width}
                    height={primitive.rect.height}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </Oval>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'trianglePattern') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const fillPath = Skia.Path.Make();
            const [firstFillPoint, ...remainingFillPoints] = primitive.polygon;
            if (!firstFillPoint) return null;
            fillPath.moveTo(firstFillPoint.x, firstFillPoint.y);
            for (const point of remainingFillPoints) {
              fillPath.lineTo(point.x, point.y);
            }
            fillPath.close();

            const boundaryPath = Skia.Path.Make();
            for (const boundary of primitive.boundaries) {
              boundaryPath.moveTo(boundary.start.x, boundary.start.y);
              boundaryPath.lineTo(boundary.end.x, boundary.end.y);
            }
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <SkiaPath path={fillPath} color={primitive.style.fillColor} style="fill" />
                )}
                {primitive.style.lineVisible !== false && (
                  <SkiaPath
                    path={boundaryPath}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    strokeCap="round"
                    strokeJoin="round"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaPath>
                )}
                {font &&
                  primitive.labels.map((label) => {
                    const bounds = font.measureText(label.text);
                    return (
                      <SkiaText
                        key={`${primitive.id}:label:${label.text}`}
                        x={label.point.x - bounds.width / 2}
                        y={label.point.y - 6}
                        text={label.text}
                        font={font}
                        color={primitive.style.textColor ?? primitive.style.lineColor}
                      />
                    );
                  })}
              </Group>
            );
          }

          if (primitive.kind === 'headShouldersPattern') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const path = Skia.Path.Make();
            const [firstPoint, ...remainingPoints] = primitive.points;
            if (!firstPoint) return null;
            path.moveTo(firstPoint.x, firstPoint.y);
            for (const point of remainingPoints) {
              path.lineTo(point.x, point.y);
            }
            path.moveTo(primitive.neckline.start.x, primitive.neckline.start.y);
            path.lineTo(primitive.neckline.end.x, primitive.neckline.end.y);

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.lineVisible !== false && (
                  <SkiaPath
                    path={path}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    strokeCap="round"
                    strokeJoin="round"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaPath>
                )}
                {font &&
                  primitive.labels.map((label) => {
                    const bounds = font.measureText(label.text);
                    return (
                      <SkiaText
                        key={`${primitive.id}:label:${label.text}`}
                        x={label.point.x - bounds.width / 2}
                        y={label.point.y - 6}
                        text={label.text}
                        font={font}
                        color={primitive.style.textColor ?? primitive.style.lineColor}
                      />
                    );
                  })}
              </Group>
            );
          }

          if (primitive.kind === 'doubleCurve') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const path = Skia.Path.Make();
            path.moveTo(primitive.start.x, primitive.start.y);
            path.cubicTo(
              primitive.firstControl.x,
              primitive.firstControl.y,
              primitive.secondControl.x,
              primitive.secondControl.y,
              primitive.end.x,
              primitive.end.y,
            );

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.lineVisible !== false && (
                  <SkiaPath
                    path={path}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    strokeCap="round"
                    strokeJoin="round"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaPath>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'fibSpiral') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const path = Skia.Path.Make();
            const [firstPoint, ...remainingPoints] = primitive.points;
            if (!firstPoint) return null;
            path.moveTo(firstPoint.x, firstPoint.y);
            for (const point of remainingPoints) {
              path.lineTo(point.x, point.y);
            }

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.lineVisible !== false && (
                  <SkiaPath
                    path={path}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    strokeCap="round"
                    strokeJoin="round"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaPath>
                )}
                {primitive.style.lineVisible !== false &&
                  font &&
                  primitive.labels.map((label) => {
                    const bounds = font.measureText(label.text);
                    return (
                      <SkiaText
                        key={`${primitive.id}:label:${label.text}`}
                        x={label.point.x - bounds.width / 2}
                        y={label.point.y - 6}
                        text={label.text}
                        font={font}
                        color={primitive.style.textColor ?? primitive.style.lineColor}
                      />
                    );
                  })}
              </Group>
            );
          }

          if (
            primitive.kind === 'path' ||
            primitive.kind === 'brush' ||
            primitive.kind === 'highlighter' ||
            primitive.kind === 'curve' ||
            primitive.kind === 'arc' ||
            primitive.kind === 'abcdPattern' ||
            primitive.kind === 'xabcdPattern' ||
            primitive.kind === 'cypherPattern' ||
            primitive.kind === 'threeDrivesPattern' ||
            primitive.kind === 'elliottImpulseWave' ||
            primitive.kind === 'elliottCorrectiveWave' ||
            primitive.kind === 'elliottDoubleComboWave' ||
            primitive.kind === 'elliottTripleComboWave' ||
            primitive.kind === 'elliottTriangleWave'
          ) {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font =
              primitive.kind === 'xabcdPattern' ||
              primitive.kind === 'cypherPattern' ||
              primitive.kind === 'abcdPattern' ||
              primitive.kind === 'threeDrivesPattern' ||
              primitive.kind === 'elliottImpulseWave' ||
              primitive.kind === 'elliottCorrectiveWave' ||
              primitive.kind === 'elliottDoubleComboWave' ||
              primitive.kind === 'elliottTripleComboWave' ||
              primitive.kind === 'elliottTriangleWave'
                ? getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily)
                : null;
            const path = Skia.Path.Make();
            const [firstPoint, ...remainingPoints] = primitive.points;
            if (!firstPoint) return null;
            path.moveTo(firstPoint.x, firstPoint.y);
            for (const point of remainingPoints) {
              path.lineTo(point.x, point.y);
            }

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.lineVisible !== false && (
                  <SkiaPath
                    path={path}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    strokeCap="round"
                    strokeJoin="round"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaPath>
                )}
                {(primitive.kind === 'xabcdPattern' ||
                  primitive.kind === 'cypherPattern' ||
                  primitive.kind === 'abcdPattern' ||
                  primitive.kind === 'threeDrivesPattern' ||
                  primitive.kind === 'elliottImpulseWave' ||
                  primitive.kind === 'elliottCorrectiveWave' ||
                  primitive.kind === 'elliottDoubleComboWave' ||
                  primitive.kind === 'elliottTripleComboWave' ||
                  primitive.kind === 'elliottTriangleWave') &&
                  font &&
                  primitive.labels.map((label) => {
                    const bounds = font.measureText(label.text);
                    return (
                      <SkiaText
                        key={`${primitive.id}:label:${label.text}`}
                        x={label.point.x - bounds.width / 2}
                        y={label.point.y - 6}
                        text={label.text}
                        font={font}
                        color={primitive.style.textColor ?? primitive.style.lineColor}
                      />
                    );
                  })}
              </Group>
            );
          }

          if (primitive.kind === 'anchoredVwap') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const path = Skia.Path.Make();
            const [firstPoint, ...remainingPoints] = primitive.points;
            if (!firstPoint) return null;
            path.moveTo(firstPoint.x, firstPoint.y);
            for (const point of remainingPoints) {
              path.lineTo(point.x, point.y);
            }

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.lineVisible !== false && (
                  <SkiaPath
                    path={path}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    strokeCap="round"
                    strokeJoin="round"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaPath>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'anchoredVolumeProfile' || primitive.kind === 'fixedRangeVolumeProfile') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const fillColor = primitive.style.fillColor ?? primitive.style.lineColor;

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false &&
                  primitive.bins.map((bin) =>
                    bin.volume > 0 && bin.rect.width > 0 && bin.rect.height > 0 ? (
                      <Rect
                        key={`${primitive.id}:bin:${bin.priceMin}:${bin.priceMax}`}
                        x={bin.rect.x}
                        y={bin.rect.y}
                        width={bin.rect.width}
                        height={bin.rect.height}
                        color={fillColor}
                        style="fill"
                      />
                    ) : null,
                  )}
                {primitive.style.lineVisible !== false && (
                  <Rect
                    x={primitive.bounds.x}
                    y={primitive.bounds.y}
                    width={primitive.bounds.width}
                    height={primitive.bounds.height}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </Rect>
                )}
                {primitive.style.lineVisible !== false &&
                  primitive.guides.map((guide) => {
                    const path = Skia.Path.Make();
                    path.moveTo(guide.segment.start.x, guide.segment.start.y);
                    path.lineTo(guide.segment.end.x, guide.segment.end.y);
                    const guideDash = guide.kind === 'pointOfControl' ? null : [4, 3];
                    return (
                      <SkiaPath
                        key={`${primitive.id}:guide:${guide.kind}`}
                        path={path}
                        color={primitive.style.lineColor}
                        style="stroke"
                        strokeWidth={Math.max(1, primitive.style.lineWidth)}
                        strokeCap="round"
                        strokeJoin="round"
                      >
                        {guideDash && <DashPathEffect intervals={guideDash} />}
                      </SkiaPath>
                    );
                  })}
              </Group>
            );
          }

          if (primitive.kind === 'triangle') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const path = Skia.Path.Make();
            const [firstPoint, ...remainingPoints] = primitive.points;
            if (!firstPoint) return null;
            path.moveTo(firstPoint.x, firstPoint.y);
            for (const point of remainingPoints) {
              path.lineTo(point.x, point.y);
            }
            path.close();

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <SkiaPath path={path} color={primitive.style.fillColor} />
                )}
                {primitive.style.lineVisible !== false && (
                  <SkiaPath
                    path={path}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    strokeCap="round"
                    strokeJoin="round"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaPath>
                )}
              </Group>
            );
          }

          if (
            primitive.kind === 'parallelChannel' ||
            primitive.kind === 'regressionTrend' ||
            primitive.kind === 'rotatedRectangle' ||
            primitive.kind === 'flatTopBottom' ||
            primitive.kind === 'disjointChannel'
          ) {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const path = Skia.Path.Make();
            const [firstPoint, ...remainingPoints] = primitive.points;
            if (!firstPoint) return null;
            path.moveTo(firstPoint.x, firstPoint.y);
            for (const point of remainingPoints) {
              path.lineTo(point.x, point.y);
            }
            path.close();

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <SkiaPath path={path} color={primitive.style.fillColor} />
                )}
                {primitive.style.lineVisible !== false && (
                  <SkiaPath
                    path={path}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    strokeCap="round"
                    strokeJoin="round"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaPath>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'riskRewardPosition') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const rewardTextBounds = font ? font.measureText(primitive.rewardLabel) : { width: 0 };
            const riskTextBounds = font ? font.measureText(primitive.riskLabel) : { width: 0 };
            const ratioTextBounds = font ? font.measureText(primitive.ratioLabel) : { width: 0 };
            const rewardLabelPosition = resolveMobileUserDrawingRiskRewardLabelPosition(
              { labelPoint: primitive.rewardLabelPoint, style: primitive.style },
              rewardTextBounds,
            );
            const riskLabelPosition = resolveMobileUserDrawingRiskRewardLabelPosition(
              { labelPoint: primitive.riskLabelPoint, style: primitive.style },
              riskTextBounds,
            );
            const ratioLabelPosition = resolveMobileUserDrawingRiskRewardLabelPosition(
              { labelPoint: primitive.ratioLabelPoint, style: primitive.style },
              ratioTextBounds,
            );

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && (
                  <>
                    <Rect
                      x={primitive.profitRect.x}
                      y={primitive.profitRect.y}
                      width={primitive.profitRect.width}
                      height={primitive.profitRect.height}
                      color="rgba(34, 197, 94, 0.18)"
                    />
                    <Rect
                      x={primitive.riskRect.x}
                      y={primitive.riskRect.y}
                      width={primitive.riskRect.width}
                      height={primitive.riskRect.height}
                      color="rgba(244, 63, 94, 0.18)"
                    />
                  </>
                )}
                {primitive.style.lineVisible !== false && (
                  <>
                    <Rect
                      x={primitive.profitRect.x}
                      y={primitive.profitRect.y}
                      width={primitive.profitRect.width}
                      height={primitive.profitRect.height}
                      color="#22c55e"
                      style="stroke"
                      strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    >
                      {dash && <DashPathEffect intervals={dash} />}
                    </Rect>
                    <Rect
                      x={primitive.riskRect.x}
                      y={primitive.riskRect.y}
                      width={primitive.riskRect.width}
                      height={primitive.riskRect.height}
                      color="#f43f5e"
                      style="stroke"
                      strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    >
                      {dash && <DashPathEffect intervals={dash} />}
                    </Rect>
                    {[primitive.targetLine, primitive.entryLine, primitive.stopLine].map((line, index) => (
                      <SkiaLine
                        key={`${primitive.id}:line:${index}`}
                        p1={vec(line.start.x, line.start.y)}
                        p2={vec(line.end.x, line.end.y)}
                        color={primitive.style.lineColor}
                        strokeWidth={Math.max(1, primitive.style.lineWidth)}
                        style="stroke"
                      >
                        {dash && <DashPathEffect intervals={dash} />}
                      </SkiaLine>
                    ))}
                  </>
                )}
                {font && (
                  <>
                    <SkiaText
                      x={rewardLabelPosition.x}
                      y={rewardLabelPosition.y}
                      text={primitive.rewardLabel}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                    <SkiaText
                      x={riskLabelPosition.x}
                      y={riskLabelPosition.y}
                      text={primitive.riskLabel}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                    <SkiaText
                      x={ratioLabelPosition.x}
                      y={ratioLabelPosition.y}
                      text={primitive.ratioLabel}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                  </>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'barsPattern') {
            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.bars.map((bar) => {
                  const color = bar.up ? '#22c55e' : '#f43f5e';
                  const bodyTop = Math.min(bar.openY, bar.closeY);
                  const bodyHeight = Math.max(1, Math.abs(bar.closeY - bar.openY));
                  const bodyX = bar.x - bar.bodyWidth / 2;

                  return (
                    <Group key={`${primitive.id}:bar:${bar.time}`}>
                      {primitive.style.lineVisible !== false && (
                        <SkiaLine
                          p1={vec(bar.x, bar.highY)}
                          p2={vec(bar.x, bar.lowY)}
                          color={color}
                          strokeWidth={Math.max(1, primitive.style.lineWidth)}
                          style="stroke"
                        />
                      )}
                      {primitive.style.fillVisible !== false && (
                        <Rect x={bodyX} y={bodyTop} width={bar.bodyWidth} height={bodyHeight} color={color} />
                      )}
                      {primitive.style.lineVisible !== false && (
                        <Rect
                          x={bodyX}
                          y={bodyTop}
                          width={bar.bodyWidth}
                          height={bodyHeight}
                          color={primitive.style.lineColor}
                          style="stroke"
                          strokeWidth={Math.max(1, primitive.style.lineWidth)}
                        />
                      )}
                    </Group>
                  );
                })}
              </Group>
            );
          }

          if (primitive.kind === 'priceRange') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const textBounds = font ? font.measureText(primitive.label) : { width: 0 };
            const labelPosition = resolveMobileUserDrawingPriceRangeLabelPosition(primitive, textBounds);

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <Rect
                    x={primitive.rect.x}
                    y={primitive.rect.y}
                    width={primitive.rect.width}
                    height={primitive.rect.height}
                    color={primitive.style.fillColor}
                  />
                )}
                {primitive.style.lineVisible !== false && (
                  <Rect
                    x={primitive.rect.x}
                    y={primitive.rect.y}
                    width={primitive.rect.width}
                    height={primitive.rect.height}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </Rect>
                )}
                {font && (
                  <SkiaText
                    x={labelPosition.x}
                    y={labelPosition.y}
                    text={primitive.label}
                    font={font}
                    color={primitive.style.textColor ?? primitive.style.lineColor}
                  />
                )}
              </Group>
            );
          }

          if (primitive.kind === 'datePriceRange') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const priceTextBounds = font ? font.measureText(primitive.priceLabel) : { width: 0 };
            const dateTextBounds = font ? font.measureText(primitive.dateLabel) : { width: 0 };
            const priceLabelPosition = resolveMobileUserDrawingMeasurementLabelPosition(
              { labelPoint: primitive.priceLabelPoint, style: primitive.style },
              priceTextBounds,
            );
            const dateLabelPosition = resolveMobileUserDrawingMeasurementLabelPosition(
              { labelPoint: primitive.dateLabelPoint, style: primitive.style },
              dateTextBounds,
            );

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <Rect
                    x={primitive.rect.x}
                    y={primitive.rect.y}
                    width={primitive.rect.width}
                    height={primitive.rect.height}
                    color={primitive.style.fillColor}
                  />
                )}
                {primitive.style.lineVisible !== false && (
                  <Rect
                    x={primitive.rect.x}
                    y={primitive.rect.y}
                    width={primitive.rect.width}
                    height={primitive.rect.height}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </Rect>
                )}
                {font && (
                  <>
                    <SkiaText
                      x={priceLabelPosition.x}
                      y={priceLabelPosition.y}
                      text={primitive.priceLabel}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                    <SkiaText
                      x={dateLabelPosition.x}
                      y={dateLabelPosition.y}
                      text={primitive.dateLabel}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                  </>
                )}
              </Group>
            );
          }

          if (
            primitive.kind === 'fibRetracement' ||
            primitive.kind === 'fibExtension' ||
            primitive.kind === 'trendBasedFibExtension'
          ) {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.lineVisible !== false &&
                  primitive.levels.map((level) => (
                    <SkiaLine
                      key={`${primitive.id}:level:${level.ratio}:line`}
                      p1={vec(level.start.x, level.start.y)}
                      p2={vec(level.end.x, level.end.y)}
                      color={primitive.style.lineColor}
                      strokeWidth={Math.max(1, primitive.style.lineWidth)}
                      strokeCap="round"
                    >
                      {dash && <DashPathEffect intervals={dash} />}
                    </SkiaLine>
                  ))}
                {font &&
                  primitive.levels.map((level) => (
                    <SkiaText
                      key={`${primitive.id}:level:${level.ratio}:label`}
                      x={level.start.x + 4}
                      y={level.start.y - 2}
                      text={level.label}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                  ))}
              </Group>
            );
          }

          if (primitive.kind === 'dateRange') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const textBounds = font ? font.measureText(primitive.label) : { width: 0 };
            const labelPosition = resolveMobileUserDrawingPriceRangeLabelPosition(primitive, textBounds);

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <Rect
                    x={primitive.rect.x}
                    y={primitive.rect.y}
                    width={primitive.rect.width}
                    height={primitive.rect.height}
                    color={primitive.style.fillColor}
                  />
                )}
                {primitive.style.lineVisible !== false && (
                  <Rect
                    x={primitive.rect.x}
                    y={primitive.rect.y}
                    width={primitive.rect.width}
                    height={primitive.rect.height}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </Rect>
                )}
                {font && (
                  <SkiaText
                    x={labelPosition.x}
                    y={labelPosition.y}
                    text={primitive.label}
                    font={font}
                    color={primitive.style.textColor ?? primitive.style.lineColor}
                  />
                )}
              </Group>
            );
          }

          if (primitive.kind === 'pin') {
            const radius = primitive.radius;
            const stem = radius * 1.8;
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const color = primitive.style.lineColor;
            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                <Circle
                  cx={primitive.point.x}
                  cy={primitive.point.y - stem}
                  r={radius}
                  color={primitive.style.fillColor ?? color}
                />
                <Circle
                  cx={primitive.point.x}
                  cy={primitive.point.y - stem}
                  r={radius}
                  color={color}
                  style="stroke"
                  strokeWidth={1}
                >
                  {dash && <DashPathEffect intervals={dash} />}
                </Circle>
                <SkiaLine
                  p1={vec(primitive.point.x, primitive.point.y - stem + radius)}
                  p2={vec(primitive.point.x, primitive.point.y)}
                  color={color}
                  strokeWidth={Math.max(1, primitive.style.lineWidth)}
                >
                  {dash && <DashPathEffect intervals={dash} />}
                </SkiaLine>
              </Group>
            );
          }

          if (isMobileUserDrawingTextBoxPrimitive(primitive)) {
            const textPrimitive: MobileUserDrawingTextBoxPrimitive = primitive;
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            if (!font) return null;
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const textWrapWidth = primitive.style.textWrap ? primitive.style.textMaxWidth : undefined;
            const measuredLines = measureUserDrawingTextLines(
              primitive.text,
              (line) => font.measureText(line).width,
              textWrapWidth === undefined
                ? undefined
                : Math.max(1, textWrapWidth - DEFAULT_USER_DRAWING_TEXT_LABEL_PADDING * 2),
            );
            const textLines = measuredLines.map((line) => line.text);
            const measuredWidths = measuredLines.map((line) => line.width);
            const layout =
              textPrimitive.kind === 'balloon'
                ? resolveMobileUserDrawingBalloonLayout(textPrimitive, measuredWidths, {
                    lines: textLines,
                    boxWidth: textWrapWidth,
                  })
                : resolveMobileUserDrawingTextLabelLayout(textPrimitive, measuredWidths, {
                    lines: textLines,
                    boxWidth: textWrapWidth,
                  });
            const balloonTailPath = textPrimitive.kind === 'balloon' ? Skia.Path.Make() : null;
            if (balloonTailPath && 'tail' in layout) {
              balloonTailPath.moveTo(layout.tail.left.x, layout.tail.left.y);
              balloonTailPath.lineTo(layout.tail.tip.x, layout.tail.tip.y);
              balloonTailPath.lineTo(layout.tail.right.x, layout.tail.right.y);
              balloonTailPath.close();
            }

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {(primitive.kind === 'callout' || primitive.kind === 'priceNote') && (
                  <SkiaLine
                    p1={vec(primitive.tip.x, primitive.tip.y)}
                    p2={vec(primitive.point.x, primitive.point.y)}
                    color={primitive.style.lineColor}
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaLine>
                )}
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <>
                    <Rect
                      x={layout.box.x}
                      y={layout.box.y}
                      width={layout.box.width}
                      height={layout.box.height}
                      color={primitive.style.fillColor}
                    />
                    {balloonTailPath && <SkiaPath path={balloonTailPath} color={primitive.style.fillColor} />}
                  </>
                )}
                {primitive.style.lineVisible !== false && (
                  <>
                    <Rect
                      x={layout.box.x}
                      y={layout.box.y}
                      width={layout.box.width}
                      height={layout.box.height}
                      color={primitive.style.lineColor}
                      style="stroke"
                      strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    >
                      {dash && <DashPathEffect intervals={dash} />}
                    </Rect>
                    {balloonTailPath && (
                      <SkiaPath
                        path={balloonTailPath}
                        color={primitive.style.lineColor}
                        style="stroke"
                        strokeWidth={Math.max(1, primitive.style.lineWidth)}
                      >
                        {dash && <DashPathEffect intervals={dash} />}
                      </SkiaPath>
                    )}
                  </>
                )}
                {layout.lines.map((line, index) => (
                  <UserDrawingSkiaText
                    key={`${primitive.id}:line:${index}`}
                    x={line.x}
                    y={line.y}
                    text={line.text}
                    font={font}
                    color={primitive.style.textColor ?? primitive.style.lineColor}
                    style={primitive.style}
                    underlineWidth={font.measureText(line.text).width}
                    fontSize={fontSize}
                  />
                ))}
              </Group>
            );
          }

          if (primitive.kind === 'table') {
            const fontSize = normalizeUserDrawingFontSize(primitive.style.fontSize ?? 12);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            if (!font) return null;
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <Rect
                    x={primitive.table.bounds.x}
                    y={primitive.table.bounds.y}
                    width={primitive.table.bounds.width}
                    height={primitive.table.bounds.height}
                    color={primitive.style.fillColor}
                  />
                )}
                {primitive.style.lineVisible !== false &&
                  primitive.table.cells.map((cell) => (
                    <Rect
                      key={`${primitive.id}:cell:${cell.row}:${cell.column}`}
                      x={cell.rect.x}
                      y={cell.rect.y}
                      width={cell.rect.width}
                      height={cell.rect.height}
                      color={primitive.style.lineColor}
                      style="stroke"
                      strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    >
                      {dash && <DashPathEffect intervals={dash} />}
                    </Rect>
                  ))}
                {primitive.table.cells.map((cell) => {
                  const textWidth = font.measureText(cell.text).width;
                  const textX =
                    primitive.textAlign === 'center'
                      ? cell.rect.x + cell.rect.width / 2 - textWidth / 2
                      : primitive.textAlign === 'right'
                        ? cell.rect.x + cell.rect.width - 10 - textWidth
                        : cell.textPoint.x;
                  return (
                    <UserDrawingSkiaText
                      key={`${primitive.id}:text:${cell.row}:${cell.column}`}
                      x={textX}
                      y={cell.textPoint.y + fontSize / 2 - 2}
                      text={cell.text}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                      style={primitive.style}
                      underlineWidth={textWidth}
                      fontSize={fontSize}
                    />
                  );
                })}
              </Group>
            );
          }

          if (primitive.kind !== 'handle') return null;

          return (
            <Group key={primitive.id} clip={primitive.clip}>
              <Circle
                cx={primitive.point.x}
                cy={primitive.point.y}
                r={primitive.radius}
                color={primitive.fillColor}
                style="fill"
              />
              <Circle
                cx={primitive.point.x}
                cy={primitive.point.y}
                r={primitive.radius}
                color={primitive.strokeColor}
                style="stroke"
                strokeWidth={1}
              />
            </Group>
          );
        })}

        {/* Crosshair lines mirror the web overlay and avoid RN dashed-border gaps on iOS. */}
        {crosshairOverlay && (
          <Group>
            <SkiaLine
              p1={vec(crosshairOverlay.x, crosshairOverlay.chartTop)}
              p2={vec(crosshairOverlay.x, crosshairOverlay.chartBottom)}
              color={crosshairOverlay.color}
              strokeWidth={1}
              style="stroke"
            >
              <DashPathEffect intervals={[4, 4]} />
            </SkiaLine>

            {crosshairOverlay.showHorizontal && (
              <SkiaLine
                p1={vec(crosshairOverlay.chartLeft, crosshairOverlay.y)}
                p2={vec(crosshairOverlay.horizontalRight, crosshairOverlay.y)}
                color={crosshairOverlay.color}
                strokeWidth={1}
                style="stroke"
              >
                <DashPathEffect intervals={[4, 4]} />
              </SkiaLine>
            )}
          </Group>
        )}

        {/* Bracket drag preview (TP/SL dashed line + label) */}
        {bracketPreview && bracketFont && (
          <Group>
            {/* Dashed horizontal line at drag price */}
            <SkiaLine
              p1={vec(bracketPreview.chartLeft, bracketPreview.y)}
              p2={vec(bracketPreview.chartRight, bracketPreview.y)}
              color={bracketPreview.color}
              strokeWidth={1.5}
              style="stroke"
            >
              <DashPathEffect intervals={[6, 4]} />
            </SkiaLine>

            {/* Label background */}
            <Rect
              x={bracketPreview.chartRight - 160}
              y={bracketPreview.y - 18}
              width={155}
              height={16}
              color="rgba(19, 23, 34, 0.9)"
            />
            {/* Label border */}
            <Rect
              x={bracketPreview.chartRight - 160}
              y={bracketPreview.y - 18}
              width={155}
              height={16}
              color={bracketPreview.color}
              style="stroke"
              strokeWidth={1}
            />

            {/* Label text */}
            <SkiaText
              x={bracketPreview.chartRight - 156}
              y={bracketPreview.y - 6}
              text={bracketPreview.labelText}
              font={bracketFont}
              color={bracketPreview.pnl >= 0 ? '#22c55e' : '#ef4444'}
            />
          </Group>
        )}
      </Canvas>

      {/* Layer 2: Interactive RN Layer (order lines, crosshair, etc.) */}
      <View style={[styles.absoluteFill, styles.interactiveLayer]} pointerEvents="box-none">
        {/* Text labels from Skia renderer */}
        {textItems.map((item, index) => (
          <Text key={`${item.text}-${item.x}-${item.y}-${index}`} style={getTextStyle(item)} numberOfLines={1}>
            {item.text}
          </Text>
        ))}

        {/* Order lines */}
        {viewport &&
          orderLines?.map((order) => (
            <OrderLineComponent
              key={order.id}
              order={order}
              viewport={viewport}
              dimensions={chartDimensions}
              pricePrecision={pricePrecision}
              useNarrowText={dimensions.width < 400}
              onPriceChange={onOrderMove}
              onCancel={onOrderCancel}
              onTPMovePreview={handleOrderTPMove}
              onSLMovePreview={handleOrderSLMove}
              onTPSLDragEnd={handleTPSLDragEnd}
            />
          ))}

        {/* Position lines */}
        {viewport &&
          positionLines?.map((position) => (
            <PositionLineComponent
              key={position.id}
              position={position}
              viewport={viewport}
              dimensions={chartDimensions}
              pricePrecision={pricePrecision}
              useNarrowText={dimensions.width < 400}
              onClose={onPositionClose}
              onReverse={onPositionReverse}
              onTPMovePreview={handleTPMove}
              onSLMovePreview={handleSLMove}
              onTPSLDragEnd={handleTPSLDragEnd}
            />
          ))}

        {/* Crosshair */}
        {viewport && (
          <CrosshairComponent
            x={lastCrosshairPosition.x}
            y={lastCrosshairPosition.y}
            visible={crosshairVisible}
            viewport={viewport}
            dimensions={chartDimensions}
            pricePrecision={pricePrecision}
            color={fullRenderOptions.crosshairColor}
            showContextMenuButton={!!onContextMenu}
            showLines={false}
            onContextMenuPress={handleContextMenuPress}
          />
        )}
      </View>

      {/* Layer 3: Base Gesture Handler */}
      <GestureDetector gesture={allGestures}>
        <Animated.View style={[styles.absoluteFill, { width: dimensions.width, height: dimensions.height }]} />
      </GestureDetector>

      {/* Reset viewport button — re-enables auto-scale */}
      {resetButtonVisible && (
        <Animated.View style={[styles.resetButtonContainer, resetButtonAnimatedStyle]} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.resetButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={handleResetButtonPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Reset chart viewport"
            accessibilityHint="Resets zoom and auto-scale"
          >
            <Text style={styles.resetButtonText}>↻</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {activeUserDrawingTextEditPrimitive && activeUserDrawingTextEditorStyle && (
        <TextInput
          accessibilityLabel="Edit drawing text"
          autoFocus
          blurOnSubmit={false}
          multiline
          selectTextOnFocus
          value={activeUserDrawingTextEditPrimitive.editValue ?? activeUserDrawingTextEditPrimitive.text}
          onChangeText={(value: string) => {
            dispatchUserDrawingCommandToState({ type: 'updateTextEdit', value, meta: { source: 'textEditor' } });
          }}
          onBlur={() => {
            dispatchUserDrawingCommandToState({ type: 'commitTextEdit', meta: { source: 'textEditor' } });
          }}
          style={[styles.userDrawingTextEditor, activeUserDrawingTextEditorStyle]}
        />
      )}

      <UserDrawingSelectedActionSurfaceComponent
        state={effectiveUserDrawingState}
        surface={userDrawingSelectedActionSurface}
        anchor={userDrawingSelectionActionAnchor}
        dimensions={dimensions}
        topInset={showTopBar ? TOP_BAR_SAFE_ZONE : 0}
        createId={createUserDrawingId}
        dispatchUserDrawingCommand={(command) => dispatchUserDrawingCommandToState(command)}
        onUserDrawingPropertiesOpen={onUserDrawingPropertiesOpen}
        onUserDrawingObjectTreeOpen={onUserDrawingObjectTreeOpen}
      />

      {/* Top Bar (overlay on top of chart) */}
      {showTopBar && (
        <View style={styles.topBarOverlay} pointerEvents="box-none">
          <ChartTopBarComponent
            symbol={symbol}
            exchangeName={exchangeName}
            interval={interval}
            onIntervalChange={onIntervalChange}
            onIndicatorsPress={handleIndicatorsPress}
            supportedResolutions={supportedResolutions}
            userDrawingState={effectiveUserDrawingState}
            onUserDrawingToolSelect={(tool) =>
              dispatchUserDrawingCommandToState({ type: 'setActiveTool', tool, meta: { source: 'toolbar' } })
            }
            onUserDrawingDuplicateSelected={() => {
              dispatchUserDrawingCommandToState({
                type: 'duplicate',
                options: { createId: createUserDrawingId },
                meta: { source: 'toolbar' },
              });
            }}
            onUserDrawingDeleteSelected={() => {
              dispatchUserDrawingCommandToState({ type: 'delete', meta: { source: 'toolbar' } });
            }}
            onUserDrawingCancelDraft={() => {
              dispatchUserDrawingCommandToState({ type: 'cancelDraft', meta: { source: 'toolbar' } });
            }}
            onUserDrawingClearAll={() => {
              dispatchUserDrawingCommandToState({ type: 'clear', meta: { source: 'toolbar' } });
            }}
            onUserDrawingZOrderChange={(action) => {
              dispatchUserDrawingCommandToState({ type: 'reorder', action, meta: { source: 'toolbar' } });
            }}
            onUserDrawingStyleChange={(style) => {
              dispatchUserDrawingCommandToState({ type: 'updateStyle', style, meta: { source: 'toolbar' } });
            }}
            onUserDrawingTextAlignChange={(textAlign) => {
              dispatchUserDrawingCommandToState({ type: 'setTextAlign', textAlign, meta: { source: 'toolbar' } });
            }}
            onUserDrawingTrendLineExtendChange={(extend) => {
              dispatchUserDrawingCommandToState({ type: 'setTrendLineExtend', extend, meta: { source: 'toolbar' } });
            }}
            onUserDrawingIconNameChange={(iconName) => {
              dispatchUserDrawingCommandToState({ type: 'setIconName', iconName, meta: { source: 'toolbar' } });
            }}
            onUserDrawingVisibilityChange={(visible) => {
              dispatchUserDrawingCommandToState({ type: 'setVisibility', visible, meta: { source: 'toolbar' } });
            }}
            onUserDrawingLockedChange={(locked, includeLocked) => {
              dispatchUserDrawingCommandToState({
                type: 'setLocked',
                locked,
                options: { includeLocked },
                meta: { source: 'toolbar' },
              });
            }}
          />
        </View>
      )}

      {/* Context Menu (Modal) */}
      <ContextMenuComponent
        visible={contextMenuVisible}
        items={contextMenuItems}
        x={contextMenuPosition.x}
        y={contextMenuPosition.y}
        price={contextMenuPosition.price}
        time={contextMenuPosition.time}
        pricePrecision={pricePrecision}
        onClose={handleContextMenuClose}
      />

      {/* Indicators Modal */}
      <IndicatorsModalMobile
        visible={indicatorsModalVisible}
        onClose={handleIndicatorsModalClose}
        onSelectIndicator={handleSelectIndicator}
        activeIndicatorIds={activeIndicatorIds}
      />

      {/* Indicator Settings Modal */}
      <IndicatorSettingsModalMobile
        visible={settingsModalVisible}
        onClose={handleSettingsModalClose}
        indicator={settingsIndicator}
        inputDefinitions={settingsInputDefs}
        plots={settingsPlots}
        onSave={handleSettingsSave}
      />
    </View>
  );
});

SkiaTealchart.displayName = 'SkiaTealchart';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // No background - transparent overlay
  },
  userDrawingTextEditor: {
    position: 'absolute',
    zIndex: 6,
    minHeight: 30,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(9, 12, 18, 0.92)',
    lineHeight: 18,
  },
  userDrawingActionDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#363a45',
  },
  interactiveLayer: {
    // Interactive elements go here
    // pointerEvents="box-none" allows touches to pass through to gesture layer
  },
  resetButtonContainer: {
    position: 'absolute',
    bottom: 40, // Above time axis
    alignSelf: 'center',
    left: '50%',
    marginLeft: -14, // Half of width (28)
  },
  resetButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(42, 46, 57, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    color: '#d1d4dc',
    fontSize: 16,
  },
});

export default SkiaTealchart;
