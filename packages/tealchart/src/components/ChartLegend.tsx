/**
 * ChartLegend - Chart legend overlay showing symbol info, OHLC, and active indicators
 * Positioned in the top-left corner of the chart canvas area
 */

import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Bar, ResolutionString } from '../types';
import { useChartTranslations } from '../i18n';
import { useMobileTapHover, isTouchDevice } from '../hooks/useMobileTapHover';

// ============================================================================
// Types
// ============================================================================

import type { PlotStyleOverride } from '../state/chartState';

export interface ActiveIndicator {
  id: string;
  name: string;
  isVisible: boolean;
  inputs: Record<string, unknown>;
  styleOverrides?: PlotStyleOverride[];
}

/** Info about an indicator for pane assignment */
export interface IndicatorPaneInfo {
  overlay: boolean;
  yAxisRange?: { min: number; max: number };
  /** Indicator name for pane label */
  name?: string;
  /** Input values for pane label display */
  inputs?: Record<string, unknown>;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: {
    position: 'absolute' as const,
    top: 40,  // Below the 32px top bar + 8px padding
    left: 12,
    zIndex: 4,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 12,
    userSelect: 'none' as const,
  },
  mainRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  symbolInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    color: 'var(--text, #d1d4dc)',
    fontWeight: 500,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: 'var(--buy-color, #26a69a)',
    marginLeft: 4,
  },
  ohlcGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  ohlcItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  ohlcLabel: {
    color: 'var(--text3, #5d606b)',
    fontSize: 11,
  },
  ohlcValue: {
    color: 'var(--text, #d1d4dc)',
    fontFamily: 'monospace',
    fontSize: 11,
  },
  ohlcValueUp: {
    color: 'var(--buy-color, #26a69a)',
  },
  ohlcValueDown: {
    color: 'var(--sell-color, #ef5350)',
  },
  changeValue: {
    fontFamily: 'monospace',
    fontSize: 11,
  },
  indicatorToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 0',
    cursor: 'pointer',
    color: 'var(--text2, #787b86)',
    fontSize: 11,
  },
  indicatorToggleIcon: {
    fontSize: 10,
    transition: 'transform 0.15s',
  },
  indicatorList: {
    marginTop: 2,
  },
  indicatorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '3px 0',
    fontSize: 11,
    color: 'var(--text, #d1d4dc)',
    transition: 'opacity 0.15s',
  },
  indicatorRowDisabled: {
    opacity: 0.5,
  },
  indicatorName: {
    fontWeight: 500,
  },
  indicatorInputs: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginLeft: 6,
  },
  indicatorInput: {
    color: 'var(--text2, #787b86)',
    fontSize: 11,
  },
  indicatorActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    opacity: 0,
    transition: 'opacity 0.15s',
  },
  indicatorActionsVisible: {
    opacity: 1,
  },
  iconButton: {
    background: 'none',
    border: 'none',
    padding: 2,
    cursor: 'pointer',
    color: 'var(--text2, #787b86)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  iconButtonHover: {
    color: 'var(--text, #d1d4dc)',
  },
};

// ============================================================================
// Props
// ============================================================================

export interface ChartLegendProps {
  /** Current symbol */
  symbol: string;
  /** Current interval */
  interval: ResolutionString;
  /** Exchange name */
  exchangeName?: string;
  /** Latest bar for OHLC display */
  latestBar?: Bar;
  /** Previous bar for change calculation */
  previousBar?: Bar;
  /** List of active indicators */
  activeIndicators?: ActiveIndicator[];
  /** Map from indicator ID to pane info (overlay vs dedicated pane) */
  indicatorPaneInfo?: Record<string, IndicatorPaneInfo>;
  /** Callback when indicator visibility is toggled */
  onToggleIndicator?: (indicatorId: string) => void;
  /** Callback when indicator settings are opened */
  onSettingsIndicator?: (indicatorId: string) => void;
  /** Callback when indicator is removed */
  onRemoveIndicator?: (indicatorId: string) => void;
}

// ============================================================================
// Icons
// ============================================================================

