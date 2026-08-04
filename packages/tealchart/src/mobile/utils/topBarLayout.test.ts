import { describe, expect, it } from 'vitest';

import { AVAILABLE_TIMEFRAMES } from '../../state/chartState';
import { createNativeTopBarLayout, createNativeTopBarTimeframes } from './topBarLayout';

const textWidth = (text: string) => text.length * 7;
const mobileTimeframes = AVAILABLE_TIMEFRAMES.filter((timeframe) =>
  ['1', '5', '15', '30', '60'].includes(timeframe.value),
);
const mobileVisibleValues = new Set(['1', '5', '15', '30', '60']);

function createLayout(width = 390, layoutSelectorEnabled = false) {
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
    layoutName: 'Default Layout',
    layoutSelectorEnabled,
    undoEnabled: true,
    redoEnabled: true,
  });
}

describe('native top bar layout', () => {
  it('renders symbol, active timeframe, indicators, and drawing action buttons in bounds', () => {
    const layout = createLayout();
    const visibleLaneWidth = 390 - layout.scrollAreaX;

    expect(layout.symbol.text).toBe('BTC-USD');
    expect(layout.symbolChevron?.text).toBe('v');
    expect(layout.symbolChevron?.x).toBeGreaterThan(layout.symbol.x);
    expect(layout.scrollAreaX).toBeGreaterThan(layout.symbolChevron?.x ?? layout.symbol.x);
    expect(layout.scrollAreaX).toBeGreaterThanOrEqual(
      (layout.symbolHitRect?.x ?? 0) + (layout.symbolHitRect?.width ?? 0),
    );
    expect(layout.scrollContentWidth).toBeGreaterThanOrEqual(visibleLaneWidth);
    expect(layout.buttons.map((button) => button.type)).toContain('timeframe');
    expect(layout.buttons.find((button) => button.interval === '15')?.backgroundColor).toBe('#24312b');
    expect(layout.buttons.find((button) => button.type === 'indicators')?.text).toBe('Indicators');
    expect(layout.buttons.map((button) => button.type)).toContain('undo');
    expect(layout.buttons.map((button) => button.type)).toContain('redo');

    for (const button of layout.buttons) {
      expect(button.x).toBeGreaterThanOrEqual(0);
      expect(button.x + button.width).toBeLessThanOrEqual(layout.scrollContentWidth);
      expect(button.y).toBeGreaterThanOrEqual(0);
      expect(button.y + button.height).toBeLessThanOrEqual(36);
    }
  });

  it('overflows narrow native widths into horizontal scroll content', () => {
    const layout = createLayout(240);
    const visibleLaneWidth = 240 - layout.scrollAreaX;

    expect(layout.buttons.length).toBeGreaterThan(0);
    expect(layout.scrollContentWidth).toBeGreaterThan(visibleLaneWidth);
    expect(layout.buttons.every((button) => button.x + button.width <= layout.scrollContentWidth)).toBe(true);
  });

  it('keeps every native timeframe in the scrollable lane on compact widths', () => {
    const layout = createLayout(270);
    const timeframeButtons = layout.buttons.filter((button) => button.type === 'timeframe');

    expect(timeframeButtons.map((button) => button.interval)).toEqual(['1', '5', '15', '30', '60']);
    expect(timeframeButtons.map((button) => button.interval)).toContain('15');
    expect(layout.scrollContentWidth).toBeGreaterThan(270 - layout.scrollAreaX);
  });

  it('adds a compact layout selector button without overlapping other controls', () => {
    const layout = createLayout(390, true);
    const layoutButton = layout.buttons.find((button) => button.type === 'layout');
    const redoButton = layout.buttons.find((button) => button.type === 'redo');
    const buttons = [...layout.buttons].sort((a, b) => a.x - b.x);

    expect(layoutButton).toEqual(expect.objectContaining({ enabled: true }));
    expect(layoutButton?.text).toContain('Default');
    expect(redoButton).toBeDefined();
    expect(layoutButton!.x).toBeGreaterThan(redoButton!.x);
    expect(layoutButton!.x + layoutButton!.width).toBeLessThanOrEqual(layout.scrollContentWidth);
    expect(buttons.at(-1)?.type).toBe('layout');
    for (let index = 1; index < buttons.length; index += 1) {
      expect(buttons[index].x).toBeGreaterThanOrEqual(buttons[index - 1].x + buttons[index - 1].width);
    }
  });

  it('keeps the layout selector in overflow content on narrow widths', () => {
    const layout = createLayout(300, true);
    const layoutButton = layout.buttons.find((button) => button.type === 'layout');

    expect(layoutButton).toBeDefined();
    expect(layout.scrollContentWidth).toBeGreaterThan(300 - layout.scrollAreaX);
    expect(layout.buttons.every((button) => button.x + button.width <= layout.scrollContentWidth)).toBe(true);
    expect(layout.buttons.filter((button) => button.type === 'timeframe').map((button) => button.interval)).toContain(
      '15',
    );
  });

  it('exports deterministic button commands for native overlay controls', () => {
    const layout = createLayout();
    const activeButton = layout.buttons.find((button) => button.interval === '15');

    expect(activeButton).toBeDefined();
    expect(activeButton).toEqual(
      expect.objectContaining({
        type: 'timeframe',
        interval: '15',
        enabled: true,
      }),
    );
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
