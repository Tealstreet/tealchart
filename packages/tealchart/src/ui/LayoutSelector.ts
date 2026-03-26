/**
 * LayoutSelector - Dropdown for managing saved chart layouts
 *
 * Shows current layout name, dropdown with saved layouts,
 * and actions: Save, Save As, Rename, Delete.
 * Built with vanilla DOM (same pattern as other UI components).
 */

import type { LayoutMetadata } from '../transformer/saveLoadIntegration';

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

const styles = {
  wrapper: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: '0',
  } as Partial<CSSStyleDeclaration>,

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

  buttonHover: {
    backgroundColor: 'var(--hover-bg, rgba(255, 255, 255, 0.05))',
    color: 'var(--text, #d1d4dc)',
  } as Partial<CSSStyleDeclaration>,

  buttonActive: {
    backgroundColor: 'var(--accent-bg, rgba(41, 98, 255, 0.2))',
    color: 'var(--accent, #2962ff)',
  } as Partial<CSSStyleDeclaration>,

  chevron: {
    fontSize: '8px',
    marginLeft: '2px',
    transition: 'transform 0.15s',
  } as Partial<CSSStyleDeclaration>,

  dropdown: {
    position: 'absolute',
    top: '100%',
    left: '0',
    marginTop: '4px',
    minWidth: '220px',
    maxWidth: '300px',
    maxHeight: '320px',
    backgroundColor: 'var(--modal-bg, #1e222d)',
    border: '1px solid var(--border, #363a45)',
    borderRadius: '6px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
    zIndex: '10000',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  } as Partial<CSSStyleDeclaration>,

  listContainer: {
    flex: '1',
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '4px 0',
    minHeight: '0',
  } as Partial<CSSStyleDeclaration>,

  listItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '12px',
    color: 'var(--text, #d1d4dc)',
    transition: 'background-color 0.1s',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } as Partial<CSSStyleDeclaration>,

  listItemHover: {
    backgroundColor: 'var(--hover-bg, rgba(255, 255, 255, 0.05))',
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
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '3px',
    transition: 'color 0.1s, background-color 0.1s',
  } as Partial<CSSStyleDeclaration>,

  separator: {
    height: '1px',
    backgroundColor: 'var(--border, #363a45)',
    margin: '4px 0',
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
    fontSize: '12px',
    color: 'var(--text2, #787b86)',
    transition: 'background-color 0.1s, color 0.1s',
    whiteSpace: 'nowrap',
    border: 'none',
    background: 'transparent',
    width: '100%',
    textAlign: 'left',
  } as Partial<CSSStyleDeclaration>,

  actionItemHover: {
    backgroundColor: 'var(--hover-bg, rgba(255, 255, 255, 0.05))',
    color: 'var(--text, #d1d4dc)',
  } as Partial<CSSStyleDeclaration>,

  emptyState: {
    padding: '16px 12px',
    fontSize: '12px',
    color: 'var(--text2, #787b86)',
    textAlign: 'center',
  } as Partial<CSSStyleDeclaration>,

  loadingState: {
    padding: '16px 12px',
    fontSize: '12px',
    color: 'var(--text2, #787b86)',
    textAlign: 'center',
  } as Partial<CSSStyleDeclaration>,

  deleteText: {
    color: '#f44336',
  } as Partial<CSSStyleDeclaration>,
};

// ============================================================================
// LayoutSelector Class
// ============================================================================

export class LayoutSelector {
  private wrapperEl: HTMLDivElement;
  private buttonEl: HTMLButtonElement;
  private buttonLabelEl: HTMLSpanElement;
  private dropdownEl: HTMLDivElement | null = null;
  private isOpen = false;
  private callbacks: LayoutSelectorCallbacks;
  private currentLayoutId: string | number | null = null;
  private currentLayoutName: string | null = null;
  private layouts: LayoutMetadata[] = [];
  private isLoading = false;

  // Bound handlers for cleanup
  private boundOnClickOutside: (e: MouseEvent) => void;
  private boundOnKeyDown: (e: KeyboardEvent) => void;

