// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { resolveLeftToolRailMetrics, WEB_CHART_CHROME_METRICS } from '../layout/chartGeometry';
import { clearChartStoreCache } from '../state/chartState';
import { ChartLegend } from './ChartLegend';
import { IndicatorPaneLegend } from './IndicatorPaneLegend';

describe('ChartLegend layout', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    clearChartStoreCache();
  });

  it.each([320, 375])('wraps long symbol and exchange captions inside a %ipx chart', (width) => {
    const host = document.createElement('div');
    host.style.position = 'relative';
    host.style.width = `${width}px`;
    document.body.appendChild(host);
    const symbol = 'LONG-SYMBOL-'.repeat(12);
    const exchangeName = 'Long exchange display name '.repeat(8);
    const legend = new ChartLegend({ symbol, exchangeName, interval: '60', avoidLeftTools: true });
    legend.mount(host);
    legend.setBars({ time: 1, open: 12345, high: 12350, low: 12340, close: 12346, volume: 1 }, null);
    const root = legend.getElement();
    const main = root.firstElementChild as HTMLElement;
    const caption = main.firstElementChild as HTMLElement;
    // Style contracts: jsdom does not measure real browser line boxes.
    expect(caption.style.flexWrap).toBe('wrap');
    expect(caption.style.maxWidth).toBe('100%');
    expect(Number.parseFloat(caption.style.minWidth)).toBe(0);
    expect(caption.style.whiteSpace).toBe('normal');
    expect(caption.style.overflowWrap).toBe('anywhere');
    expect(root.style.right).toBe('12px');
    expect(main.style.maxWidth).toBe('100%');
    expect(main.style.flexWrap).toBe('wrap');
    expect((main.lastElementChild as HTMLElement).style.flexWrap).toBe('wrap');
    expect(caption.textContent).toBe(`${symbol}·1h·${exchangeName}`);
    expect(root.style.pointerEvents).toBe('none');
    legend.unmount();
  });

  it('keeps the ordinary wide caption content-sized and in its original order', () => {
    const host = document.createElement('div');
    host.style.width = '1024px';
    document.body.appendChild(host);
    const legend = new ChartLegend({ symbol: 'BTCUSDT', exchangeName: 'Bybit', interval: '60' });
    legend.mount(host);
    const main = legend.getElement().firstElementChild as HTMLElement;
    expect(main.style.width).toBe('fit-content');
    expect(main.style.display).toBe('flex');
    expect(main.firstElementChild?.textContent).toBe('BTCUSDT·1h·Bybit');
    expect(legend.getElement().style.fontSize).toBe('12px');
    legend.unmount();
  });

  it('moves right when left drawing tools are present', () => {
    const legend = new ChartLegend({
      symbol: 'BTCUSDT',
      interval: '60',
    });
    legend.mount(document.body);

    expect(legend.getElement().style.top).toBe('40px');
    expect(legend.getElement().style.left).toBe('12px');

    legend.setAvoidLeftTools(true);
    expect(legend.getElement().style.top).toBe('40px');
    expect(legend.getElement().style.left).toBe('70px');

    legend.setAvoidLeftTools(false);
    expect(legend.getElement().style.left).toBe('12px');

    legend.unmount();
  });

  it('only lets visible top-left legend content receive pointer events', () => {
    const legend = new ChartLegend({
      symbol: 'BTCUSDT',
      interval: '60',
    });
    legend.mount(document.body);
    legend.setIndicators(
      [{ id: 'study_1', inputs: { length: 20 }, isVisible: true, name: 'SMA' }],
      { study_1: { overlay: true } },
    );

    const root = legend.getElement();
    const mainRow = root.firstElementChild as HTMLElement;
    const indicatorList = Array.from(root.children).find((child) => child.textContent?.includes('SMA')) as HTMLElement;
    const indicatorRow = indicatorList.firstElementChild as HTMLElement;
    const toggle = Array.from(root.children).find((child) => child.textContent?.includes('1 indicator')) as HTMLElement;

    expect(root.style.pointerEvents).toBe('none');
    expect(mainRow.style.pointerEvents).toBe('none');
    expect(mainRow.style.width).toBe('fit-content');
    expect(indicatorList.style.pointerEvents).toBe('none');
    expect(indicatorRow.style.pointerEvents).toBe('auto');
    expect(indicatorRow.style.width).toBe('fit-content');
    expect(toggle.style.pointerEvents).toBe('auto');
    expect(toggle.style.width).toBe('fit-content');

    legend.unmount();
  });

  it('uses resolved chrome metrics when the left drawing rail is collapsed', () => {
    const legend = new ChartLegend({
      symbol: 'BTCUSDT',
      interval: '60',
      avoidLeftTools: true,
      chromeMetrics: resolveLeftToolRailMetrics(WEB_CHART_CHROME_METRICS, true),
    });
    legend.mount(document.body);

    expect(legend.getElement().style.left).toBe('12px');

    legend.setChromeMetrics(resolveLeftToolRailMetrics(WEB_CHART_CHROME_METRICS, false));
    expect(legend.getElement().style.left).toBe('70px');

    legend.unmount();
  });

  it('uses resolved chrome metrics for collapsed indicator pane legends', () => {
    const legend = new IndicatorPaneLegend({
      paneId: 'pane_1',
      top: 120,
      avoidLeftTools: true,
      chromeMetrics: resolveLeftToolRailMetrics(WEB_CHART_CHROME_METRICS, true),
    });
    legend.mount(document.body);

    expect(legend.getElement().style.left).toBe('12px');

    legend.setChromeMetrics(resolveLeftToolRailMetrics(WEB_CHART_CHROME_METRICS, false));
    expect(legend.getElement().style.left).toBe('70px');

    legend.unmount();
  });

  it('only lets visible indicator pane legend content receive pointer events', () => {
    const legend = new IndicatorPaneLegend({
      paneId: 'pane_1',
      top: 120,
    });
    legend.mount(document.body);
    legend.setIndicators(
      [{ id: 'study_2', inputs: { fast: 12, slow: 26, signal: 9 }, isVisible: true, name: 'MACD' }],
      { study_2: { overlay: false } },
    );

    const root = legend.getElement();
    const row = root.firstElementChild as HTMLElement;

    expect(root.style.pointerEvents).toBe('none');
    expect(row.style.pointerEvents).toBe('auto');
    expect(row.style.width).toBe('fit-content');

    legend.unmount();
  });

  it('moves indicator pane legends right when left drawing tools are present', () => {
    const legend = new IndicatorPaneLegend({
      paneId: 'pane_1',
      top: 120,
    });
    legend.mount(document.body);

    expect(legend.getElement().style.top).toBe('124px');
    expect(legend.getElement().style.left).toBe('12px');

    legend.setAvoidLeftTools(true);
    expect(legend.getElement().style.top).toBe('124px');
    expect(legend.getElement().style.left).toBe('70px');

    legend.setAvoidLeftTools(false);
    expect(legend.getElement().style.left).toBe('12px');

    legend.unmount();
  });

  it('formats OHLC labels without changing visible price precision', () => {
    const legend = new ChartLegend({
      symbol: 'BTCUSDT',
      interval: '60',
    });
    legend.mount(document.body);

    legend.setBars(
      { time: 1, open: 12345.67, high: 123.456, low: 0.1234567, close: 1.234, volume: 1 },
      { time: 0, open: 12000, high: 12500, low: 11900, close: 1.2, volume: 1 },
    );

    expect(legend.getElement().textContent).toContain('O12,345.7');
    expect(legend.getElement().textContent).toContain('H123.46');
    expect(legend.getElement().textContent).toContain('L0.123457');
    expect(legend.getElement().textContent).toContain('C1.23');

    legend.unmount();
  });
});
