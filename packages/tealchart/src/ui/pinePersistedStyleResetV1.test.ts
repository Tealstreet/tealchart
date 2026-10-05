import type { PlotOutput } from '@tealstreet/tealscript';
import type { PlotStyleOverride } from '../state/chartState';

import { fireEvent, screen } from '@testing-library/dom';
import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import { IndicatorSettingsModal } from './IndicatorSettingsModal';

// ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json
// display.none remarks: Defaults / Reset settings restores coded settings.
describe('PARTIAL rank 504: display.none Style selection and reset', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    clearChartStoreCache();
  });

  it('publishes an explicit empty override list so the host clears a saved display selection', () => {
    const modal = new IndicatorSettingsModal();
    modal.mount(document.body);
    const plot: PlotOutput = { id: 'hidden', title: 'Hidden', type: 'plot', values: [7], color: '#ffffff', display: 0 };
    let saved: PlotStyleOverride[] | undefined;
    const selected = { plotId: 'hidden', display: 31 };
    let persisted: PlotStyleOverride[] = [selected];
    modal.openWith({ id: 'study', name: 'Study', inputs: {} }, [], [plot], [selected], (_inputs, overrides) => {
      saved = overrides;
      if (overrides) persisted = overrides;
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Defaults' }), { target: { value: 'reset' } });
    fireEvent.click(screen.getByText('Apply'));
    expect(saved).toEqual([]);
    expect(persisted).toEqual([]);
    expect(plot.display).toBe(0);
    modal.unmount();
  });
});
