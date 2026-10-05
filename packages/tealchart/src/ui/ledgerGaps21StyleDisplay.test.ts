import type { PlotOutput } from '@tealstreet/tealscript';

import { fireEvent, screen } from '@testing-library/dom';
import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache, type PlotStyleOverride } from '../state/chartState';
import { IndicatorSettingsModal } from './IndicatorSettingsModal';

// ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json
// constants[176] remark 2: selecting a deselected plot enables every display
// location; Defaults / Reset settings restores the script's coded display.
describe('ledger804: Style display selection and reset', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    clearChartStoreCache();
  });

  it.each([1, 2])('restores coded display %s after enabling all locations', (codedDisplay) => {
    const modal = new IndicatorSettingsModal();
    modal.mount(document.body);
    const plot: PlotOutput = { id: 'plot', type: 'plot', title: 'Value', values: [7], color: '#00ff00', display: codedDisplay };
    let saved: PlotStyleOverride[] | undefined;
    const open = () => {
      modal.openWith({ id: 'study', name: 'Study', inputs: {} }, [], [plot], saved, (_inputs, overrides) => { saved = overrides; });
      fireEvent.click(screen.getByText('Style'));
    };
    const display = () => (saved?.find((override) => override.plotId === 'plot') as (PlotStyleOverride & { display?: number }) | undefined)?.display ?? codedDisplay;
    open();
    if ((codedDisplay & 1) !== 0) {
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByText('Apply'));
      expect(display()).toBe(0);
      open();
    }
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText('Apply'));
    expect(display()).toBe(31);
    open();
    fireEvent.change(screen.getByRole('combobox', { name: 'Defaults' }), { target: { value: 'reset' } });
    fireEvent.click(screen.getByText('Apply'));
    expect(display()).toBe(codedDisplay);
    expect(plot.display).toBe(codedDisplay);
    modal.unmount();
  });
});
