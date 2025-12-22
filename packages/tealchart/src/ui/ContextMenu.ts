/**
 * ContextMenu - Vanilla DOM context menu component
 *
 * Provides a floating menu that appears on right-click or long-press.
 * Supports nested submenus and dividers.
 */

import { div, span } from './dom';
import type { ContextMenuItem } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface ContextMenuOptions {
  /** Menu items */
  items: ContextMenuItem[];
  /** X position (screen coordinates) */
  x: number;
  /** Y position (screen coordinates) */
  y: number;
  /** Callback when menu is closed */
  onClose?: () => void;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  menu: {
    position: 'fixed',
    backgroundColor: '#1e222d',
    border: '1px solid #363a45',
    borderRadius: '4px',
    padding: '4px 0',
    minWidth: '160px',
    maxWidth: '280px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    zIndex: '10000',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '12px',
    userSelect: 'none',
  } as Partial<CSSStyleDeclaration>,

  menuItem: {
    padding: '8px 12px',
    color: '#d1d4dc',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'background-color 0.1s',
  } as Partial<CSSStyleDeclaration>,

  menuItemHover: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  } as Partial<CSSStyleDeclaration>,

  menuItemDisabled: {
    opacity: '0.5',
    cursor: 'default',
  } as Partial<CSSStyleDeclaration>,

  divider: {
    height: '1px',
    backgroundColor: '#363a45',
    margin: '4px 0',
  } as Partial<CSSStyleDeclaration>,

  icon: {
    width: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: '0',
  } as Partial<CSSStyleDeclaration>,

  label: {
    flex: '1',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } as Partial<CSSStyleDeclaration>,

  shortcut: {
    marginLeft: '16px',
    color: '#787b86',
    fontSize: '11px',
    flexShrink: '0',
  } as Partial<CSSStyleDeclaration>,

  submenuArrow: {
    marginLeft: 'auto',
    color: '#787b86',
    fontSize: '10px',
    flexShrink: '0',
  } as Partial<CSSStyleDeclaration>,
};

// ============================================================================
// ContextMenu Class
// ============================================================================

export class ContextMenu {
  private el: HTMLDivElement;
  private options: ContextMenuOptions;
  private closeHandler: ((e: MouseEvent) => void) | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(options: ContextMenuOptions) {
    this.options = options;
    this.el = this.createMenu();
    this.positionMenu();
    this.attachEventListeners();
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Close and destroy the menu
   */
  close(): void {
    this.detachEventListeners();
    this.el.remove();
    this.options.onClose?.();
  }

  /**
   * Get the menu element
   */
  getElement(): HTMLDivElement {
    return this.el;
  }

  // ============================================================================
  // Private: Create Menu
  // ============================================================================

  private createMenu(): HTMLDivElement {
    const menu = div({ style: styles.menu });

    for (const item of this.options.items) {
      if (item.text === '-' || item.text === 'divider') {
        menu.appendChild(div({ style: styles.divider }));
        continue;
      }

      const menuItem = this.createMenuItem(item);
      menu.appendChild(menuItem);
    }

    document.body.appendChild(menu);
    return menu;
  }

  private createMenuItem(item: ContextMenuItem): HTMLDivElement {
    const isDisabled = item.enabled === false;

    const menuItem = div({
      style: {
        ...styles.menuItem,
        ...(isDisabled ? styles.menuItemDisabled : {}),
      },
      onClick: isDisabled ? undefined : () => {
        item.click?.();
        this.close();
      },
      onMouseEnter: isDisabled ? undefined : (e) => {
        Object.assign((e.target as HTMLElement).style, styles.menuItemHover);
      },
      onMouseLeave: isDisabled ? undefined : (e) => {
        (e.target as HTMLElement).style.backgroundColor = 'transparent';
      },
    });

    // Label
    const label = span({ text: item.text, style: styles.label });
    menuItem.appendChild(label);

    return menuItem;
  }

  // ============================================================================
  // Private: Positioning
  // ============================================================================

  private positionMenu(): void {
    const { x, y } = this.options;
    const rect = this.el.getBoundingClientRect();

    // Adjust position to fit in viewport
    let adjustedX = x;
    let adjustedY = y;

    // Right edge
    if (x + rect.width > window.innerWidth - 10) {
      adjustedX = window.innerWidth - rect.width - 10;
    }

    // Bottom edge
    if (y + rect.height > window.innerHeight - 10) {
      adjustedY = window.innerHeight - rect.height - 10;
    }

    // Left edge
    if (adjustedX < 10) {
      adjustedX = 10;
    }

    // Top edge
    if (adjustedY < 10) {
      adjustedY = 10;
    }

    this.el.style.left = `${adjustedX}px`;
    this.el.style.top = `${adjustedY}px`;
  }

  // ============================================================================
  // Private: Event Listeners
  // ============================================================================

  private attachEventListeners(): void {
    // Close on click outside
    this.closeHandler = (e: MouseEvent) => {
      if (!this.el.contains(e.target as Node)) {
        this.close();
      }
    };
    // Delay to avoid immediate close from the triggering click
    setTimeout(() => {
      document.addEventListener('click', this.closeHandler!, { capture: true });
      document.addEventListener('contextmenu', this.closeHandler!, { capture: true });
    }, 0);

    // Close on escape
    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };
    document.addEventListener('keydown', this.keyHandler);

    // Close on scroll
    window.addEventListener('scroll', () => this.close(), { once: true, capture: true });
  }

  private detachEventListeners(): void {
    if (this.closeHandler) {
      document.removeEventListener('click', this.closeHandler, { capture: true });
      document.removeEventListener('contextmenu', this.closeHandler, { capture: true });
    }
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Show a context menu at the specified position
 */
export function showContextMenu(options: ContextMenuOptions): ContextMenu {
  return new ContextMenu(options);
}
