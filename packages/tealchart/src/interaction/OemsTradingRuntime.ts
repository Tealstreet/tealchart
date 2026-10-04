import type {
  Awaitable,
  OemsActionResult,
  OrderLineRenderData,
  PositionLineRenderData,
  PriceLineLabelBounds,
} from '../types';
import type { OemsActionKind } from './oemsActionManager';
import type { OemsTradingLineState } from './oemsLineState';

import { OemsActionManager } from './oemsActionManager';
import {
  applyOemsOrderActionState,
  applyOemsPositionActionState,
  confirmOemsOrderLineSnapshots,
  confirmOemsPositionLineSnapshots,
  getOemsOrderLineState,
  getOemsOrderObjectId,
  getOemsPositionLineState,
  getOemsPositionObjectId,
} from './oemsLineState';

export interface OemsTradingRuntimeOptions {
  priceTolerance?: () => number;
  onChange?: () => void;
  onOrderMove?: (id: string, price: number) => Awaitable<OemsActionResult>;
  onOrderCancel?: (id: string) => Awaitable<OemsActionResult>;
  onPositionClose?: (id: string) => Awaitable<OemsActionResult>;
  onPositionReverse?: (id: string) => Awaitable<OemsActionResult>;
}

/** Existing ChartCore action ownership, shared by chart hosts. No projection or DOM state. */
export class OemsTradingRuntime {
  readonly oemsActions: OemsActionManager<OemsTradingLineState>;
  private rawOrderLines: OrderLineRenderData[] = [];
  private rawPositionLines: PositionLineRenderData[] = [];
  private orderLines: OrderLineRenderData[] = [];
  private positionLines: PositionLineRenderData[] = [];

  constructor(private readonly options: OemsTradingRuntimeOptions = {}) {
    this.oemsActions = new OemsActionManager<OemsTradingLineState>({
      priceTolerance: options.priceTolerance,
      onChange: () => {
        this.reapplyActionState();
        this.options.onChange?.();
      },
    });
  }

  setOrderLines(lines: OrderLineRenderData[]): void {
    if (lines === this.rawOrderLines && this.oemsActions.getActions().length === 0) return;
    this.rawOrderLines = lines;
    confirmOemsOrderLineSnapshots(this.oemsActions, lines);
    this.orderLines = lines.map((line) => applyOemsOrderActionState(line, this.oemsActions));
  }

  setPositionLines(lines: PositionLineRenderData[]): void {
    if (lines === this.rawPositionLines && this.oemsActions.getActions().length === 0) return;
    this.rawPositionLines = lines;
    confirmOemsPositionLineSnapshots(this.oemsActions, lines);
    this.positionLines = lines.map((line) => applyOemsPositionActionState(line, this.oemsActions));
  }

  getOrderLines(): OrderLineRenderData[] {
    return this.orderLines;
  }
  getPositionLines(): PositionLineRenderData[] {
    return this.positionLines;
  }

  private reapplyActionState(): void {
    this.orderLines = this.rawOrderLines.map((line) => applyOemsOrderActionState(line, this.oemsActions));
    this.positionLines = this.rawPositionLines.map((line) => applyOemsPositionActionState(line, this.oemsActions));
  }

  private getOrderObjectId(line: OrderLineRenderData): string {
    return getOemsOrderObjectId(line);
  }
  private getPositionObjectId(line: PositionLineRenderData): string {
    return getOemsPositionObjectId(line);
  }
  private getOrderLineState(line: OrderLineRenderData): OemsTradingLineState {
    return getOemsOrderLineState(line);
  }
  private getPositionLineState(line: PositionLineRenderData): OemsTradingLineState {
    return getOemsPositionLineState(line);
  }

  handleOrderMove(orderId: string, newPrice: number): void {
    // Raw, never the action-applied array: an action's optimistic state must
    // describe what the venue is expected to report back. Reading a line that
    // already carries an unsettled action folds that action's guess into the
    // new one, and `confirmState` compares every field it was given - so the
    // replacement could never confirm either.
    const order = this.rawOrderLines.find((line) => this.getOrderObjectId(line) === orderId);
    const originalState = order ? this.getOrderLineState(order) : { price: newPrice, visible: true };
    const result = this.oemsActions.startAction({
      objectType: 'order',
      objectId: orderId,
      kind: 'orderMove',
      originalState,
      optimisticState: {
        ...originalState,
        price: newPrice,
      },
      callback: () => this.options.onOrderMove?.(orderId, newPrice),
    });
    if (result.completedSynchronously) this.options.onChange?.();
  }

