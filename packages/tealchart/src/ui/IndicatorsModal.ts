/**
 * IndicatorsModal - Modal for selecting and adding indicators
 *
 * Displays a searchable list of indicators grouped by category.
 * Extends the Modal base class for overlay, escape key, and click-outside handling.
 */
import type { BuiltinIndicator } from '../indicators/builtinIndicators';
import type { ModalOptions } from './Modal';

import { BUILTIN_INDICATORS, INDICATOR_CATEGORIES, searchIndicators } from '../indicators/builtinIndicators';
import { Modal } from './Modal';

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
// Styles (content-specific only — overlay/header/close from base)
// ============================================================================

const contentStyles = {
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

  listItemActive: {
    backgroundColor: 'var(--accent-bg, rgba(41, 98, 255, 0.15))',
  } as Partial<CSSStyleDeclaration>,

  listItemHover: {
    backgroundColor: 'var(--hover-bg, rgba(255, 255, 255, 0.08))',
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

export class IndicatorsModal extends Modal {
  private indicatorOptions: IndicatorsModalOptions;
  private searchInput: HTMLInputElement | null = null;
  private searchContainer: HTMLElement | null = null;
  private listEl: HTMLElement | null = null;
  private searchQuery = '';

  constructor(options: IndicatorsModalOptions) {
    const modalOptions: ModalOptions = {
      title: options.translations?.title || 'Indicators',
      width: 280,
      maxHeight: '400px',
      position: 'absolute',
      align: 'top',
      paddingTop: '40px',
      borderRadius: '4px',
      border: '1px solid var(--border, #363a45)',
      showCloseButton: true,
      closeOnOverlayClick: true,
      closeOnEscape: true,
    };

    super(modalOptions);

    this.indicatorOptions = options;

    // Build search bar (between header and content)
    this.buildSearch();
  }

  // ============================================================================
  // Build
  // ============================================================================

  private buildSearch(): void {
    // Insert search container before the content element
    this.searchContainer = this.createElement('div', { style: contentStyles.searchContainer });
    const searchWrapper = this.createElement('div', { style: contentStyles.searchWrapper });

    // Search icon
    const iconSpan = document.createElement('span');
    Object.assign(iconSpan.style, contentStyles.searchIcon);
    iconSpan.innerHTML = `<svg width="12" height="12" viewBox="0 0 18 18" fill="currentColor">
      <path d="M12.5 11h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L17.49 16l-4.99-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"/>
    </svg>`;
    searchWrapper.appendChild(iconSpan);

    // Search input
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = this.getTranslation('searchPlaceholder', 'Search...');
    Object.assign(this.searchInput.style, contentStyles.searchInput);
    this.searchInput.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.renderList();
    });
    searchWrapper.appendChild(this.searchInput);

    this.searchContainer.appendChild(searchWrapper);

    // Insert before contentEl in the modal
    this.modalEl.insertBefore(this.searchContainer, this.contentEl);

    // Set content to have no padding (list items handle their own)
    this.contentEl.style.overflowY = 'auto';
    this.contentEl.style.padding = '0';
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  protected onOpen(): void {
    this.searchQuery = '';
    if (this.searchInput) {
      this.searchInput.value = '';
    }
    this.renderList();

    // Focus search input
    setTimeout(() => {
      this.searchInput?.focus();
    }, 50);
  }

  protected render(): void {
    this.renderList();
  }

  private renderList(): void {
    this.contentEl.innerHTML = '';

    const query = this.searchQuery.trim();
    const indicators = query ? searchIndicators(query) : BUILTIN_INDICATORS;

    if (indicators.length === 0) {
      const empty = this.createElement('div', {
        style: contentStyles.emptyState,
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
    const activeIds = new Set(this.indicatorOptions.getActiveIndicatorIds?.() || []);

    // Render categories in order
    for (const { id: categoryId } of INDICATOR_CATEGORIES) {
      const categoryIndicators = groups.get(categoryId);
      if (!categoryIndicators || categoryIndicators.length === 0) continue;

      const categoryKey = CATEGORY_KEYS[categoryId];
      const categoryName = this.getTranslation(
        categoryKey,
        INDICATOR_CATEGORIES.find((c) => c.id === categoryId)?.name || categoryId,
      );

      // Category header
      const categoryHeader = this.createElement('div', {
        style: contentStyles.categoryHeader,
        textContent: categoryName,
      });
      this.contentEl.appendChild(categoryHeader);

      // Indicators in category
      for (const indicator of categoryIndicators) {
        const isActive = activeIds.has(indicator.id);

        const item = this.createElement('div', {
          style: {
            ...contentStyles.listItem,
            ...(isActive ? contentStyles.listItemActive : {}),
          },
          textContent: indicator.name,
          onClick: () => this.handleIndicatorClick(indicator),
        });

        // Apply hover styles directly to avoid full re-render which destroys
        // the element before the click event can fire
        if (!isActive) {
          item.addEventListener('mouseenter', () => {
            Object.assign(item.style, contentStyles.listItemHover);
          });
          item.addEventListener('mouseleave', () => {
            item.style.backgroundColor = '';
          });
        }

        this.contentEl.appendChild(item);
      }
    }
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  private handleIndicatorClick(indicator: BuiltinIndicator): void {
    this.indicatorOptions.onSelectIndicator(indicator);
    this.close();
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private getTranslation(key: string, fallback: string): string {
    const translations = this.indicatorOptions.translations as Record<string, string> | undefined;
    return translations?.[key] || fallback;
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Update translations
   */
  setTranslations(translations: IndicatorsModalOptions['translations']): void {
    this.indicatorOptions.translations = translations;
    if (this.state.isOpen) {
      this.setTitle(translations?.title || 'Indicators');
      this.renderList();
    }
  }
}
