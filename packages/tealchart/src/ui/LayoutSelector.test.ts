import type { LayoutMetadata } from '../transformer/saveLoadIntegration';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LayoutSelector } from './LayoutSelector';

describe('LayoutSelector', () => {
  const callbacks = {
    getAllLayouts: vi.fn<() => Promise<LayoutMetadata[]>>(),
    onSave: vi.fn(),
    onSaveAs: vi.fn(),
    onLoad: vi.fn(),
    onDelete: vi.fn(),
    onRename: vi.fn(),
  };

  beforeEach(() => {
    callbacks.getAllLayouts.mockResolvedValue([{ id: 0, name: 'Zero Layout', symbol: 'BTCUSDT', isTealchart: true }]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('shows Save when current layout id is 0', async () => {
    const selector = new LayoutSelector(callbacks);
    const host = document.createElement('div');
    document.body.appendChild(host);

    selector.mount(host);
    selector.setCurrentLayout(0, 'Zero Layout');
    selector.getElement().click();
    await Promise.resolve();
    await Promise.resolve();

    const saveButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Save');
    expect(saveButton).toBeTruthy();

    selector.dispose();
  });
});
