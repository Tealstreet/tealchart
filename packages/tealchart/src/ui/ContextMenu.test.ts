// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { showContextMenu } from './ContextMenu';

describe('ContextMenu', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('opens left of its anchor using the measured width and still clamps to the viewport', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 260, height: 200 } as DOMRect);
    const menu = showContextMenu({ x: 700, y: 20, openDirection: 'left', items: [{ text: 'Menu', position: 'top', click: vi.fn() }] });
    expect(menu.getElement().style.left).toBe('440px');
    menu.close();
    const narrow = showContextMenu({ x: 100, y: 20, openDirection: 'left', items: [{ text: 'Menu', position: 'top', click: vi.fn() }] });
    expect(narrow.getElement().style.left).toBe('10px');
  });

  it('keeps menu clicks from falling through to chart handlers', () => {
    const onChartClick = vi.fn();
    const onItemClick = vi.fn();
    document.body.addEventListener('click', onChartClick);

    const menu = showContextMenu({
      x: 20,
      y: 20,
      items: [{ text: 'Duplicate selected drawing', click: onItemClick, position: 'top' }],
    });
    const item = menu.getElement().querySelector<HTMLElement>('div');
    expect(item).not.toBeNull();

    menu.getElement().dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    menu.getElement().dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    menu.getElement().dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
    item?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onItemClick).toHaveBeenCalledTimes(1);
    expect(onChartClick).not.toHaveBeenCalled();
    document.body.removeEventListener('click', onChartClick);
  });

  it('renders and dispatches the drawing object-tree context action', () => {
    const onChartClick = vi.fn();
    const onObjectTree = vi.fn();
    document.body.addEventListener('click', onChartClick);

    const menu = showContextMenu({
      x: 20,
      y: 20,
      items: [
        { text: 'Open selected drawing properties', click: vi.fn(), position: 'top' },
        { text: 'Open drawing object tree', click: onObjectTree, position: 'top' },
      ],
    });

    const item = Array.from(menu.getElement().querySelectorAll<HTMLElement>('div')).find(
      (element) => element.textContent === 'Open drawing object tree',
    );
    expect(item).not.toBeNull();

    item?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onObjectTree).toHaveBeenCalledTimes(1);
    expect(onChartClick).not.toHaveBeenCalled();
    expect(document.body.contains(menu.getElement())).toBe(false);
    document.body.removeEventListener('click', onChartClick);
  });

  it('does not attach delayed outside listeners after item-click close', () => {
    vi.useFakeTimers();
    const onItemClick = vi.fn();
    const onClose = vi.fn();
    const addDocumentListener = vi.spyOn(document, 'addEventListener');
    const removeDocumentListener = vi.spyOn(document, 'removeEventListener');
    const removeWindowListener = vi.spyOn(window, 'removeEventListener');

    const menu = showContextMenu({
      x: 20,
      y: 20,
      items: [{ text: 'Duplicate selected drawing', click: onItemClick, position: 'top' }],
      onClose,
    });
    const item = menu.getElement().querySelector<HTMLElement>('div');
    expect(item).not.toBeNull();

    item?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    vi.runOnlyPendingTimers();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onItemClick).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(addDocumentListener).not.toHaveBeenCalledWith('click', expect.any(Function), { capture: true });
    expect(addDocumentListener).not.toHaveBeenCalledWith('contextmenu', expect.any(Function), { capture: true });
    expect(removeDocumentListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(removeWindowListener).toHaveBeenCalledWith('scroll', expect.any(Function), { capture: true });
  });
});
