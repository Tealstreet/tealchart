import type { BarsIndicator } from '../jailbreak/BarsIndicator';
import type {
  TradingViewPatchCallbacks,
  TradingViewRawRenderFrame,
  TradingViewRenderFrame,
  TradingViewRenderFrameInput,
} from './types';

import { JailbreakIndicatorManager } from '../jailbreak/JailbreakIndicatorManager';
import { normalizeTradingViewRenderFrame, toIndicatorDrawArgs } from './frameBridge';

export interface TradingViewOverlayIndicator {
  id: string;
  indicator: BarsIndicator;
  settings?: Record<string, unknown>;
  behindCandles?: boolean;
}

export interface TradingViewOverlayBridgeOptions {
  indicators?: readonly TradingViewOverlayIndicator[];
  hideNativeCandles?: boolean | ((frame: TradingViewRenderFrame) => boolean);
  onBeforeBars?: (frame: TradingViewRenderFrame) => void;
  onAfterBars?: (frame: TradingViewRenderFrame) => void;
}

export class TradingViewOverlayBridge {
  readonly indicatorManager = new JailbreakIndicatorManager();

  private hideNativeCandles: TradingViewOverlayBridgeOptions['hideNativeCandles'];
  private onBeforeBars?: (frame: TradingViewRenderFrame) => void;
  private onAfterBars?: (frame: TradingViewRenderFrame) => void;
  private lastBarFrame: TradingViewRenderFrame | null = null;
  private readonly paneIndicatorManagers = new Map<string, JailbreakIndicatorManager>();

  constructor(options: TradingViewOverlayBridgeOptions = {}) {
    this.hideNativeCandles = options.hideNativeCandles;
    this.onBeforeBars = options.onBeforeBars;
    this.onAfterBars = options.onAfterBars;

    for (const entry of options.indicators ?? []) {
      this.registerIndicator(entry);
    }
  }

  registerIndicator(entry: TradingViewOverlayIndicator): void {
    this.indicatorManager.register(entry.id, entry.indicator, entry.settings ?? {}, entry.behindCandles ?? false);
  }

  unregisterIndicator(id: string): void {
    this.indicatorManager.unregister(id);
  }

  registerPaneIndicator(sourceId: string, entry: TradingViewOverlayIndicator): void {
    this.getPaneIndicatorManager(sourceId).register(
      entry.id,
      entry.indicator,
      entry.settings ?? {},
      entry.behindCandles ?? false,
    );
  }

  unregisterPaneIndicator(sourceId: string, id: string): void {
    const manager = this.paneIndicatorManagers.get(sourceId);
    if (!manager) return;
    manager.unregister(id);
    if (manager.size === 0) {
      this.paneIndicatorManagers.delete(sourceId);
    }
  }

  updateIndicatorSettings(id: string, settings: Record<string, unknown>): void {
    this.indicatorManager.updateSettings(id, settings);
  }

  callbacks(): TradingViewPatchCallbacks {
    return {
      beforeBars: (frame) => this.drawBehindCandles(frame),
      afterBars: (frame) => this.drawAfterCandles(frame),
      afterPane: (frame) => this.drawPane(frame),
      hasPaneSource: (sourceId) => this.hasPaneSource(sourceId),
      shouldSkipNativeBars: (frame) => this.shouldSkipNativeBars(frame),
    };
  }

  drawBehindCandles(frame: TradingViewRenderFrameInput): void {
    const normalized = normalizeTradingViewRenderFrame(frame);
    const args = normalized ? toIndicatorDrawArgs(normalized) : null;
    if (!normalized || !args) return;

    this.lastBarFrame = normalized;
    this.onBeforeBars?.(normalized);
    this.indicatorManager.drawBehindCandles(args);
  }

  drawAfterCandles(frame: TradingViewRenderFrameInput): void {
    const normalized = normalizeTradingViewRenderFrame(frame);
    const args = normalized ? toIndicatorDrawArgs(normalized) : null;
    if (!normalized || !args) return;

    this.lastBarFrame = normalized;
    this.indicatorManager.drawAfterCandles(args);
    this.onAfterBars?.(normalized);
  }

  drawPane(frame: TradingViewRenderFrameInput): void {
    const rawFrame = frame as TradingViewRawRenderFrame;
    const sourceId = rawFrame.sourceId;
    const manager = sourceId ? this.paneIndicatorManagers.get(sourceId) : undefined;
    const args = manager ? this.toPaneIndicatorDrawArgs(rawFrame) : null;
    if (!manager || !args) return;

    manager.drawBehindCandles(args);
    manager.drawAfterCandles(args);
  }

  hasPaneSource(sourceId: string): boolean {
    return this.paneIndicatorManagers.has(sourceId);
  }

  shouldSkipNativeBars(frame: TradingViewRenderFrameInput): boolean {
    const normalized = normalizeTradingViewRenderFrame(frame);
    if (!normalized) return false;

    if (typeof this.hideNativeCandles === 'function') {
      return this.hideNativeCandles(normalized);
    }

    return this.hideNativeCandles === true || this.indicatorManager.hasSettingEnabled('hideCandles');
  }

  private getPaneIndicatorManager(sourceId: string): JailbreakIndicatorManager {
    let manager = this.paneIndicatorManagers.get(sourceId);
    if (!manager) {
      manager = new JailbreakIndicatorManager();
      this.paneIndicatorManagers.set(sourceId, manager);
    }
    return manager;
  }

  private toPaneIndicatorDrawArgs(
    frame: TradingViewRawRenderFrame,
  ): Parameters<JailbreakIndicatorManager['drawAfterCandles']>[0] | null {
    if (!frame.ctx || !this.lastBarFrame) return null;

    const coordinates = frame.coordinates?.mediaSize ?? frame.coordinates;
    const chartWidth = frame.chartWidth ?? coordinates?.width ?? this.lastBarFrame.chartWidth;
    const chartHeight = frame.chartHeight ?? coordinates?.height ?? this.lastBarFrame.chartHeight;

    return {
      ctx: frame.ctx,
      bars: this.lastBarFrame.bars,
      candleCoords: this.lastBarFrame.candleCoords,
      exchange: frame.exchange ?? this.lastBarFrame.exchange,
      symbol: frame.symbol ?? this.lastBarFrame.symbol,
      resolutionString: frame.resolutionString ?? this.lastBarFrame.resolutionString,
      chartWidth,
      chartHeight,
      priceToCoord: frame.priceToCoord ?? this.lastBarFrame.priceToCoord,
      coordToPrice: frame.coordToPrice ?? this.lastBarFrame.coordToPrice,
    };
  }
}

export function createTradingViewOverlayCallbacks(options: TradingViewOverlayBridgeOptions): TradingViewPatchCallbacks {
  return new TradingViewOverlayBridge(options).callbacks();
}

export type { TradingViewRawRenderFrame };
