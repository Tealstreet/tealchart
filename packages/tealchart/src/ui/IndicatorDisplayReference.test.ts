import type { PlotOutput } from '@tealstreet/tealscript';
import type { PlotStyleOverride } from '../state/chartState';

import { fireEvent, screen } from '@testing-library/dom';
import { afterEach, describe, expect, it } from 'vitest';

import { IndicatorSettingsModal } from './IndicatorSettingsModal';

const plot: PlotOutput = { id: 'price', type: 'plot', title: 'Price', values: [17], color: '#ff0000', display: 8 };
let modal: IndicatorSettingsModal;

function open(overrides?: PlotStyleOverride[]) {
  const saved: Array<PlotStyleOverride[] | undefined> = [];
  modal = new IndicatorSettingsModal();
  modal.mount(document.body);
  modal.openWith({ id: 'study', name: 'Study', inputs: {} }, [], [plot], overrides, (_, styles) => saved.push(styles));
  fireEvent.click(screen.getByText('Style'));
  return saved;
}

// const_display.price_scale remarks[1]: selecting a deselected plot enables all locations; Defaults resets coded display.
describe('documented plot display settings', () => {
  afterEach(() => {
    modal?.unmount();
    document.body.innerHTML = '';
  });

  it('selects a price-scale-only plot for all locations without changing its coded mask', () => {
    const saved = open();
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText('Apply'));
    expect(saved[0]?.find((style) => style.plotId === 'price')?.display).toBe(31);
    expect(plot.display).toBe(8);
  });


});
