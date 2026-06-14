// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { showContextMenu } from './ContextMenu';

describe('ContextMenu', () => {
  afterEach(() => {
    document.body.innerHTML = '';
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
    item?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onItemClick).toHaveBeenCalledTimes(1);
    expect(onChartClick).not.toHaveBeenCalled();
    document.body.removeEventListener('click', onChartClick);
  });
});
