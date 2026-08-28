import type { BarsIndicator } from './BarsIndicator';
import type { CrossHairTooltip, IndicatorDrawArgs, IndicatorTooltipArgs } from './types';

import { isTealchartIndicatorAuditEnabled } from '../debug/plotDebug';

/**
 * A registered indicator with its settings and render ordering.
 */
interface RegisteredIndicator {
  id: string;
  indicator: BarsIndicator;
  settings: Record<string, unknown>;
  behindCandles: boolean;
}

/**
 * Registry that holds jailbreak indicator instances and orchestrates
 * their rendering in the correct order.
 */
export class JailbreakIndicatorManager {
  private indicators = new Map<string, RegisteredIndicator>();
  private _tooltipContext: Record<string, unknown> = {};
  private loggedDrawIds = new Set<string>();

  /**
   * Set extra context that will be merged into tooltip args for all indicators.
   * The consuming app uses this to pass exchange references, etc.
   */
  setTooltipContext(context: Record<string, unknown>): void {
    this._tooltipContext = context;
  }

  /**
   * Register an indicator instance.
   * @param id Unique identifier (e.g. 'Tealstreet-DWMO@tv-basicstudies-1')
   * @param indicator The BarsIndicator instance
   * @param settings Flat settings object
   * @param behindCandles If true, draws before candles; otherwise after
   */
  register(id: string, indicator: BarsIndicator, settings: Record<string, unknown>, behindCandles: boolean): void {
    this.indicators.set(id, { id, indicator, settings, behindCandles });
    this.loggedDrawIds.delete(id);
  }

  /**
   * Unregister an indicator.
   */
  unregister(id: string): void {
    this.indicators.delete(id);
    this.loggedDrawIds.delete(id);
  }

  /**
   * Update settings for a registered indicator.
   */
  updateSettings(id: string, settings: Record<string, unknown>): void {
    const entry = this.indicators.get(id);
    if (entry) {
      entry.settings = settings;
    }
  }

  /**
   * Draw all indicators that are configured to render behind candles.
   * The manager merges per-indicator settings into the args.
   */
  drawBehindCandles(args: Omit<IndicatorDrawArgs, 'settings'>): void {
    for (const entry of this.indicators.values()) {
      if (!entry.behindCandles) continue;
      if (!entry.indicator.isVisible()) continue;
      try {
        const drawArgs: IndicatorDrawArgs = { ...args, settings: entry.settings };
        this.logFirstDraw('behind', entry, args);
        entry.indicator.drawBehind(drawArgs);
        entry.indicator.draw(drawArgs);
      } catch (err) {
        console.error(`[JailbreakIndicatorManager] Error drawing behind candles for ${entry.id}:`, err);
      }
    }
  }

  /**
   * Draw all indicators that are configured to render after candles.
   */
  drawAfterCandles(args: Omit<IndicatorDrawArgs, 'settings'>): void {
    for (const entry of this.indicators.values()) {
      if (entry.behindCandles) continue;
      if (!entry.indicator.isVisible()) continue;
      try {
        const drawArgs: IndicatorDrawArgs = { ...args, settings: entry.settings };
        this.logFirstDraw('after', entry, args);
        entry.indicator.draw(drawArgs);
        entry.indicator.drawInFront(drawArgs);
      } catch (err) {
        console.error(`[JailbreakIndicatorManager] Error drawing after candles for ${entry.id}:`, err);
      }
    }
  }

  /**
   * Collect crosshair tooltips from all visible indicators.
   * Returns an array of tooltip groups (one group per indicator).
   */
  getTooltips(args: Omit<IndicatorTooltipArgs, 'settings'>): CrossHairTooltip[][] {
    const groups: CrossHairTooltip[][] = [];
    for (const entry of this.indicators.values()) {
      if (!entry.indicator.isVisible()) continue;
      try {
        const fullArgs = { ...args, ...this._tooltipContext, settings: entry.settings } as IndicatorTooltipArgs;
        const tooltips = entry.indicator.getTooltipText(fullArgs);
        if (tooltips.length > 0) groups.push(tooltips);
      } catch (err) {
        console.error(`[JailbreakIndicatorManager] Error getting tooltips for ${entry.id}:`, err);
      }
    }
    return groups;
  }

  /**
   * Check if any registered indicator has a specific flag set in its settings.
   */
  hasSettingEnabled(key: string): boolean {
    for (const entry of this.indicators.values()) {
      if (entry.indicator.isVisible() && entry.settings[key] === true) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get count of registered indicators.
   */
  get size(): number {
    return this.indicators.size;
  }

  private logFirstDraw(
    stage: 'behind' | 'after',
    entry: RegisteredIndicator,
    args: Omit<IndicatorDrawArgs, 'settings'>,
  ): void {
    if (!isTealchartIndicatorAuditEnabled() || this.loggedDrawIds.has(entry.id)) return;
    this.loggedDrawIds.add(entry.id);
    console.info('[tealchart:indicator-audit] jailbreak first draw', {
      id: entry.id,
      stage,
      className: entry.indicator.constructor?.name ?? null,
      behindCandles: entry.behindCandles,
      barCount: args.bars.length,
      candleCoordCount: args.candleCoords.length,
      exchange: args.exchange,
      symbol: args.symbol,
      resolutionString: args.resolutionString,
      chartWidth: args.chartWidth,
      chartHeight: args.chartHeight,
      settingKeys: Object.keys(entry.settings),
    });
  }
}
