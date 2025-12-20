/**
 * PriceLineLayer - Konva-based interactive price line rendering
 *
 * Renders all price lines (horizontal line + labels) using Konva for:
 * - Built-in drag support for order/position lines
 * - Click handling for cancel/close buttons
 * - Smooth interaction without custom hit detection
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Group, Line, Rect, Text, Circle } from 'react-konva';
import type Konva from 'konva';
import type {
  PriceLineLabelBounds,
  ChartMargins,
  PendingOrderUpdate,
} from '../types';

export interface CrosshairState {
  /** X position of crosshair (in Konva layer coordinates) */
  x: number;
  /** Y position of crosshair (in Konva layer coordinates) */
  y: number;
  /** Whether crosshair is visible */
  visible: boolean;
  /** Crosshair color */
  color: string;
}

export interface PriceLineLayerProps {
  /** All price lines with collision-resolved positions */
  labelBounds: PriceLineLabelBounds[];
  /** Chart dimensions */
  width: number;
  height: number;
  /** Chart margins */
  margins: ChartMargins;
  /** Convert Y coordinate to price */
  yToPrice: (y: number) => number;
  /** Convert price to Y coordinate */
  priceToY: (price: number) => number;
  /** Callback when order is moved via drag (final) */
  onOrderMove?: (orderId: string, newPrice: number) => void;
  /** Callback when order cancel button is clicked */
  onOrderCancel?: (orderId: string) => void;
  /** Callback when position close button is clicked */
  onPositionClose?: (positionId: string) => void;
  /** Callback when position reverse button is clicked */
  onPositionReverse?: (positionId: string) => void;
  /** Callback when TP button drag ends */
  onTPDragEnd?: (positionId: string, price: number, partialPercent?: number) => void;
  /** Callback when SL button drag ends */
  onSLDragEnd?: (positionId: string, price: number, partialPercent?: number) => void;
  /** Callback when TP button is clicked (without drag) */
  onTPClick?: (positionId: string) => void;
  /** Callback when SL button is clicked (without drag) */
  onSLClick?: (positionId: string) => void;
  /** Currently pending order updates (for visual feedback) */
  pendingOrders?: Map<string, PendingOrderUpdate>;
  /** Callback when cursor should change */
  onCursorChange?: (cursor: 'default' | 'pointer' | 'grab' | 'grabbing') => void;
  /** Crosshair state for vertical line */
  crosshair?: CrosshairState;
  /** Whether to show the + button (affects line termination) */
  hasContextMenuButton?: boolean;
  /** Callback when context menu button is clicked */
  onContextMenuButtonClick?: (price: number, screenX: number, screenY: number) => void;
}

interface DragState {
  lineId: string;
  originalY: number;
  originalPrice: number;
}

// State for tracking TP/SL button dragging
interface TPSLDragState {
  type: 'tp' | 'sl';
  positionId: string;
  startY: number;
  startX: number;
  currentY: number;
  currentX: number;
  currentPrice: number;
  entryPrice: number;  // Position entry price for PnL calculations
  entryY: number;      // Position Y coordinate for diagonal lines
  buttonX: number;     // X position of the button for preview line
  partialEnabled: boolean;
  partialPercent: number;  // 100%, 75%, 50%, 25%, or 10%
  notional?: number;   // Position notional for PnL calculations
  isLong?: boolean;    // Position direction
}

/**
 * Calculate magnet percentage for partial TP/SL
 * Symmetric zones: 100% at center, decreasing as you move left OR right
 * Evenly spaced zones: 0, 55, 110, 165, 220 (55px each from center)
 * Reference: TradingView charting_library line-tool-position.js
 */
function calculatePartialPercent(startX: number, currentX: number): number {
  const deltaX = Math.abs(currentX - startX);
  if (deltaX <= 27) return 100;   // 0-27 (center zone)
  if (deltaX <= 82) return 75;    // 28-82 (center at 55)
  if (deltaX <= 137) return 50;   // 83-137 (center at 110)
  if (deltaX <= 192) return 25;   // 138-192 (center at 165)
  return 10;                       // 193+ (center at 220)
}

// Zone offsets from center for visual rendering (55px spacing)
const ZONE_OFFSETS = [0, 55, 110, 165, 220];
const ZONE_HALF_WIDTH = 220;

/**
 * Render a single price line with its label(s)
 */
