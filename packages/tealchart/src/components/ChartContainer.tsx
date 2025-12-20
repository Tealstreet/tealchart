/**
 * ChartContainer - Complete chart component with top bar and canvas
 * Manages Jotai state and coordinates between toolbar and chart
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { ChartTopBar } from './ChartTopBar';
import { ChartLegend, type ActiveIndicator } from './ChartLegend';
import { IndicatorSettingsModal } from './IndicatorSettingsModal';
import { Tealchart, TealchartProps } from '../Tealchart';
import { createChartFocusAtoms, resolutionToMs, formatPriceWithPrecision, PlotStyleOverride, ChartSettings } from '../state/chartState';
import { type BuiltinIndicator } from '../indicators/builtinIndicators';
import { Bar, ChartMargins, ContextMenuItem, GapDetectionErrorState, OrderLineRenderData, PaneLayout, PositionLineRenderData, PriceLine, ResolutionString, Viewport } from '../types';
import type { PlotOutput, InputDefinition } from '@tealstreet/tealscript';
import type { ISaveLoadAdapter } from '../transformer';
import { TranslationProvider, useChartTranslations, type PartialChartTranslations } from '../i18n';

/** Info about each indicator for pane assignment */
export interface IndicatorPaneInfo {
  overlay: boolean;
  yAxisRange?: { min: number; max: number };
  /** Indicator name for pane label */
  name?: string;
  /** Input values for pane label display */
  inputs?: Record<string, unknown>;
}

// ============================================================================
// Props
// ============================================================================

