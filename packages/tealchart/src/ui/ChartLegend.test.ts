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
});