const PriceLineGroup: React.FC<{
  bound: PriceLineLabelBounds;
  width: number;
  margins: ChartMargins;
  priceToY: (price: number) => number;
  yToPrice: (y: number) => number;
  isDraggable: boolean;
  isPending: boolean;
  formatPrice: (price: number) => string;
  onDragStart?: (lineId: string, originalY: number, originalPrice: number) => void;
  onDragEnd?: (lineId: string, newPrice: number) => void;
  onButtonClick?: (lineId: string, buttonType: 'cancel' | 'close' | 'reverse') => void;
  onTPButtonClick?: (positionId: string) => void;
  onSLButtonClick?: (positionId: string) => void;
  onTPDragEnd?: (positionId: string, price: number, partialPercent?: number) => void;
  onSLDragEnd?: (positionId: string, price: number, partialPercent?: number) => void;
  onCursorChange?: (cursor: 'default' | 'pointer' | 'grab' | 'grabbing') => void;
  hasContextMenuButton?: boolean;
  registerDrag: (drag: { node: Konva.Rect; originalX: number; originalY: number; onCancel?: () => void }) => void;
  clearDrag: (node: Konva.Rect) => void;
  wasDragCancelled: () => boolean;
}> = ({
  bound,
  width,
  margins,
  priceToY,
  yToPrice,
  isDraggable,
  isPending,
  formatPrice,
  onDragStart,
  onDragEnd,
  onButtonClick,
  onTPButtonClick,
  onSLButtonClick,
  onTPDragEnd,
  onSLDragEnd,
  onCursorChange,
  hasContextMenuButton,
  registerDrag,
  clearDrag,
  wasDragCancelled,
}) => {
  // For crosshair on indicator panes, bound.price is in pane's coordinate system (not main price)
  // Use adjustedY directly for crosshair type since it's already calculated with correct pane range
  const lineY = bound.type === 'crosshair' ? bound.adjustedY : priceToY(bound.price);

  // State for TP/SL button dragging (with preview line)
  const [tpslDragState, setTPSLDragState] = useState<TPSLDragState | null>(null);

  // Compute label position relative to current line position, preserving collision offset
  // This handles viewport changes between when adjustedY was computed and when Konva renders
  const collisionOffset = bound.adjustedY - bound.originalY;
  const labelCenterY = lineY + collisionOffset;
  const lineType = bound.type || 'price';

  // Price axis label position
  const priceAxisLabelX = width - bound.width;
  const priceAxisLabelY = labelCenterY - bound.height / 2;

  // Chart label dimensions
  const chartLabel = bound.chartLabel;
  let chartLabelWidth = 0;
  let segmentsWidth = 0; // Width of segments only (drag handle area)
  let chartLabelX = margins.left;
  const labelHeight = 18;
  const touchTargetHeight = 44; // Minimum 44px for touch-friendly hit area

  // Use short text when chart pane is narrow (< 400px)
  const useNarrowText = width < 400;

  // Check if we have TP/SL buttons (they come first in the buttons array)
  const buttons = chartLabel?.buttons || [];
  const hasTPSLButtons = buttons.length > 0 && (buttons[0].type === 'tp' || buttons[0].type === 'sl');
  const tpslGap = hasTPSLButtons ? 6 : 0; // 6px gap between segments and TP/SL buttons

  // Calculate TP/SL button dimensions for drag handling
  let tpslButtonsWidth = 0;
  const tpButton = buttons.find(b => b.type === 'tp');
  const slButton = buttons.find(b => b.type === 'sl');
  if (tpButton) tpslButtonsWidth += 24;
  if (slButton) tpslButtonsWidth += 24;

  if (chartLabel && chartLabel.segments.length > 0) {
    // Calculate segments width (these are the draggable parts)
    for (const segment of chartLabel.segments) {
      const text = useNarrowText && segment.textShort ? segment.textShort : segment.text;
      // Approximate text width (11px font, ~6px per char + 8px padding)
      segmentsWidth += text.length * 6 + 8;
    }
    // Add gap and buttons width for total label width
    chartLabelWidth = segmentsWidth + tpslGap;
    for (const button of buttons) {
      // TP/SL buttons are wider (24px) than other buttons (16px)
      chartLabelWidth += (button.type === 'tp' || button.type === 'sl') ? 24 : 16;
    }

    // Position based on lineLength
    // lineLength=100 means line extends full width, label at LEFT edge
    // lineLength=0 means no line extension, label at RIGHT edge (near price axis)
    const lineLength = bound.lineLength ?? 100;
    const maxLabelX = width - margins.right - chartLabelWidth;
    const minLabelX = margins.left;
    chartLabelX = minLabelX + ((maxLabelX - minLabelX) * (100 - lineLength) / 100);
  }

  // Track drag state for visual offset and price display
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [dragPrice, setDragPrice] = useState<number | null>(null);
  const dragStartYRef = useRef(0);

  // Line dash pattern
  const lineDash = bound.lineStyle === 'dashed'
    ? [4, 4]
    : bound.lineStyle === 'dotted'
      ? [2, 2]
      : [];

  // Handle drag on the chart label segments (the draggable area)
  const handleDragStart = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target as Konva.Rect;
    dragStartYRef.current = node.y();
    // Register drag for escape cancellation
    registerDrag({
      node,
      originalX: node.x(),
      originalY: node.y(),
      onCancel: () => {
        setDragOffsetY(0);
        setDragPrice(null);
      },
    });
    if (onDragStart) {
      onDragStart(bound.lineId, lineY, bound.price);
    }
    onCursorChange?.('grabbing');
  }, [bound.lineId, bound.price, lineY, onDragStart, onCursorChange, registerDrag]);

  const handleDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const delta = node.y() - dragStartYRef.current;
    setDragOffsetY(delta);
    // Calculate and display current price during drag
    const currentY = lineY + delta;
    const currentPrice = yToPrice(currentY);
    setDragPrice(currentPrice);
  }, [lineY, yToPrice]);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target as Konva.Rect;
    const finalDelta = node.y() - dragStartYRef.current;
    const finalY = lineY + finalDelta;
    const finalPrice = yToPrice(finalY);

    // Clear drag registration
    clearDrag(node);

    // Check if drag was cancelled (escape pressed) - skip order placement
    const cancelled = wasDragCancelled();

    // Trigger callback BEFORE resetting state to set pending state first
    // This prevents snap-back on the render between reset and pending state
    if (!cancelled && onDragEnd && Math.abs(finalDelta) > 0) {
      onDragEnd(bound.lineId, finalPrice);
    }

    // Reset the Rect position and drag state after pending state is set
    node.y(dragStartYRef.current);
    setDragOffsetY(0);
    setDragPrice(null);
    onCursorChange?.('grab');
  }, [bound.lineId, lineY, yToPrice, onDragEnd, onCursorChange, clearDrag, wasDragCancelled]);

  // Constrain drag to vertical only, within chart bounds
  const dragBoundFunc = useCallback((pos: { x: number; y: number }) => {
    const minY = margins.top - lineY;
    const maxY = (priceToY(0) || 1000) - lineY;
    return {
      x: 0,
      y: Math.max(minY, Math.min(maxY, pos.y)),
    };
  }, [lineY, margins.top, priceToY]);

  const opacity = isPending ? 0.5 : 1;

  // Render based on line type
  if (lineType === 'price' || lineType === 'crosshair') {
    // Simple price line - just horizontal line and price axis label
    // For crosshair with context menu button, stop line at left edge of button circle
    const lineEndX = (lineType === 'crosshair' && hasContextMenuButton)
      ? width - margins.right - 18  // Stop at left edge of "+" button (button at -10, radius 8)
      : priceAxisLabelX;

    // For lines with renderLineOnCanvas, skip the line - only render label
    // (the line is drawn on canvas for high-speed sync with candles)
    const skipLineRendering = bound.renderLineOnCanvas;

    return (
      <Group opacity={opacity}>
        {/* Horizontal line - skip if rendered on canvas */}
        {!skipLineRendering && (
          <Line
            points={[margins.left, lineY, lineEndX, lineY]}
            stroke={bound.color}
            strokeWidth={bound.lineWidth || 1}
            dash={lineDash}
          />
        )}

        {/* Connector line if label is offset - always render (Konva handles for canvas lines) */}
        {Math.abs(labelCenterY - lineY) > 2 && (
          <Line
            points={[priceAxisLabelX, lineY, priceAxisLabelX, labelCenterY]}
            stroke={bound.color}
            strokeWidth={1}
            opacity={0.5}
          />
        )}

        {/* Price axis label */}
        {lineType === 'crosshair' ? (
          // Filled label for crosshair
          <>
            <Rect
              x={priceAxisLabelX}
              y={priceAxisLabelY}
              width={bound.width}
              height={bound.height}
              fill={bound.label.backgroundColor || bound.color}
              cornerRadius={2}
            />
            <Text
              x={priceAxisLabelX}
              y={priceAxisLabelY}
              width={bound.width}
              height={bound.height}
              text={bound.label.primaryText}
              fontSize={11}
              fontFamily="sans-serif"
              fill={bound.label.textColor || '#000000'}
              align="center"
              verticalAlign="middle"
            />
          </>
        ) : (
          // Border-only label for price lines
          <>
            <Rect
              x={priceAxisLabelX}
              y={priceAxisLabelY}
              width={bound.width}
              height={bound.height}
              stroke={bound.color}
              strokeWidth={1}
              cornerRadius={2}
            />
            {bound.label.secondaryText ? (
              // Two lines of text
              <>
                <Text
                  x={priceAxisLabelX}
                  y={priceAxisLabelY + 1}
                  width={bound.width}
                  height={bound.height / 2}
                  text={bound.label.primaryText}
                  fontSize={11}
                  fontFamily="sans-serif"
                  fill={bound.label.textColor || bound.color}
                  align="center"
                  verticalAlign="middle"
                />
                <Text
                  x={priceAxisLabelX}
                  y={priceAxisLabelY + bound.height / 2 - 1}
                  width={bound.width}
                  height={bound.height / 2}
                  text={bound.label.secondaryText}
                  fontSize={11}
                  fontFamily="sans-serif"
                  fill={bound.label.textColor || bound.color}
                  align="center"
                  verticalAlign="middle"
                />
              </>
            ) : (
              <Text
                x={priceAxisLabelX}
                y={priceAxisLabelY}
                width={bound.width}
                height={bound.height}
                text={bound.label.primaryText}
                fontSize={11}
                fontFamily="sans-serif"
                fill={bound.label.textColor || bound.color}
                align="center"
                verticalAlign="middle"
              />
            )}
          </>
        )}
      </Group>
    );
  }

  // Trading line (order/position/liquidation) with chart label
  // Apply drag offset to all Y positions during drag for smooth visual movement
  const offsetLineY = lineY + dragOffsetY;
  const offsetLabelCenterY = labelCenterY + dragOffsetY;
  const offsetPriceAxisLabelY = priceAxisLabelY + dragOffsetY;

  // Display current drag price in label, or original price if not dragging
  const displayPrice = dragPrice !== null ? formatPrice(dragPrice) : bound.label.primaryText;

  return (
    <Group opacity={opacity}>
      {/* Line from left margin to chart label */}
      {chartLabel && chartLabel.segments.length > 0 && bound.extendLeft !== false && (
        <Line
          points={[margins.left, offsetLineY, chartLabelX - 1, offsetLineY]}
          stroke={bound.color}
          strokeWidth={bound.lineWidth || 1}
          dash={lineDash}
        />
      )}

      {/* Line from end of segments to price axis - renders BEHIND TP/SL buttons */}
      {chartLabel && chartLabel.segments.length > 0 && (
        <Line
          points={[chartLabelX + segmentsWidth + 2, offsetLineY, priceAxisLabelX, offsetLineY]}
          stroke={bound.color}
          strokeWidth={bound.lineWidth || 1}
          dash={lineDash}
        />
      )}

      {/* Invisible drag handle over segments only - underneath for drag events */}
      {/* Note: This Rect stays at original position - Konva controls its movement during drag */}
      {/* Uses touchTargetHeight (44px) for touch-friendly hit area while visual label stays at labelHeight */}
      {isDraggable && chartLabel && chartLabel.segments.length > 0 && segmentsWidth > 0 && (
        <Rect
          x={chartLabelX}
          y={lineY - touchTargetHeight / 2}
          width={segmentsWidth}
          height={touchTargetHeight}
          fill="transparent"
          draggable={true}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          dragBoundFunc={dragBoundFunc}
          onMouseEnter={() => onCursorChange?.('grab')}
          onMouseLeave={() => onCursorChange?.('default')}
        />
      )}

      {/* TP button drag handle - underneath visual button */}
      {tpButton && bound.positionId && (
        <Rect
          x={chartLabelX + segmentsWidth + tpslGap}
          y={lineY - touchTargetHeight / 2}
          width={24}
          height={touchTargetHeight}
          fill="transparent"
          draggable={true}
          onDragStart={(e) => {
            const node = e.target as Konva.Rect;
            const stage = node.getStage();
            const pointerPos = stage?.getPointerPosition();
            if (!pointerPos) return;
            const originalX = chartLabelX + segmentsWidth + tpslGap;
            const originalY = lineY - touchTargetHeight / 2;
            // Register drag for escape cancellation
            registerDrag({
              node,
              originalX,
              originalY,
              onCancel: () => setTPSLDragState(null),
            });
            setTPSLDragState({
              type: 'tp',
              positionId: bound.lineId,
              startY: pointerPos.y,
              startX: pointerPos.x,
              currentY: pointerPos.y,
              currentX: pointerPos.x,
              currentPrice: yToPrice(pointerPos.y),
              entryPrice: bound.price,  // Position line price is entry price
              entryY: lineY,            // Position line Y coordinate
              buttonX: chartLabelX + segmentsWidth + tpslGap + 12,
              partialEnabled: bound.partialEnabled ?? false,
              partialPercent: 100,
              notional: bound.positionData?.notional,
              isLong: bound.positionData?.isLong,
            });
            onCursorChange?.('grabbing');
          }}
          onDragMove={(e) => {
            const stage = e.target.getStage();
            const pointerPos = stage?.getPointerPosition();
            if (!pointerPos) return;
            setTPSLDragState(prev => {
              if (!prev) return prev;
              const newPartialPercent = prev.partialEnabled
                ? calculatePartialPercent(prev.startX, pointerPos.x)
                : 100;
              return { ...prev, currentY: pointerPos.y, currentX: pointerPos.x, currentPrice: yToPrice(pointerPos.y), partialPercent: newPartialPercent };
            });
          }}
          onDragEnd={(e) => {
            const node = e.target as Konva.Rect;
            const stage = node.getStage();
            const pointerPos = stage?.getPointerPosition();
            // Reset to original position (not 0,0)
            const originalX = chartLabelX + segmentsWidth + tpslGap;
            const originalY = lineY - touchTargetHeight / 2;
            node.x(originalX);
            node.y(originalY);
            clearDrag(node);
            // Check if drag was cancelled (escape pressed) - skip order placement
            const cancelled = wasDragCancelled();
            if (!cancelled && pointerPos && tpslDragState) {
              const finalPrice = yToPrice(pointerPos.y);
              const dragDistance = Math.abs(pointerPos.y - tpslDragState.startY);
              if (dragDistance > 5) {
                onTPDragEnd?.(bound.lineId, finalPrice, tpslDragState.partialEnabled ? tpslDragState.partialPercent : undefined);
              } else {
                onTPButtonClick?.(bound.lineId);
              }
            }
            setTPSLDragState(null);
            onCursorChange?.('default');
          }}
          dragBoundFunc={(pos) => ({ x: chartLabelX + segmentsWidth + tpslGap, y: pos.y })}
          onMouseEnter={() => onCursorChange?.('grab')}
          onMouseLeave={() => onCursorChange?.('default')}
        />
      )}

      {/* SL button drag handle - underneath visual button */}
      {slButton && bound.positionId && (
        <Rect
          x={chartLabelX + segmentsWidth + tpslGap + (tpButton ? 25 : 0)}
          y={lineY - touchTargetHeight / 2}
          width={24}
          height={touchTargetHeight}
          fill="transparent"
          draggable={true}
          onDragStart={(e) => {
            const node = e.target as Konva.Rect;
            const stage = node.getStage();
            const pointerPos = stage?.getPointerPosition();
            if (!pointerPos) return;
            const originalX = chartLabelX + segmentsWidth + tpslGap + (tpButton ? 25 : 0);  // 24px + 1px gap
            const originalY = lineY - touchTargetHeight / 2;
            // Register drag for escape cancellation
            registerDrag({
              node,
              originalX,
              originalY,
              onCancel: () => setTPSLDragState(null),
            });
            setTPSLDragState({
              type: 'sl',
              positionId: bound.lineId,
              startY: pointerPos.y,
              startX: pointerPos.x,
              currentY: pointerPos.y,
              currentX: pointerPos.x,
              currentPrice: yToPrice(pointerPos.y),
              entryPrice: bound.price,  // Position line price is entry price
              entryY: lineY,            // Position line Y coordinate
              buttonX: chartLabelX + segmentsWidth + tpslGap + (tpButton ? 25 : 0) + 12,  // 24px + 1px gap
              partialEnabled: bound.partialEnabled ?? false,
              partialPercent: 100,
              notional: bound.positionData?.notional,
              isLong: bound.positionData?.isLong,
            });
            onCursorChange?.('grabbing');
          }}
          onDragMove={(e) => {
            const stage = e.target.getStage();
            const pointerPos = stage?.getPointerPosition();
            if (!pointerPos) return;
            setTPSLDragState(prev => {
              if (!prev) return prev;
              const newPartialPercent = prev.partialEnabled
                ? calculatePartialPercent(prev.startX, pointerPos.x)
                : 100;
              return { ...prev, currentY: pointerPos.y, currentX: pointerPos.x, currentPrice: yToPrice(pointerPos.y), partialPercent: newPartialPercent };
            });
          }}
          onDragEnd={(e) => {
            const node = e.target as Konva.Rect;
            const stage = node.getStage();
            const pointerPos = stage?.getPointerPosition();
            // Reset to original position (not 0,0)
            const originalX = chartLabelX + segmentsWidth + tpslGap + (tpButton ? 25 : 0);  // 24px + 1px gap
            const originalY = lineY - touchTargetHeight / 2;
            node.x(originalX);
            node.y(originalY);
            clearDrag(node);
            // Check if drag was cancelled (escape pressed) - skip order placement
            const cancelled = wasDragCancelled();
            if (!cancelled && pointerPos && tpslDragState) {
              const finalPrice = yToPrice(pointerPos.y);
              const dragDistance = Math.abs(pointerPos.y - tpslDragState.startY);
              if (dragDistance > 5) {
                onSLDragEnd?.(bound.lineId, finalPrice, tpslDragState.partialEnabled ? tpslDragState.partialPercent : undefined);
              } else {
                onSLButtonClick?.(bound.lineId);
              }
            }
            setTPSLDragState(null);
            onCursorChange?.('default');
          }}
          dragBoundFunc={(pos) => ({ x: chartLabelX + segmentsWidth + tpslGap + (tpButton ? 25 : 0), y: pos.y })}
          onMouseEnter={() => onCursorChange?.('grab')}
          onMouseLeave={() => onCursorChange?.('default')}
        />
      )}

      {/* Chart area label - on top so buttons are clickable, segments have listening=false */}
      {chartLabel && chartLabel.segments.length > 0 && (
        <ChartLabelGroup
          chartLabel={chartLabel}
          x={chartLabelX}
          y={offsetLineY - labelHeight / 2}
          height={labelHeight}
          lineId={bound.lineId}
          positionId={bound.positionId}
          partialEnabled={bound.partialEnabled}
          useNarrowText={useNarrowText}
          hasTPSLButtons={hasTPSLButtons}
          tpslGap={tpslGap}
          lineY={lineY}
          priceToY={priceToY}
          yToPrice={yToPrice}
          chartWidth={width}
          margins={margins}
          onButtonClick={onButtonClick}
          onTPButtonClick={onTPButtonClick}
          onSLButtonClick={onSLButtonClick}
          onTPDragEnd={onTPDragEnd}
          onSLDragEnd={onSLDragEnd}
          onCursorChange={onCursorChange}
          tpslDragState={tpslDragState}
          setTPSLDragState={setTPSLDragState}
        />
      )}

      {/* TP/SL Bracket Zone Preview - renders during drag */}
      {tpslDragState && (() => {
        const color = tpslDragState.type === 'tp' ? '#22c55e' : '#f97316';
        const bgColor = '#1e222d';
        const borderColor = '#363a45';
        const isPartialMode = tpslDragState.partialEnabled;
        const centerX = tpslDragState.startX;
        const cursorOnRight = tpslDragState.currentX > centerX;
        const leftEdge = Math.max(margins.left, centerX - ZONE_HALF_WIDTH);
        const rightEdge = Math.min(width - margins.right, centerX + ZONE_HALF_WIDTH);
        const top = Math.min(tpslDragState.entryY, tpslDragState.currentY);
        const bottom = Math.max(tpslDragState.entryY, tpslDragState.currentY);
        const zoneHeight = bottom - top;
        const isDraggingUp = tpslDragState.currentY < tpslDragState.entryY;

        // Calculate PnL and percent distance
        const priceChange = tpslDragState.currentPrice - tpslDragState.entryPrice;
        const percentDistance = (priceChange / tpslDragState.entryPrice) * 100;
        const pnl = tpslDragState.notional
          ? (tpslDragState.isLong ? priceChange : -priceChange) * (tpslDragState.notional / tpslDragState.entryPrice) * (tpslDragState.partialPercent / 100)
          : null;

        // Build main label text
        const typeLabel = isPartialMode && tpslDragState.partialPercent < 100
          ? `${tpslDragState.partialPercent}% ${tpslDragState.type.toUpperCase()}`
          : tpslDragState.type.toUpperCase();
        const pnlText = pnl !== null ? `${pnl >= 0 ? '+' : ''}$${Math.abs(pnl).toFixed(2)}` : '';
        const percentText = `${percentDistance >= 0 ? '+' : ''}${percentDistance.toFixed(2)}%`;

        // Label position - in partial mode snap to zone, in non-partial stay at drag X
        const zoneOffset = tpslDragState.partialPercent === 100 ? 0 :
                          tpslDragState.partialPercent === 75 ? 55 :
                          tpslDragState.partialPercent === 50 ? 110 :
                          tpslDragState.partialPercent === 25 ? 165 : 220;
        const labelX = isPartialMode
          ? (zoneOffset === 0 ? centerX : (cursorOnRight ? centerX + zoneOffset : centerX - zoneOffset))
          : centerX;
        const labelY = isPartialMode
          ? (isDraggingUp ? top + 20 : bottom - 20)
          : (isDraggingUp ? tpslDragState.currentY - 14 : tpslDragState.currentY + 14);

        // Bottom percentage labels
        const bottomLabels = [
          { percent: 10, x: leftEdge, side: 'left' },
          { percent: 25, x: centerX - 165, side: 'left' },
          { percent: 50, x: centerX - 110, side: 'left' },
          { percent: 75, x: centerX - 55, side: 'left' },
          { percent: 100, x: centerX, side: 'center' },
          { percent: 75, x: centerX + 55, side: 'right' },
          { percent: 50, x: centerX + 110, side: 'right' },
          { percent: 25, x: centerX + 165, side: 'right' },
          { percent: 10, x: rightEdge, side: 'right' },
        ].filter(l => l.x >= leftEdge && l.x <= rightEdge);

        const labelBoxY = isDraggingUp ? top - 18 : bottom + 4;

        // Vertical line position
        const vertLineX = isPartialMode ? rightEdge : centerX;

        return (
          <Group>
            {/* Partial mode: Zone rectangle with fill */}
            {isPartialMode && zoneHeight > 0 && (
              <>
                <Rect
                  x={leftEdge}
                  y={top}
                  width={rightEdge - leftEdge}
                  height={zoneHeight}
                  fill={color}
                  opacity={0.08}
                />
                <Rect
                  x={leftEdge}
                  y={top}
                  width={rightEdge - leftEdge}
                  height={zoneHeight}
                  stroke={color}
                  strokeWidth={1}
                  dash={[4, 4]}
                  opacity={0.6}
                />
                {/* V-shape diagonal lines */}
                <Line
                  points={isDraggingUp
                    ? [leftEdge, top, centerX, bottom, rightEdge, top]
                    : [leftEdge, bottom, centerX, top, rightEdge, bottom]}
                  stroke={color}
                  strokeWidth={1}
                  dash={[4, 4]}
                  opacity={0.6}
                />
                {/* Zone boundary lines */}
                {[55, 110, 165].map(offset => (
                  <React.Fragment key={offset}>
                    {centerX - offset >= leftEdge && (
                      <Line
                        points={[centerX - offset, top, centerX - offset, bottom]}
                        stroke={color}
                        strokeWidth={1}
                        dash={[4, 4]}
                        opacity={0.3}
                      />
                    )}
                    {centerX + offset <= rightEdge && (
                      <Line
                        points={[centerX + offset, top, centerX + offset, bottom]}
                        stroke={color}
                        strokeWidth={1}
                        dash={[4, 4]}
                        opacity={0.3}
                      />
                    )}
                  </React.Fragment>
                ))}
                {/* Bottom percentage labels */}
                {bottomLabels.map((label, i) => {
                  const isHighlighted = label.percent === tpslDragState.partialPercent && (
                    label.side === 'center' ||
                    (label.side === 'right' && cursorOnRight) ||
                    (label.side === 'left' && !cursorOnRight)
                  );
                  const boxWidth = 30;
                  const boxX = label.x - boxWidth / 2;
                  return (
                    <React.Fragment key={`${label.percent}-${label.side}-${i}`}>
                      {isHighlighted && (
                        <Rect x={boxX} y={labelBoxY} width={boxWidth} height={14} fill={color} opacity={0.3} />
                      )}
                      <Rect x={boxX} y={labelBoxY} width={boxWidth} height={14} fill={bgColor} />
                      <Rect x={boxX} y={labelBoxY} width={boxWidth} height={14} stroke={isHighlighted ? color : borderColor} strokeWidth={1} />
                      <Text
                        x={boxX}
                        y={labelBoxY}
                        width={boxWidth}
                        height={14}
                        text={`${label.percent}%`}
                        fontSize={10}
                        fontFamily="sans-serif"
                        fill={isHighlighted ? color : '#787b86'}
                        align="center"
                        verticalAlign="middle"
                      />
                    </React.Fragment>
                  );
                })}
              </>
            )}

            {/* Dashed horizontal line at bracket price */}
            <Line
              points={[margins.left, tpslDragState.currentY, width - margins.right, tpslDragState.currentY]}
              stroke={color}
              strokeWidth={1}
              dash={[4, 4]}
            />

            {/* Vertical dashed line from entry to bracket */}
            {zoneHeight > 0 && (
              <Line
                points={[vertLineX, top, vertLineX, bottom]}
                stroke={color}
                strokeWidth={1}
                dash={[4, 4]}
                opacity={0.6}
              />
            )}

            {/* Y-axis percent labels along vertical line */}
            {zoneHeight > 30 && [0.25, 0.5, 0.75, 1.0].map(ratio => {
              const labelYPos = isDraggingUp
                ? bottom - zoneHeight * ratio + (ratio === 1 ? 8 : 0)
                : top + zoneHeight * ratio + (ratio === 1 ? -8 : 0);
              const percentAtLevel = percentDistance * ratio;
              return (
                <Text
                  key={ratio}
                  x={vertLineX + 6}
                  y={labelYPos - 5}
                  text={`${percentAtLevel >= 0 ? '' : '-'}${Math.abs(percentAtLevel).toFixed(1)}%`}
                  fontSize={10}
                  fontFamily="sans-serif"
                  fill={color}
                  opacity={0.7}
                />
              );
            })}

            {/* Main info label (PnL | Type | Percent) */}
            {(() => {
              const parts = [pnlText, typeLabel, percentText].filter(Boolean);
              const totalWidth = parts.length * 50 + (parts.length - 1) * 1;
              const boxX = labelX - totalWidth / 2;
              const boxY = labelY - 10;
              return (
                <>
                  <Rect x={boxX} y={boxY} width={totalWidth} height={20} fill={bgColor} />
                  <Rect x={boxX} y={boxY} width={totalWidth} height={20} stroke={color} strokeWidth={1} />
                  {parts.map((part, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && (
                        <Line
                          points={[boxX + i * 51, boxY + 3, boxX + i * 51, boxY + 17]}
                          stroke={color}
                          strokeWidth={1}
                          opacity={0.4}
                        />
                      )}
                      <Text
                        x={boxX + i * 51}
                        y={boxY}
                        width={50}
                        height={20}
                        text={part}
                        fontSize={11}
                        fontFamily="sans-serif"
                        fill={color}
                        align="center"
                        verticalAlign="middle"
                      />
                    </React.Fragment>
                  ))}
                </>
              );
            })()}

            {/* Price label at right edge - matches standard PriceLineLayer labels */}
            <Rect
              x={width - bound.width}
              y={tpslDragState.currentY - bound.height / 2}
              width={bound.width}
              height={bound.height}
              stroke={color}
              strokeWidth={1}
              cornerRadius={2}
            />
            <Text
              x={width - bound.width}
              y={tpslDragState.currentY - bound.height / 2}
              width={bound.width}
              height={bound.height}
              text={formatPrice(tpslDragState.currentPrice)}
              fontSize={11}
              fontFamily="sans-serif"
              fill={color}
              align="center"
              verticalAlign="middle"
            />
          </Group>
        );
      })()}

      {/* Line all the way across if no chart label */}
      {(!chartLabel || chartLabel.segments.length === 0) && (
        <Line
          points={[margins.left, offsetLineY, priceAxisLabelX, offsetLineY]}
          stroke={bound.color}
          strokeWidth={bound.lineWidth || 1}
          dash={lineDash}
        />
      )}

      {/* Connector line if label is offset */}
      {Math.abs(offsetLabelCenterY - offsetLineY) > 2 && (
        <Line
          points={[priceAxisLabelX, offsetLineY, priceAxisLabelX, offsetLabelCenterY]}
          stroke={bound.color}
          strokeWidth={1}
          opacity={0.5}
        />
      )}

      {/* Price axis label (filled for trading lines) */}
      <Rect
        x={priceAxisLabelX}
        y={offsetPriceAxisLabelY}
        width={bound.width}
        height={bound.height}
        fill={bound.label.backgroundColor || bound.color}
        stroke={bound.color}
        strokeWidth={1}
        cornerRadius={2}
      />
      {bound.label.secondaryText ? (
        <>
          <Text
            x={priceAxisLabelX}
            y={offsetPriceAxisLabelY + 1}
            width={bound.width}
            height={bound.height / 2}
            text={displayPrice}
            fontSize={11}
            fontFamily="sans-serif"
            fill={bound.label.textColor || '#ffffff'}
            align="center"
            verticalAlign="middle"
          />
          <Text
            x={priceAxisLabelX}
            y={offsetPriceAxisLabelY + bound.height / 2 - 1}
            width={bound.width}
            height={bound.height / 2}
            text={bound.label.secondaryText}
            fontSize={11}
            fontFamily="sans-serif"
            fill={bound.label.textColor || '#ffffff'}
            align="center"
            verticalAlign="middle"
          />
        </>
      ) : (
        <Text
          x={priceAxisLabelX}
          y={offsetPriceAxisLabelY}
          width={bound.width}
          height={bound.height}
          text={displayPrice}
          fontSize={11}
          fontFamily="sans-serif"
          fill={bound.label.textColor || '#ffffff'}
          align="center"
          verticalAlign="middle"
        />
      )}
    </Group>
  );
};