  constructor(callbacks: LayoutSelectorCallbacks) {
    this.callbacks = callbacks;

    // Bind handlers
    this.boundOnClickOutside = this.onClickOutside.bind(this);
    this.boundOnKeyDown = this.onKeyDown.bind(this);

    // Create wrapper
    this.wrapperEl = document.createElement('div');
    Object.assign(this.wrapperEl.style, styles.wrapper);

    // Create button
    this.buttonEl = document.createElement('button');
    Object.assign(this.buttonEl.style, styles.button);

    this.buttonLabelEl = document.createElement('span');
    this.buttonLabelEl.style.overflow = 'hidden';
    this.buttonLabelEl.style.textOverflow = 'ellipsis';
    this.buttonLabelEl.textContent = 'Default';
    this.buttonEl.appendChild(this.buttonLabelEl);

    const chevron = document.createElement('span');
    Object.assign(chevron.style, styles.chevron);
    chevron.textContent = '\u25BE'; // small down triangle
    this.buttonEl.appendChild(chevron);

    this.buttonEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });
    this.buttonEl.addEventListener('mouseenter', () => {
      if (!this.isOpen) {
        Object.assign(this.buttonEl.style, styles.buttonHover);
      }
    });
    this.buttonEl.addEventListener('mouseleave', () => {
      if (!this.isOpen) {
        this.buttonEl.style.backgroundColor = 'transparent';
        this.buttonEl.style.color = 'var(--text2, #787b86)';
      }
    });

    this.wrapperEl.appendChild(this.buttonEl);
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Get the root DOM element to insert into the top bar
   */
  getElement(): HTMLDivElement {
    return this.wrapperEl;
  }

  /**
   * Set the current layout (updates button label + highlight)
   */
  setCurrentLayout(layoutId: string | number | null, layoutName: string | null): void {
    this.currentLayoutId = layoutId;
    this.currentLayoutName = layoutName;
    this.buttonLabelEl.textContent = layoutName || 'Default';
  }

  /**
   * Toggle the dropdown open/closed
   */
  toggle(): void {
    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  /**
   * Clean up event listeners
   */
  dispose(): void {
    this.closeDropdown();
    this.wrapperEl.remove();
  }

  // ============================================================================
  // Dropdown Lifecycle
  // ============================================================================

  private async openDropdown(): Promise<void> {
    if (this.isOpen) return;
    this.isOpen = true;

    // Style the button as active
    Object.assign(this.buttonEl.style, styles.buttonActive);

    // Create dropdown
    this.dropdownEl = document.createElement('div');
    Object.assign(this.dropdownEl.style, styles.dropdown);

    // Prevent click inside dropdown from closing it
    this.dropdownEl.addEventListener('click', (e) => e.stopPropagation());

    this.wrapperEl.appendChild(this.dropdownEl);

    // Show loading state
    this.renderLoading();

    // Add global listeners
    document.addEventListener('click', this.boundOnClickOutside, true);
    document.addEventListener('keydown', this.boundOnKeyDown);

    // Fetch layouts
    try {
      this.isLoading = true;
      this.layouts = await this.callbacks.getAllLayouts();
      this.isLoading = false;
      this.renderDropdownContent();
    } catch (err) {
      this.isLoading = false;
      console.warn('[LayoutSelector] Failed to fetch layouts:', err);
      this.renderDropdownContent();
    }
  }

  private closeDropdown(): void {
    if (!this.isOpen) return;
    this.isOpen = false;

    // Reset button style
    this.buttonEl.style.backgroundColor = 'transparent';
    this.buttonEl.style.color = 'var(--text2, #787b86)';

    // Remove dropdown
    if (this.dropdownEl) {
      this.dropdownEl.remove();
      this.dropdownEl = null;
    }

    // Remove global listeners
    document.removeEventListener('click', this.boundOnClickOutside, true);
    document.removeEventListener('keydown', this.boundOnKeyDown);
  }

  // ============================================================================
  // Rendering
  // ============================================================================

  private renderLoading(): void {
    if (!this.dropdownEl) return;
    this.dropdownEl.innerHTML = '';
    const loadingEl = document.createElement('div');
    Object.assign(loadingEl.style, styles.loadingState);
    loadingEl.textContent = 'Loading...';
    this.dropdownEl.appendChild(loadingEl);
  }

  private renderDropdownContent(): void {
    if (!this.dropdownEl) return;
    this.dropdownEl.innerHTML = '';

    // Layout list
    const listContainer = document.createElement('div');
    Object.assign(listContainer.style, styles.listContainer);

    // Filter to tealchart layouts only
    const tealchartLayouts = this.layouts.filter((l) => l.isTealchart);

    if (tealchartLayouts.length === 0) {
      const emptyEl = document.createElement('div');
      Object.assign(emptyEl.style, styles.emptyState);
      emptyEl.textContent = 'No saved layouts';
      listContainer.appendChild(emptyEl);
    } else {
      for (const layout of tealchartLayouts) {
        listContainer.appendChild(this.createListItem(layout));
      }
    }

    this.dropdownEl.appendChild(listContainer);

    // Actions section
    const actionsContainer = document.createElement('div');
    Object.assign(actionsContainer.style, styles.actionsContainer);

    // "Save" action — only if a layout is currently loaded
    if (this.currentLayoutId) {
      actionsContainer.appendChild(
        this.createActionItem('Save', '\uD83D\uDCBE', () => {
          this.callbacks.onSave();
          this.closeDropdown();
        }),
      );
    }

    // "Save As..." action
    actionsContainer.appendChild(
      this.createActionItem('Save As...', '\u2795', () => {
        this.closeDropdown();
        const name = prompt('Layout name:');
        if (name && name.trim()) {
          this.callbacks.onSaveAs(name.trim());
        }
      }),
    );

    this.dropdownEl.appendChild(actionsContainer);
  }

  private createListItem(layout: LayoutMetadata): HTMLDivElement {
    const isActive = layout.id === this.currentLayoutId;
    const item = document.createElement('div');
    Object.assign(item.style, styles.listItem);
    if (isActive) {
      Object.assign(item.style, styles.listItemActive);
    }

    // Name
    const nameEl = document.createElement('span');
    Object.assign(nameEl.style, styles.listItemName);
    nameEl.textContent = layout.name;
    item.appendChild(nameEl);

    // Actions (rename, delete) — visible on hover
    const actionsEl = document.createElement('div');
    Object.assign(actionsEl.style, styles.listItemActions);

    // Rename button
    const renameBtn = document.createElement('button');
    Object.assign(renameBtn.style, styles.iconButton);
    renameBtn.title = 'Rename';
    renameBtn.textContent = '\u270E'; // pencil
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const newName = prompt('Rename layout:', layout.name);
      if (newName && newName.trim() && newName.trim() !== layout.name) {
        this.callbacks.onRename(layout.id, newName.trim());
        this.closeDropdown();
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
    Object.assign(deleteBtn.style, styles.iconButton);
    deleteBtn.title = 'Delete';
    deleteBtn.textContent = '\u2715'; // x mark
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Delete layout "${layout.name}"?`)) {
        this.callbacks.onDelete(layout.id);
        this.closeDropdown();
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
      if (!isActive) {
        Object.assign(item.style, styles.listItemHover);
      }
      actionsEl.style.opacity = '1';
    });
    item.addEventListener('mouseleave', () => {
      if (!isActive) {
        item.style.backgroundColor = 'transparent';
      } else {
        Object.assign(item.style, styles.listItemActive);
      }
      actionsEl.style.opacity = '0';
    });

    // Click to load
    item.addEventListener('click', () => {
      this.callbacks.onLoad(layout.id);
      this.closeDropdown();
    });

    return item;
  }

  private createActionItem(label: string, icon: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    Object.assign(btn.style, styles.actionItem);

    const iconEl = document.createElement('span');
    iconEl.textContent = icon;
    iconEl.style.fontSize = '12px';
    btn.appendChild(iconEl);

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    btn.appendChild(labelEl);

    btn.addEventListener('click', onClick);
    btn.addEventListener('mouseenter', () => {
      Object.assign(btn.style, styles.actionItemHover);
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.backgroundColor = 'transparent';
      btn.style.color = 'var(--text2, #787b86)';
    });

    return btn;
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  private onClickOutside(e: MouseEvent): void {
    if (!this.wrapperEl.contains(e.target as Node)) {
      this.closeDropdown();
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.closeDropdown();
    }
  }
}