export interface ChartContainerProps {
  /** Unique key for this chart instance (e.g., tab ID) */
  chartKey: string;
  /** Total width including top bar */
  width: number;
  /** Total height including top bar */
  height: number;
  /** Initial/current symbol */
  symbol: string;
  /** Exchange name for display */
  exchangeName?: string;
  /** Bar data */
  bars: Bar[];
  /** Price lines to render (last trade, orders, positions, etc.) */
  priceLines?: PriceLine[];
  /** Order lines to render (limit orders, stops, etc.) */
  orderLines?: OrderLineRenderData[];
  /** Position lines to render (open positions with PnL) */
  positionLines?: PositionLineRenderData[];
  /** Tealscript indicator plot outputs */
  plots?: PlotOutput[];
  /** Pane layout for multi-pane indicator rendering */
  paneLayout?: PaneLayout;
  /** Map from study ID to indicator pane info */
  indicatorPaneInfo?: Record<string, IndicatorPaneInfo>;
  /** Callback for imperative bar updates */
  onBarsUpdateRef?: React.MutableRefObject<((bars: Bar[]) => void) | null>;
  /** Callback when viewport changes */
  onViewportChange?: (viewport: Viewport) => void;
  /** Callback when more bars are needed */
  onRequestMoreBars?: (direction: 'left' | 'right') => void;
  /** Callback when interval changes */
  onIntervalChange?: (interval: ResolutionString) => void;
  /** Callback when symbol changes */
  onSymbolChange?: (symbol: string) => void;
  /** Callback when an indicator is added */
  onAddIndicator?: (indicator: BuiltinIndicator) => void;
  /** List of active indicators with visibility state */
  activeIndicators?: ActiveIndicator[];
  /** Callback when indicator visibility is toggled */
  onToggleIndicator?: (indicatorId: string) => void;
  /** Callback when indicator settings are opened */
  onSettingsIndicator?: (indicatorId: string) => void;
  /** Callback when indicator is removed */
  onRemoveIndicator?: (indicatorId: string) => void;
  /** Get input definitions for a study */
  getStudyInputDefinitions?: (studyId: string) => InputDefinition[];
  /** Callback when indicator settings are saved */
  onSaveIndicatorSettings?: (indicatorId: string, inputs: Record<string, unknown>, styleOverrides?: PlotStyleOverride[]) => void;
  /** Custom render options for styling */
  renderOptions?: TealchartProps['renderOptions'];
  /** Whether to show the top bar */
  showTopBar?: boolean;
  /** Height of the top bar (default 32) */
  topBarHeight?: number;
  /** Whether bars are currently loading */
  isLoading?: boolean;
  // Layout selector props (optional - enables layout UI)
  /** SaveLoadAdapter for layout selector */
  saveLoadAdapter?: ISaveLoadAdapter;
  /** Called when a layout is loaded */
  onLoadLayout?: (settings: ChartSettings, warnings: string[], layoutId: string | number, layoutName: string) => void;
  /** Called when save is requested */
  onSaveLayout?: () => void;
  /** Context menu callback - returns menu items for a given time/price */
  onContextMenu?: (unixTime: number, price: number) => ContextMenuItem[];
  /** Called on mouse down (for hotkey integration) */
  onMouseDown?: () => void;
  /** Called on mouse up (for hotkey integration) */
  onMouseUp?: () => void;
  /** Called when crosshair position changes (for hotkey integration) */
  onCrossHairMoved?: (price: number, time: number) => void;
  /** Translations for i18n support - if not provided, English defaults are used */
  translations?: PartialChartTranslations;
  /** Gap detection error state (if any) */
  gapDetectionError?: GapDetectionErrorState | null;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TOP_BAR_HEIGHT = 32;

// ============================================================================
// IndicatorPaneLegend - Legend overlay for indicator panes
// ============================================================================

interface IndicatorPaneLegendProps {
  top: number;
  indicators: ActiveIndicator[];
  indicatorPaneInfo?: Record<string, IndicatorPaneInfo>;
  onToggleIndicator?: (indicatorId: string) => void;
  onSettingsIndicator?: (indicatorId: string) => void;
  onRemoveIndicator?: (indicatorId: string) => void;
}

const IndicatorPaneLegend: React.FC<IndicatorPaneLegendProps> = memo(({
  top,
  indicators,
  indicatorPaneInfo,
  onToggleIndicator,
  onSettingsIndicator,
  onRemoveIndicator,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const t = useChartTranslations();

  return (
    <div
      style={{
        position: 'absolute',
        top: top + 4,
        left: 12,
        zIndex: 4,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 11,
        userSelect: 'none',
      }}
    >
      {indicators.map((indicator) => {
        const info = indicatorPaneInfo?.[indicator.id];
        const isHovered = hoveredId === indicator.id;

        // Format input values
        const inputValues = Object.entries(indicator.inputs)
          .filter(([_, v]) => v !== undefined && v !== null)
          .map(([_, v]) => {
            if (typeof v === 'number') return v.toString();
            if (typeof v === 'boolean') return v ? 'Yes' : 'No';
            return String(v);
          });

        return (
          <div
            key={indicator.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '2px 0',
              color: 'var(--text, #d1d4dc)',
              opacity: indicator.isVisible ? 1 : 0.5,
            }}
            onMouseEnter={() => setHoveredId(indicator.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <span style={{ fontWeight: 500 }}>{info?.name || indicator.name}</span>
            {inputValues.length > 0 && (
              <span style={{ color: 'var(--text2, #787b86)' }}>
                {inputValues.join(' · ')}
              </span>
            )}
            {/* Action buttons - show on hover */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                opacity: isHovered ? 1 : 0,
                transition: 'opacity 0.15s',
              }}
            >
              <PaneLegendButton
                onClick={() => onToggleIndicator?.(indicator.id)}
                title={indicator.isVisible ? t.hideIndicator : t.showIndicator}
              >
                <EyeIconSmall visible={indicator.isVisible} />
              </PaneLegendButton>
              <PaneLegendButton
                onClick={() => onSettingsIndicator?.(indicator.id)}
                title={t.indicatorSettings}
              >
                <GearIconSmall />
              </PaneLegendButton>
              <PaneLegendButton
                onClick={() => onRemoveIndicator?.(indicator.id)}
                title={t.removeIndicator}
              >
                <TrashIconSmall />
              </PaneLegendButton>
            </div>
          </div>
        );
      })}
    </div>
  );
});

IndicatorPaneLegend.displayName = 'IndicatorPaneLegend';

// Small button for pane legend actions
const PaneLegendButton: React.FC<{
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, title, children }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      style={{
        background: 'none',
        border: 'none',
        padding: 2,
        cursor: 'pointer',
        color: hovered ? 'var(--text, #d1d4dc)' : 'var(--text2, #787b86)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 2,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title}
    >
      {children}
    </button>
  );
};

// Small icons for pane legend
const EyeIconSmall: React.FC<{ visible: boolean }> = ({ visible }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

const GearIconSmall: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const TrashIconSmall: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

// ============================================================================
// Inner Component (uses Jotai atoms)
// ============================================================================

const ChartContainerInner: React.FC<ChartContainerProps> = memo(({
  chartKey,
  width,
  height,
  symbol,
  exchangeName,
  bars,
  priceLines,
  orderLines,
  positionLines,
  plots,
  paneLayout,
  indicatorPaneInfo,
  onBarsUpdateRef,
  onViewportChange,
  onRequestMoreBars,
  onIntervalChange,
  onSymbolChange,
  onAddIndicator,
  activeIndicators = [],
  onToggleIndicator,
  onSettingsIndicator,
  onRemoveIndicator,
  getStudyInputDefinitions,
  onSaveIndicatorSettings,
  renderOptions,
  showTopBar = true,
  topBarHeight = DEFAULT_TOP_BAR_HEIGHT,
  isLoading = false,
  // Layout selector props
  saveLoadAdapter,
  onLoadLayout,
  onSaveLayout,
  // Context menu
  onContextMenu,
  // Mouse events for hotkey integration
  onMouseDown,
  onMouseUp,
  onCrossHairMoved,
  // i18n
  translations,
  // Gap detection error
  gapDetectionError,
}) => {
  // Get focus atoms for this chart
  const focusAtoms = useMemo(() => createChartFocusAtoms(chartKey), [chartKey]);
  const [interval, setInterval] = useAtom(focusAtoms.intervalAtom);
  const setSymbol = useSetAtom(focusAtoms.symbolAtom);

  // Get latest bars directly from props (recalculated on every render for real-time updates)
  const latestBar = bars.length > 0 ? bars[bars.length - 1] : undefined;
  const previousBar = bars.length > 1 ? bars[bars.length - 2] : undefined;

  // Extract primitive values for reliable dependency tracking
  // (object property dependencies don't work when object is mutated in place)
  const latestClose = latestBar?.close;
  const latestOpen = latestBar?.open;

  // Countdown state for last trade line (updates every second)
  const [countdown, setCountdown] = useState<string>('--:--');

  // Settings modal state
  const [settingsModalIndicatorId, setSettingsModalIndicatorId] = useState<string | null>(null);

  // Get the indicator being configured
  const settingsModalIndicator = useMemo(() => {
    if (!settingsModalIndicatorId) return null;
    return activeIndicators.find((ind) => ind.id === settingsModalIndicatorId) || null;
  }, [settingsModalIndicatorId, activeIndicators]);

  // Get input definitions for the indicator being configured
  const settingsModalInputDefinitions = useMemo(() => {
    if (!settingsModalIndicatorId || !getStudyInputDefinitions) return [];
    return getStudyInputDefinitions(settingsModalIndicatorId);
  }, [settingsModalIndicatorId, getStudyInputDefinitions]);

  // Get plots for the indicator being configured
  const settingsModalPlots = useMemo(() => {
    if (!settingsModalIndicatorId || !plots) return [];
    // Filter plots that belong to this indicator using scriptId
    return plots.filter(plot => plot.scriptId === settingsModalIndicatorId);
  }, [settingsModalIndicatorId, plots]);

  // Handle settings click
  const handleSettingsIndicator = useCallback((indicatorId: string) => {
    setSettingsModalIndicatorId(indicatorId);
    onSettingsIndicator?.(indicatorId);
  }, [onSettingsIndicator]);

  // Handle settings modal close
  const handleCloseSettingsModal = useCallback(() => {
    setSettingsModalIndicatorId(null);
  }, []);

  // Handle settings save
  const handleSaveIndicatorSettings = useCallback((inputs: Record<string, unknown>, styleOverrides?: PlotStyleOverride[]) => {
    if (settingsModalIndicatorId && onSaveIndicatorSettings) {
      onSaveIndicatorSettings(settingsModalIndicatorId, inputs, styleOverrides);
    }
  }, [settingsModalIndicatorId, onSaveIndicatorSettings]);

  // Sync symbol to state when prop changes
  useEffect(() => {
    setSymbol(symbol);
  }, [symbol, setSymbol]);

  // Handle interval change from top bar
  const handleIntervalChange = useCallback((newInterval: ResolutionString) => {
    setInterval(newInterval);
    onIntervalChange?.(newInterval);
  }, [setInterval, onIntervalChange]);

  // Calculate margins - increase top margin when top bar overlay is shown
  const chartMargins: Partial<ChartMargins> = useMemo(() => {
    if (!showTopBar) return {};
    return { top: topBarHeight };
  }, [showTopBar, topBarHeight]);

  // CSS variables for theming (pass through from renderOptions)
  const cssVars = useMemo(() => {
    if (!renderOptions) return undefined;
    return {
      '--background': renderOptions.backgroundColor,
      '--text': renderOptions.textColor,
      '--border': renderOptions.gridColor,
      '--buy-color': renderOptions.upColor,
      '--sell-color': renderOptions.downColor,
    } as Record<string, string>;
  }, [renderOptions]);

  // Calculate bar close time and update countdown every second
  const intervalMs = useMemo(() => resolutionToMs(interval), [interval]);

  // Track the latest bar time to detect new candles
  const latestBarTime = latestBar?.time;

  useEffect(() => {
    if (!latestBarTime || intervalMs === 0) {
      setCountdown('--:--');
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      // Handle bar time in either seconds or milliseconds
      // If bar.time is less than 1e12, it's likely in seconds
      const barTimeMs = latestBarTime < 1e12 ? latestBarTime * 1000 : latestBarTime;
      const barCloseTime = barTimeMs + intervalMs;
      const remaining = Math.max(0, barCloseTime - now);
      const totalSeconds = Math.floor(remaining / 1000);
      const totalMinutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      // Format like TradingView: HH:MM:SS for >= 1 hour, MM:SS for < 1 hour
      if (totalMinutes >= 60) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        setCountdown(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setCountdown(`${totalMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(timer);
  }, [latestBarTime, intervalMs]);

  // Generate last trade price line
  const pricePrecision = renderOptions?.pricePrecision;

  const lastTradeLine: PriceLine | undefined = useMemo(() => {
    if (latestClose === undefined || latestOpen === undefined) return undefined;

    const isUp = latestClose >= latestOpen;
    const color = isUp
      ? (renderOptions?.upColor || '#26a69a')
      : (renderOptions?.downColor || '#ef5350');

    // Format price with market precision if available, otherwise use heuristic
    let priceText: string;
    if (pricePrecision && pricePrecision > 0) {
      priceText = formatPriceWithPrecision(latestClose, pricePrecision);
    } else if (latestClose >= 1000) {
      priceText = latestClose.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    } else if (latestClose >= 1) {
      priceText = latestClose.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
      priceText = latestClose.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
    }

    return {
      id: 'last-trade',
      price: latestClose,
      lineStyle: 'dotted',
      color,
      label: {
        primaryText: priceText,
        secondaryText: countdown,
      },
      // Render line on canvas for high-speed sync with candles
      // Label rendered in Konva for collision resolution with order/position labels
      renderLineOnCanvas: true,
    };
  // Use primitive values for reliable dependency tracking
  }, [latestClose, latestOpen, countdown, pricePrecision, renderOptions?.upColor, renderOptions?.downColor]);

  // Combine last trade line with external price lines
  const allPriceLines: PriceLine[] = useMemo(() => {
    const lines: PriceLine[] = [];
    if (lastTradeLine) {
      lines.push(lastTradeLine);
    }
    if (priceLines) {
      lines.push(...priceLines);
    }
    return lines;
  }, [lastTradeLine, priceLines]);

  // Build plotStyleOverrides map from activeIndicators
  const plotStyleOverrides: Map<string, PlotStyleOverride> = useMemo(() => {
    const map = new Map<string, PlotStyleOverride>();
    for (const indicator of activeIndicators) {
      if (indicator.styleOverrides) {
        for (const override of indicator.styleOverrides) {
          map.set(override.plotId, override);
        }
      }
    }
    return map;
  }, [activeIndicators]);

  // Compute indicator pane positions for overlay legends
  const indicatorPanePositions = useMemo(() => {
    if (!paneLayout || paneLayout.indicatorPanes.length === 0) return [];

    // Constants matching the renderer
    const TIME_AXIS_HEIGHT = 30;
    const availableHeight = height - TIME_AXIS_HEIGHT;

    // Calculate main pane height
    const mainPanePixelHeight = availableHeight * paneLayout.mainPaneHeight;

    // Calculate indicator pane positions
    let currentTop = mainPanePixelHeight;
    return paneLayout.indicatorPanes.map((pane) => {
      const paneHeight = availableHeight * pane.heightRatio;
      const position = {
        id: pane.id,
        indicatorIds: pane.indicatorIds,
        top: currentTop,
        height: paneHeight,
      };
      currentTop += paneHeight;
      return position;
    });
  }, [paneLayout, height]);

  // Get non-overlay indicators for pane legends
  const nonOverlayIndicators = useMemo(() => {
    if (!indicatorPaneInfo) return [];
    return activeIndicators.filter(ind => {
      const info = indicatorPaneInfo[ind.id];
      return info?.overlay === false;
    });
  }, [activeIndicators, indicatorPaneInfo]);

  return (
    <div style={{ width, height, position: 'relative' }}>
      {/* Chart renders full size, behind top bar */}
      {!isLoading && (
        <Tealchart
          width={width}
          height={height}
          bars={bars}
          priceLines={allPriceLines}
          orderLines={orderLines}
          positionLines={positionLines}
          plots={plots}
          paneLayout={paneLayout}
          indicatorPaneInfo={indicatorPaneInfo}
          plotStyleOverrides={plotStyleOverrides}
          renderOptions={renderOptions}
          margins={chartMargins}
          onBarsUpdateRef={onBarsUpdateRef}
          onViewportChange={onViewportChange}
          onRequestMoreBars={onRequestMoreBars}
          onContextMenu={onContextMenu}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onCrossHairMoved={onCrossHairMoved}
        />
      )}
      {/* Top bar overlays chart with transparency */}
      {showTopBar && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5 }}>
          <ChartTopBar
            chartKey={chartKey}
            symbol={symbol}
            exchangeName={exchangeName}
            onIntervalChange={handleIntervalChange}
            onSymbolChange={onSymbolChange}
            onAddIndicator={onAddIndicator}
            activeIndicatorIds={activeIndicators.map((ind) => ind.id)}
            cssVars={cssVars}
            saveLoadAdapter={saveLoadAdapter}
            onLoadLayout={onLoadLayout}
            onSaveLayout={onSaveLayout}
            gapDetectionError={gapDetectionError}
          />
        </div>
      )}
      {/* Chart legend with OHLC and indicators list */}
      <ChartLegend
        symbol={symbol}
        interval={interval}
        exchangeName={exchangeName}
        latestBar={latestBar}
        previousBar={previousBar}
        activeIndicators={activeIndicators}
        indicatorPaneInfo={indicatorPaneInfo}
        onToggleIndicator={onToggleIndicator}
        onSettingsIndicator={handleSettingsIndicator}
        onRemoveIndicator={onRemoveIndicator}
      />
      {/* Indicator pane legends - rendered as overlays on each indicator pane */}
      {indicatorPanePositions.map((panePos) => {
        // Find the indicators for this pane
        const paneIndicators = nonOverlayIndicators.filter(
          ind => panePos.indicatorIds.includes(ind.id)
        );
        if (paneIndicators.length === 0) return null;

        return (
          <IndicatorPaneLegend
            key={panePos.id}
            top={panePos.top}
            indicators={paneIndicators}
            indicatorPaneInfo={indicatorPaneInfo}
            onToggleIndicator={onToggleIndicator}
            onSettingsIndicator={handleSettingsIndicator}
            onRemoveIndicator={onRemoveIndicator}
          />
        );
      })}
      {/* Loading state - show placeholder and spinner */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: showTopBar ? topBarHeight : 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: renderOptions?.backgroundColor || '#1e222d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              border: '3px solid rgba(255, 255, 255, 0.2)',
              borderTopColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '50%',
              animation: 'tealchartSpin 0.8s linear infinite',
            }}
          />
          <style>
            {`
              @keyframes tealchartSpin {
                to { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      )}
      {/* Indicator settings modal */}
      {settingsModalIndicator && (
        <IndicatorSettingsModal
          indicator={settingsModalIndicator}
          inputDefinitions={settingsModalInputDefinitions}
          plots={settingsModalPlots}
          styleOverrides={settingsModalIndicator.styleOverrides}
          onSave={handleSaveIndicatorSettings}
          onClose={handleCloseSettingsModal}
        />
      )}
    </div>
  );
});

ChartContainerInner.displayName = 'ChartContainerInner';

// ============================================================================
// Main Component (wraps with TranslationProvider)
// ============================================================================

// Note: We don't need a Jotai Provider wrapper because atoms are already
// scoped by chartKey via createChartFocusAtoms(chartKey). Each chart instance
// gets its own set of atoms stored in a cache, providing state isolation.
export const ChartContainer: React.FC<ChartContainerProps> = memo((props) => {
  return (
    <TranslationProvider translations={props.translations}>
      <ChartContainerInner {...props} />
    </TranslationProvider>
  );
});

ChartContainer.displayName = 'ChartContainer';

// ============================================================================
// Exports
// ============================================================================

export { ChartTopBar } from './ChartTopBar';
export { ChartLegend, type ActiveIndicator } from './ChartLegend';