/**
 * Chart area label with segments and buttons
 */
const ChartLabelGroup: React.FC<{
  chartLabel: NonNullable<PriceLineLabelBounds['chartLabel']>;
  x: number;
  y: number;
  height: number;
  lineId: string;
  positionId?: string;
  partialEnabled?: boolean;
  useNarrowText: boolean;
  hasTPSLButtons: boolean;
  tpslGap: number;
  lineY: number;  // Y position of the price line (for drag constraint)
  priceToY: (price: number) => number;
  yToPrice: (y: number) => number;
  chartWidth: number;
  margins: ChartMargins;
  onButtonClick?: (lineId: string, buttonType: 'cancel' | 'close' | 'reverse') => void;
  onTPButtonClick?: (positionId: string) => void;
  onSLButtonClick?: (positionId: string) => void;
  onTPDragEnd?: (positionId: string, price: number, partialPercent?: number) => void;
  onSLDragEnd?: (positionId: string, price: number, partialPercent?: number) => void;
  onCursorChange?: (cursor: 'default' | 'pointer' | 'grab' | 'grabbing') => void;
  tpslDragState: TPSLDragState | null;
  setTPSLDragState: React.Dispatch<React.SetStateAction<TPSLDragState | null>>;
}> = ({ chartLabel, x, y, height, lineId, positionId, partialEnabled, useNarrowText, hasTPSLButtons, tpslGap, lineY, priceToY, yToPrice, chartWidth, margins, onButtonClick, onTPButtonClick, onSLButtonClick, onTPDragEnd, onSLDragEnd, onCursorChange, tpslDragState, setTPSLDragState }) => {
  let currentX = x;
  const elements: React.ReactNode[] = [];
  const segmentCount = chartLabel.segments.length;
  const buttonCount = (chartLabel.buttons || []).length;

  // Render segments
  chartLabel.segments.forEach((segment, index) => {
    // Use short text when chart is narrow (< 400px), full text otherwise
    const text = useNarrowText && segment.textShort ? segment.textShort : segment.text;
    const textWidth = text.length * 6 + 8; // Approximate width
    const isFirst = index === 0;
    // Last segment in the segments section - rounded if no buttons OR if TP/SL buttons (they're visually separate)
    const isLastSegment = index === segmentCount - 1;
    const isLastItem = isLastSegment && buttonCount === 0;
    // Segments section should have right rounded corners when followed by TP/SL (separate visual group)
    const hasRightRadius = isLastItem || (isLastSegment && hasTPSLButtons);

    // Determine corner radius
    const cornerRadius = isFirst && hasRightRadius
      ? [2, 2, 2, 2]
      : isFirst
        ? [2, 0, 0, 2]
        : hasRightRadius
          ? [0, 2, 2, 0]
          : [0, 0, 0, 0];

    elements.push(
      <Group
        key={`segment-${index}`}
        listening={false}  // Let drag Rect underneath handle events
      >
        <Rect
          x={currentX}
          y={y}
          width={textWidth}
          height={height}
          fill={segment.backgroundColor}
          stroke={segment.borderColor}
          strokeWidth={1}
          cornerRadius={cornerRadius}
        />
        <Text
          x={currentX}
          y={y}
          width={textWidth}
          height={height}
          text={text}
          fontSize={11}
          fontFamily="sans-serif"
          fill={segment.textColor}
          align="center"
          verticalAlign="middle"
        />
      </Group>
    );
    currentX += textWidth;
  });

  // Render buttons
  const buttons = chartLabel.buttons || [];
  // Add gap before TP/SL buttons (they're visually separate from segments)
  if (hasTPSLButtons && tpslGap > 0) {
    currentX += tpslGap;
  }

  // Track button X positions for TP/SL
  const buttonXPositions: { [key: string]: number } = {};

  buttons.forEach((button, index) => {
    const isLastItem = index === buttonCount - 1;
    const isTPSL = button.type === 'tp' || button.type === 'sl';
    // TP/SL buttons: outer corners rounded, inner flat (connected look with distinct borders)
    // Other buttons share corners in a connected group
    const isFirstTPSL = index === 0 && isTPSL;
    let cornerRadius: number[];
    if (button.type === 'tp') {
      cornerRadius = [2, 0, 0, 2];  // TP: left corners rounded
    } else if (button.type === 'sl') {
      cornerRadius = [0, 2, 2, 0];  // SL: right corners rounded
    } else if (isFirstTPSL && isLastItem) {
      cornerRadius = [2, 2, 2, 2];
    } else if (isFirstTPSL) {
      cornerRadius = [2, 0, 0, 2];
    } else if (isLastItem) {
      cornerRadius = [0, 2, 2, 0];
    } else {
      cornerRadius = [0, 0, 0, 0];
    }
    // TP/SL buttons are wider to fit text
    const buttonWidth = isTPSL ? 24 : 16;

    // Store X position for TP/SL buttons
    if (button.type === 'tp' || button.type === 'sl') {
      buttonXPositions[button.type] = currentX;
    }

    // Handle TP/SL button clicks differently
    const handleClick = () => {
      if (button.type === 'tp' && positionId && onTPButtonClick) {
        onTPButtonClick(positionId);
      } else if (button.type === 'sl' && positionId && onSLButtonClick) {
        onSLButtonClick(positionId);
      } else if (button.type === 'cancel' || button.type === 'close' || button.type === 'reverse') {
        onButtonClick?.(lineId, button.type);
      }
    };

    // For TP/SL buttons, render visual only (drag handled by parent's invisible Rect)
    if ((button.type === 'tp' || button.type === 'sl') && positionId) {
      const btnX = currentX;

      // TP/SL button: visual rect + text label, drag handled by parent component's invisible Rect
      elements.push(
        <Rect
          key={`button-bg-${index}`}
          x={btnX}
          y={y}
          width={buttonWidth}
          height={height}
          fill={button.backgroundColor}
          stroke={button.borderColor}
          strokeWidth={1}
          cornerRadius={cornerRadius}
          listening={false}
        />
      );
      elements.push(
        <Text
          key={`button-text-${index}`}
          x={btnX}
          y={y}
          width={buttonWidth}
          height={height}
          text={button.type === 'tp' ? 'TP' : 'SL'}
          fontSize={10}
          fontFamily="sans-serif"
          fontStyle="bold"
          fill={button.iconColor}
          align="center"
          verticalAlign="middle"
          listening={false}
        />
      );
    } else {
      // Non-TP/SL buttons (cancel, close, reverse)
      elements.push(
        <Group
          key={`button-${index}`}
          onClick={handleClick}
          onTap={handleClick}
          onMouseEnter={() => onCursorChange?.('pointer')}
          onMouseLeave={() => onCursorChange?.('default')}
        >
          <Rect
            x={currentX}
            y={y}
            width={buttonWidth}
            height={height}
            fill={button.backgroundColor}
            stroke={button.borderColor}
            strokeWidth={1}
            cornerRadius={cornerRadius}
          />
          {button.type === 'cancel' || button.type === 'close' ? (
            // X icon - listening={false} so clicks pass through to parent Group
            <>
              <Line
                points={[
                  currentX + 5, y + 5,
                  currentX + 11, y + 13,
                ]}
                stroke={button.iconColor}
                strokeWidth={1.5}
                listening={false}
              />
              <Line
                points={[
                  currentX + 11, y + 5,
                  currentX + 5, y + 13,
                ]}
                stroke={button.iconColor}
                strokeWidth={1.5}
                listening={false}
              />
            </>
          ) : button.type === 'reverse' ? (
            // Reverse arrow icon (simplified)
            <Text
              x={currentX}
              y={y}
              width={buttonWidth}
              height={height}
              text={button.icon || '\u21c4'}
              fontSize={11}
              fontFamily="sans-serif"
              fill={button.iconColor}
              align="center"
              listening={false}
              verticalAlign="middle"
            />
          ) : null}
        </Group>
      );
    }
    currentX += buttonWidth;
    // Add 1px gap after TP so TP's right border and SL's left border both show
    if (button.type === 'tp') {
      currentX += 1;
    }
  });

  return <Group>{elements}</Group>;
};

