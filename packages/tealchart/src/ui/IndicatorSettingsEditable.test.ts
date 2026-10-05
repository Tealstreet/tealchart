import type { PlotOutput } from '@tealstreet/tealscript';

import { fireEvent, screen } from '@testing-library/dom';
import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import { IndicatorSettingsModal } from './IndicatorSettingsModal';

describe('Pine editable styles', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    clearChartStoreCache();
  });

  it('omits locked visual outputs from the Style controls', () => {
    const modal = new IndicatorSettingsModal();
    modal.mount(document.body);
    const types: PlotOutput['type'][] = ['plot', 'plotshape', 'plotchar', 'plotarrow', 'plotbar', 'plotcandle', 'bgcolor', 'barcolor', 'hline', 'fill'];
    const plots: PlotOutput[] = types.map((type) => ({
      id: type, type, title: `Locked ${type}`, values: [], color: '#ff0000', editable: false,
    }));
    plots.push({ id: 'editable', type: 'plot', title: 'Editable plot', values: [], color: '#00ff00' });
    modal.openWith({ id: 'study', name: 'Study', inputs: {} }, [], plots, undefined, () => {});
    fireEvent.click(screen.getByText('Style'));
    for (const type of types) expect(screen.queryByText(`Locked ${type}`)).toBeNull();
    expect(screen.getByText('Editable plot')).toBeTruthy();
    expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(1);
    modal.unmount();
  });
});
