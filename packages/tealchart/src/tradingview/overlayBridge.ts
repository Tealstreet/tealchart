import type { BarsIndicator } from '../jailbreak/BarsIndicator';
import { JailbreakIndicatorManager } from '../jailbreak/JailbreakIndicatorManager';
import { normalizeTradingViewRenderFrame, toIndicatorDrawArgs } from './frameBridge';
import type {
  TradingViewPatchCallbacks,
  TradingViewRawRenderFrame,
  TradingViewRenderFrame,
  TradingViewRenderFrameInput,
} from './types';

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

  constructor(options: TradingViewOverlayBridgeOptions = {}) {
    this.hideNativeCandles = options.hideNativeCandles;
    this.onBeforeBars = options.onBeforeBars;
    this.onAfterBars = options.onAfterBars;

    for (const entry of options.indicators ?? []) {
      this.registerIndicator(entry);
    }
  }

  registerIndicator(entry: TradingViewOverlayIndicator): void {
    this.indicatorManager.register(
      entry.id,
      entry.indicator,
      entry.settings ?? {},
      entry.behindCandles ?? false
    );
  }

  unregisterIndicator(id: string): void {
    this.indicatorManager.unregister(id);
  }

  updateIndicatorSettings(id: string, settings: Record<string, unknown>): void {
    this.indicatorManager.updateSettings(id, settings);
  }

  callbacks(): TradingViewPatchCallbacks {
    return {
      beforeBars: (frame) => this.drawBehindCandles(frame),
      afterBars: (frame) => this.drawAfterCandles(frame),
      shouldSkipNativeBars: (frame) => this.shouldSkipNativeBars(frame),
    };
  }

  drawBehindCandles(frame: TradingViewRenderFrameInput): void {
    const normalized = normalizeTradingViewRenderFrame(frame);
    const args = normalized ? toIndicatorDrawArgs(normalized) : null;
    if (!normalized || !args) return;

    this.onBeforeBars?.(normalized);
    this.indicatorManager.drawBehindCandles(args);
  }

  drawAfterCandles(frame: TradingViewRenderFrameInput): void {
    const normalized = normalizeTradingViewRenderFrame(frame);
    const args = normalized ? toIndicatorDrawArgs(normalized) : null;
    if (!normalized || !args) return;

    this.indicatorManager.drawAfterCandles(args);
    this.onAfterBars?.(normalized);
  }

  shouldSkipNativeBars(frame: TradingViewRenderFrameInput): boolean {
    const normalized = normalizeTradingViewRenderFrame(frame);
    if (!normalized) return false;

    if (typeof this.hideNativeCandles === 'function') {
      return this.hideNativeCandles(normalized);
    }

    return this.hideNativeCandles === true || this.indicatorManager.hasSettingEnabled('hideCandles');
  }
}

export function createTradingViewOverlayCallbacks(
  options: TradingViewOverlayBridgeOptions
): TradingViewPatchCallbacks {
  return new TradingViewOverlayBridge(options).callbacks();
}

export type { TradingViewRawRenderFrame };
