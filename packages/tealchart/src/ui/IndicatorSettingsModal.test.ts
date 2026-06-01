import { fireEvent, screen } from '@testing-library/dom';
import { afterEach, describe, expect, it } from 'vitest';

import type { InputDefinition } from '@tealstreet/tealscript';

import { IndicatorSettingsModal } from './IndicatorSettingsModal';

describe('IndicatorSettingsModal', () => {
  afterEach(() => {
    document.body.innerHTML = '';
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

    const selects = document.querySelectorAll('select');
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
