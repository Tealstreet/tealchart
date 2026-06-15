import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ContextMenuComponent } from './ContextMenuComponent';

describe('ContextMenuComponent', () => {
  afterEach(() => {
    cleanup();
  });

  it('keeps mobile menu item taps from falling through to chart handlers', () => {
    const onChartTouch = vi.fn();
    const onItemClick = vi.fn();
    const onClose = vi.fn();

    render(
      <div onClick={onChartTouch}>
        <ContextMenuComponent
          visible
          items={[{ text: 'Duplicate selected drawing', click: onItemClick, position: 'top' }]}
          x={20}
          y={20}
          price={10}
          time={1}
          onClose={onClose}
        />
      </div>,
    );

    expect(screen.getByLabelText('Context menu').getAttribute('data-start-should-set-responder')).toBe('true');

    fireEvent.click(screen.getByText('Duplicate selected drawing'));

    expect(onItemClick).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onChartTouch).not.toHaveBeenCalled();
  });

  it('renders and dispatches the drawing object-tree context action', () => {
    const onChartTouch = vi.fn();
    const onObjectTree = vi.fn();
    const onClose = vi.fn();

    render(
      <div onClick={onChartTouch}>
        <ContextMenuComponent
          visible
          items={[
            { text: 'Open selected drawing properties', click: vi.fn(), position: 'top' },
            { text: 'Open drawing object tree', click: onObjectTree, position: 'top' },
          ]}
          x={20}
          y={20}
          price={10}
          time={1}
          onClose={onClose}
        />
      </div>,
    );

    fireEvent.click(screen.getByText('Open drawing object tree'));

    expect(onObjectTree).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onChartTouch).not.toHaveBeenCalled();
  });
});
