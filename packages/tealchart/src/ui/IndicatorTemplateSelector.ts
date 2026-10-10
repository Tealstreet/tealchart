/**
 * IndicatorTemplateSelector - compact button beside "Indicators" + a modal to
 * save the chart's indicators as a template, apply one, or delete one.
 *
 * Built on the same Modal base and list styles as the LayoutSelector. Names
 * are typed into the modal itself rather than `prompt()`, which Electron does
 * not implement. Applying REPLACES the chart's indicators.
 */

import type { WebOverlayHostFactory } from './OverlayHost';

import { renderDrawingIcon } from './dom';
import { layoutSelectorStyles as styles } from './LayoutSelector';
import { Modal } from './Modal';

// ============================================================================
// Types
// ============================================================================

export interface IndicatorTemplateApplyOutcome {
  /** TealScript studies the template uses that this user does not have; not applied. */
  missingStudies: string[];
  /** TradingView studies kept with the chart but not drawn by this engine. */
  unsupportedStudies: string[];
}

export interface IndicatorTemplateCallbacks {
  /** Template names. A rejection (for example: not signed in) disables the menu with its message. */
  getAll: () => Promise<string[]>;
  /** Save the chart's current indicators under this name, replacing any template of that name. */
  save: (name: string) => Promise<void>;
  /** Replace the chart's indicators with the named template. */
  apply: (name: string) => Promise<IndicatorTemplateApplyOutcome>;
  remove: (name: string) => Promise<void>;
}

const UNAVAILABLE_MESSAGE = 'Indicator templates are unavailable.';

const modalStyles = {
  saveRow: {
    display: 'flex',
    gap: '6px',
    padding: '8px 12px',
    borderTop: '1px solid var(--tc-border, #363a45)',
  } as Partial<CSSStyleDeclaration>,
  input: {
    flex: '1',
    minWidth: '0',
    padding: '5px 8px',
    fontSize: '13px',
    color: 'var(--tc-text, #d1d4dc)',
    backgroundColor: 'transparent',
    border: '1px solid var(--tc-border, #363a45)',
    borderRadius: '4px',
    outline: 'none',
  } as Partial<CSSStyleDeclaration>,
  saveButton: {
    padding: '5px 10px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--tc-text, #d1d4dc)',
    backgroundColor: 'var(--tc-hover-bg, rgba(255, 255, 255, 0.05))',
    border: '1px solid var(--tc-border, #363a45)',
    borderRadius: '4px',
    cursor: 'pointer',
    flexShrink: '0',
  } as Partial<CSSStyleDeclaration>,
  notice: {
    padding: '8px 12px',
    fontSize: '12px',
    lineHeight: '1.4',
    color: 'var(--tc-warning, #ff9800)',
    whiteSpace: 'normal',
  } as Partial<CSSStyleDeclaration>,
};

