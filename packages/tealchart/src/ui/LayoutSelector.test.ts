// @vitest-environment jsdom

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
    vi.clearAllMocks();
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

  it('opens the original chart-contained modal from a native header and gives Escape app-origin focus', async () => {
    const onClose = vi.fn();
    const selector = new LayoutSelector({ ...callbacks, onClose });
    const host = document.createElement('div');
    document.body.appendChild(host);
    selector.mount(host);
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    iframe.focus();
    selector.open();
    await Promise.resolve();
    await Promise.resolve();
    expect(host.textContent).toContain('Layouts');
    expect(host.textContent).toContain('Zero Layout');
    expect(host.contains(document.activeElement)).toBe(true);
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onClose).toHaveBeenCalledOnce();
    expect((host.firstElementChild as HTMLElement).style.display).toBe('none');
    selector.dispose();
  });

  it('delegates Electron naming and confirmation through the original actions without using browser dialogs', async () => {
    const prompt = vi.spyOn(window, 'prompt');
    const confirm = vi.spyOn(window, 'confirm');
    const requestName = vi.fn().mockResolvedValue(' New name ');
    const confirmDelete = vi.fn().mockResolvedValue(true);
    const selector = new LayoutSelector({ ...callbacks, requestName, confirmDelete });
    const host = document.createElement('div');
    document.body.appendChild(host);
    selector.mount(host);
    const open = async () => {
      selector.open();
      await Promise.resolve();
      await Promise.resolve();
    };
    await open();
    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent === 'Save As...')!
      .click();
    await Promise.resolve();
    expect(callbacks.onSaveAs).toHaveBeenCalledWith('New name');
    await open();
    host.querySelector<HTMLButtonElement>('button[title="Rename"]')!.click();
    await Promise.resolve();
    expect(requestName).toHaveBeenLastCalledWith('rename', expect.objectContaining({ id: 0, name: 'Zero Layout' }));
    expect(callbacks.onRename).toHaveBeenCalledWith(0, 'New name');
    await open();
    host.querySelector<HTMLButtonElement>('button[title="Delete"]')!.click();
    await Promise.resolve();
    expect(callbacks.onDelete).toHaveBeenCalledWith(0);
    expect(prompt).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
    selector.dispose();
  });

  it('retires a late naming result after its selector is disposed', async () => {
    let resolve!: (value: string | null) => void;
    const selector = new LayoutSelector({
      ...callbacks,
      requestName: () =>
        new Promise((done) => {
          resolve = done;
        }),
    });
    const host = document.createElement('div');
    document.body.appendChild(host);
    selector.mount(host);
    selector.open();
    await Promise.resolve();
    await Promise.resolve();
    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent === 'Save As...')!
      .click();
    selector.dispose();
    resolve('Retired');
    await Promise.resolve();
    expect(callbacks.onSaveAs).not.toHaveBeenCalled();
  });

  it('retains browser prompt and confirm for existing callers without hosted dialog callbacks', async () => {
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue(' Browser name ');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const selector = new LayoutSelector(callbacks);
    const host = document.createElement('div');
    document.body.appendChild(host);
    selector.mount(host);
    selector.open();
    await Promise.resolve();
    await Promise.resolve();
    Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent === 'Save As...')!
      .click();
    expect(prompt).toHaveBeenCalledWith('Layout name:');
    expect(callbacks.onSaveAs).toHaveBeenCalledWith('Browser name');
    selector.open();
    await Promise.resolve();
    await Promise.resolve();
    host.querySelector<HTMLButtonElement>('button[title="Delete"]')!.click();
    expect(confirm).toHaveBeenCalledWith('Delete layout "Zero Layout"?');
    expect(callbacks.onDelete).toHaveBeenCalledWith(0);
    selector.dispose();
  });
});
