/**
 * IndicatorsModal - Vanilla DOM modal for selecting and adding indicators
 *
 * Displays a searchable list of indicators grouped by category.
 */

import { Component } from './Component';
import {
  BUILTIN_INDICATORS,
  INDICATOR_CATEGORIES,
  searchIndicators,
  type BuiltinIndicator,
} from '../indicators/builtinIndicators';

// ============================================================================
// Types
// ============================================================================

export interface IndicatorsModalOptions {
  /** Callback when an indicator is selected */
  onSelectIndicator: (indicator: BuiltinIndicator) => void;
  /** Get currently active indicator IDs */
  getActiveIndicatorIds?: () => string[];
  /** Translation strings */
  translations?: {
    title?: string;
    searchPlaceholder?: string;
    noIndicatorsFound?: string;
    categoryTealstreet?: string;
    categoryTrend?: string;
    categoryMomentum?: string;
    categoryVolatility?: string;
    categoryVolume?: string;
    categoryOther?: string;
  };
}

interface IndicatorsModalState {
  isOpen: boolean;
  searchQuery: string;
  hoveredId: string | null;
}

// Category translation key mapping
const CATEGORY_KEYS: Record<BuiltinIndicator['category'], string> = {
  tealstreet: 'categoryTealstreet',
  trend: 'categoryTrend',
  momentum: 'categoryMomentum',
  volatility: 'categoryVolatility',
  volume: 'categoryVolume',
  other: 'categoryOther',
};

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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '40px',
    zIndex: '10000',
  } as Partial<CSSStyleDeclaration>,

  container: {
    backgroundColor: 'var(--modal-bg, #1e222d)',
    borderRadius: '4px',
    width: '280px',
    maxHeight: '400px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5)',
    border: '1px solid var(--border, #363a45)',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  } as Partial<CSSStyleDeclaration>,

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid var(--border, #363a45)',
    flexShrink: '0',
  } as Partial<CSSStyleDeclaration>,

  title: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text, #d1d4dc)',
    margin: '0',
  } as Partial<CSSStyleDeclaration>,

  closeButton: {
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
    color: 'var(--text2, #787b86)',
    fontSize: '16px',
    lineHeight: '1',
    borderRadius: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as Partial<CSSStyleDeclaration>,

  searchContainer: {
    padding: '8px',
    borderBottom: '1px solid var(--border, #363a45)',
    flexShrink: '0',
  } as Partial<CSSStyleDeclaration>,

  searchWrapper: {
    position: 'relative',
  } as Partial<CSSStyleDeclaration>,

  searchIcon: {
    position: 'absolute',
    left: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text3, #5d606b)',
    pointerEvents: 'none',
  } as Partial<CSSStyleDeclaration>,

  searchInput: {
    width: '100%',
    padding: '6px 8px 6px 28px',
    backgroundColor: 'var(--input-bg, #2a2e39)',
    border: '1px solid var(--border, #363a45)',
    borderRadius: '3px',
    color: 'var(--text, #d1d4dc)',
    fontSize: '12px',
    outline: 'none',
    boxSizing: 'border-box',
  } as Partial<CSSStyleDeclaration>,

  content: {
    flex: '1',
    overflowY: 'auto',
    minHeight: '0',
  } as Partial<CSSStyleDeclaration>,

  categoryHeader: {
    padding: '8px 12px 4px',
    fontSize: '10px',
    fontWeight: '600',
    color: 'var(--text3, #5d606b)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  } as Partial<CSSStyleDeclaration>,

  listItem: {
    padding: '6px 12px',
    cursor: 'pointer',
    color: 'var(--text, #d1d4dc)',
    fontSize: '13px',
    transition: 'background-color 0.1s',
  } as Partial<CSSStyleDeclaration>,

  listItemHover: {
    backgroundColor: 'var(--hover-bg, rgba(255, 255, 255, 0.08))',
  } as Partial<CSSStyleDeclaration>,

  listItemActive: {
    backgroundColor: 'var(--accent-bg, rgba(41, 98, 255, 0.15))',
  } as Partial<CSSStyleDeclaration>,

  emptyState: {
    padding: '16px 12px',
    textAlign: 'center',
    color: 'var(--text3, #5d606b)',
    fontSize: '12px',
  } as Partial<CSSStyleDeclaration>,
};

// ============================================================================
// IndicatorsModal Class
// ============================================================================

export class IndicatorsModal extends Component<IndicatorsModalState> {
  private options: IndicatorsModalOptions;
  private containerEl: HTMLElement | null = null;
  private contentEl: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private boundKeyDown: (e: KeyboardEvent) => void;

  constructor(options: IndicatorsModalOptions) {
    super('div', {
      isOpen: false,
      searchQuery: '',
      hoveredId: null,
    });

    this.options = options;

    // Setup overlay
    Object.assign(this.el.style, styles.overlay);
    this.el.style.display = 'none';

    this.boundKeyDown = this.handleKeyDown.bind(this);

    // Build the modal structure
    this.buildModal();
  }

  // ============================================================================
  // Build
  // ============================================================================

  private buildModal(): void {
    // Overlay click handler
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) {
        this.close();
      }
    });

    // Container
    this.containerEl = this.createElement('div', { style: styles.container });
    this.containerEl.addEventListener('click', (e) => e.stopPropagation());
    this.el.appendChild(this.containerEl);

    // Header
    const header = this.createElement('div', { style: styles.header });

    const title = this.createElement('h2', {
      style: styles.title,
      textContent: this.getTranslation('title', 'Indicators'),
    });
    header.appendChild(title);

    const closeBtn = this.createElement('button', {
      style: styles.closeButton,
      textContent: '×',
      onClick: () => this.close(),
      onMouseEnter: (e) => {
        (e.target as HTMLElement).style.color = 'var(--text, #d1d4dc)';
      },
      onMouseLeave: (e) => {
        (e.target as HTMLElement).style.color = 'var(--text2, #787b86)';
      },
    });
    header.appendChild(closeBtn);

    this.containerEl.appendChild(header);

    // Search
    const searchContainer = this.createElement('div', { style: styles.searchContainer });
    const searchWrapper = this.createElement('div', { style: styles.searchWrapper });

    // Search icon
    const iconSpan = document.createElement('span');
    Object.assign(iconSpan.style, styles.searchIcon);
    iconSpan.innerHTML = `<svg width="12" height="12" viewBox="0 0 18 18" fill="currentColor">
      <path d="M12.5 11h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L17.49 16l-4.99-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"/>
    </svg>`;
    searchWrapper.appendChild(iconSpan);

    // Search input
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = this.getTranslation('searchPlaceholder', 'Search...');
    Object.assign(this.searchInput.style, styles.searchInput);
    this.searchInput.addEventListener('input', (e) => {
      this.setState({ searchQuery: (e.target as HTMLInputElement).value });
    });
    searchWrapper.appendChild(this.searchInput);

    searchContainer.appendChild(searchWrapper);
    this.containerEl.appendChild(searchContainer);

    // Content area
    this.contentEl = this.createElement('div', { style: styles.content });
    this.containerEl.appendChild(this.contentEl);
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  protected render(): void {
    if (!this.contentEl) return;

    this.contentEl.innerHTML = '';

    const query = this.state.searchQuery.trim();
    const indicators = query ? searchIndicators(query) : BUILTIN_INDICATORS;

    if (indicators.length === 0) {
      const empty = this.createElement('div', {
        style: styles.emptyState,
        textContent: this.getTranslation('noIndicatorsFound', 'No indicators found'),
      });
      this.contentEl.appendChild(empty);
      return;
    }

    // Group by category
    const groups = new Map<BuiltinIndicator['category'], BuiltinIndicator[]>();
    for (const indicator of indicators) {
      const existing = groups.get(indicator.category) || [];
      groups.set(indicator.category, [...existing, indicator]);
    }

    // Get active indicators
    const activeIds = new Set(this.options.getActiveIndicatorIds?.() || []);

    // Render categories in order
    for (const { id: categoryId } of INDICATOR_CATEGORIES) {
      const categoryIndicators = groups.get(categoryId);
      if (!categoryIndicators || categoryIndicators.length === 0) continue;

      const categoryKey = CATEGORY_KEYS[categoryId];
      const categoryName = this.getTranslation(
        categoryKey,
        INDICATOR_CATEGORIES.find((c) => c.id === categoryId)?.name || categoryId
      );

      // Category header
      const categoryHeader = this.createElement('div', {
        style: styles.categoryHeader,
        textContent: categoryName,
      });
      this.contentEl.appendChild(categoryHeader);

      // Indicators in category
      for (const indicator of categoryIndicators) {
        const isActive = activeIds.has(indicator.id);
        const isHovered = this.state.hoveredId === indicator.id;

        const item = this.createElement('div', {
          style: {
            ...styles.listItem,
            ...(isActive ? styles.listItemActive : {}),
            ...(isHovered && !isActive ? styles.listItemHover : {}),
          },
          textContent: indicator.name,
          onClick: () => this.handleIndicatorClick(indicator),
          onMouseEnter: () => this.setState({ hoveredId: indicator.id }),
          onMouseLeave: () => this.setState({ hoveredId: null }),
        });

        this.contentEl.appendChild(item);
      }
    }
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.close();
    }
  }

  private handleIndicatorClick(indicator: BuiltinIndicator): void {
    this.options.onSelectIndicator(indicator);
    this.close();
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private getTranslation(key: string, fallback: string): string {
    const translations = this.options.translations as Record<string, string> | undefined;
    return translations?.[key] || fallback;
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Open the modal
   */
  open(): void {
    if (this.state.isOpen) return;

    this.setState({ isOpen: true, searchQuery: '', hoveredId: null });
    this.el.style.display = 'flex';

    document.addEventListener('keydown', this.boundKeyDown);

    // Focus search input
    setTimeout(() => {
      this.searchInput?.focus();
    }, 50);
  }

  /**
   * Close the modal
   */
  close(): void {
    if (!this.state.isOpen) return;

    this.setState({ isOpen: false });
    this.el.style.display = 'none';

    document.removeEventListener('keydown', this.boundKeyDown);
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
   * Update translations
   */
  setTranslations(translations: IndicatorsModalOptions['translations']): void {
    this.options.translations = translations;
    if (this.state.isOpen) {
      this.render();
    }
  }

  protected onUnmount(): void {
    document.removeEventListener('keydown', this.boundKeyDown);
  }
}
