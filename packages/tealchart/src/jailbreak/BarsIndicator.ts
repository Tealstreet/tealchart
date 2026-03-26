import type { CrossHairTooltip, IndicatorDrawArgs, IndicatorTooltipArgs } from './types';

/**
 * Base class for all custom indicators.
 * Provides default implementations for visibility and tooltip.
 */
export class CustomIndicator {
  isVisible(): boolean {
    return true;
  }

  getTooltipText(_args: IndicatorTooltipArgs): CrossHairTooltip[] {
    return [];
  }
}

/**
 * Base class for custom indicators that draw on the candle pane.
 * Indicators extend this and override drawBehind / draw / drawInFront.
 */
export class BarsIndicator extends CustomIndicator {
  /** Called before candles are drawn */
  drawBehind(_args: IndicatorDrawArgs): void {}

  /** Called at the default draw point */
  draw(_args: IndicatorDrawArgs): void {}

  /** Called after candles are drawn */
  drawInFront(_args: IndicatorDrawArgs): void {}
}

export type BarsIndicatorConstructor = new () => BarsIndicator;
