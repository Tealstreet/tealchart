import type { LayoutMetadata } from '../../transformer';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Alert } from '../../test/reactNativeMock';
import { LayoutSelectorSheet } from './LayoutSelectorSheet';

const layouts: LayoutMetadata[] = [
  { id: 'a', name: 'Scalp', symbol: 'BTCUSDT', isTealchart: true },
  { id: 'b', name: 'Swing', symbol: 'ETHUSDT', isTealchart: true },
];

function renderSheet(overrides: Partial<React.ComponentProps<typeof LayoutSelectorSheet>> = {}) {
  const props = {
    visible: true,
    layouts,
    currentLayoutId: 'a' as string | number | null,
    onSaveAs: vi.fn(),
    onLoad: vi.fn(),
    onRename: vi.fn(),
    onDelete: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<LayoutSelectorSheet {...props} />);
  return props;
}

afterEach(() => {
  cleanup();
  Alert.lastButtons = [];
});

describe('LayoutSelectorSheet', () => {
  it('renders nothing when not visible', () => {
    renderSheet({ visible: false });
    expect(screen.queryByLabelText('Load layout Scalp')).toBeNull();
  });

  it('lists layouts and marks the current one', () => {
    renderSheet();
    expect(screen.getByLabelText('Load layout Scalp').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('Load layout Swing').getAttribute('aria-pressed')).toBe('false');
  });

  it('loads a layout on tap', () => {
    const props = renderSheet();
    fireEvent.click(screen.getByLabelText('Load layout Swing'));
    expect(props.onLoad).toHaveBeenCalledWith('b');
  });

  it('saves a new layout and ignores empty names', () => {
    const props = renderSheet();
    const save = screen.getByLabelText('Save new layout');
    expect(save.getAttribute('aria-disabled')).toBe('true');

    fireEvent.change(screen.getByLabelText('New layout name'), { target: { value: '  Breakout  ' } });
    fireEvent.click(screen.getByLabelText('Save new layout'));
    expect(props.onSaveAs).toHaveBeenCalledWith('Breakout');
  });

  it('renames a layout', () => {
    const props = renderSheet();
    fireEvent.click(screen.getByLabelText('Rename layout Scalp'));
    fireEvent.change(screen.getByLabelText('Edit layout name'), { target: { value: 'Scalp v2' } });
    fireEvent.click(screen.getByLabelText('Confirm rename'));
    expect(props.onRename).toHaveBeenCalledWith('a', 'Scalp v2');
  });

  it('confirms before deleting', () => {
    const props = renderSheet();
    fireEvent.click(screen.getByLabelText('Delete layout Scalp'));
    const destructive = Alert.lastButtons.find((b) => b.style === 'destructive');
    expect(destructive).toBeTruthy();
    destructive?.onPress?.();
    expect(props.onDelete).toHaveBeenCalledWith('a');
  });

  it('closes', () => {
    const props = renderSheet();
    fireEvent.click(screen.getByLabelText('Close layouts'));
    expect(props.onClose).toHaveBeenCalled();
  });

  it('shows an empty state', () => {
    renderSheet({ layouts: [], currentLayoutId: null });
    expect(screen.getByText('No saved layouts')).toBeTruthy();
  });

  it('exits the rename editor if the edited layout is removed', () => {
    const props = {
      visible: true,
      layouts,
      currentLayoutId: 'a' as string | number | null,
      onSaveAs: vi.fn(),
      onLoad: vi.fn(),
      onRename: vi.fn(),
      onDelete: vi.fn(),
      onClose: vi.fn(),
    };
    const { rerender } = render(<LayoutSelectorSheet {...props} />);
    fireEvent.click(screen.getByLabelText('Rename layout Scalp'));
    expect(screen.getByLabelText('Edit layout name')).toBeTruthy();

    rerender(<LayoutSelectorSheet {...props} layouts={[layouts[1]]} />);
    expect(screen.queryByLabelText('Edit layout name')).toBeNull();
    expect(screen.getByLabelText('Load layout Swing')).toBeTruthy();
  });
});
