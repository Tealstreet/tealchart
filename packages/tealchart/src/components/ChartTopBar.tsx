/**
 * ChartTopBar - Top toolbar for the custom chart
 * Contains symbol info, timeframe selector, indicators button, and optional layout selector.
 * OHLC values are displayed in the ChartLegend component.
 */
import type { ChartSettings } from '../state/chartState';
import type { LayoutSelectorProps } from './LayoutSelector';

import React, { memo, useCallback, useMemo, useState } from 'react';

import { useStore } from '@nanostores/react';

import { TealchartLogger } from '../debug/TealchartLogger';
import { useChartTranslations } from '../i18n';
import { type BuiltinIndicator } from '../indicators/builtinIndicators';
import { useChartApiOptional } from '../state/ChartApiContext';
import { AVAILABLE_TIMEFRAMES, createChartFocusAtoms } from '../state/chartState';
import { GapDetectionErrorState, ResolutionString } from '../types';
import { DebugConsole } from './DebugConsole';
import { IndicatorsModal } from './IndicatorsModal';
import { LayoutSelector } from './LayoutSelector';

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    height: 32,
    padding: '0 8px',
    backgroundColor: 'transparent',
    fontSize: 12,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    gap: 12,
    userSelect: 'none' as const,
    overflowX: 'auto' as const,
    overflowY: 'hidden' as const,
    flexWrap: 'nowrap' as const,
    scrollbarWidth: 'none' as const, // Firefox
    msOverflowStyle: 'none' as const, // IE/Edge
  },
  symbol: {
    fontWeight: 600,
    color: 'var(--text, #d1d4dc)',
    fontSize: 13,
  },
  exchange: {
    color: 'var(--text2, #787b86)',
    fontSize: 11,
    marginLeft: 4,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: 'var(--border, #363a45)',
    flexShrink: 0,
  },
  timeframeGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  timeframeButton: {
    padding: '4px 8px',
    border: 'none',
    borderRadius: 4,
    backgroundColor: 'transparent',
    color: 'var(--text2, #787b86)',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    transition: 'background-color 0.15s, color 0.15s',
  },
  timeframeButtonActive: {
    backgroundColor: 'var(--accent-bg, rgba(41, 98, 255, 0.2))',
    color: 'var(--accent, #2962ff)',
  },
  timeframeButtonHover: {
    backgroundColor: 'var(--hover-bg, rgba(255, 255, 255, 0.05))',
  },
  indicatorsButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    border: 'none',
    borderRadius: 4,
    backgroundColor: 'transparent',
    color: 'var(--text2, #787b86)',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    transition: 'background-color 0.15s, color 0.15s',
    flexShrink: 0,
    whiteSpace: 'nowrap' as const,
  },
  indicatorsButtonHover: {
    backgroundColor: 'var(--hover-bg, rgba(255, 255, 255, 0.05))',
    color: 'var(--text, #d1d4dc)',
  },
  indicatorsIcon: {
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: 700,
  },
  spacer: {
    flex: 1,
  },
  errorIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    borderRadius: 4,
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    color: '#ff9800',
    fontSize: 11,
    fontWeight: 500,
    cursor: 'help',
    flexShrink: 0,
    whiteSpace: 'nowrap' as const,
  },
};

// ============================================================================
// Props
// ============================================================================

export interface ChartTopBarProps {
  /** Unique key for this chart instance (for state persistence) */
  chartKey: string;
  /** Current symbol */
  symbol: string;
  /** Exchange name */
  exchangeName?: string;
  /** Callback when interval changes */
  onIntervalChange?: (interval: ResolutionString) => void;
  /** Callback when symbol changes */
  onSymbolChange?: (symbol: string) => void;
  /** Callback when an indicator is added */
  onAddIndicator?: (indicator: BuiltinIndicator) => void;
  /** IDs of currently active indicators */
  activeIndicatorIds?: string[];
  /** Custom CSS variables for theming */
  cssVars?: Record<string, string>;
  /** SaveLoadAdapter for layout selector (optional - enables layout UI) */
  saveLoadAdapter?: LayoutSelectorProps['saveLoadAdapter'];
  /** Called when a layout is loaded */
  onLoadLayout?: (settings: ChartSettings, warnings: string[], layoutId: string | number, layoutName: string) => void;
  /** Called when save is requested */
  onSaveLayout?: () => void;
  /** Gap detection error state (if any) */
  gapDetectionError?: GapDetectionErrorState | null;
  /** Debug logger for this chart (optional - enables debug console) */
  logger?: TealchartLogger | null;
  /** Supported resolutions from datafeed (filters timeframe buttons) */
  supportedResolutions?: string[] | null;
}

// ============================================================================
// Component
// ============================================================================

