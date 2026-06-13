import type {
  ChartTradingAction,
  ChartTradingIntent,
  ChartTradingIntentHandler,
  ChartTradingLineDash,
  ChartTradingOrderLine,
  ChartTradingPositionLine,
  ChartTradingState,
} from '../trading';
import type { TradingViewPatchCallbacks, TradingViewRenderFrame, TradingViewRenderFrameInput } from './types';

import { normalizeTradingViewRenderFrame } from './frameBridge';

const LABEL_HEIGHT = 18;
const LINE_HIT_HEIGHT = 10;
const BASE_LABEL_WIDTH = 112;
const PRICE_AXIS_GAP = 64;
const ACTION_WIDTH = 24;
const BUILT_IN_ACTION_WIDTH = 18;
const BRACKET_GAP = 6;
const DRAG_THRESHOLD_PX = 3;
const DEFAULT_ORDER_COLOR = '#3b82f6';
const DEFAULT_POSITION_COLOR = '#22c55e';
const DEFAULT_SELL_COLOR = '#ef4444';
const TAKE_PROFIT_COLOR = '#22c55e';
const STOP_LOSS_COLOR = '#f97316';

type TradingViewTradingOwnerType = 'order' | 'position';

interface Point {
  x: number;
  y: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface HitTarget {
  rect: Rect;
  cursor: string;
  action:
    | { type: 'order-line'; line: ChartTradingOrderLine }
    | { type: 'order-cancel'; line: ChartTradingOrderLine }
    | { type: 'position-close'; line: ChartTradingPositionLine }
    | { type: 'position-reverse'; line: ChartTradingPositionLine }
    | { type: 'line-action'; lineId: string; actionId: string }
    | {
        type: 'bracket';
        ownerType: TradingViewTradingOwnerType;
        ownerId: string;
        lineId: string;
        side: 'tp' | 'sl';
        partialEnabled: boolean;
      };
}

interface ActiveOrderDrag {
  type: 'order';
  line: ChartTradingOrderLine;
  start: Point;
}

interface ActiveBracketDrag {
  type: 'bracket';
  ownerType: TradingViewTradingOwnerType;
  ownerId: string;
  lineId: string;
  side: 'tp' | 'sl';
  start: Point;
  partialEnabled: boolean;
}

type ActiveDrag = ActiveOrderDrag | ActiveBracketDrag;

export interface TradingViewTradingBridgeOptions {
  state?: ChartTradingState;
  onIntent?: ChartTradingIntentHandler;
}

export class TradingViewTradingBridge {
  private state: ChartTradingState = {};
  private lastFrame: TradingViewRenderFrame | null = null;
  private hitTargets: HitTarget[] = [];
  private activeDrag: ActiveDrag | null = null;
  private activePointerId: number | null = null;
  private readonly listeners = new Set<ChartTradingIntentHandler>();
  private attachedElement: HTMLElement | null = null;
  private detachListeners: (() => void) | null = null;

  constructor(options: TradingViewTradingBridgeOptions = {}) {
    this.state = cloneTradingState(options.state ?? {});
    if (options.onIntent) {
      this.listeners.add(options.onIntent);
    }
  }

  setState(state: ChartTradingState): void {
    const nextState = cloneTradingState(state);
    this.activeDrag = rebindActiveDrag(this.activeDrag, nextState);
    this.state = nextState;
    this.hitTargets = [];
  }

  getState(): ChartTradingState {
    return cloneTradingState(this.state);
  }

