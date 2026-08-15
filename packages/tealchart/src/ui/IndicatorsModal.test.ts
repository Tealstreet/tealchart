// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { BUILTIN_INDICATORS } from '../indicators/builtinIndicators';
import { IndicatorsModal } from './IndicatorsModal';

describe('IndicatorsModal', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders only indicators available to the current chart runtime', () => {
    const movingAverage = BUILTIN_INDICATORS.find((indicator) => indicator.id === 'sma');
    const dwmo = BUILTIN_INDICATORS.find((indicator) => indicator.id === 'dwmo');
    if (!movingAverage || !dwmo) {
      throw new Error('Expected built-in indicators to exist');
    }

    const modal = new IndicatorsModal({
      indicators: [movingAverage],
      onSelectIndicator: vi.fn(),
    });

    modal.mount(document.body);
    modal.open();

    expect(document.body.textContent).toContain('Moving Average');
    expect(document.body.textContent).not.toContain('DWMO');

    modal.unmount();
  });

  it('searches only within the available indicators', () => {
    const movingAverage = BUILTIN_INDICATORS.find((indicator) => indicator.id === 'sma');
    if (!movingAverage) {
      throw new Error('Expected SMA indicator to exist');
    }

    const modal = new IndicatorsModal({
      indicators: [movingAverage],
      onSelectIndicator: vi.fn(),
    });

    modal.mount(document.body);
    modal.open();

    const searchInput = document.querySelector<HTMLInputElement>('input');
    expect(searchInput).not.toBeNull();

    searchInput!.value = 'DWMO';
    searchInput!.dispatchEvent(new Event('input', { bubbles: true }));

    expect(document.body.textContent).toContain('No indicators found');
    expect(document.body.textContent).not.toContain('DWMO');

    modal.unmount();
  });

  it('updates the open picker when the available indicator catalog changes', () => {
    const movingAverage = BUILTIN_INDICATORS.find((indicator) => indicator.id === 'sma');
    if (!movingAverage) {
      throw new Error('Expected SMA indicator to exist');
    }

    const customIndicator = {
      ...movingAverage,
      id: 'custom-tealchart-study:demo',
      sourceKind: 'custom_tealchart_study' as const,
      sourceId: 'demo',
      sourceHash: 'v1',
      name: 'Demo Custom Study',
      category: 'other' as const,
      description: 'User-authored Tealscript study',
    };
    const modal = new IndicatorsModal({
      indicators: [movingAverage],
      onSelectIndicator: vi.fn(),
    });

    modal.mount(document.body);
    modal.open();
    expect(document.body.textContent).not.toContain('Demo Custom Study');

    modal.setIndicators([movingAverage, customIndicator]);

    expect(document.body.textContent).toContain('Demo Custom Study');
    modal.unmount();
  });
});
