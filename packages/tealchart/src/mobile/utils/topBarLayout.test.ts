import { describe, expect, it } from 'vitest';

import { AVAILABLE_TIMEFRAMES } from '../../state/chartState';
import {
  createNativeTopBarLayout,
  createNativeTopBarTimeframes,
} from './topBarLayout';

const textWidth = (text: string) => text.length * 7;
const mobileTimeframes = AVAILABLE_TIMEFRAMES.filter((timeframe) => ['1', '5', '15', '30', '60'].includes(timeframe.value));
const mobileVisibleValues = new Set(['1', '5', '15', '30', '60']);

function createLayout(width = 390) {
  return createNativeTopBarLayout({
    width,
    height: 36,
    symbol: 'BTC-USD',
    interval: '15',
    timeframes: mobileTimeframes,
    textWidth,
    titleTextWidth: textWidth,
    textColor: '#f0f3fa',
    mutedTextColor: '#8a8f98',
    activeTextColor: '#12c48b',
    activeBackgroundColor: '#24312b',
    indicatorsEnabled: true,
    undoEnabled: true,
    redoEnabled: true,
  });
}

describe('native top bar layout', () => {
  it('renders symbol, active timeframe, indicators, and drawing action buttons in bounds', () => {
    const layout = createLayout();

    expect(layout.symbol.text).toBe('BTC-USD');
    expect(layout.symbolChevron?.text).toBe('v');
    expect(layout.symbolChevron?.x).toBeGreaterThan(layout.symbol.x);
    expect(layout.buttons.map((button) => button.type)).toContain('timeframe');
    expect(layout.buttons.find((button) => button.interval === '15')?.backgroundColor).toBe('#24312b');
    expect(layout.buttons.find((button) => button.type === 'indicators')?.text).toBe('Indicators');
    expect(layout.buttons.map((button) => button.type)).toContain('undo');
    expect(layout.buttons.map((button) => button.type)).toContain('redo');

    for (const button of layout.buttons) {
      expect(button.x).toBeGreaterThanOrEqual(0);
      expect(button.x + button.width).toBeLessThanOrEqual(390 - 4);
      expect(button.y).toBeGreaterThanOrEqual(0);
      expect(button.y + button.height).toBeLessThanOrEqual(36);
    }
  });

  it('clips toolbar actions instead of overflowing narrow native widths', () => {
    const layout = createLayout(240);

    expect(layout.buttons.length).toBeGreaterThan(0);
    expect(layout.buttons.every((button) => button.x + button.width <= 236)).toBe(true);
  });

  it('keeps the active native timeframe visible before less important timeframe buttons', () => {
    const layout = createLayout(270);
    const timeframeButtons = layout.buttons.filter((button) => button.type === 'timeframe');

    expect(timeframeButtons.length).toBeGreaterThan(0);
    expect(timeframeButtons.map((button) => button.interval)).toContain('15');
    expect(layout.buttons.every((button) => button.x + button.width <= 266)).toBe(true);
  });

  it('exports deterministic button commands for native overlay controls', () => {
    const layout = createLayout();
    const activeButton = layout.buttons.find((button) => button.interval === '15');

    expect(activeButton).toBeDefined();
    expect(activeButton).toEqual(expect.objectContaining({
      type: 'timeframe',
      interval: '15',
      enabled: true,
    }));
  });

  it('does not overlap adjacent horizontal buttons', () => {
    const layout = createLayout();
    const buttons = [...layout.buttons].sort((a, b) => a.x - b.x);

    for (let index = 1; index < buttons.length; index += 1) {
      expect(buttons[index].x).toBeGreaterThanOrEqual(buttons[index - 1].x + buttons[index - 1].width);
    }
  });

  it('separates toolbar groups with dividers before indicators and drawing actions', () => {
    const layout = createLayout();
    const indicators = layout.buttons.find((button) => button.type === 'indicators');
    const undo = layout.buttons.find((button) => button.type === 'undo');

    expect(indicators).toBeDefined();
    expect(undo).toBeDefined();
    expect(layout.dividers.some((divider) => divider.x > 0 && divider.x < indicators!.x)).toBe(true);
    expect(layout.dividers.some((divider) => divider.x < undo!.x && divider.x > indicators!.x)).toBe(true);
  });

  it('renders unavailable optional controls disabled without no-op action zones', () => {
    const layout = createNativeTopBarLayout({
      width: 390,
      height: 36,
      symbol: 'BTC-USD',
      interval: '15',
      timeframes: mobileTimeframes,
      textWidth,
      titleTextWidth: textWidth,
      textColor: '#f0f3fa',
      mutedTextColor: '#8a8f98',
      activeTextColor: '#12c48b',
      activeBackgroundColor: '#24312b',
    });

    expect(layout.buttons.find((button) => button.type === 'indicators')?.enabled).toBe(false);
    expect(layout.buttons.find((button) => button.type === 'undo')?.enabled).toBe(false);
    expect(layout.buttons.find((button) => button.type === 'redo')?.enabled).toBe(false);
    expect(layout.symbolChevron?.text).toBe('v');
  });

  it('keeps the active interval visible when it is outside the compact mobile defaults', () => {
    const timeframes = createNativeTopBarTimeframes({
      timeframes: AVAILABLE_TIMEFRAMES,
      interval: '240',
      defaultVisibleValues: mobileVisibleValues,
    });

    expect(timeframes[0]?.value).toBe('240');
    expect(timeframes.map((timeframe) => timeframe.value)).toContain('1');
  });
});