  onIntent(handler: ChartTradingIntentHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  callbacks(): TradingViewPatchCallbacks {
    return {
      afterBars: (frame) => this.draw(frame),
    };
  }

  attach(element: HTMLElement): () => void {
    this.detach();
    this.attachedElement = element;

    const onPointerDown = (event: PointerEvent) => {
      const point = this.eventPoint(event);
      if (!point) return;
      const hit = this.findHit(point);
      if (!hit) return;
      element.style.cursor = hit.cursor;
      claimPointerEvent(event);
      capturePointer(element, event);
      this.activePointerId = typeof event.pointerId === 'number' ? event.pointerId : null;
      this.handleHitStart(hit, point);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (this.activeDrag) {
        const point = this.eventPoint(event, { allowOutside: true });
        element.style.cursor = 'ns-resize';
        claimPointerEvent(event);
        if (point) {
          this.handlePointerMove(point);
        }
        return;
      }
      const point = this.eventPoint(event);
      if (!point) return;
      const hit = this.findHit(point);
      if (hit) {
        element.style.cursor = hit.cursor;
        claimPointerEvent(event);
        return;
      }
      element.style.cursor = '';
    };
    const onPointerUp = (event: PointerEvent) => {
      const point = this.activeDrag ? this.eventPoint(event, { allowOutside: true }) : this.eventPoint(event);
      const activeDrag = this.activeDrag;
      const hit = point ? this.findHit(point) : null;
      if (activeDrag || hit) {
        claimPointerEvent(event);
      }
      if (point) {
        this.handlePointerUp(point);
      }
      this.activeDrag = null;
      releasePointer(element, event);
      this.activePointerId = null;
      element.style.cursor = point ? this.findHit(point)?.cursor ?? '' : '';
    };
    const onPointerCancel = (event: PointerEvent) => {
      if (!this.activeDrag) return;
      claimPointerEvent(event);
      this.activeDrag = null;
      releasePointer(element, event);
      this.activePointerId = null;
      element.style.cursor = '';
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !this.activeDrag) return;
      claimKeyboardEvent(event);
      this.activeDrag = null;
      releasePointerId(element, this.activePointerId);
      this.activePointerId = null;
      element.style.cursor = '';
    };
    const onPointerLeave = () => {
      if (!this.activeDrag) {
        element.style.cursor = '';
      }
    };

    element.addEventListener('pointerdown', onPointerDown, { capture: true });
    element.addEventListener('pointermove', onPointerMove, { capture: true });
    element.addEventListener('pointercancel', onPointerCancel, { capture: true });
    element.addEventListener('lostpointercapture', onPointerCancel, { capture: true });
    element.addEventListener('pointerleave', onPointerLeave, { capture: true });
    window.addEventListener('pointerup', onPointerUp, { capture: true });
    window.addEventListener('keydown', onKeyDown, { capture: true });

    this.detachListeners = () => {
      element.removeEventListener('pointerdown', onPointerDown, { capture: true });
      element.removeEventListener('pointermove', onPointerMove, { capture: true });
      element.removeEventListener('pointercancel', onPointerCancel, { capture: true });
      element.removeEventListener('lostpointercapture', onPointerCancel, { capture: true });
      element.removeEventListener('pointerleave', onPointerLeave, { capture: true });
      window.removeEventListener('pointerup', onPointerUp, { capture: true });
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      if (this.attachedElement === element) {
        element.style.cursor = '';
      }
    };

    return () => this.detach();
  }

  detach(): void {
    this.detachListeners?.();
    this.detachListeners = null;
    this.attachedElement = null;
    this.activeDrag = null;
    this.activePointerId = null;
  }

  destroy(): void {
    this.detach();
    this.listeners.clear();
    this.hitTargets = [];
    this.lastFrame = null;
  }

  handlePointerDown(point: Point): void {
    const hit = this.findHit(point);
    if (hit) {
      this.handleHitStart(hit, point);
    }
  }

  handlePointerMove(point: Point): void {
    if (!this.activeDrag || !this.lastFrame) return;
    if (this.activeDrag.type !== 'bracket') return;
    if (distance(this.activeDrag.start, point) < DRAG_THRESHOLD_PX) return;
    this.emit({
      type: `bracket.${this.activeDrag.side}.preview`,
      source: 'tradingview-bridge',
      ownerType: this.activeDrag.ownerType,
      ownerId: this.activeDrag.ownerId,
      lineId: this.activeDrag.lineId,
      price: this.lastFrame.coordToPrice(point.y),
      partialPercent: bracketPartialPercent(this.activeDrag, point),
    });
  }

