export type PriceAxisTagDomain = 'lastTrade' | 'trade' | 'indicatorOutput' | 'other';

export interface PriceAxisTagSemanticSource {
  id?: string;
  type?: string;
}

export interface PriceAxisTagDomainSizing {
  fontSize: number;
  height: number;
  paddingX: number;
}

export class PriceAxisTagWidthCache {
  private readonly widths = new Map<string, number>();

  resolve(key: string, measuredWidth: number): number {
    if (!Number.isFinite(measuredWidth) || measuredWidth <= 0) return measuredWidth;

    const width = Math.ceil(measuredWidth);
    const cachedWidth = this.widths.get(key);
    if (cachedWidth === undefined || width > cachedWidth) {
      this.widths.set(key, width);
      return width;
    }

    return cachedWidth;
  }

  get(key: string): number | undefined {
    return this.widths.get(key);
  }

  clear(): void {
    this.widths.clear();
  }
}

export const WEB_PRICE_AXIS_TAG_SIZING: Record<PriceAxisTagDomain, PriceAxisTagDomainSizing> = {
  lastTrade: { fontSize: 11, height: 20, paddingX: 4 },
  trade: { fontSize: 11, height: 17, paddingX: 4 },
  indicatorOutput: { fontSize: 10, height: 12, paddingX: 4 },
  other: { fontSize: 11, height: 18, paddingX: 4 },
};

export const WEB_PRICE_AXIS_TAG_SECONDARY_TEXT_EXTRA_HEIGHT = 6;

// Indicator readouts, not prices. They are dense - one per plot, per pane - and
// they sit beside the real price tags rather than competing with them, so they
// take the same smaller type native already gives them.
export const WEB_PLOT_TRACK_PRICE_AXIS_TAG_SIZING: PriceAxisTagDomainSizing = {
  fontSize: 10,
  height: 12,
  paddingX: 4,
};

export const NATIVE_PRICE_AXIS_TAG_SIZING: Record<PriceAxisTagDomain, PriceAxisTagDomainSizing> = {
  lastTrade: { fontSize: 11, height: 18, paddingX: 4 },
  trade: { fontSize: 11, height: 17, paddingX: 4 },
  indicatorOutput: { fontSize: 10, height: 11, paddingX: 4 },
  other: { fontSize: 11, height: 18, paddingX: 4 },
};

export const NATIVE_PRICE_AXIS_TAG_TWO_LINE_HEIGHT = 30;

export function resolvePriceLineAxisTagDomain(source: PriceAxisTagSemanticSource): PriceAxisTagDomain {
  if (source.id === 'last-trade') return 'lastTrade';
  if (source.type === 'order' || source.type === 'position') return 'trade';
  return 'other';
}