  handleOrderCancel(orderId: string): void {
    const order = this.rawOrderLines.find((line) => this.getOrderObjectId(line) === orderId);
    const originalState = order ? this.getOrderLineState(order) : { visible: true };
    const result = this.oemsActions.startAction({
      objectType: 'order',
      objectId: orderId,
      kind: 'orderCancel',
      originalState,
      optimisticState: originalState,
      confirmsRemoved: true,
      callback: () => this.options.onOrderCancel?.(orderId),
    });
    if (result.completedSynchronously) this.options.onChange?.();
  }

  handlePositionClose(positionId: string): void {
    const position = this.rawPositionLines.find((line) => this.getPositionObjectId(line) === positionId);
    const originalState = position ? this.getPositionLineState(position) : { visible: true };
    const result = this.oemsActions.startAction({
      objectType: 'position',
      objectId: positionId,
      kind: 'positionClose',
      originalState,
      optimisticState: originalState,
      confirmsRemoved: true,
      callback: () => this.options.onPositionClose?.(positionId),
    });
    if (result.completedSynchronously) this.options.onChange?.();
  }

  handlePositionReverse(positionId: string): void {
    const position = this.rawPositionLines.find((line) => this.getPositionObjectId(line) === positionId);
    const originalState = position ? this.getPositionLineState(position) : { visible: true };
    const result = this.oemsActions.startAction({
      objectType: 'position',
      objectId: positionId,
      kind: 'positionReverse',
      originalState,
      optimisticState: originalState,
      confirmsRemoved: true,
      callback: () => this.options.onPositionReverse?.(positionId),
    });
    if (result.completedSynchronously) this.options.onChange?.();
  }

  handleBracketMoveEnd(
    bracketType: 'tp' | 'sl',
    bound: PriceLineLabelBounds,
    price: number,
    partialPercent?: number,
  ): void {
    const object = this.getBoundTradingObject(bound);
    if (!object) return;

    const originalState = object.state;
    const existingBracketPrice = bracketType === 'tp' ? originalState.takeProfit : originalState.stopLoss;
    const optimisticState: OemsTradingLineState = {
      ...originalState,
      ...(bracketType === 'tp' ? { takeProfit: price } : { stopLoss: price }),
    };
    const kind = this.getBracketMoveActionKind(object.objectType, bracketType);
    const callback =
      bracketType === 'tp'
        ? () => bound.callbacks?.onTPMoveEnd?.(price, partialPercent)
        : () => bound.callbacks?.onSLMoveEnd?.(price, partialPercent);

    const result = this.oemsActions.startAction({
      objectType: object.objectType,
      objectId: object.objectId,
      kind,
      originalState,
      optimisticState,
      settleOnCallback: typeof existingBracketPrice !== 'number',
      callback,
    });
    if (result.completedSynchronously) this.options.onChange?.();
  }

  handleBracketClick(bracketType: 'tp' | 'sl', bound: PriceLineLabelBounds): void {
    const object = this.getBoundTradingObject(bound);
    if (!object) return;

    const kind: OemsActionKind = bracketType === 'tp' ? 'tpClick' : 'slClick';
    const callback = bracketType === 'tp' ? () => bound.callbacks?.onTPClick?.() : () => bound.callbacks?.onSLClick?.();
    const result = this.oemsActions.startAction({
      objectType: object.objectType,
      objectId: object.objectId,
      kind,
      originalState: object.state,
      optimisticState: object.state,
      callback,
    });
    if (result.completedSynchronously) this.options.onChange?.();
  }

  getBoundTradingObject(bound: PriceLineLabelBounds): {
    objectType: 'order' | 'position';
    objectId: string;
    state: OemsTradingLineState;
  } | null {
    if (bound.type === 'order') {
      // `lineId` IS the identity - it is the adapter's id, which is what the
      // OEMS layer keys on. Preferring `bound.orderId` started actions under the
      // venue's id and looked them up under the adapter's, so nothing on this
      // line ever rendered as pending. See CLAUDE.md "Line identity (OEMS)".
      const objectId = bound.lineId;
      const line = this.rawOrderLines.find((candidate) => this.getOrderObjectId(candidate) === objectId);
      return {
        objectType: 'order',
        objectId,
        state: line ? this.getOrderLineState(line) : { price: bound.price, visible: true },
      };
    }

    if (bound.type === 'position') {
      const objectId = bound.lineId;
      const line = this.rawPositionLines.find((candidate) => this.getPositionObjectId(candidate) === objectId);
      return {
        objectType: 'position',
        objectId,
        state: line ? this.getPositionLineState(line) : { price: bound.price, visible: true },
      };
    }

    return null;
  }

  private getBracketMoveActionKind(objectType: 'order' | 'position', bracketType: 'tp' | 'sl'): OemsActionKind {
    if (objectType === 'order') {
      return bracketType === 'tp' ? 'orderTpMove' : 'orderSlMove';
    }
    return bracketType === 'tp' ? 'positionTpMove' : 'positionSlMove';
  }

  dispose(): void {
    this.oemsActions.dispose();
  }
}