const EyeIcon: React.FC<{ visible: boolean }> = ({ visible }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {visible ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

const TrashIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const GearIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const ChevronIcon: React.FC<{ expanded: boolean }> = ({ expanded }) => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ============================================================================
// Component
// ============================================================================

export const ChartLegend: React.FC<ChartLegendProps> = memo(({
  symbol,
  interval,
  exchangeName,
  latestBar,
  previousBar,
  activeIndicators = [],
  indicatorPaneInfo,
  onToggleIndicator,
  onSettingsIndicator,
  onRemoveIndicator,
}) => {
  const t = useChartTranslations();
  const [isExpanded, setIsExpanded] = useState(true);
  const [hoveredIndicatorId, setHoveredIndicatorId] = useState<string | null>(null);

  // Mobile tap-hover for showing action buttons on touch devices
  // Disabled when legend is collapsed (no indicators visible)
  const {
    isActive: mobileHoverActive,
    handleTap: handleMobileTap,
    handleDragStart: handleMobileDragStart,
    resetTimer: resetMobileTimer,
  } = useMobileTapHover({ disabled: !isExpanded });

  // Track touch state for tap vs drag detection
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isTouchDraggingRef = useRef(false);
  const TOUCH_TAP_THRESHOLD = 10;

  // Touch handlers for mobile tap-hover
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isTouchDevice()) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    isTouchDraggingRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > TOUCH_TAP_THRESHOLD) {
      isTouchDraggingRef.current = true;
      handleMobileDragStart();
    }
  }, [handleMobileDragStart]);

  const handleTouchEnd = useCallback(() => {
    if (touchStartRef.current && !isTouchDraggingRef.current) {
      // It was a tap, not a drag - toggle mobile hover
      handleMobileTap();
    }
    touchStartRef.current = null;
    isTouchDraggingRef.current = false;
  }, [handleMobileTap]);

  // Reset mobile timer when action buttons are clicked
  const handleIndicatorAction = useCallback((action: () => void) => {
    return () => {
      action();
      if (mobileHoverActive) {
        resetMobileTimer();
      }
    };
  }, [mobileHoverActive, resetMobileTimer]);

  // Filter to only show overlay indicators in this legend
  // Non-overlay indicators with dedicated panes will have their legend rendered in the pane
  const overlayIndicators = useMemo(() => {
    if (!indicatorPaneInfo) return activeIndicators;
    return activeIndicators.filter(ind => {
      const info = indicatorPaneInfo[ind.id];
      // Show in legend if overlay is true or if no info (default to overlay)
      return info?.overlay !== false;
    });
  }, [activeIndicators, indicatorPaneInfo]);

  // Calculate price change
  const priceChange = useMemo(() => {
    if (!latestBar || !previousBar) return null;
    const change = latestBar.close - previousBar.close;
    const changePercent = (change / previousBar.close) * 100;
    return { change, changePercent, isUp: change >= 0 };
  }, [latestBar, previousBar]);

  // Format price with appropriate decimals
  const formatPrice = useCallback((price: number) => {
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    if (price >= 1) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  }, []);

  // Format interval for display
  const formatInterval = useCallback((int: ResolutionString) => {
    if (int === '1D' || int === 'D') return '1D';
    if (int === '1W' || int === 'W') return '1W';
    const num = parseInt(int, 10);
    if (!isNaN(num)) {
      if (num >= 60) return `${num / 60}h`;
      return `${num}m`;
    }
    return int;
  }, []);

  const hasOverlayIndicators = overlayIndicators.length > 0;

  return (
    <div
      style={styles.container}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Main row: Symbol · Interval · Exchange + OHLC */}
      <div style={styles.mainRow}>
        <div style={styles.symbolInfo}>
          <span>{symbol}</span>
          <span style={{ color: 'var(--text3, #5d606b)' }}>·</span>
          <span>{formatInterval(interval)}</span>
          {exchangeName && (
            <>
              <span style={{ color: 'var(--text3, #5d606b)' }}>·</span>
              <span style={{ color: 'var(--text2, #787b86)' }}>{exchangeName}</span>
            </>
          )}
          <div style={styles.dot} />
        </div>

        {/* OHLC values */}
        {latestBar && (
          <div style={styles.ohlcGroup}>
            <OHLCItem label="O" value={formatPrice(latestBar.open)} />
            <OHLCItem label="H" value={formatPrice(latestBar.high)} />
            <OHLCItem label="L" value={formatPrice(latestBar.low)} />
            <OHLCItem
              label="C"
              value={formatPrice(latestBar.close)}
              isUp={latestBar.close >= latestBar.open}
            />
            {priceChange && (
              <span
                style={{
                  ...styles.changeValue,
                  color: priceChange.isUp
                    ? 'var(--buy-color, #26a69a)'
                    : 'var(--sell-color, #ef5350)',
                }}
              >
                {priceChange.isUp ? '+' : ''}{priceChange.change.toFixed(1)} ({priceChange.changePercent.toFixed(2)}%)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Expanded indicator list - only overlay indicators shown here */}
      {hasOverlayIndicators && isExpanded && (
        <div style={styles.indicatorList}>
          {overlayIndicators.map((indicator) => (
            <IndicatorRow
              key={indicator.id}
              indicator={indicator}
              isHovered={hoveredIndicatorId === indicator.id}
              mobileHoverActive={mobileHoverActive}
              onMouseEnter={() => setHoveredIndicatorId(indicator.id)}
              onMouseLeave={() => setHoveredIndicatorId(null)}
              onToggle={handleIndicatorAction(() => onToggleIndicator?.(indicator.id))}
              onSettings={handleIndicatorAction(() => onSettingsIndicator?.(indicator.id))}
              onRemove={handleIndicatorAction(() => onRemoveIndicator?.(indicator.id))}
              hideIndicatorLabel={t.hideIndicator}
              showIndicatorLabel={t.showIndicator}
              indicatorSettingsLabel={t.indicatorSettings}
              removeIndicatorLabel={t.removeIndicator}
            />
          ))}
        </div>
      )}

      {/* Indicators toggle (only show if there are overlay indicators) */}
      {hasOverlayIndicators && (
        <div
          style={styles.indicatorToggle}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <ChevronIcon expanded={isExpanded} />
          <span>{overlayIndicators.length} indicator{overlayIndicators.length !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
});

ChartLegend.displayName = 'ChartLegend';

// ============================================================================
// Sub-components
// ============================================================================

interface OHLCItemProps {
  label: string;
  value: string;
  isUp?: boolean;
}

const OHLCItem: React.FC<OHLCItemProps> = memo(({ label, value, isUp }) => (
  <div style={styles.ohlcItem}>
    <span style={styles.ohlcLabel}>{label}</span>
    <span
      style={{
        ...styles.ohlcValue,
        ...(isUp !== undefined ? (isUp ? styles.ohlcValueUp : styles.ohlcValueDown) : {}),
      }}
    >
      {value}
    </span>
  </div>
));

OHLCItem.displayName = 'OHLCItem';

interface IndicatorRowProps {
  indicator: ActiveIndicator;
  isHovered: boolean;
  /** Mobile tap-hover active (shows all action buttons on touch devices) */
  mobileHoverActive?: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onToggle: () => void;
  onSettings: () => void;
  onRemove: () => void;
  hideIndicatorLabel: string;
  showIndicatorLabel: string;
  indicatorSettingsLabel: string;
  removeIndicatorLabel: string;
}

const IndicatorRow: React.FC<IndicatorRowProps> = memo(({
  indicator,
  isHovered,
  mobileHoverActive = false,
  onMouseEnter,
  onMouseLeave,
  onToggle,
  onSettings,
  onRemove,
  hideIndicatorLabel,
  showIndicatorLabel,
  indicatorSettingsLabel,
  removeIndicatorLabel,
}) => {
  // Show action buttons when either mouse hover (desktop) or mobile tap-hover is active
  const showActions = isHovered || mobileHoverActive;
  const [eyeHovered, setEyeHovered] = useState(false);
  const [gearHovered, setGearHovered] = useState(false);
  const [trashHovered, setTrashHovered] = useState(false);

  // Format input values for display
  const inputValues = useMemo(() => {
    const entries = Object.entries(indicator.inputs);
    if (entries.length === 0) return null;
    return entries.map(([_key, value]) => {
      // Format the value nicely
      if (typeof value === 'number') {
        return value.toString();
      }
      if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
      }
      return String(value);
    });
  }, [indicator.inputs]);

  return (
    <div
      style={{
        ...styles.indicatorRow,
        ...(!indicator.isVisible ? styles.indicatorRowDisabled : {}),
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <span style={styles.indicatorName}>{indicator.name}</span>
      {inputValues && inputValues.length > 0 && (
        <div style={styles.indicatorInputs}>
          {inputValues.map((value, idx) => (
            <span key={idx} style={styles.indicatorInput}>
              {idx > 0 && <span style={{ marginRight: 4 }}>·</span>}
              {value}
            </span>
          ))}
        </div>
      )}
      <div
        style={{
          ...styles.indicatorActions,
          ...(showActions ? styles.indicatorActionsVisible : {}),
        }}
      >
        <button
          style={{
            ...styles.iconButton,
            ...(eyeHovered ? styles.iconButtonHover : {}),
          }}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          onMouseEnter={() => setEyeHovered(true)}
          onMouseLeave={() => setEyeHovered(false)}
          title={indicator.isVisible ? hideIndicatorLabel : showIndicatorLabel}
        >
          <EyeIcon visible={indicator.isVisible} />
        </button>
        <button
          style={{
            ...styles.iconButton,
            ...(gearHovered ? styles.iconButtonHover : {}),
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSettings();
          }}
          onMouseEnter={() => setGearHovered(true)}
          onMouseLeave={() => setGearHovered(false)}
          title={indicatorSettingsLabel}
        >
          <GearIcon />
        </button>
        <button
          style={{
            ...styles.iconButton,
            ...(trashHovered ? styles.iconButtonHover : {}),
          }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onMouseEnter={() => setTrashHovered(true)}
          onMouseLeave={() => setTrashHovered(false)}
          title={removeIndicatorLabel}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
});

IndicatorRow.displayName = 'IndicatorRow';
