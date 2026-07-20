import type { ComponentOptions } from './Component';

import { Component } from './Component';

/**
 * Modal - Base class for modal dialogs
 *
 * Provides overlay, close button, escape key handling,
 * click-outside-to-close functionality, optional tabs, and optional footer.
 *
 * Defaults to position:absolute (chart-contained). Pass position:'fixed'
 * for viewport-level modals.
 */

// ============================================================================
// Types
// ============================================================================

export interface ModalOptions extends ComponentOptions {
  /** Modal title */
  title?: string;
  /** Show close button */
  showCloseButton?: boolean;
  /** Close on overlay click */
  closeOnOverlayClick?: boolean;
  /** Close on escape key */
  closeOnEscape?: boolean;
  /** Modal width */
  width?: number | string;
  /** Modal max height */
  maxHeight?: number | string;
  /** Position mode: 'absolute' (chart-contained, default) or 'fixed' (viewport) */
  position?: 'absolute' | 'fixed';
  /** Overlay alignment: 'center' (default) or 'top' (with paddingTop) */
  align?: 'center' | 'top';
  /** Padding top when align is 'top' */
  paddingTop?: string;
  /** Background color override for the modal container */
  modalBackground?: string;
  /** Border radius override */
  borderRadius?: string;
  /** Border override */
  border?: string;
  /** Font family override */
  fontFamily?: string;
  /** Tab definitions - if provided, renders a tab bar below the header */
  tabs?: ModalTab[];
  /** Show footer with Cancel/Apply buttons */
  showFooter?: boolean;
  /** Footer button labels */
  footerLabels?: {
    cancel?: string;
    apply?: string;
  };
  /** Called when modal is closed */
  onClose?: () => void;
  /** Called when Apply is clicked */
  onApply?: () => void;
}

export interface ModalTab {
  id: string;
  label: string;
}

export interface ModalState {
  isOpen: boolean;
  activeTab?: string;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  overlay: {
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    zIndex: '10000',
  } as Partial<CSSStyleDeclaration>,

  modal: {
    backgroundColor: 'var(--modal-bg, #1e222d)',
    borderRadius: '8px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  } as Partial<CSSStyleDeclaration>,

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border, #363a45)',
    flexShrink: '0',
  } as Partial<CSSStyleDeclaration>,

  title: {
    margin: '0',
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text, #d1d4dc)',
    fontFamily: 'inherit',
  } as Partial<CSSStyleDeclaration>,

  closeButton: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text2, #787b86)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    transition: 'background-color 0.15s, color 0.15s',
  } as Partial<CSSStyleDeclaration>,

  tabs: {
    display: 'flex',
    borderBottom: '1px solid var(--border, #363a45)',
    flexShrink: '0',
  } as Partial<CSSStyleDeclaration>,

  tab: {
    padding: '10px 20px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--text2, #787b86)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as Partial<CSSStyleDeclaration>,

  tabActive: {
    color: 'var(--text, #d1d4dc)',
    borderBottomColor: 'var(--text, #d1d4dc)',
  } as Partial<CSSStyleDeclaration>,

  content: {
    flex: '1',
    overflow: 'auto',
    minHeight: '0',
  } as Partial<CSSStyleDeclaration>,

  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '12px 16px',
    borderTop: '1px solid var(--border, #363a45)',
    flexShrink: '0',
  } as Partial<CSSStyleDeclaration>,

  footerButton: {
    padding: '8px 16px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    border: 'none',
    outline: 'none',
  } as Partial<CSSStyleDeclaration>,

  cancelButton: {
    backgroundColor: 'transparent',
    border: '1px solid var(--border, #363a45)',
    color: 'var(--text2, #787b86)',
  } as Partial<CSSStyleDeclaration>,

  applyButton: {
    backgroundColor: 'var(--buy-color, #0ECB81)',
    color: '#fff',
  } as Partial<CSSStyleDeclaration>,
};

// ============================================================================
// Modal Class
// ============================================================================

export class Modal extends Component<ModalState> {
  protected options: ModalOptions;
  protected overlay: HTMLElement;
  protected modalEl: HTMLElement;
  protected headerEl: HTMLElement;
  protected tabsEl: HTMLElement | null = null;
  protected contentEl: HTMLElement;
  protected footerEl: HTMLElement | null = null;
  protected titleEl: HTMLElement | null = null;
  protected boundKeyDown: (e: KeyboardEvent) => void;

