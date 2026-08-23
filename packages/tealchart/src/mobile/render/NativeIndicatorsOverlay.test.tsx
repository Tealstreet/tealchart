import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NativeIndicatorsOverlayImpl, resolveNativeIndicatorGroups } from './NativeIndicatorsOverlay';

describe('resolveNativeIndicatorGroups', () => {
  it('groups only native-addable indicators', () => {
    const groups = resolveNativeIndicatorGroups('');
    const allIndicators = groups.flatMap((group) => group.indicators);

    expect(groups.map((group) => group.value)).toContain('trend');
    expect(allIndicators.every((indicator) => indicator.code.trim().length > 0)).toBe(true);
    expect(allIndicators.some((indicator) => indicator.id === 'sma')).toBe(true);
    expect(allIndicators.some((indicator) => indicator.id === 'dwmo')).toBe(false);
  });

  it('filters indicators by query', () => {
    const groups = resolveNativeIndicatorGroups('relative strength');
    const names = groups.flatMap((group) => group.indicators.map((indicator) => indicator.name));

    expect(names).toContain('Relative Strength Index');
    expect(names).not.toContain('SMA');
  });
});

describe('NativeIndicatorsOverlay', () => {
  it('selects an indicator and closes', () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();

    render(
      <NativeIndicatorsOverlayImpl
        activeBackgroundColor="#20242b"
        backgroundColor="#101418"
        gridColor="#252a32"
        mutedTextColor="#8a8f98"
        onClose={onClose}
        onSelect={onSelect}
        textColor="#f0f3fa"
      />,
    );

    fireEvent.click(screen.getByLabelText('Add Relative Strength Index'));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'rsi' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
