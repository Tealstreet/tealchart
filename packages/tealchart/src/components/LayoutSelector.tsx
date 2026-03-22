/**
 * LayoutSelector - Load and manage saved chart layouts
 *
 * Provides UI for loading saved layouts from the TradingView SaveLoadAdapter.
 * Layouts are transparently transformed to/from Tealchart format.
 */

import React, { memo, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useStore } from '@nanostores/react';
import type { ChartSettings, SaveStatus } from '../state/chartState';
import { createChartFocusAtoms } from '../state/chartState';
import type { ISaveLoadAdapter, TransformResult } from '../transformer';
import { loadAsTealchart, deleteLayout, saveTealchartLayout } from '../transformer';
import { PopoverContainer, popoverStyles } from './PopoverContainer';
import { useChartTranslations } from '../i18n';

// ============================================================================
// Styles (only button styles, rest uses PopoverContainer)
// ============================================================================

// Inject keyframes for spinner and fade animations
const keyframes = `
@keyframes layoutSelectorSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes layoutSelectorFadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
`;

// Inject styles once
if (typeof document !== 'undefined') {
  const styleId = 'layout-selector-keyframes';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = keyframes;
    document.head.appendChild(style);
  }
}

const styles = {
  container: {
    position: 'relative' as const,
    display: 'inline-block',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    border: 'none',
    borderRadius: 4,
    backgroundColor: 'transparent',
    color: 'var(--text2, #787b86)',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    transition: 'background-color 0.15s, color 0.15s',
    whiteSpace: 'nowrap' as const,
  },
  buttonHover: {
    backgroundColor: 'var(--hover-bg, rgba(255, 255, 255, 0.05))',
    color: 'var(--text, #d1d4dc)',
  },
  buttonActive: {
    backgroundColor: 'var(--accent-bg, rgba(41, 98, 255, 0.2))',
    color: 'var(--accent, #2962ff)',
  },
  chevron: {
    fontSize: 10,
    marginLeft: 2,
  },
  layoutName: {
    fontWeight: 500,
  },
  layoutMeta: {
    fontSize: 11,
    color: 'var(--text2, #787b86)',
    marginTop: 2,
  },
  unsavedIndicator: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: 'var(--warning, #f0b90b)',
    marginRight: 4,
    flexShrink: 0,
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 14,
    height: 14,
    marginRight: 4,
    flexShrink: 0,
  },
  spinner: {
    width: 10,
    height: 10,
    border: '2px solid var(--text2, #787b86)',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'layoutSelectorSpin 0.8s linear infinite',
  },
  successIcon: {
    color: 'var(--success, #26a69a)',
    fontSize: 12,
    fontWeight: 'bold' as const,
  },
  successIconFading: {
    color: 'var(--success, #26a69a)',
    fontSize: 12,
    fontWeight: 'bold' as const,
    animation: 'layoutSelectorFadeOut 0.5s ease-out forwards',
  },
  errorIcon: {
    color: 'var(--error, #ef5350)',
    fontSize: 12,
    fontWeight: 'bold' as const,
  },
  layoutRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  layoutContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    flex: 1,
    minWidth: 0,
  },
  layoutActions: {
    display: 'flex',
    gap: 4,
    marginLeft: 8,
    opacity: 0,
    transition: 'opacity 0.15s',
  },
  layoutActionsVisible: {
    opacity: 1,
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    border: 'none',
    borderRadius: 4,
    backgroundColor: 'transparent',
    color: 'var(--text2, #787b86)',
    cursor: 'pointer',
    fontSize: 12,
    transition: 'background-color 0.15s, color 0.15s',
  },
  actionButtonHover: {
    backgroundColor: 'var(--hover-bg, rgba(255, 255, 255, 0.1))',
    color: 'var(--text, #d1d4dc)',
  },
  deleteButtonHover: {
    backgroundColor: 'rgba(239, 83, 80, 0.2)',
    color: 'var(--error, #ef5350)',
  },
};

// ============================================================================
// Types
// ============================================================================

export interface LayoutInfo {
  id: string | number;
  name: string;
  symbol: string;
  resolution?: string;
  timestamp?: number;
}

