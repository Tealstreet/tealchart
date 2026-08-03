import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR,
  DEFAULT_TRADE_LINE_LABEL_COLOR,
} from '../../constants';
import {
  getNativeDarkLabelBackgroundColor,
  getNativeMutedTextColor,
  getNativePriceAxisTagBackgroundColor,
  getNativePriceAxisTagTextColor,
  NATIVE_PRICE_AXIS_TAG_TEXT_COLOR,
  NATIVE_TOP_BAR_ACTIVE_BACKGROUND_COLOR,
} from './nativeColor';

describe('native color utilities', () => {
  it('derives muted rgba colors from hex colors', () => {
    expect(getNativeMutedTextColor('#aabbcc')).toBe('rgba(170, 187, 204, 0.72)');
    expect(getNativeMutedTextColor('#abc')).toBe('rgba(170, 187, 204, 0.72)');
  });

  it('derives muted rgba colors from rgb and rgba colors', () => {
    expect(getNativeMutedTextColor('rgb(170, 187, 204)')).toBe('rgba(170, 187, 204, 0.72)');
    expect(getNativeMutedTextColor('rgba(170, 187, 204, 0.9)')).toBe('rgba(170, 187, 204, 0.72)');
  });

  it('leaves named colors unchanged when they cannot be decomposed safely', () => {
    expect(getNativeMutedTextColor('white')).toBe('white');
  });

  it('centralizes native dark label fills', () => {
    expect(getNativeDarkLabelBackgroundColor()).toBe(DEFAULT_TRADE_LINE_LABEL_COLOR);
  });

  it('matches web price-axis tag fill fallback order', () => {
    expect(getNativePriceAxisTagBackgroundColor('#123456', '#abcdef')).toBe('#123456');
    expect(getNativePriceAxisTagBackgroundColor(undefined, '#abcdef')).toBe('#abcdef');
  });

  it('uses explicit label text color or the native tag default', () => {
    expect(getNativePriceAxisTagTextColor('#fedcba', '#000000')).toBe('#fedcba');
    expect(getNativePriceAxisTagTextColor(undefined, '#111827')).toBe(NATIVE_PRICE_AXIS_TAG_TEXT_COLOR);
    expect(getNativePriceAxisTagTextColor(undefined, '#0ECB81')).toBe(DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR);
  });

  it('owns native top-bar active background as a named token', () => {
    expect(NATIVE_TOP_BAR_ACTIVE_BACKGROUND_COLOR).toBe('#24272d');
  });
});
