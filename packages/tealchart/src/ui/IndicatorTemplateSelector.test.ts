// @vitest-environment jsdom

import type { IndicatorTemplateCallbacks } from './IndicatorTemplateSelector';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { describeApplyOutcome, IndicatorTemplateSelector } from './IndicatorTemplateSelector';

function setup(overrides: Partial<IndicatorTemplateCallbacks> = {}) {
  const names = ['Scalping', 'Swing'];
  const callbacks: IndicatorTemplateCallbacks = {
    getAll: vi.fn(async () => [...names]),
    save: vi.fn(async (name: string) => {
      if (!names.includes(name)) names.push(name);
    }),
    apply: vi.fn(async () => ({ missingStudies: [], unsupportedStudies: [] })),
    remove: vi.fn(async (name: string) => {
      names.splice(names.indexOf(name), 1);
    }),
    ...overrides,
  };
  const root = document.createElement('div');
  document.body.appendChild(root);
  const selector = new IndicatorTemplateSelector(callbacks);
  root.appendChild(selector.getElement());
  selector.mount(root);
  return { callbacks, root, selector };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function dialog(root: HTMLElement): HTMLElement {
  return root.querySelector('[role="dialog"]') as HTMLElement;
}

function listItem(root: HTMLElement, name: string): HTMLElement {
  const item = Array.from(root.querySelectorAll<HTMLElement>('[role="button"]')).find(
    (el) => el.querySelector('span')?.textContent === name,
  );
  if (!item) throw new Error(`No template row "${name}"`);
  return item;
}

function submitName(root: HTMLElement, name: string): void {
  const input = root.querySelector<HTMLInputElement>('input[aria-label="Template name"]')!;
  input.value = name;
  input.dispatchEvent(new Event('input'));
  input.form!.dispatchEvent(new Event('submit', { cancelable: true }));
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('IndicatorTemplateSelector', () => {
  it('is a compact labelled button that opens the templates dialog and lists names', async () => {
    const { root, selector } = setup();
    expect(selector.getElement().getAttribute('aria-label')).toBe('Indicator templates');
    expect(selector.getElement().textContent).toBe('');

    selector.getElement().click();
    expect(dialog(root).style.display).toBe('flex');
    await flush();
    expect(listItem(root, 'Scalping')).toBeTruthy();
    expect(listItem(root, 'Swing')).toBeTruthy();
  });

  it('applies a template and closes when nothing was left out', async () => {
    const { root, selector, callbacks } = setup();
    selector.open();
    await flush();

    listItem(root, 'Swing').click();
    await flush();
    expect(callbacks.apply).toHaveBeenCalledWith('Swing');
    expect(dialog(root).style.display).toBe('none');
  });

  it('stays open with a notice naming skipped studies', async () => {
    const { root, selector } = setup({
      apply: vi.fn(async () => ({ missingStudies: ['My Bands'], unsupportedStudies: ['Some Pine'] })),
    });
    selector.open();
    await flush();

    listItem(root, 'Swing').click();
    await flush();
    const status = root.querySelector('[role="status"]');
    expect(status?.textContent).toContain('Skipped, not in your studies: My Bands.');
    expect(status?.textContent).toContain('Kept but not shown on this chart: Some Pine.');
    expect(dialog(root).style.display).toBe('flex');
  });

  it('saves under a new name without asking', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    const { root, selector, callbacks } = setup();
    selector.open();
    await flush();

    submitName(root, '  Breakout  ');
    await flush();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(callbacks.save).toHaveBeenCalledWith('Breakout');
    expect(listItem(root, 'Breakout')).toBeTruthy();
  });

  it('asks before replacing an existing template, and does nothing when declined', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const { root, selector, callbacks } = setup();
    selector.open();
    await flush();

    submitName(root, 'Swing');
    expect(confirmSpy).toHaveBeenCalledWith('Replace indicator template "Swing"?');
    expect(callbacks.save).not.toHaveBeenCalled();

    submitName(root, 'Swing');
    await flush();
    expect(callbacks.save).toHaveBeenCalledWith('Swing');
  });

  it('deletes after confirmation and refreshes the list', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { root, selector, callbacks } = setup();
    selector.open();
    await flush();

    root.querySelector<HTMLButtonElement>('button[aria-label="Delete Scalping"]')!.click();
    await flush();
    expect(callbacks.remove).toHaveBeenCalledWith('Scalping');
    expect(() => listItem(root, 'Scalping')).toThrow();
    // Deleting does not apply the row underneath the button.
    expect(callbacks.apply).not.toHaveBeenCalled();
  });

  it('shows the adapter’s reason and no save control when templates are unavailable', async () => {
    const { root, selector } = setup({
      getAll: vi.fn(async () => {
        throw new Error('Sign in to save indicator templates.');
      }),
    });
    selector.open();
    await flush();
    expect(dialog(root).textContent).toContain('Sign in to save indicator templates.');
    expect(root.querySelector('input[aria-label="Template name"]')).toBeNull();
  });
});

describe('describeApplyOutcome', () => {
  it('says nothing when the whole template applied', () => {
    expect(describeApplyOutcome({ missingStudies: [], unsupportedStudies: [] })).toBeNull();
  });
});
