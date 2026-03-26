/**
 * LayoutSelector - Button + Modal for managing saved chart layouts
 *
 * Button sits in the top bar showing current layout name.
 * Click opens a Modal (using our standardized Modal base class) with:
 * - List of saved layouts
 * - Save / Save As actions
 * - Per-layout rename / delete on hover
 */

import type { LayoutMetadata } from '../transformer/saveLoadIntegration';

import { Modal } from './Modal';

// ============================================================================
// Types
// ============================================================================

export interface LayoutSelectorCallbacks {
  /** Fetch all saved layouts */
  getAllLayouts: () => Promise<LayoutMetadata[]>;
  /** Save current layout (update existing) */
  onSave: () => void;
  /** Save as a new layout (prompts for name) */
  onSaveAs: (name: string) => void;
  /** Load a layout by ID */
  onLoad: (id: string | number) => void;
  /** Delete a layout by ID */
  onDelete: (id: string | number) => void;
  /** Rename a layout */
  onRename: (id: string | number, newName: string) => void;
}

// ============================================================================
// Styles
// ============================================================================

const selectorStyles = {
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: 'var(--text2, #787b86)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'background-color 0.15s, color 0.15s',
    whiteSpace: 'nowrap',
    maxWidth: '160px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } as Partial<CSSStyleDeclaration>,

  listItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '13px',
    color: 'var(--text, #d1d4dc)',
    transition: 'background-color 0.1s',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } as Partial<CSSStyleDeclaration>,

  listItemActive: {
    backgroundColor: 'var(--accent-bg, rgba(41, 98, 255, 0.15))',
    color: 'var(--accent, #2962ff)',
  } as Partial<CSSStyleDeclaration>,

  listItemName: {
    flex: '1',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as Partial<CSSStyleDeclaration>,

  listItemActions: {
    display: 'flex',
    gap: '4px',
    marginLeft: '8px',
    flexShrink: '0',
    opacity: '0',
    transition: 'opacity 0.1s',
  } as Partial<CSSStyleDeclaration>,

  iconButton: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text2, #787b86)',
    cursor: 'pointer',
    padding: '2px 4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '3px',
    fontSize: '12px',
    transition: 'color 0.1s, background-color 0.1s',
  } as Partial<CSSStyleDeclaration>,

  actionsContainer: {
    padding: '4px 0',
    borderTop: '1px solid var(--border, #363a45)',
  } as Partial<CSSStyleDeclaration>,

  actionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '13px',
    color: 'var(--text2, #787b86)',
    transition: 'background-color 0.1s, color 0.1s',
    whiteSpace: 'nowrap',
    border: 'none',
    background: 'transparent',
    width: '100%',
    textAlign: 'left',
  } as Partial<CSSStyleDeclaration>,

  emptyState: {
    padding: '20px 12px',
    fontSize: '12px',
    color: 'var(--text2, #787b86)',
    textAlign: 'center',
  } as Partial<CSSStyleDeclaration>,
};

// ============================================================================
// LayoutModal - extends Modal base class
// ============================================================================

class LayoutModal extends Modal {
  private callbacks: LayoutSelectorCallbacks;
  private currentLayoutId: string | number | null = null;
  private layouts: LayoutMetadata[] = [];

  constructor(callbacks: LayoutSelectorCallbacks) {
    super({
      title: 'Layouts',
      width: 320,
      maxHeight: 'min(80vh, calc(100% - 40px))',
      position: 'absolute',
    });
    this.callbacks = callbacks;
  }

  setCurrentLayoutId(id: string | number | null): void {
    this.currentLayoutId = id;
  }

  protected onOpen(): void {
    this.contentEl.innerHTML = '';
    const loadingEl = document.createElement('div');
    Object.assign(loadingEl.style, selectorStyles.emptyState);
    loadingEl.textContent = 'Loading...';
    this.contentEl.appendChild(loadingEl);
    this.contentEl.style.padding = '0';

    // Fetch layouts
    this.callbacks
      .getAllLayouts()
      .then((layouts) => {
        this.layouts = layouts;
        this.renderContent();
      })
      .catch(() => {
        this.layouts = [];
        this.renderContent();
      });
  }

  private renderContent(): void {
    this.contentEl.innerHTML = '';

    // Layout list — show all layouts (TV and tealchart are compatible)
    const allLayouts = this.layouts;

    if (allLayouts.length === 0) {
      const emptyEl = document.createElement('div');
      Object.assign(emptyEl.style, selectorStyles.emptyState);
      emptyEl.textContent = 'No saved layouts';
      this.contentEl.appendChild(emptyEl);
    } else {
      for (const layout of allLayouts) {
        this.contentEl.appendChild(this.createListItem(layout));
      }
    }

    // Actions section
    const actionsContainer = document.createElement('div');
    Object.assign(actionsContainer.style, selectorStyles.actionsContainer);

    // Save — only if a layout is loaded
    if (this.currentLayoutId) {
      actionsContainer.appendChild(
        this.createActionItem('Save', () => {
          this.callbacks.onSave();
          this.close();
        }),
      );
    }

    // Save As
    actionsContainer.appendChild(
      this.createActionItem('Save As...', () => {
        this.close();
        const name = prompt('Layout name:');
        if (name && name.trim()) {
          this.callbacks.onSaveAs(name.trim());
        }
      }),
    );

    this.contentEl.appendChild(actionsContainer);
  }