export const ChartTopBar: React.FC<ChartTopBarProps> = memo(
  ({
    chartKey,
    symbol,
    exchangeName,
    onIntervalChange,
    onSymbolChange: _onSymbolChange,
    onAddIndicator,
    activeIndicatorIds = [],
    cssVars,
    saveLoadAdapter,
    onLoadLayout,
    onSaveLayout,
    gapDetectionError,
    logger,
    supportedResolutions,
  }) => {
    // Translations
    const t = useChartTranslations();

    // Filter timeframes by supported resolutions (if set by datafeed)
    const timeframes = useMemo(() => {
      if (!supportedResolutions || supportedResolutions.length === 0) {
        return AVAILABLE_TIMEFRAMES;
      }
      const filtered = AVAILABLE_TIMEFRAMES.filter((tf) => supportedResolutions.includes(tf.value));
      return filtered.length > 0 ? filtered : AVAILABLE_TIMEFRAMES;
    }, [supportedResolutions]);

    // Get chart API from context (optional - may not be available in standalone usage)
    const chartApi = useChartApiOptional();

    // Modal state
    const [isIndicatorsModalOpen, setIndicatorsModalOpen] = useState(false);
    const [indicatorsButtonHovered, setIndicatorsButtonHovered] = useState(false);

    // Get chart stores for this chart
    const chartStores = useMemo(() => createChartFocusAtoms(chartKey), [chartKey]);
    const interval = useStore(chartStores.intervalAtom);
    const setInterval = chartStores.setInterval;

    // Handle timeframe change
    // This does THREE things:
    // 1. Updates Nanostores (for persistence via localStorage)
    // 2. Calls chartApi.setResolution() which emits to TradingView-style subscribers
    // 3. Calls the optional external onIntervalChange callback
    const handleTimeframeClick = useCallback(
      (newInterval: ResolutionString) => {
        setInterval(newInterval); // Persist to localStorage
        chartApi?.setResolution(newInterval); // Emit to subscribers + trigger data reload
        onIntervalChange?.(newInterval); // External callback
      },
      [setInterval, chartApi, onIntervalChange],
    );

    // Handle indicator selection
    const handleIndicatorSelect = useCallback(
      (indicator: BuiltinIndicator) => {
        onAddIndicator?.(indicator);
      },
      [onAddIndicator],
    );

    // Combine styles with CSS vars
    const containerStyle = useMemo(
      () => ({
        ...styles.container,
        ...cssVars,
      }),
      [cssVars],
    );

    return (
      <div style={containerStyle}>
        {/* Symbol */}
        <div style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
          <span style={styles.symbol}>{symbol}</span>
          {exchangeName && <span style={styles.exchange}>{exchangeName}</span>}
        </div>

        <div style={styles.divider} />

        {/* Timeframe selector */}
        <div style={styles.timeframeGroup}>
          {timeframes.map((tf) => (
            <TimeframeButton
              key={tf.value}
              value={tf.value}
              label={tf.shortLabel}
              isActive={interval === tf.value}
              onClick={handleTimeframeClick}
            />
          ))}
        </div>

        <div style={styles.divider} />

        {/* Indicators button */}
        <button
          style={{
            ...styles.indicatorsButton,
            ...(indicatorsButtonHovered ? styles.indicatorsButtonHover : {}),
          }}
          onClick={() => setIndicatorsModalOpen(true)}
          onMouseEnter={() => setIndicatorsButtonHovered(true)}
          onMouseLeave={() => setIndicatorsButtonHovered(false)}
        >
          <span style={styles.indicatorsIcon}>ƒ</span>
          <span>{t.indicators}</span>
        </button>

        {/* Gap detection error indicator */}
        {gapDetectionError?.hasError && (
          <div
            style={styles.errorIndicator}
            title={`Data sync issue: ${gapDetectionError.reason || 'unknown'} (${gapDetectionError.retryCount}/${gapDetectionError.maxRetries} retries)`}
          >
            <span>⚠️</span>
            <span>Sync issue</span>
          </div>
        )}

        {/* Debug console (optional) */}
        {logger && <DebugConsole logger={logger} />}

        {/* Spacer to push layout selector to the right */}
        <div style={styles.spacer} />

        {/* Layout selector (optional, right-aligned) */}
        {saveLoadAdapter && onLoadLayout && (
          <LayoutSelector
            chartKey={chartKey}
            saveLoadAdapter={saveLoadAdapter}
            onLoadLayout={onLoadLayout}
            onSaveLayout={onSaveLayout}
          />
        )}

        {/* Indicators Modal */}
        <IndicatorsModal
          isOpen={isIndicatorsModalOpen}
          onClose={() => setIndicatorsModalOpen(false)}
          onSelectIndicator={handleIndicatorSelect}
          activeIndicatorIds={activeIndicatorIds}
        />
      </div>
    );
  },
);

ChartTopBar.displayName = 'ChartTopBar';

// ============================================================================
// Sub-components
// ============================================================================

interface TimeframeButtonProps {
  value: ResolutionString;
  label: string;
  isActive: boolean;
  onClick: (value: ResolutionString) => void;
}

const TimeframeButton: React.FC<TimeframeButtonProps> = memo(({ value, label, isActive, onClick }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const buttonStyle = useMemo(
    () => ({
      ...styles.timeframeButton,
      ...(isActive ? styles.timeframeButtonActive : {}),
      ...(isHovered && !isActive ? styles.timeframeButtonHover : {}),
    }),
    [isActive, isHovered],
  );

  return (
    <button
      style={buttonStyle}
      onClick={() => onClick(value)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {label}
    </button>
  );
});

TimeframeButton.displayName = 'TimeframeButton';
