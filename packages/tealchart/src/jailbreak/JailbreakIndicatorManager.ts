import type { BarsIndicator } from './BarsIndicator';
import type { IndicatorDrawArgs } from './types';

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

  /**
   * Register an indicator instance.
   * @param id Unique identifier (e.g. 'Tealstreet-DWMO@tv-basicstudies-1')
   * @param indicator The BarsIndicator instance
   * @param settings Flat settings object
   * @param behindCandles If true, draws before candles; otherwise after
   */
  register(id: string, indicator: BarsIndicator, settings: Record<string, unknown>, behindCandles: boolean): void {
    this.indicators.set(id, { id, indicator, settings, behindCandles });
  }

  /**
   * Unregister an indicator.
   */
  unregister(id: string): void {
    this.indicators.delete(id);
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
        entry.indicator.draw(drawArgs);
        entry.indicator.drawInFront(drawArgs);
      } catch (err) {
        console.error(`[JailbreakIndicatorManager] Error drawing after candles for ${entry.id}:`, err);
      }
    }
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
}
