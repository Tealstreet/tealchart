/**
 * Modal - Base class for modal dialogs
 *
 * Provides overlay, close button, escape key handling,
 * and click-outside-to-close functionality.
 */

import { Component, type ComponentOptions } from './Component';

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
  /** Called when modal is closed */
  onClose?: () => void;
}

export interface ModalState {
  isOpen: boolean;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  overlay: {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '10000',
  } as Partial<CSSStyleDeclaration>,

  modal: {
    backgroundColor: 'var(--modal-bg, #1e222d)',
    borderRadius: '8px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
    maxWidth: '90vw',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  } as Partial<CSSStyleDeclaration>,

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border, #363a45)',
    flexShrink: '0',
  } as Partial<CSSStyleDeclaration>,

  title: {
    margin: '0',
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text, #d1d4dc)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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

  content: {
    flex: '1',
    overflow: 'auto',
    padding: '16px 20px',
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
  protected contentEl: HTMLElement;
  protected boundKeyDown: (e: KeyboardEvent) => void;

  constructor(options: ModalOptions = {}) {
    super('div', { isOpen: false });

    this.options = {
      showCloseButton: true,
      closeOnOverlayClick: true,
      closeOnEscape: true,
      width: 400,
      ...options,
    };

    // Setup overlay
    this.overlay = this.el;
    Object.assign(this.overlay.style, styles.overlay);
    this.overlay.style.display = 'none';

    // Create modal container
    this.modalEl = this.createElement('div', { style: styles.modal });
    if (typeof this.options.width === 'number') {
      this.modalEl.style.width = `${this.options.width}px`;
    } else if (this.options.width) {
      this.modalEl.style.width = this.options.width;
    }
    if (this.options.maxHeight) {
      this.modalEl.style.maxHeight = typeof this.options.maxHeight === 'number'
        ? `${this.options.maxHeight}px`
        : this.options.maxHeight;
    }
    this.overlay.appendChild(this.modalEl);

    // Create header
    this.headerEl = this.createElement('div', { style: styles.header });
    this.modalEl.appendChild(this.headerEl);

    // Create title
    if (this.options.title) {
      const title = this.createElement('h2', {
        style: styles.title,
        textContent: this.options.title,
      });
      this.headerEl.appendChild(title);
    }

    // Create close button
    if (this.options.showCloseButton) {
      const closeBtn = this.createElement('button', {
        style: styles.closeButton,
        innerHTML: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>`,
        onClick: () => this.close(),
        onMouseEnter: (e) => {
          (e.target as HTMLElement).style.backgroundColor = 'var(--hover-bg, rgba(255, 255, 255, 0.05))';
          (e.target as HTMLElement).style.color = 'var(--text, #d1d4dc)';
        },
        onMouseLeave: (e) => {
          (e.target as HTMLElement).style.backgroundColor = 'transparent';
          (e.target as HTMLElement).style.color = 'var(--text2, #787b86)';
        },
      });
      this.headerEl.appendChild(closeBtn);
    }

    // Create content area
    this.contentEl = this.createElement('div', { style: styles.content });
    this.modalEl.appendChild(this.contentEl);

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
    const titleEl = this.headerEl.querySelector('h2');
    if (titleEl) {
      titleEl.textContent = title;
    }
  }

  /**
   * Get the content container element
   */
  getContentElement(): HTMLElement {
    return this.contentEl;
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

  protected render(): void {
    // Override in subclasses to render content
  }

  protected onUnmount(): void {
    document.removeEventListener('keydown', this.boundKeyDown);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.close();
    }
  }
}
