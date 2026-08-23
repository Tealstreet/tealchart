import { describe, expect, it } from 'vitest';

import { resolveChartChromeTheme, resolveChromeThemeVars } from './chromeTheme';

describe('chrome theme resolver', () => {
  it('derives chrome surfaces from the chart canvas by default', () => {
    const theme = resolveChartChromeTheme({
      backgroundColor: '#101418',
      gridColor: '#222831',
      textColor: '#f0f3fa',
      crosshairColor: '#24a3ff',
      upColor: '#12c48b',
      downColor: '#f04465',
    });

    expect(theme.canvasBackgroundColor).toBe('#101418');
    expect(theme.topBarBackgroundColor).toBe('#101418');
    expect(theme.leftToolRailBackgroundColor).toBe('#101418');
    expect(theme.menuBackgroundColor).toBe('#101418');
    expect(theme.modalBackgroundColor).toBe('#101418');
    expect(theme.popoverBackgroundColor).toBe('#101418');
    expect(theme.borderColor).toBe('#222831');
    expect(theme.buyColor).toBe('#12c48b');
    expect(theme.sellColor).toBe('#f04465');
  });

  it('allows hosts to override chrome surfaces without changing canvas paint', () => {
    const theme = resolveChartChromeTheme({
      backgroundColor: '#101418',
      chromeTheme: {
        menuBackgroundColor: '#151924',
        modalBackgroundColor: '#20242f',
        topBarBackgroundColor: '#090b10',
      },
    });

    expect(theme.canvasBackgroundColor).toBe('#101418');
    expect(theme.menuBackgroundColor).toBe('#151924');
    expect(theme.modalBackgroundColor).toBe('#20242f');
    expect(theme.topBarBackgroundColor).toBe('#090b10');
  });

  it('emits semantic variables plus legacy aliases', () => {
    const vars = resolveChromeThemeVars({
      backgroundColor: '#101418',
      chromeTheme: { menuBackgroundColor: '#151924' },
    });

    expect(vars['--tc-canvas-bg']).toBe('#101418');
    expect(vars['--tc-menu-bg']).toBe('#151924');
    expect(vars['--tc-bg']).toBe('#101418');
    expect(vars['--tealchart-chrome-bg']).toBe('#101418');
    expect(vars['--tealchart-chrome-text']).toBe(vars['--tc-text2']);
    expect(vars['--bg']).toBe('#101418');
    expect(vars['--modal-bg']).toBe(vars['--tc-modal-bg']);
  });
});