  constructor(options: ModalOptions = {}) {
    const initialState: ModalState = {
      isOpen: false,
      activeTab: options.tabs?.[0]?.id,
    };
    super('div', initialState);

    this.options = {
      showCloseButton: true,
      closeOnOverlayClick: true,
      closeOnEscape: true,
      position: 'absolute',
      align: 'center',
      ...options,
    };

    // Setup overlay
    this.overlay = this.el;
    Object.assign(this.overlay.style, styles.overlay);
    this.overlay.style.position = this.options.position!;

    if (this.options.align === 'center') {
      this.overlay.style.alignItems = 'center';
      this.overlay.style.justifyContent = 'center';
    } else {
      this.overlay.style.alignItems = 'flex-start';
      this.overlay.style.justifyContent = 'center';
      this.overlay.style.paddingTop = this.options.paddingTop || '40px';
    }

    this.overlay.style.display = 'none';

    // Create modal container
    this.modalEl = this.createElement('div', { style: styles.modal });

    if (typeof this.options.width === 'number') {
      this.modalEl.style.width = `${this.options.width}px`;
    } else if (this.options.width) {
      this.modalEl.style.width = this.options.width;
    }

    if (this.options.maxHeight) {
      this.modalEl.style.maxHeight =
        typeof this.options.maxHeight === 'number' ? `${this.options.maxHeight}px` : this.options.maxHeight;
    }

    if (this.options.modalBackground) {
      this.modalEl.style.backgroundColor = this.options.modalBackground;
    }
    if (this.options.borderRadius) {
      this.modalEl.style.borderRadius = this.options.borderRadius;
    }
    if (this.options.border) {
      this.modalEl.style.border = this.options.border;
    }
    if (this.options.fontFamily) {
      this.modalEl.style.fontFamily = this.options.fontFamily;
    }

    // Prevent clicks on modal container from closing via overlay
    this.modalEl.addEventListener('click', (e) => e.stopPropagation());
    this.overlay.appendChild(this.modalEl);

    // Create header
    this.headerEl = this.createElement('div', { style: styles.header });
    this.modalEl.appendChild(this.headerEl);

    // Create title
    if (this.options.title) {
      this.titleEl = this.createElement('h2', {
        style: styles.title,
        textContent: this.options.title,
      });
      this.headerEl.appendChild(this.titleEl);
    }

    // Create close button
    if (this.options.showCloseButton) {
      const closeBtn = this.createElement('button', {
        style: styles.closeButton,
        innerHTML: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>`,
        onClick: () => this.close(),
        onMouseEnter: (e) => {
          (e.currentTarget as HTMLElement).style.color = 'var(--text, #d1d4dc)';
        },
        onMouseLeave: (e) => {
          (e.currentTarget as HTMLElement).style.color = 'var(--text2, #787b86)';
        },
      });
      this.headerEl.appendChild(closeBtn);
    }

    // Create tabs (if provided)
    if (this.options.tabs && this.options.tabs.length > 0) {
      this.tabsEl = this.createElement('div', { style: styles.tabs });
      this.renderTabs();
      this.modalEl.appendChild(this.tabsEl);
    }

    // Create content area
    this.contentEl = this.createElement('div', { style: styles.content });
    this.modalEl.appendChild(this.contentEl);

    // Create footer (if requested)
    if (this.options.showFooter) {
      this.footerEl = this.createElement('div', { style: styles.footer });

      const cancelBtn = this.createElement('button', {
        style: { ...styles.footerButton, ...styles.cancelButton },
        textContent: this.options.footerLabels?.cancel || 'Cancel',
        onClick: () => this.close(),
      });
      this.footerEl.appendChild(cancelBtn);

      const applyBtn = this.createElement('button', {
        style: { ...styles.footerButton, ...styles.applyButton },
        textContent: this.options.footerLabels?.apply || 'Apply',
        onClick: () => this.handleApply(),
      });
      this.footerEl.appendChild(applyBtn);

      this.modalEl.appendChild(this.footerEl);
    }

    // Event handlers
    this.boundKeyDown = this.handleKeyDown.bind(this);

    // Overlay click
    if (this.options.closeOnOverlayClick) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.close();
        }
      });
    }
  }

  // ============================================================================
  // Tab Rendering
  // ============================================================================

  private renderTabs(): void {
    if (!this.tabsEl || !this.options.tabs) return;
    this.tabsEl.innerHTML = '';

    for (const tab of this.options.tabs) {
      const isActive = this.state.activeTab === tab.id;
      const tabBtn = this.createElement('button', {
        style: {
          ...styles.tab,
          ...(isActive ? styles.tabActive : {}),
        },
        textContent: tab.label,
        onClick: () => this.setActiveTab(tab.id),
      });
      this.tabsEl.appendChild(tabBtn);
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Open the modal
   */
  open(): void {
    if (this.state.isOpen) return;

    this.setState({ isOpen: true });
    this.overlay.style.display = 'flex';

    if (this.options.closeOnEscape) {
      document.addEventListener('keydown', this.boundKeyDown);
    }

    this.onOpen();
  }

  /**
   * Close the modal
   */
  close(): void {
    if (!this.state.isOpen) return;

    this.setState({ isOpen: false });
    this.overlay.style.display = 'none';

    if (this.options.closeOnEscape) {
      document.removeEventListener('keydown', this.boundKeyDown);
    }

    this.onClose();
    this.options.onClose?.();
  }

  /**
   * Toggle the modal
   */
  toggle(): void {
    if (this.state.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Check if modal is open
   */
  isOpen(): boolean {
    return this.state.isOpen;
  }

  /**
   * Set modal title
   */
  setTitle(title: string): void {
    if (this.titleEl) {
      this.titleEl.textContent = title;
    }
  }

  /**
   * Get the content container element
   */
  getContentElement(): HTMLElement {
    return this.contentEl;
  }

  /**
   * Set the active tab
   */
  setActiveTab(tabId: string): void {
    if (this.state.activeTab === tabId) return;
    this.setState({ activeTab: tabId });
    this.renderTabs();
    this.onTabChange(tabId);
  }

  /**
   * Get the active tab ID
   */
  getActiveTab(): string | undefined {
    return this.state.activeTab;
  }

  // ============================================================================
  // Protected Methods
  // ============================================================================

  /**
   * Called when modal opens - override to add custom behavior
   */
  protected onOpen(): void {
    // Override in subclasses
  }

  /**
   * Called when modal closes - override to add custom behavior
   */
  protected onClose(): void {
    // Override in subclasses
  }

  /**
   * Called when active tab changes - override to add custom behavior
   */
  protected onTabChange(_tabId: string): void {
    // Override in subclasses
  }

  /**
   * Called when Apply button is clicked - override in subclasses
   */
  protected handleApply(): void {
    this.options.onApply?.();
  }

  /**
   * Handle keydown - can be overridden by subclasses for custom escape behavior
   */
  protected handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.close();
    }
  }

  protected render(): void {
    // Override in subclasses to render content
  }

  protected onUnmount(): void {
    document.removeEventListener('keydown', this.boundKeyDown);
  }
}