export interface LayoutSelectorProps {
  /** Chart key for state persistence */
  chartKey: string;
  /** SaveLoadAdapter instance for fetching layouts */
  saveLoadAdapter: ISaveLoadAdapter;
  /** Called when a layout is loaded */
  onLoadLayout: (settings: ChartSettings, warnings: string[], layoutId: string | number, layoutName: string) => void;
  /** Called when save is requested */
  onSaveLayout?: () => void;
  /** Custom styles */
  style?: React.CSSProperties;
}

// ============================================================================
// Component
// ============================================================================

export const LayoutSelector: React.FC<LayoutSelectorProps> = memo(({
  chartKey,
  saveLoadAdapter,
  onLoadLayout,
  onSaveLayout,
  style,
}) => {
  // Translations
  const t = useChartTranslations();

  // Get current layout from persisted stores
  const chartStores = useMemo(() => createChartFocusAtoms(chartKey), [chartKey]);
  const currentLayout = useStore(chartStores.currentLayoutAtom);
  const setCurrentLayout = useCallback((value: typeof currentLayout) => {
    chartStores.currentLayoutAtom.set(value);
  }, [chartStores]);
  const isDirty = useStore(chartStores.isDirtyAtom);
  const setIsDirty = useCallback((value: boolean) => {
    chartStores.isDirtyAtom.set(value);
  }, [chartStores]);
  const saveStatus = useStore(chartStores.saveStatusAtom);

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [layouts, setLayouts] = useState<LayoutInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredId, setHoveredId] = useState<string | number | null>(null);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const [buttonHovered, setButtonHovered] = useState(false);
  const [loadWarnings, setLoadWarnings] = useState<string[]>([]);

  // Track deleted layout IDs to filter from cached results
  const deletedIdsRef = useRef<Set<string | number>>(new Set());

  // Track if we've already auto-loaded the persisted layout
  const hasAutoLoaded = useRef(false);

  // Auto-load persisted layout on mount
  useEffect(() => {
    if (hasAutoLoaded.current) return;
    if (!currentLayout.layoutId || !currentLayout.layoutName) return;

    hasAutoLoaded.current = true;

    // Load the persisted layout (don't update atom since it's already set)
    const loadPersistedLayout = async () => {
      try {
        const result: TransformResult<ChartSettings> = await loadAsTealchart(
          currentLayout.layoutId!,
          saveLoadAdapter
        );

        if (result.warnings.length > 0) {
          console.warn('LayoutSelector: Auto-load warnings:', result.warnings);
        }

        // Apply the layout (don't call setCurrentLayout - it's already persisted)
        onLoadLayout(result.data, result.warnings, currentLayout.layoutId!, currentLayout.layoutName!);
      } catch (e) {
        console.error('LayoutSelector: Failed to auto-load persisted layout:', e);
        // Clear the invalid persisted layout
        setCurrentLayout({ layoutId: null, layoutName: null });
      }
    };

    loadPersistedLayout();
  }, [currentLayout.layoutId, currentLayout.layoutName, saveLoadAdapter, onLoadLayout, setCurrentLayout]);

  // Fetch layouts when dropdown opens, clear search when it closes
  useEffect(() => {
    if (isOpen) {
      fetchLayouts();
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Fetch layouts from adapter
  const fetchLayouts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const charts = await saveLoadAdapter.getAllCharts();
      const layoutList: LayoutInfo[] = charts
        .filter((chart: any) => !deletedIdsRef.current.has(chart.id))
        .map((chart: any) => ({
          id: chart.id,
          name: chart.name || 'Untitled',
          symbol: chart.symbol || '',
          resolution: chart.resolution,
          timestamp: chart.timestamp,
        }));
      setLayouts(layoutList);
    } catch (e) {
      setError('Failed to load layouts');
      console.error('LayoutSelector: Failed to fetch layouts:', e);
    } finally {
      setIsLoading(false);
    }
  }, [saveLoadAdapter]);

  // Load selected layout
  const handleLoadLayout = useCallback(async (layoutId: string | number, layoutName: string) => {
    setIsLoading(true);
    setError(null);
    setLoadWarnings([]);

    try {
      const result: TransformResult<ChartSettings> = await loadAsTealchart(layoutId, saveLoadAdapter);

      if (result.warnings.length > 0) {
        setLoadWarnings(result.warnings);
        console.warn('LayoutSelector: Load warnings:', result.warnings);
      }

      // Persist the current layout selection and reset dirty state
      setCurrentLayout({ layoutId, layoutName });
      setIsDirty(false);

      onLoadLayout(result.data, result.warnings, layoutId, layoutName);
      setIsOpen(false);
    } catch (e) {
      setError('Failed to load layout');
      console.error('LayoutSelector: Failed to load layout:', e);
    } finally {
      setIsLoading(false);
    }
  }, [saveLoadAdapter, onLoadLayout, setCurrentLayout, setIsDirty]);

  // Filter layouts by search
  const filteredLayouts = useMemo(() => {
    if (!searchQuery) return layouts;
    const query = searchQuery.toLowerCase();
    return layouts.filter(
      (l) =>
        l.name.toLowerCase().includes(query) ||
        l.symbol.toLowerCase().includes(query)
    );
  }, [layouts, searchQuery]);

  // Format timestamp
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle save button click
  const handleSaveClick = useCallback(() => {
    onSaveLayout?.();
    setIsOpen(false);
  }, [onSaveLayout]);

  // Handle delete layout
  const handleDeleteLayout = useCallback(async (e: React.MouseEvent, layoutId: string | number, layoutName: string) => {
    e.stopPropagation(); // Don't trigger row click

    if (!confirm(`Delete layout "${layoutName}"?`)) return;

    try {
      await deleteLayout(layoutId, saveLoadAdapter);

      // Track deleted ID to filter from cached results
      deletedIdsRef.current.add(layoutId);

      // Remove from local list
      setLayouts((prev) => prev.filter((l) => l.id !== layoutId));

      // If we deleted the current layout, clear it
      if (currentLayout.layoutId === layoutId) {
        setCurrentLayout({ layoutId: null, layoutName: null });
        setIsDirty(false);
      }
    } catch (err) {
      console.error('Failed to delete layout:', err);
      setError('Failed to delete layout');
    }
  }, [saveLoadAdapter, currentLayout.layoutId, setCurrentLayout, setIsDirty]);

  // Handle duplicate layout
  const handleDuplicateLayout = useCallback(async (e: React.MouseEvent, layoutId: string | number, layoutName: string) => {
    e.stopPropagation(); // Don't trigger row click

    const newName = prompt('Enter name for duplicate:', `${layoutName} (copy)`);
    if (!newName) return;

    setIsLoading(true);
    try {
      // Load the layout content
      const result = await loadAsTealchart(layoutId, saveLoadAdapter);

      // Save as new layout
      const newId = await saveTealchartLayout(result.data, newName, saveLoadAdapter);

      // Refresh the list
      await fetchLayouts();

      // Optionally load the new duplicate
      setCurrentLayout({ layoutId: newId, layoutName: newName });
    } catch (err) {
      console.error('Failed to duplicate layout:', err);
      setError('Failed to duplicate layout');
    } finally {
      setIsLoading(false);
    }
  }, [saveLoadAdapter, fetchLayouts, setCurrentLayout]);

  // Render status indicator based on save status and dirty state
  const renderStatusIndicator = () => {
    if (saveStatus === 'saving') {
      return (
        <span style={styles.statusIndicator} title={t.saving}>
          <span style={styles.spinner} />
        </span>
      );
    }
    if (saveStatus === 'success') {
      return (
        <span style={styles.statusIndicator} title={t.saved}>
          <span style={styles.successIcon}>✓</span>
        </span>
      );
    }
    if (saveStatus === 'success-fading') {
      return (
        <span style={styles.statusIndicator} title={t.saved}>
          <span style={styles.successIconFading}>✓</span>
        </span>
      );
    }
    if (saveStatus === 'error') {
      return (
        <span style={styles.statusIndicator} title={t.saveFailed}>
          <span style={styles.errorIcon}>✕</span>
        </span>
      );
    }
    // Idle state - show unsaved indicator if dirty
    if (isDirty) {
      return <span style={styles.unsavedIndicator} title={t.unsavedChanges} />;
    }
    return null;
  };

  return (
    <div style={{ ...styles.container, ...style }}>
      {/* Trigger button */}
      <button
        style={{
          ...styles.button,
          ...(buttonHovered ? styles.buttonHover : {}),
          ...(isOpen ? styles.buttonActive : {}),
        }}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setButtonHovered(true)}
        onMouseLeave={() => setButtonHovered(false)}
        title={saveStatus === 'error' ? t.saveFailed : isDirty ? t.unsavedChanges : undefined}
      >
        {renderStatusIndicator()}
        <span>{currentLayout.layoutName || t.layouts}</span>
        <span style={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Popover */}
      <PopoverContainer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t.layouts}
        searchPlaceholder={t.searchLayouts}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        footerButtonText={onSaveLayout ? t.saveCurrentLayout : undefined}
        onFooterButtonClick={onSaveLayout ? handleSaveClick : undefined}
      >
        {/* Warnings from last load */}
        {loadWarnings.length > 0 && (
          <div style={popoverStyles.warningContainer}>
            {loadWarnings.map((w, i) => (
              <p key={i} style={popoverStyles.warningText}>⚠️ {w}</p>
            ))}
          </div>
        )}

        {/* Error */}
        {error && <div style={popoverStyles.errorState}>{error}</div>}

        {/* Loading */}
        {isLoading && <div style={popoverStyles.loadingState}>Loading...</div>}

        {/* Layout list */}
        {!isLoading && !error && (
          <>
            {filteredLayouts.length === 0 ? (
              <div style={popoverStyles.emptyState}>{t.noLayoutsFound}</div>
            ) : (
              filteredLayouts.map((layout) => {
                // Use loose equality for ID comparison (handles string/number mismatch)
                 
                const isSelected = currentLayout.layoutId != null && currentLayout.layoutId == layout.id;
                const isHovered = hoveredId === layout.id;

                return (
                  <div
                    key={layout.id}
                    style={{
                      ...popoverStyles.listItem,
                      ...(isSelected ? popoverStyles.listItemActive : {}),
                      ...(isHovered && !isSelected ? popoverStyles.listItemHover : {}),
                    }}
                    onClick={() => handleLoadLayout(layout.id, layout.name)}
                    onMouseEnter={() => setHoveredId(layout.id)}
                    onMouseLeave={() => { setHoveredId(null); setHoveredAction(null); }}
                  >
                    <div style={styles.layoutRow}>
                      <div style={styles.layoutContent}>
                        <span style={styles.layoutName}>{layout.name}</span>
                        <span style={styles.layoutMeta}>
                          {layout.symbol}
                          {layout.resolution && `, ${layout.resolution}`}
                          {layout.timestamp && ` (${formatDate(layout.timestamp)})`}
                        </span>
                      </div>
                      <div style={{
                        ...styles.layoutActions,
                        ...(isHovered ? styles.layoutActionsVisible : {}),
                      }}>
                        {/* Duplicate button */}
                        <button
                          style={{
                            ...styles.actionButton,
                            ...(hoveredAction === `dup-${layout.id}` ? styles.actionButtonHover : {}),
                          }}
                          onClick={(e) => handleDuplicateLayout(e, layout.id, layout.name)}
                          onMouseEnter={() => setHoveredAction(`dup-${layout.id}`)}
                          onMouseLeave={() => setHoveredAction(null)}
                          title={t.duplicate}
                        >
                          ⧉
                        </button>
                        {/* Delete button */}
                        <button
                          style={{
                            ...styles.actionButton,
                            ...(hoveredAction === `del-${layout.id}` ? styles.deleteButtonHover : {}),
                          }}
                          onClick={(e) => handleDeleteLayout(e, layout.id, layout.name)}
                          onMouseEnter={() => setHoveredAction(`del-${layout.id}`)}
                          onMouseLeave={() => setHoveredAction(null)}
                          title={t.delete}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </PopoverContainer>
    </div>
  );
});

LayoutSelector.displayName = 'LayoutSelector';