/** Text for the notice shown after applying, or null when nothing was left out. */
export function describeApplyOutcome(outcome: IndicatorTemplateApplyOutcome): string | null {
  const parts: string[] = [];
  if (outcome.missingStudies.length > 0) {
    parts.push(`Skipped, not in your studies: ${outcome.missingStudies.join(', ')}.`);
  }
  if (outcome.unsupportedStudies.length > 0) {
    parts.push(`Kept but not shown on this chart: ${outcome.unsupportedStudies.join(', ')}.`);
  }
  return parts.length > 0 ? parts.join(' ') : null;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

// ============================================================================
// Modal
// ============================================================================

class IndicatorTemplateModal extends Modal {
  private callbacks: IndicatorTemplateCallbacks;
  private names: string[] = [];
  private unavailable: string | null = null;
  private notice: string | null = null;
  private busy = false;
  private draftName = '';
  /** Results of a load started before the latest one are dropped. */
  private loadGeneration = 0;

  constructor(callbacks: IndicatorTemplateCallbacks) {
    super({
      title: 'Indicator templates',
      width: 320,
      maxHeight: 'min(80vh, calc(100% - 40px))',
      position: 'absolute',
    });
    this.callbacks = callbacks;
    this.contentEl.style.padding = '0';
  }

  protected onOpen(): void {
    this.notice = null;
    this.load();
  }

  private load(): void {
    const generation = ++this.loadGeneration;
    this.renderMessage('Loading...');
    this.callbacks
      .getAll()
      .then((names) => {
        if (generation !== this.loadGeneration) return;
        this.names = [...names].sort((a, b) => a.localeCompare(b));
        this.unavailable = null;
        this.renderContent();
      })
      .catch((error: unknown) => {
        if (generation !== this.loadGeneration) return;
        this.names = [];
        this.unavailable = errorMessage(error, UNAVAILABLE_MESSAGE);
        this.renderContent();
      });
  }

  private renderMessage(text: string): void {
    this.contentEl.innerHTML = '';
    const el = document.createElement('div');
    Object.assign(el.style, styles.emptyState);
    el.textContent = text;
    this.contentEl.appendChild(el);
  }

  private renderContent(): void {
    this.contentEl.innerHTML = '';

    if (this.unavailable) {
      // No list and no save: the adapter cannot reach the user's templates.
      this.renderMessage(this.unavailable);
      return;
    }

    if (this.notice) {
      const noticeEl = document.createElement('div');
      noticeEl.setAttribute('role', 'status');
      Object.assign(noticeEl.style, modalStyles.notice);
      noticeEl.textContent = this.notice;
      this.contentEl.appendChild(noticeEl);
    }

    if (this.names.length === 0) {
      const emptyEl = document.createElement('div');
      Object.assign(emptyEl.style, styles.emptyState);
      emptyEl.textContent = 'No saved indicator templates';
      this.contentEl.appendChild(emptyEl);
    } else {
      for (const name of this.names) this.contentEl.appendChild(this.createListItem(name));
    }

    this.contentEl.appendChild(this.createSaveRow());
  }

  private createSaveRow(): HTMLFormElement {
    const form = document.createElement('form');
    Object.assign(form.style, modalStyles.saveRow);

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Save current indicators as...';
    input.setAttribute('aria-label', 'Template name');
    input.value = this.draftName;
    input.disabled = this.busy;
    Object.assign(input.style, modalStyles.input);
    input.addEventListener('input', () => {
      this.draftName = input.value;
    });
    form.appendChild(input);

    const button = document.createElement('button');
    button.type = 'submit';
    button.textContent = 'Save';
    button.disabled = this.busy;
    Object.assign(button.style, modalStyles.saveButton);
    form.appendChild(button);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.save(input.value.trim());
    });
    return form;
  }

  private save(name: string): void {
    if (!name || this.busy) return;
    if (this.names.includes(name) && !confirm(`Replace indicator template "${name}"?`)) return;
    this.runAction(
      () => this.callbacks.save(name),
      () => {
        this.draftName = '';
        this.notice = `Saved "${name}".`;
        this.load();
      },
      'Failed to save the template.',
    );
  }

  private apply(name: string): void {
    if (this.busy) return;
    this.runAction(
      () => this.callbacks.apply(name),
      (outcome) => {
        const notice = describeApplyOutcome(outcome);
        if (!notice) {
          this.close();
          return;
        }
        this.notice = `Applied "${name}". ${notice}`;
        this.renderContent();
      },
      'Failed to apply the template.',
    );
  }

  private remove(name: string): void {
    if (this.busy || !confirm(`Delete indicator template "${name}"?`)) return;
    this.runAction(
      () => this.callbacks.remove(name),
      () => {
        this.notice = null;
        this.load();
      },
      'Failed to delete the template.',
    );
  }

  private runAction<T>(action: () => Promise<T>, onDone: (value: T) => void, failure: string): void {
    this.busy = true;
    this.renderContent();
    action()
      .then((value) => {
        this.busy = false;
        if (this.isOpen()) onDone(value);
      })
      .catch((error: unknown) => {
        this.busy = false;
        if (!this.isOpen()) return;
        this.notice = errorMessage(error, failure);
        this.renderContent();
      });
  }

  private createListItem(name: string): HTMLDivElement {
    const item = document.createElement('div');
    item.setAttribute('role', 'button');
    item.title = `Apply "${name}" (replaces this chart's indicators)`;
    Object.assign(item.style, styles.listItem);

    const nameEl = document.createElement('span');
    Object.assign(nameEl.style, styles.listItemName);
    nameEl.textContent = name;
    item.appendChild(nameEl);

    const actionsEl = document.createElement('div');
    Object.assign(actionsEl.style, styles.listItemActions);
    const deleteBtn = document.createElement('button');
    Object.assign(deleteBtn.style, styles.iconButton);
    deleteBtn.title = 'Delete';
    deleteBtn.setAttribute('aria-label', `Delete ${name}`);
    deleteBtn.textContent = '✕';
    deleteBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      this.remove(name);
    });
    actionsEl.appendChild(deleteBtn);
    item.appendChild(actionsEl);

    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = 'var(--tc-hover-bg, rgba(255, 255, 255, 0.05))';
      actionsEl.style.opacity = '1';
    });
    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'transparent';
      actionsEl.style.opacity = '0';
    });
    item.addEventListener('click', () => this.apply(name));
    return item;
  }
}

// ============================================================================
// Button + Modal
// ============================================================================

export class IndicatorTemplateSelector {
  private buttonEl: HTMLButtonElement;
  private modal: IndicatorTemplateModal;

  constructor(callbacks: IndicatorTemplateCallbacks) {
    // Icon-only so it costs one small slot beside "Indicators" on narrow charts.
    this.buttonEl = document.createElement('button');
    this.buttonEl.title = 'Indicator templates';
    this.buttonEl.setAttribute('aria-label', 'Indicator templates');
    this.buttonEl.setAttribute('aria-haspopup', 'dialog');
    Object.assign(this.buttonEl.style, styles.button, { padding: '4px 4px', marginLeft: '-4px' });
    const icon = renderDrawingIcon('chevronDown', { size: 14 });
    if (icon) this.buttonEl.appendChild(icon);

    this.buttonEl.addEventListener('mouseenter', () => {
      this.buttonEl.style.backgroundColor = 'var(--tc-hover-bg, rgba(255, 255, 255, 0.05))';
      this.buttonEl.style.color = 'var(--tc-text, #d1d4dc)';
    });
    this.buttonEl.addEventListener('mouseleave', () => {
      this.buttonEl.style.backgroundColor = 'transparent';
      this.buttonEl.style.color = 'var(--tc-text2, #787b86)';
    });

    this.modal = new IndicatorTemplateModal(callbacks);
    this.buttonEl.addEventListener('click', (event) => {
      event.stopPropagation();
      this.modal.toggle();
    });
  }

  /** Mount the modal overlay inside the chart root. */
  mount(container: HTMLElement): void {
    this.modal.mount(container);
  }

  setOverlayHost(factory?: WebOverlayHostFactory): void {
    this.modal.setOverlayHost(factory);
  }

  getElement(): HTMLButtonElement {
    return this.buttonEl;
  }

  open(): void {
    this.modal.open();
  }

  close(): void {
    this.modal.close();
  }

  dispose(): void {
    this.modal.close();
    this.buttonEl.remove();
    this.modal.unmount();
  }
}
