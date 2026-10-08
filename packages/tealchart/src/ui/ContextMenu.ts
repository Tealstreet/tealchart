/**
 * ContextMenu - Vanilla DOM context menu component
 *
 * Provides a floating menu that appears on right-click or long-press.
 * Supports nested submenus and dividers.
 */

import type { ContextMenuItem, RenderOptions } from '../types';

import { applyChromeThemeVars } from './chromeTheme';
import { div, span } from './dom';
import { mountWebFloatingElement, positionFixedFloatingElement } from './FloatingLayer';
import { showWebOverlayError, type WebOverlayHost, type WebOverlayHostFactory, type WebOverlayEnvironment } from './OverlayHost';

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
  /** Side of the anchor on which the menu opens; defaults to right. */
  openDirection?: 'left' | 'right';
  /** Callback when menu is closed */
  onClose?: () => void;
  /** Chart render options used to theme the menu (it portals to document.body). */
  renderOptions?: Partial<RenderOptions>;
  overlayHost?: WebOverlayHostFactory;
  source?: HTMLElement;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  menu: {
    position: 'fixed',
    backgroundColor: 'var(--tc-menu-bg, var(--tc-canvas-bg, #1e222d))',
    border: '1px solid var(--tc-border, #363a45)',
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
    color: 'var(--tc-text, #d1d4dc)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'background-color 0.1s',
  } as Partial<CSSStyleDeclaration>,

  menuItemHover: {
    backgroundColor: 'var(--tc-hover-bg, rgba(255, 255, 255, 0.05))',
  } as Partial<CSSStyleDeclaration>,

  menuItemDisabled: {
    opacity: '0.5',
    cursor: 'default',
  } as Partial<CSSStyleDeclaration>,

  divider: {
    height: '1px',
    backgroundColor: 'var(--tc-border, #363a45)',
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
    color: 'var(--tc-text3, #787b86)',
    fontSize: '11px',
    flexShrink: '0',
  } as Partial<CSSStyleDeclaration>,

  submenuArrow: {
    marginLeft: 'auto',
    color: 'var(--tc-text3, #787b86)',
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
  private closed = false;
  private closeHandler: ((e: MouseEvent) => void) | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private scrollHandler: (() => void) | null = null;
  private attachTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private host?: WebOverlayHost;
  private environment?: WebOverlayEnvironment;
  private hostCleanup?: () => void;

  constructor(options: ContextMenuOptions) {
    this.options = options;
    this.el = this.createMenu();
    if (options.overlayHost) this.openHosted();
    else { this.positionMenu(); this.attachEventListeners(); }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Close and destroy the menu
   */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.hostCleanup?.();
    this.host?.dispose();
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
    // Portaled to document.body, so theme it directly (can't inherit root vars).
    applyChromeThemeVars(menu, this.options.renderOptions);
    menu.addEventListener('mousedown', (event) => event.stopPropagation());
    menu.addEventListener('mouseup', (event) => event.stopPropagation());
    menu.addEventListener('click', (event) => event.stopPropagation());
    menu.addEventListener('contextmenu', (event) => event.stopPropagation());

    for (const item of this.options.items) {
      if (item.text === '-' || item.text === 'divider') {
        menu.appendChild(div({ style: styles.divider }));
        continue;
      }

      const menuItem = this.createMenuItem(item);
      menu.appendChild(menuItem);
    }

    if (!this.options.overlayHost) mountWebFloatingElement(menu);
    return menu;
  }

  private createMenuItem(item: ContextMenuItem): HTMLDivElement {
    const isDisabled = item.enabled === false;

    const menuItem = div({
      style: {
        ...styles.menuItem,
        ...(isDisabled ? styles.menuItemDisabled : {}),
      },
      onClick: isDisabled
        ? undefined
        : (event) => {
            event.stopPropagation();
            item.click?.();
            this.close();
          },
      onMouseEnter: isDisabled
        ? undefined
        : (e) => {
            Object.assign((e.currentTarget as HTMLElement).style, styles.menuItemHover);
          },
      onMouseLeave: isDisabled
        ? undefined
        : (e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
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
    const width = this.el.getBoundingClientRect().width || this.el.offsetWidth || 160;
    const anchor = this.host?.sourcePoint({ clientX: this.options.x, clientY: this.options.y }) ?? { x: this.options.x, y: this.options.y };
    const position = positionFixedFloatingElement(this.el, {
      desiredLeft: anchor.x - (this.options.openDirection === 'left' ? width : 0),
      desiredTop: anchor.y,
      fallbackWidth: 160,
      margin: 10,
      viewport: this.environment ? { width: this.environment.sourceWindow.innerWidth, height: this.environment.sourceWindow.innerHeight } : undefined,
    });
    if (this.environment) {
      const point = this.environment.targetPoint({ x: position.left, y: position.top });
      this.el.style.left = `${point.x}px`;
      this.el.style.top = `${point.y}px`;
    }
  }

  private openHosted(): void {
    const source = this.options.source ?? document.body;
    const failed = (error: string) => queueMicrotask(() => { if (!this.closed) { showWebOverlayError(source, error); this.close(); } });
    try {
      const host = this.options.overlayHost!({ kind: 'floating', source, onError: failed });
      this.host = host;
      void host.ready.then((environment) => {
        if (this.closed || this.host !== host) return;
        this.environment = environment;
        environment.portalRoot.append(this.el);
        this.positionMenu();
        host.setContent(this.el);
        this.hostCleanup = host.subscribeInput((input) => {
          if (input.type === 'pointerdown' && !input.inside) this.close();
          if (input.type === 'keydown' && (input.event as KeyboardEvent).key === 'Escape' &&
            ((input.inside && (!input.sourceId || input.sourceId === host.surfaceId)) ||
              (input.event.target as Node | null)?.ownerDocument === environment.sourceWindow.document)) {
            input.event.preventDefault();
            this.close();
          }
        });
        this.scrollHandler = () => this.close();
        environment.sourceWindow.addEventListener('scroll', this.scrollHandler, { once: true, capture: true });
      }).catch((error: unknown) => failed(error instanceof Error ? error.message : String(error)));
    } catch (error) { failed(error instanceof Error ? error.message : String(error)); }
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
    this.attachTimeoutId = setTimeout(() => {
      this.attachTimeoutId = null;
      if (!this.closeHandler || this.closed) return;
      document.addEventListener('click', this.closeHandler, { capture: true });
      document.addEventListener('contextmenu', this.closeHandler, { capture: true });
    }, 0);

    // Close on escape
    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };
    document.addEventListener('keydown', this.keyHandler);

    // Close on scroll
    this.scrollHandler = () => this.close();
    window.addEventListener('scroll', this.scrollHandler, { once: true, capture: true });
  }

  private detachEventListeners(): void {
    if (this.attachTimeoutId !== null) {
      clearTimeout(this.attachTimeoutId);
      this.attachTimeoutId = null;
    }
    if (this.closeHandler) {
      document.removeEventListener('click', this.closeHandler, { capture: true });
      document.removeEventListener('contextmenu', this.closeHandler, { capture: true });
      this.closeHandler = null;
    }
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    if (this.scrollHandler) {
      (this.environment?.sourceWindow ?? window).removeEventListener('scroll', this.scrollHandler, { capture: true });
      this.scrollHandler = null;
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
