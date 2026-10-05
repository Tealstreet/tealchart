// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { BUILTIN_INDICATORS } from '../indicators/builtinIndicators';
import { IndicatorsModal } from './IndicatorsModal';

describe('IndicatorsModal', () => {
  it('offers creation in an empty catalog and edits custom records without adding them', () => {
    const onNew = vi.fn();
    const onEdit = vi.fn();
    const onSelectIndicator = vi.fn();
    const modal = new IndicatorsModal({ indicators: [], onSelectIndicator });
    modal.mount(document.body);
    modal.open();
    modal.setCustomIndicatorEditor({ onNew, onEdit });
    const create = Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'New Indicator');
    create!.click();
    expect(onNew).toHaveBeenCalledOnce();
    const custom = { ...BUILTIN_INDICATORS[0], id: 'custom', sourceId: 'saved', sourceKind: 'custom_tealchart_study' as const };
    modal.setIndicators([custom]);
    modal.open();
    document.querySelector<HTMLButtonElement>(`button[aria-label="Edit ${custom.name}"]`)!.click();
    expect(onEdit).toHaveBeenCalledWith(custom);
    expect(onSelectIndicator).not.toHaveBeenCalled();
    modal.setCustomIndicatorEditor(undefined);
    modal.open();
    expect(document.body.textContent).not.toContain('New Indicator');
    modal.unmount();
  });
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

  it('renders host-supplied categories only when matching indicators are available', () => {
    const movingAverage = BUILTIN_INDICATORS.find((indicator) => indicator.id === 'sma');
    if (!movingAverage) {
      throw new Error('Expected SMA indicator to exist');
    }

    const modal = new IndicatorsModal({
      indicators: [movingAverage],
      additionalCategories: [{ id: 'custom-host-studies', name: 'MY SCRIPTS' }],
      onSelectIndicator: vi.fn(),
    });

    modal.mount(document.body);
    modal.open();
    expect(document.body.textContent).not.toContain('MY SCRIPTS');

    modal.setIndicators([
      movingAverage,
      {
        ...movingAverage,
        id: 'custom-tealchart-study:demo',
        sourceKind: 'custom_tealchart_study',
        sourceId: 'demo',
        sourceHash: 'v1',
        name: 'Demo Custom Study',
        category: 'custom-host-studies',
        description: 'User-authored Tealscript study',
      },
    ]);

    expect(document.body.textContent).toContain('MY SCRIPTS');
    expect(document.body.textContent).toContain('Demo Custom Study');
    modal.unmount();
  });
});
