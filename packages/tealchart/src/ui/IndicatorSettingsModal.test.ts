import { fireEvent, screen } from '@testing-library/dom';
import { afterEach, describe, expect, it } from 'vitest';

import type { InputDefinition } from '@tealstreet/tealscript';

import { clearChartStoreCache } from '../state/chartState';
import { IndicatorSettingsModal } from './IndicatorSettingsModal';

describe('IndicatorSettingsModal', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    clearChartStoreCache();
  });

  it('renders Pine input metadata controls and saves typed values', () => {
    const modal = new IndicatorSettingsModal();
    modal.mount(document.body);

    const saved: Record<string, unknown>[] = [];
    const inputDefinitions: InputDefinition[] = [
      {
        id: 'input_Length',
        type: 'int',
        title: 'Length',
        defval: 14,
        options: [7, 14, 21],
        tooltip: 'Length options',
      },
      {
        id: 'input_Timeframe',
        type: 'timeframe',
        title: 'Timeframe',
        defval: '60',
        options: ['15', '60'],
      },
      {
        id: 'input_Source',
        type: 'source',
        title: 'Source',
        defval: 100,
      },
      {
        id: 'input_Start',
        type: 'time',
        title: 'Start',
        defval: Date.UTC(2024, 0, 1),
      },
      {
        id: 'input_Notes',
        type: 'text_area',
        title: 'Notes',
        defval: 'watch',
        active: false,
      },
    ];

    modal.openWith(
      { id: 'study-1', name: 'Study', inputs: {} },
      inputDefinitions,
      [],
      undefined,
      (inputs) => saved.push(inputs),
    );

    const selects = Array.from(document.querySelectorAll('select')).filter(
      (select) => select.getAttribute('aria-label') !== 'Defaults',
    );
    expect(selects).toHaveLength(3);

    fireEvent.change(selects[0], { target: { value: '21' } });
    fireEvent.change(selects[1], { target: { value: '15' } });
    fireEvent.change(selects[2], { target: { value: 'open' } });

    const dateInput = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2024-01-02T00:00' } });

    const notesInput = document.querySelector('textarea') as HTMLTextAreaElement;
    expect(notesInput.disabled).toBe(true);

    fireEvent.click(screen.getByText('Apply'));

    expect(saved).toEqual([
      {
        input_Length: 21,
        input_Timeframe: '15',
        input_Source: 'open',
        input_Start: new Date('2024-01-02T00:00').getTime(),
        input_Notes: 'watch',
      },
    ]);
  });
});

it('shows authored external plot titles and saves the stable source binding', () => {
  const modal = new IndicatorSettingsModal(); modal.mount(document.body);
  const saved: unknown[] = [];
  modal.openWith({ id: 'consumer', name: 'Consumer', inputs: {} }, [{ id: 'input_Source', type: 'source', title: 'Source', defval: 1 }], [], undefined, inputs => saved.push(inputs), [{ value: 'tealscript-source:provider:plot1', label: 'Authored curve' }]);
  const option = screen.getByRole('option', { name: 'Authored curve' });
  fireEvent.change(option.parentElement!, { target: { value: 'tealscript-source:provider:plot1' } });
  fireEvent.click(screen.getByText('Apply'));
  expect(saved).toEqual([{ input_Source: 'tealscript-source:provider:plot1' }]);
  modal.unmount(); document.body.innerHTML = '';
});


it('edits canvas palette colors without losing transparency and resets defaults', () => {
  const modal = new IndicatorSettingsModal();
  modal.mount(document.body);
  const saved: Record<string, unknown>[] = [];
  const styleInputs: InputDefinition[] = [
    { id: 'palette_background', type: 'color', title: 'Background', defval: '#8888880a' },
  ];
  const open = () =>
    modal.openWith(
      { id: 'tpo', name: 'TPO', inputs: { length: 7, palette_background: '#12345633' } },
      [{ id: 'length', type: 'int', title: 'Length', defval: 20 }],
      [],
      undefined,
      (inputs) => saved.push(inputs),
      [],
      styleInputs,
    );
  open();
  expect(screen.queryByLabelText('Background')).toBeNull();
  fireEvent.click(screen.getByText('Style'));
  expect(screen.queryByText('No style options available')).toBeNull();
  expect((screen.getByLabelText('Background') as HTMLInputElement).value).toBe('#123456');
  expect((screen.getByLabelText('Background opacity') as HTMLInputElement).value).toBe('51');
  fireEvent.change(screen.getByLabelText('Background'), { target: { value: '#abcdef' } });
  fireEvent.click(screen.getByText('Apply'));
  expect(saved[0]).toEqual({ length: 7, palette_background: '#abcdef33' });
  open();
  fireEvent.click(screen.getByText('Style'));
  fireEvent.input(screen.getByLabelText('Background opacity'), { target: { value: '0' } });
  fireEvent.click(screen.getByText('Apply'));
  expect(saved[1].palette_background).toBe('#12345600');
  open();
  fireEvent.change(screen.getByLabelText('Defaults'), { target: { value: 'reset' } });
  fireEvent.click(screen.getByText('Apply'));
  expect(saved[2]).toEqual({ length: 20, palette_background: '#8888880a' });
  modal.openWith({ id: 'sma', name: 'SMA', inputs: {} }, [], [], undefined, () => {});
  fireEvent.click(screen.getByText('Style'));
  expect(screen.getByText('No style options available')).toBeTruthy();
  expect(screen.queryByLabelText('Background')).toBeNull();
  modal.unmount();
  document.body.innerHTML = '';
});

it('initializes rgba palette defaults with their RGB channels and opacity', () => {
  const modal = new IndicatorSettingsModal();
  modal.mount(document.body);
  const saved: Record<string, unknown>[] = [];
  modal.openWith(
    { id: 'dwmo', name: 'DWMO', inputs: {} },
    [],
    [],
    undefined,
    (inputs) => saved.push(inputs),
    [],
    [{ id: 'palette_daily', type: 'color', title: 'Daily Open', defval: 'rgba(56, 189, 248, 0.95)' }],
  );
  fireEvent.click(screen.getByText('Style'));
  expect((screen.getByLabelText('Daily Open') as HTMLInputElement).value).toBe('#38bdf8');
  expect((screen.getByLabelText('Daily Open opacity') as HTMLInputElement).value).toBe('242');
  fireEvent.change(screen.getByLabelText('Daily Open'), { target: { value: '#abcdef' } });
  fireEvent.click(screen.getByText('Apply'));
  expect(saved[0].palette_daily).toBe('#abcdeff2');
  modal.unmount();
  document.body.innerHTML = '';
});
