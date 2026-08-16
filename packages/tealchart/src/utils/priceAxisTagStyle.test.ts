import { describe, expect, it } from 'vitest';

import { DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR, DEFAULT_TRADE_LINE_LABEL_COLOR } from '../constants';
import {
  getPriceAxisTagContrastTextColor,
  PRICE_AXIS_TAG_LIGHT_TEXT_COLOR,
  resolvePriceAxisTagStyle,
} from './priceAxisTagStyle';

describe('resolvePriceAxisTagStyle', () => {
  // Web's rule. A trading line's tag carries its own colour; `filled` is not
  // consulted, which is why native's dark-backed order tags read as drift.
  describe('trading lines always fill', () => {
    it('fills an order tag from the line colour', () => {
      expect(resolvePriceAxisTagStyle({ type: 'order', label: undefined, color: '#d9534f' })).toEqual({
        filled: true,
        backgroundColor: '#d9534f',
        borderColor: '#d9534f',
        textColor: PRICE_AXIS_TAG_LIGHT_TEXT_COLOR,
      });
    });

    it('fills a position tag even when the label says it is not filled', () => {
      const style = resolvePriceAxisTagStyle({ type: 'position', label: { filled: false }, color: '#12c48b' });
      expect(style.filled).toBe(true);
      expect(style.backgroundColor).toBe('#12c48b');
    });

    // `type` is optional on the web bounds, and absent has always meant a
    // trading line there.
    it('fills when the type is absent', () => {
      expect(resolvePriceAxisTagStyle({ label: undefined, color: '#d9534f' }).filled).toBe(true);
    });

    it('prefers an explicit label background over the line colour', () => {
      const style = resolvePriceAxisTagStyle({
        type: 'order',
        label: { backgroundColor: '#101820' },
        color: '#d9534f',
      });
      expect(style.backgroundColor).toBe('#101820');
      expect(style.borderColor).toBe('#d9534f');
    });
  });

  // Native's rule. Unfilled does not mean transparent - the dark backing is
  // what keeps the tag readable where it overlaps a grid label.
  describe('price lines honour filled, and keep a backing when they do not', () => {
    it('leaves an unfilled price tag on the dark backing, lettered in the line colour', () => {
      expect(resolvePriceAxisTagStyle({ type: 'price', label: { filled: false }, color: '#8a8f98' })).toEqual({
        filled: false,
        backgroundColor: DEFAULT_TRADE_LINE_LABEL_COLOR,
        borderColor: '#8a8f98',
        textColor: '#8a8f98',
      });
    });

    it('treats a missing label as unfilled for a price line', () => {
      expect(resolvePriceAxisTagStyle({ type: 'price', label: undefined, color: '#8a8f98' }).filled).toBe(false);
    });

    it('fills a price tag that asks to be filled', () => {
      const style = resolvePriceAxisTagStyle({ type: 'price', label: { filled: true }, color: '#12c48b' });
      expect(style.filled).toBe(true);
      expect(style.backgroundColor).toBe('#12c48b');
    });
  });

  // Native's rule. Web hardcoded white, which vanishes on a light line colour.
  describe('text contrast is measured, not assumed', () => {
    it('goes dark on a light fill', () => {
      expect(getPriceAxisTagContrastTextColor('#f5f5f5')).toBe(DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR);
    });

    it('goes white on a dark fill', () => {
      expect(getPriceAxisTagContrastTextColor('#101820')).toBe(PRICE_AXIS_TAG_LIGHT_TEXT_COLOR);
    });

    it('falls back to white when the colour cannot be parsed', () => {
      expect(getPriceAxisTagContrastTextColor('not-a-colour')).toBe(PRICE_AXIS_TAG_LIGHT_TEXT_COLOR);
    });

    it('lets an explicit label text colour win over both', () => {
      const style = resolvePriceAxisTagStyle({
        type: 'order',
        label: { textColor: '#ff00ff' },
        color: '#101820',
      });
      expect(style.textColor).toBe('#ff00ff');
    });
  });
});
