export type PriceAxisTagDomain = 'lastTrade' | 'trade' | 'indicatorOutput' | 'other';

export interface PriceAxisTagSemanticSource {
  id?: string;
  type?: string;
}

export interface PriceAxisTagDomainSizing {
  fontSize: number;
  height: number;
}

export const WEB_PRICE_AXIS_TAG_SIZING: Record<PriceAxisTagDomain, PriceAxisTagDomainSizing> = {
  lastTrade: { fontSize: 11, height: 20 },
  trade: { fontSize: 11, height: 17 },
  indicatorOutput: { fontSize: 11, height: 16 },
  other: { fontSize: 11, height: 18 },
};

export const WEB_PRICE_AXIS_TAG_SECONDARY_TEXT_EXTRA_HEIGHT = 6;

export const WEB_PLOT_TRACK_PRICE_AXIS_TAG_SIZING: PriceAxisTagDomainSizing = {
  fontSize: 11,
  height: 16,
};

export const NATIVE_PRICE_AXIS_TAG_SIZING: Record<PriceAxisTagDomain, PriceAxisTagDomainSizing> = {
  lastTrade: { fontSize: 11, height: 18 },
  trade: { fontSize: 11, height: 17 },
  indicatorOutput: { fontSize: 10, height: 11 },
  other: { fontSize: 11, height: 18 },
};

export const NATIVE_PRICE_AXIS_TAG_TWO_LINE_HEIGHT = 30;

export function resolvePriceLineAxisTagDomain(source: PriceAxisTagSemanticSource): PriceAxisTagDomain {
  if (source.id === 'last-trade') return 'lastTrade';
  if (source.type === 'order' || source.type === 'position') return 'trade';
  return 'other';
}