  handlePointerUp(point: Point): void {
    if (!this.activeDrag || !this.lastFrame) return;
    if (distance(this.activeDrag.start, point) < DRAG_THRESHOLD_PX) {
      if (this.activeDrag.type === 'bracket') {
        this.emitBracketClick(this.activeDrag);
      }
      return;
    }
    if (this.activeDrag.type === 'order') {
      const line = this.activeDrag.line;
      this.emit({
        type: 'order.move.commit',
        source: 'tradingview-bridge',
        orderId: line.orderId ?? line.id,
        lineId: ownedTradingLineId('order', line.id),
        price: this.lastFrame.coordToPrice(point.y),
        ...meta(line.meta),
      });
      return;
    }
    this.emit({
      type: `bracket.${this.activeDrag.side}.commit`,
      source: 'tradingview-bridge',
      ownerType: this.activeDrag.ownerType,
      ownerId: this.activeDrag.ownerId,
      lineId: this.activeDrag.lineId,
      price: this.lastFrame.coordToPrice(point.y),
      partialPercent: bracketPartialPercent(this.activeDrag, point),
    });
  }

  draw(frame: TradingViewRenderFrameInput): void {
    const normalized = normalizeTradingViewRenderFrame(frame);
    if (!normalized) {
      this.lastFrame = null;
      this.hitTargets = [];
      this.activeDrag = null;
      return;
    }

    this.lastFrame = normalized;
    this.hitTargets = [];

    const ctx = normalized.ctx;
    ctx.save();
    ctx.font = `${fontSize(ctx, 11)}px sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.lineCap = 'butt';

    for (const position of this.state.positions ?? []) {
      this.drawPosition(ctx, normalized, position);
    }
    for (const order of this.state.orders ?? []) {
      this.drawOrder(ctx, normalized, order);
    }
    for (const execution of this.state.executions ?? []) {
      const y = normalized.priceToCoord(execution.price);
      const x = xForTime(normalized, execution.time);
      if (x === null || !Number.isFinite(y)) continue;
      const color = execution.direction === 'sell' ? DEFAULT_SELL_COLOR : DEFAULT_POSITION_COLOR;
      ctx.fillStyle = execution.style?.lineColor ?? color;
      ctx.beginPath();
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x + (execution.direction === 'sell' ? -8 : 8), y);
      ctx.lineTo(x, y + 5);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  private drawOrder(ctx: CanvasRenderingContext2D, frame: TradingViewRenderFrame, line: ChartTradingOrderLine): void {
    const y = frame.priceToCoord(line.price);
    if (!Number.isFinite(y)) return;

    const color = line.style?.lineColor ?? tradingColor(line.side, 'order');
    const label = line.label?.primary ?? defaultLabel(line.side, 'Order');
    const quantity = line.label?.quantity ?? (line.quantity == null ? '' : String(line.quantity));
    const actions = actionButtons(line.actions, line.style, color);
    const cancellable = line.cancellable === true || hasEnabledTradingAction(line.actions, 'cancel');
    const editable = line.editable === true;
    const buttons = [
      ...(cancellable
        ? [{ id: 'cancel', width: BUILT_IN_ACTION_WIDTH, text: '×', background: line.style?.actionBackgroundColor ?? color, color: line.style?.actionIconColor ?? '#ffffff', border: line.style?.actionBorderColor ?? color }]
        : []),
      ...(line.brackets == null ? [] : [{ id: 'tp', width: ACTION_WIDTH, text: 'TP', background: '#101827', color: TAKE_PROFIT_COLOR, border: TAKE_PROFIT_COLOR }]),
      ...(line.brackets == null ? [] : [{ id: 'sl', width: ACTION_WIDTH, text: 'SL', background: '#101827', color: STOP_LOSS_COLOR, border: STOP_LOSS_COLOR }]),
      ...actions,
    ];
    const labelWidth = BASE_LABEL_WIDTH + buttons.reduce((sum, button) => sum + button.width, 0) + (buttons.length > 0 ? BRACKET_GAP : 0);
    const labelX = labelLeft(frame.chartWidth, labelWidth, line.style?.lineLength);

    drawTradingLine(ctx, frame, y, labelX, labelWidth, color, line.style);
    const buttonRects = this.drawLabel(ctx, labelX, y, label, quantity, color, line.style, buttons);

    if (editable) {
      this.hitTargets.push({
        rect: { x: 0, y: y - LINE_HIT_HEIGHT / 2, width: frame.chartWidth - PRICE_AXIS_GAP, height: LINE_HIT_HEIGHT },
        cursor: 'ns-resize',
        action: { type: 'order-line', line },
      });
    }
    for (const target of buttonRects) {
      if (target.id === 'cancel') {
        this.hitTargets.push({ rect: target.rect, cursor: 'pointer', action: { type: 'order-cancel', line } });
      } else if (target.id === 'tp' || target.id === 'sl') {
        this.hitTargets.push({
          rect: target.rect,
          cursor: 'pointer',
          action: {
            type: 'bracket',
            ownerType: 'order',
            ownerId: line.orderId ?? line.id,
            lineId: ownedTradingLineId('order', line.id),
            side: target.id,
            partialEnabled: line.partialEnabled === true,
          },
        });
      } else {
        this.hitTargets.push({
          rect: target.rect,
          cursor: 'pointer',
          action: { type: 'line-action', lineId: ownedTradingLineId('order', line.id), actionId: target.id },
        });
      }
    }
  }

  private drawPosition(
    ctx: CanvasRenderingContext2D,
    frame: TradingViewRenderFrame,
    line: ChartTradingPositionLine,
  ): void {
    const y = frame.priceToCoord(line.price);
    if (!Number.isFinite(y)) return;

    const color = line.style?.lineColor ?? tradingColor(line.side, 'position');
    const label = line.label?.primary ?? defaultLabel(line.side, 'Position');
    const quantity = line.label?.quantity ?? (line.quantity == null ? '' : String(line.quantity));
    const actions = actionButtons(line.actions, line.style, color);
    const closeable = line.closeable === true || hasEnabledTradingAction(line.actions, 'close');
    const reversible = line.reversible === true || hasEnabledTradingAction(line.actions, 'reverse');
    const buttons = [
      ...(closeable
        ? [{ id: 'close', width: BUILT_IN_ACTION_WIDTH, text: '×', background: line.style?.actionBackgroundColor ?? color, color: line.style?.actionIconColor ?? '#ffffff', border: line.style?.actionBorderColor ?? color }]
        : []),
      ...(reversible
        ? [{ id: 'reverse', width: BUILT_IN_ACTION_WIDTH, text: '↩', background: line.style?.actionBackgroundColor ?? color, color: line.style?.actionIconColor ?? '#ffffff', border: line.style?.actionBorderColor ?? color }]
        : []),
      ...(line.brackets == null ? [] : [{ id: 'tp', width: ACTION_WIDTH, text: 'TP', background: '#101827', color: TAKE_PROFIT_COLOR, border: TAKE_PROFIT_COLOR }]),
      ...(line.brackets == null ? [] : [{ id: 'sl', width: ACTION_WIDTH, text: 'SL', background: '#101827', color: STOP_LOSS_COLOR, border: STOP_LOSS_COLOR }]),
      ...actions,
    ];
    const labelWidth = BASE_LABEL_WIDTH + buttons.reduce((sum, button) => sum + button.width, 0) + (buttons.length > 0 ? BRACKET_GAP : 0);
    const labelX = labelLeft(frame.chartWidth, labelWidth, line.style?.lineLength);

    drawTradingLine(ctx, frame, y, labelX, labelWidth, color, line.style);
    this.drawPositionBracketLines(ctx, frame, line, labelX, labelWidth);
    const secondary = line.label?.pnl ?? quantity;
    const buttonRects = this.drawLabel(ctx, labelX, y, label, secondary, color, line.style, buttons);

    for (const target of buttonRects) {
      if (target.id === 'close') {
        this.hitTargets.push({ rect: target.rect, cursor: 'pointer', action: { type: 'position-close', line } });
      } else if (target.id === 'reverse') {
        this.hitTargets.push({ rect: target.rect, cursor: 'pointer', action: { type: 'position-reverse', line } });
      } else if (target.id === 'tp' || target.id === 'sl') {
        this.hitTargets.push({
          rect: target.rect,
          cursor: 'pointer',
          action: {
            type: 'bracket',
            ownerType: 'position',
            ownerId: line.positionId ?? line.id,
            lineId: ownedTradingLineId('position', line.id),
            side: target.id,
            partialEnabled: line.partialEnabled === true,
          },
        });
      } else {
        this.hitTargets.push({
          rect: target.rect,
          cursor: 'pointer',
          action: { type: 'line-action', lineId: ownedTradingLineId('position', line.id), actionId: target.id },
        });
      }
    }
  }

  private drawPositionBracketLines(
    ctx: CanvasRenderingContext2D,
    frame: TradingViewRenderFrame,
    line: ChartTradingPositionLine,
    labelX: number,
    labelWidth: number,
  ): void {
    if (!line.brackets) return;
    if (isPositiveFinite(line.brackets.takeProfit)) {
      drawTradingLine(ctx, frame, frame.priceToCoord(line.brackets.takeProfit), labelX, labelWidth, TAKE_PROFIT_COLOR, {
        lineStyle: 'dashed',
        lineWidth: 1,
        extendLeft: true,
      });
    }
    if (isPositiveFinite(line.brackets.stopLoss)) {
      drawTradingLine(ctx, frame, frame.priceToCoord(line.brackets.stopLoss), labelX, labelWidth, STOP_LOSS_COLOR, {
        lineStyle: 'dashed',
        lineWidth: 1,
        extendLeft: true,
      });
    }
  }

  private drawLabel(
    ctx: CanvasRenderingContext2D,
    x: number,
    lineY: number,
    primary: string,
    secondary: string,
    fallbackColor: string,
    style: ChartTradingOrderLine['style'],
    buttons: readonly ButtonSpec[],
  ): Array<{ id: string; rect: Rect }> {
    const y = lineY - LABEL_HEIGHT / 2;
    const bodyColor = style?.bodyBackgroundColor ?? '#111827';
    const bodyTextColor = style?.bodyTextColor ?? '#ffffff';
    const bodyBorderColor = style?.bodyBorderColor ?? fallbackColor;
    const secondaryColor = style?.quantityBackgroundColor ?? '#1f2937';
    const secondaryTextColor = style?.quantityTextColor ?? bodyTextColor;
    const secondaryBorderColor = style?.quantityBorderColor ?? bodyBorderColor;
    const primaryWidth = Math.round(BASE_LABEL_WIDTH * 0.58);
    const secondaryWidth = BASE_LABEL_WIDTH - primaryWidth;
    const buttonRects: Array<{ id: string; rect: Rect }> = [];

    drawSegment(ctx, { x, y, width: primaryWidth, height: LABEL_HEIGHT }, bodyColor, bodyBorderColor);
    drawText(ctx, primary, x + 6, lineY, bodyTextColor, 'left');
    drawSegment(ctx, { x: x + primaryWidth, y, width: secondaryWidth, height: LABEL_HEIGHT }, secondaryColor, secondaryBorderColor);
    drawText(ctx, secondary, x + primaryWidth + 6, lineY, secondaryTextColor, 'left');

    let buttonX = x + BASE_LABEL_WIDTH + (buttons.length > 0 ? BRACKET_GAP : 0);
    for (const button of buttons) {
      const rect = { x: buttonX, y, width: button.width, height: LABEL_HEIGHT };
      drawSegment(ctx, rect, button.background, button.border);
      drawText(ctx, button.text, buttonX + button.width / 2, lineY, button.color, 'center');
      buttonRects.push({ id: button.id, rect });
      buttonX += button.width;
    }

    return buttonRects;
  }

  private eventPoint(event: PointerEvent, options: { allowOutside?: boolean } = {}): Point | null {
    if (!this.attachedElement || !this.lastFrame) return null;
    const rect = elementBounds(this.lastFrame.ctx.canvas) ?? elementBounds(this.attachedElement);
    if (!rect) return null;
    if (!options.allowOutside && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) {
      return null;
    }
    return {
      x: ((event.clientX - rect.left) * this.lastFrame.chartWidth) / rect.width,
      y: ((event.clientY - rect.top) * this.lastFrame.chartHeight) / rect.height,
    };
  }

  private findHit(point: Point): HitTarget | null {
    for (let index = this.hitTargets.length - 1; index >= 0; index -= 1) {
      const target = this.hitTargets[index];
      if (target && contains(target.rect, point)) return target;
    }
    return null;
  }

  private handleHitStart(hit: HitTarget, point: Point): void {
    switch (hit.action.type) {
      case 'order-line':
        this.activeDrag = { type: 'order', line: hit.action.line, start: point };
        break;
      case 'order-cancel':
        this.emit({
          type: 'order.cancel',
          source: 'tradingview-bridge',
          orderId: hit.action.line.orderId ?? hit.action.line.id,
          lineId: ownedTradingLineId('order', hit.action.line.id),
          ...meta(hit.action.line.meta),
        });
        break;
      case 'position-close':
        this.emit({
          type: 'position.close',
          source: 'tradingview-bridge',
          positionId: hit.action.line.positionId ?? hit.action.line.id,
          lineId: ownedTradingLineId('position', hit.action.line.id),
          ...meta(hit.action.line.meta),
        });
        break;
      case 'position-reverse':
        this.emit({
          type: 'position.reverse',
          source: 'tradingview-bridge',
          positionId: hit.action.line.positionId ?? hit.action.line.id,
          lineId: ownedTradingLineId('position', hit.action.line.id),
          ...meta(hit.action.line.meta),
        });
        break;
      case 'line-action':
        this.emit({
          type: 'line.action',
          source: 'tradingview-bridge',
          lineId: hit.action.lineId,
          actionId: hit.action.actionId,
        });
        break;
      case 'bracket':
        this.activeDrag = { ...hit.action, start: point };
        break;
    }

    if (hit.action.type !== 'order-line' && hit.action.type !== 'bracket') {
      this.handlePointerUp(point);
    }
  }

  private emitBracketClick(drag: ActiveBracketDrag): void {
    this.emit({
      type: `bracket.${drag.side}.click`,
      source: 'tradingview-bridge',
      ownerType: drag.ownerType,
      ownerId: drag.ownerId,
      lineId: drag.lineId,
    });
  }
  private emit(intent: ChartTradingIntent): void {
    for (const listener of this.listeners) {
      listener(intent);
    }
  }
}

interface ButtonSpec {
  id: string;
  width: number;
  text: string;
  background: string;
  color: string;
  border: string;
}

function cloneTradingState(state: ChartTradingState): ChartTradingState {
  return {
    orders: state.orders?.map((order) => ({ ...order, label: order.label ? { ...order.label } : undefined, style: order.style ? { ...order.style } : undefined, actions: order.actions?.map((action) => ({ ...action })), brackets: order.brackets ? { ...order.brackets } : order.brackets })),
    positions: state.positions?.map((position) => ({ ...position, label: position.label ? { ...position.label } : undefined, style: position.style ? { ...position.style } : undefined, actions: position.actions?.map((action) => ({ ...action })), brackets: position.brackets ? { ...position.brackets } : position.brackets })),
    executions: state.executions?.map((execution) => ({ ...execution, label: execution.label ? { ...execution.label } : undefined, style: execution.style ? { ...execution.style } : undefined, actions: execution.actions?.map((action) => ({ ...action })) })),
  };
}

function rebindActiveDrag(activeDrag: ActiveDrag | null, state: ChartTradingState): ActiveDrag | null {
  if (!activeDrag) return null;
  if (activeDrag.type === 'order') {
    const line = state.orders?.find((order) => order.id === activeDrag.line.id);
    return line?.editable === true ? { ...activeDrag, line } : null;
  }

  if (activeDrag.ownerType === 'order') {
    const owner = state.orders?.find((order) => ownedTradingLineId('order', order.id) === activeDrag.lineId);
    if (!owner?.brackets) return null;
    return {
      ...activeDrag,
      ownerId: owner.orderId ?? owner.id,
      partialEnabled: owner.partialEnabled === true,
    };
  }

  const owner = state.positions?.find((position) => ownedTradingLineId('position', position.id) === activeDrag.lineId);
  if (!owner?.brackets) return null;
  return {
    ...activeDrag,
    ownerId: owner.positionId ?? owner.id,
    partialEnabled: owner.partialEnabled === true,
  };
}

function ownedTradingLineId(kind: TradingViewTradingOwnerType | 'execution', id: string): string {
  return `chart_trading_${kind}_${id}`;
}

function bracketPartialPercent(drag: ActiveBracketDrag, point: Point): number {
  if (!drag.partialEnabled) return 100;
  const deltaX = Math.abs(point.x - drag.start.x);
  if (deltaX <= 27) return 100;
  if (deltaX <= 82) return 75;
  if (deltaX <= 137) return 50;
  if (deltaX <= 192) return 25;
  return 10;
}

function isPositiveFinite(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
}

function claimPointerEvent(event: PointerEvent): void {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function claimKeyboardEvent(event: KeyboardEvent): void {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

function capturePointer(element: HTMLElement, event: PointerEvent): void {
  if (typeof event.pointerId !== 'number' || typeof element.setPointerCapture !== 'function') return;
  element.setPointerCapture(event.pointerId);
}

function releasePointer(element: HTMLElement, event: PointerEvent): void {
  if (typeof event.pointerId !== 'number' || typeof element.releasePointerCapture !== 'function') return;
  releasePointerId(element, event.pointerId);
}

function releasePointerId(element: HTMLElement, pointerId: number | null): void {
  if (pointerId == null || typeof element.releasePointerCapture !== 'function') return;
  if (typeof element.hasPointerCapture === 'function' && !element.hasPointerCapture(pointerId)) return;
  try {
    element.releasePointerCapture(pointerId);
  } catch {
    // Browsers can report lost capture before pointerup; cleanup should still proceed.
  }
}

function actionButtons(
  actions: readonly ChartTradingAction[] | undefined,
  style: ChartTradingOrderLine['style'],
  fallbackColor: string,
): ButtonSpec[] {
  return (actions ?? [])
    .filter((action) => !action.disabled && !isBuiltInAction(action.id))
    .map((action) => ({
      id: action.id,
      width: ACTION_WIDTH,
      text: action.icon ?? action.label.slice(0, 2).toUpperCase(),
      background: style?.actionBackgroundColor ?? fallbackColor,
      color: style?.actionIconColor ?? '#ffffff',
      border: style?.actionBorderColor ?? fallbackColor,
    }));
}

function isBuiltInAction(id: string): boolean {
  return id === 'cancel' || id === 'close' || id === 'reverse';
}

function hasEnabledTradingAction(actions: readonly ChartTradingAction[] | undefined, id: string): boolean {
  return (actions ?? []).some((action) => action.id === id && !action.disabled);
}

function drawTradingLine(
  ctx: CanvasRenderingContext2D,
  frame: TradingViewRenderFrame,
  y: number,
  labelX: number,
  labelWidth: number,
  color: string,
  style: ChartTradingOrderLine['style'],
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = style?.lineWidth ?? 1;
  ctx.setLineDash(lineDash(style?.lineStyle));
  ctx.beginPath();
  if (style?.extendLeft !== false) {
    ctx.moveTo(0, y);
    ctx.lineTo(Math.max(0, labelX - 2), y);
  }
  ctx.moveTo(labelX + labelWidth + 2, y);
  ctx.lineTo(Math.max(labelX + labelWidth + 2, frame.chartWidth - PRICE_AXIS_GAP), y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawSegment(ctx: CanvasRenderingContext2D, rect: Rect, fill: string, stroke: string): void {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  align: CanvasTextAlign,
): void {
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

function labelLeft(chartWidth: number, labelWidth: number, lineLength = 0): number {
  const min = 0;
  const max = Math.max(min, chartWidth - PRICE_AXIS_GAP - labelWidth);
  return min + ((max - min) * (100 - lineLength)) / 100;
}

function lineDash(style: ChartTradingLineDash | undefined): number[] {
  switch (style) {
    case 1:
    case 'dotted':
      return [2, 4];
    case 2:
    case 'dashed':
      return [6, 4];
    default:
      return [];
  }
}

function fontSize(ctx: CanvasRenderingContext2D, size: number): number {
  const maybeScaled = ctx as CanvasRenderingContext2D & { fontSize?: (value: number) => number };
  return typeof maybeScaled.fontSize === 'function' ? maybeScaled.fontSize(size) : size;
}

function contains(rect: Rect, point: Point): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function elementBounds(element: Element | null | undefined): DOMRect | null {
  const rect = element?.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) return null;
  return rect;
}

function tradingColor(side: ChartTradingOrderLine['side'], kind: 'order' | 'position'): string {
  if (side === 'sell' || side === 'short') return DEFAULT_SELL_COLOR;
  return kind === 'position' ? DEFAULT_POSITION_COLOR : DEFAULT_ORDER_COLOR;
}

function defaultLabel(side: ChartTradingOrderLine['side'], fallback: string): string {
  if (!side) return fallback;
  return side.toUpperCase();
}

function meta(value: unknown): { meta?: unknown } {
  return value === undefined ? {} : { meta: value };
}

function xForTime(frame: TradingViewRenderFrame, time: number): number | null {
  if (!frame.bars.length || !frame.candleCoords.length) return null;
  const pointCount = Math.min(frame.bars.length, frame.candleCoords.length);
  if (pointCount === 0) return null;

  const firstTime = frame.bars[0]?.time;
  const lastTime = frame.bars[pointCount - 1]?.time;
  if (firstTime == null || lastTime == null) return null;

  const minTime = Math.min(firstTime, lastTime);
  const maxTime = Math.max(firstTime, lastTime);
  if (time < minTime || time > maxTime) return null;

  for (let index = 0; index < pointCount; index += 1) {
    const bar = frame.bars[index];
    const coord = frame.candleCoords[index];
    if (!bar || !coord) continue;
    if (bar.time === time) return coord.center;
  }

  for (let index = 1; index < pointCount; index += 1) {
    const previousBar = frame.bars[index - 1];
    const previousCoord = frame.candleCoords[index - 1];
    const bar = frame.bars[index];
    const coord = frame.candleCoords[index];
    if (!previousBar || !previousCoord || !bar || !coord || previousBar.time === bar.time) continue;

    const lower = Math.min(previousBar.time, bar.time);
    const upper = Math.max(previousBar.time, bar.time);
    if (time < lower || time > upper) continue;

    const ratio = (time - previousBar.time) / (bar.time - previousBar.time);
    return previousCoord.center + (coord.center - previousCoord.center) * ratio;
  }

  return null;
}
