import { afterEach, describe, expect, it, vi } from 'vitest';

import { getIndicatorOutputReadouts } from '../rendering/indicatorOutputReadouts';
import { clearChartStoreCache } from '../state/chartState';
import { ChartLegend } from './ChartLegend';
import { IndicatorPaneLegend } from './IndicatorPaneLegend';

const indicators = [{ id: 'study', name: 'Study', isVisible: true, inputs: {} }];
const readouts = getIndicatorOutputReadouts({
  plots: [
    {
      id: 'status',
      type: 'plot',
      scriptId: 'study',
      title: 'Status',
      color: '#ff0000',
      values: [12.345],
      display: 4,
      precision: 2,
    },
    { id: 'window', type: 'plot', scriptId: 'study', title: 'Window only', color: '#ff0000', values: [99], display: 2 },
  ],
  totalBarCount: 1,
});

describe('Pine status-line values', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    clearChartStoreCache();
  });

  it('renders and refreshes status-line values in both main and indicator pane legends', () => {
    const main = new ChartLegend({ symbol: 'TEST', interval: '60' });
    const pane = new IndicatorPaneLegend({ paneId: 'pane', top: 100 });
    main.mount(document.body);
    pane.mount(document.body);
    main.setIndicators(indicators, { study: { overlay: true } });
    pane.setIndicators(indicators, { study: { overlay: false } });
    for (const legend of [main, pane]) {
      legend.setPlotReadouts(readouts);
      const values = legend.getElement().querySelector('[data-indicator-values="study"]')!;
      expect(values.textContent).toBe('12.35');
      expect(values.querySelector('[title="Status"]')).toBeTruthy();
      expect(values.textContent).not.toContain('99');
      legend.setPlotReadouts([{ ...readouts[0], values: ['na'] }]);
      expect(values.textContent).toBe('na');
      legend.setPlotReadouts([]);
      expect(values.textContent).toBe('');
      legend.unmount();
    }
  });
});


it("reuses status spans for unchanged ticks and changed values", () => {
  const main = new ChartLegend({ symbol: "TEST", interval: "60" });
  main.mount(document.body);
  main.setIndicators(indicators, { study: { overlay: true } });
  main.setPlotReadouts(readouts);
  const container = main.getElement().querySelector<HTMLElement>("[data-indicator-values]")!;
  const node = container.firstElementChild;
  const create = vi.spyOn(document, "createElement");
  const replace = vi.spyOn(container, "replaceChildren");
  for (let tick = 0; tick < 100; tick++) main.setPlotReadouts(readouts);
  main.setPlotReadouts([{ ...readouts[0], values: ["99.00"] }]);
  expect(container.firstElementChild).toBe(node);
  expect(container.textContent).toBe("99.00");
  expect(create).not.toHaveBeenCalled();
  expect(replace).not.toHaveBeenCalled();
  main.unmount();
});