  private createListItem(layout: LayoutMetadata): HTMLDivElement {
    const isActive = layout.id === this.currentLayoutId;
    const item = document.createElement('div');
    Object.assign(item.style, selectorStyles.listItem);
    if (isActive) {
      Object.assign(item.style, selectorStyles.listItemActive);
    }

    // Name
    const nameEl = document.createElement('span');
    Object.assign(nameEl.style, selectorStyles.listItemName);
    nameEl.textContent = layout.name;
    item.appendChild(nameEl);

    // Actions (rename, delete) — visible on hover
    const actionsEl = document.createElement('div');
    Object.assign(actionsEl.style, selectorStyles.listItemActions);

    // Rename button
    const renameBtn = document.createElement('button');
    Object.assign(renameBtn.style, selectorStyles.iconButton);
    renameBtn.title = 'Rename';
    renameBtn.textContent = '\u270E';
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const newName = prompt('Rename layout:', layout.name);
      if (newName && newName.trim() && newName.trim() !== layout.name) {
        this.callbacks.onRename(layout.id, newName.trim());
        this.close();
      }
    });
    renameBtn.addEventListener('mouseenter', () => {
      renameBtn.style.color = 'var(--text, #d1d4dc)';
      renameBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    });
    renameBtn.addEventListener('mouseleave', () => {
      renameBtn.style.color = 'var(--text2, #787b86)';
      renameBtn.style.backgroundColor = 'transparent';
    });
    actionsEl.appendChild(renameBtn);

    // Delete button
    const deleteBtn = document.createElement('button');
    Object.assign(deleteBtn.style, selectorStyles.iconButton);
    deleteBtn.title = 'Delete';
    deleteBtn.textContent = '\u2715';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Delete layout "${layout.name}"?`)) {
        this.callbacks.onDelete(layout.id);
        this.close();
      }
    });
    deleteBtn.addEventListener('mouseenter', () => {
      deleteBtn.style.color = '#f44336';
      deleteBtn.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
    });
    deleteBtn.addEventListener('mouseleave', () => {
      deleteBtn.style.color = 'var(--text2, #787b86)';
      deleteBtn.style.backgroundColor = 'transparent';
    });
    actionsEl.appendChild(deleteBtn);

    item.appendChild(actionsEl);

    // Hover: show actions
    item.addEventListener('mouseenter', () => {
      if (!isActive) item.style.backgroundColor = 'var(--hover-bg, rgba(255, 255, 255, 0.05))';
      actionsEl.style.opacity = '1';
    });
    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = isActive ? 'var(--accent-bg, rgba(41, 98, 255, 0.15))' : 'transparent';
      actionsEl.style.opacity = '0';
    });

    // Click to load
    item.addEventListener('click', () => {
      this.callbacks.onLoad(layout.id);
      this.close();
    });

    return item;
  }

  private createActionItem(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    Object.assign(btn.style, selectorStyles.actionItem);
    btn.textContent = label;

    btn.addEventListener('click', onClick);
    btn.addEventListener('mouseenter', () => {
      btn.style.backgroundColor = 'var(--hover-bg, rgba(255, 255, 255, 0.05))';
      btn.style.color = 'var(--text, #d1d4dc)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.backgroundColor = 'transparent';
      btn.style.color = 'var(--text2, #787b86)';
    });

    return btn;
  }
}

// ============================================================================
// LayoutSelector - Button + Modal
// ============================================================================

export class LayoutSelector {
  private buttonEl: HTMLButtonElement;
  private buttonLabelEl: HTMLSpanElement;
  private modal: LayoutModal;
  private currentLayoutId: string | number | null = null;

  constructor(callbacks: LayoutSelectorCallbacks) {
    // Create button
    this.buttonEl = document.createElement('button');
    Object.assign(this.buttonEl.style, selectorStyles.button);

    this.buttonLabelEl = document.createElement('span');
    this.buttonLabelEl.style.overflow = 'hidden';
    this.buttonLabelEl.style.textOverflow = 'ellipsis';
    this.buttonLabelEl.textContent = 'Default';
    this.buttonEl.appendChild(this.buttonLabelEl);

    const chevron = document.createElement('span');
    chevron.style.fontSize = '8px';
    chevron.style.marginLeft = '2px';
    chevron.textContent = '\u25BE';
    this.buttonEl.appendChild(chevron);

    this.buttonEl.addEventListener('mouseenter', () => {
      this.buttonEl.style.backgroundColor = 'var(--hover-bg, rgba(255, 255, 255, 0.05))';
      this.buttonEl.style.color = 'var(--text, #d1d4dc)';
    });
    this.buttonEl.addEventListener('mouseleave', () => {
      this.buttonEl.style.backgroundColor = 'transparent';
      this.buttonEl.style.color = 'var(--text2, #787b86)';
    });

    // Create modal
    this.modal = new LayoutModal(callbacks);

    // Button opens modal
    this.buttonEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.modal.toggle();
    });
  }

  /**
   * Mount the modal overlay to a container element (e.g., chart root).
   * Call this after construction so the modal renders inside the chart.
   */
  mount(container: HTMLElement): void {
    this.modal.mount(container);
  }

  getElement(): HTMLButtonElement {
    return this.buttonEl;
  }

  setCurrentLayout(layoutId: string | number | null, layoutName: string | null): void {
    this.currentLayoutId = layoutId;
    this.buttonLabelEl.textContent = layoutName || 'Unsaved';
    this.modal.setCurrentLayoutId(layoutId);
  }

  dispose(): void {
    this.modal.close();
    this.buttonEl.remove();
    this.modal.unmount();
  }
}
