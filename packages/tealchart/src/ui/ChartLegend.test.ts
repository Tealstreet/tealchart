import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import { ChartLegend } from './ChartLegend';

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
});