// Shared type for tracking any active Konva drag
interface ActiveDrag {
  node: Konva.Rect;
  originalX: number;
  originalY: number;
  // Callback to clear component-level state when cancelled
  onCancel?: () => void;
  // Timestamp when drag was registered (to detect spurious onDragEnd from re-renders)
  registeredAt?: number;
}

/**
 * Main PriceLineLayer component
 */
export const PriceLineLayer: React.FC<PriceLineLayerProps> = ({
  labelBounds,
  width,
  height,
  margins,
  yToPrice,
  priceToY,
  onOrderMove,
  onOrderCancel,
  onPositionClose,
  onPositionReverse,
  onTPDragEnd,
  onSLDragEnd,
  onTPClick,
  onSLClick,
  pendingOrders,
  onCursorChange,
  crosshair,
  hasContextMenuButton,
  onContextMenuButtonClick,
}) => {
  const dragStateRef = useRef<DragState | null>(null);

  // Generalized drag tracking for escape cancellation
  const activeDragRef = useRef<ActiveDrag | null>(null);
  // Flag to indicate drag was cancelled (prevents onDragEnd from placing orders)
  const dragCancelledRef = useRef(false);

  // Register a drag so it can be cancelled with Escape
  // Uses a timestamp to prevent immediate clearing from re-render-triggered onDragEnd
  const registerDrag = useCallback((drag: ActiveDrag) => {
    dragCancelledRef.current = false;  // Reset cancelled flag on new drag
    activeDragRef.current = { ...drag, registeredAt: Date.now() };
  }, []);

  // Check if drag was cancelled (and consume the flag)
  const wasDragCancelled = useCallback(() => {
    if (dragCancelledRef.current) {
      dragCancelledRef.current = false;
      return true;
    }
    return false;
  }, []);

  // Clear the active drag (called on drag end)
  // Takes the node to verify it's the same drag being cleared (prevents cross-drag interference)
  // Also checks timestamp to prevent clearing from spurious onDragEnd events triggered by re-renders
  const clearDrag = useCallback((node: Konva.Rect) => {
    const active = activeDragRef.current;
    const timeSinceRegister = active?.registeredAt ? Date.now() - active.registeredAt : 0;
    // Only clear if nodes match AND at least 100ms has passed (to skip spurious onDragEnd from re-renders)
    if (active?.node === node && timeSinceRegister > 100) {
      activeDragRef.current = null;
    }
  }, []);

  // Escape key cancels any active drag
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeDragRef.current) {
        const { node, originalX, originalY, onCancel } = activeDragRef.current;
        // Set cancelled flag BEFORE stopDrag() - stopDrag triggers onDragEnd
        dragCancelledRef.current = true;
        node.stopDrag();
        node.x(originalX);
        node.y(originalY);
        onCancel?.();
        activeDragRef.current = null;
        onCursorChange?.('default');
      }
    };

    // Use capture phase to get event before anything else can handle it
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onCursorChange]);

  const handleDragStart = useCallback((lineId: string, originalY: number, originalPrice: number) => {
    dragStateRef.current = { lineId, originalY, originalPrice };
  }, []);

  const handleDragEnd = useCallback((lineId: string, newPrice: number) => {
    if (!dragStateRef.current || dragStateRef.current.lineId !== lineId) return;

    const { originalPrice } = dragStateRef.current;

    // Only trigger move callback if price actually changed
    if (Math.abs(newPrice - originalPrice) > 0.0000001) {
      onOrderMove?.(lineId, newPrice);
    }

    dragStateRef.current = null;
  }, [onOrderMove]);

  // Format price for display - use precision from label bounds
  const formatPrice = useCallback((price: number) => {
    // Use the same precision as existing labels
    const decimals = labelBounds[0]?.label?.primaryText?.split('.')[1]?.length ?? 2;
    return price.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }, [labelBounds]);

  const handleButtonClick = useCallback((lineId: string, buttonType: 'cancel' | 'close' | 'reverse') => {
    if (buttonType === 'cancel') {
      onOrderCancel?.(lineId);
    } else if (buttonType === 'close') {
      onPositionClose?.(lineId);
    } else if (buttonType === 'reverse') {
      onPositionReverse?.(lineId);
    }
  }, [onOrderCancel, onPositionClose, onPositionReverse]);

  const handleTPButtonClick = useCallback((positionId: string) => {
    onTPClick?.(positionId);
  }, [onTPClick]);

  const handleSLButtonClick = useCallback((positionId: string) => {
    onSLClick?.(positionId);
  }, [onSLClick]);

  // Separate floating and non-floating labels for explicit z-ordering
  // Floating labels (like crosshair) must render AFTER non-floating (order/position)
  // For crosshair-type entries, only include when crosshair is visible (same as vertical line)
  const nonFloatingBounds = labelBounds.filter(b => !b.floatingLabel);
  const floatingBounds = labelBounds.filter(b => b.floatingLabel && (b.type !== 'crosshair' || crosshair?.visible));

  const renderBound = (bound: PriceLineLabelBounds) => {
    const lineType = bound.type || 'price';
    const isDraggable = lineType === 'order' || lineType === 'position';
    const isPending = pendingOrders?.has(bound.lineId) ?? false;

    return (
      <PriceLineGroup
        key={bound.lineId}
        bound={bound}
        width={width}
        margins={margins}
        priceToY={priceToY}
        yToPrice={yToPrice}
        isDraggable={isDraggable}
        isPending={isPending}
        formatPrice={formatPrice}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onButtonClick={handleButtonClick}
        onTPButtonClick={handleTPButtonClick}
        onSLButtonClick={handleSLButtonClick}
        onTPDragEnd={onTPDragEnd}
        onSLDragEnd={onSLDragEnd}
        onCursorChange={onCursorChange}
        hasContextMenuButton={hasContextMenuButton}
        registerDrag={registerDrag}
        clearDrag={clearDrag}
        wasDragCancelled={wasDragCancelled}
      />
    );
  };

  return (
    <>
      {/* Non-floating labels (order/position) render first (underneath) */}
      {nonFloatingBounds.map(renderBound)}
      {/* Floating labels (crosshair horizontal line + label) render on top */}
      {floatingBounds.map(renderBound)}
      {/* Crosshair vertical line renders on top of everything */}
      {crosshair?.visible && (
        <Line
          points={[crosshair.x, 0, crosshair.x, height]}
          stroke={crosshair.color}
          strokeWidth={1}
          dash={[4, 4]}
          listening={false}
        />
      )}
      {/* Context menu "+" button at crosshair position - left of price axis */}
      {/* Note: We set cursor directly on container, NOT via onCursorChange, to avoid isOverKonvaElementRef */}
      {/* Only show on main pane (hasContextMenuButton controls this) */}
      {crosshair?.visible && hasContextMenuButton && onContextMenuButtonClick && (
        <Group
          x={width - margins.right - 10}
          y={crosshair.y}
          onClick={(e) => {
            const nativeEvt = e.evt;
            const price = yToPrice(crosshair.y);
            onContextMenuButtonClick(price, nativeEvt.clientX, nativeEvt.clientY);
          }}
          onTap={(e) => {
            const nativeEvt = e.evt as TouchEvent;
            const touch = nativeEvt.changedTouches?.[0];
            if (touch) {
              const price = yToPrice(crosshair.y);
              onContextMenuButtonClick(price, touch.clientX, touch.clientY);
            }
          }}
          onMouseEnter={(e) => {
            // Set cursor directly - don't use onCursorChange to avoid isOverKonvaElementRef
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = 'pointer';
          }}
          onMouseLeave={(e) => {
            // Clear cursor - let parent handle it
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = '';
          }}
        >
          <Circle
            x={0}
            y={0}
            radius={8}
            stroke={crosshair.color}
            strokeWidth={1}
            fill="rgba(0,0,0,0.01)"
          />
          <Line
            points={[-4, 0, 4, 0]}
            stroke={crosshair.color}
            strokeWidth={1.5}
            listening={false}
          />
          <Line
            points={[0, -4, 0, 4]}
            stroke={crosshair.color}
            strokeWidth={1.5}
            listening={false}
          />
        </Group>
      )}
    </>
  );
};

export default PriceLineLayer;
