/**
 * IndicatorSettingsModal - Modal for configuring indicator input variables and styles
 * Generates form inputs based on Tealscript InputDefinition schema
 * Includes tabs for Inputs and Style configuration
 */

import React, { memo, useCallback, useState, useMemo, useRef, useEffect } from 'react';
import { HexAlphaColorPicker, HexColorInput } from '@tealstreet/react-colorful';
import type { InputDefinition, PlotOutput } from '@tealstreet/tealscript';
import type { ActiveIndicator } from './ChartLegend';
import type { PlotStyleOverride, LineStyle } from '../state/chartState';
import { useChartTranslations } from '../i18n';

// Re-export for convenience
export type { PlotStyleOverride, LineStyle } from '../state/chartState';

// ============================================================================
// Styles
// ============================================================================

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'var(--background, #1e222d)',
    borderRadius: 8,
    border: '1px solid var(--border, #363a45)',
    minWidth: 320,
    maxWidth: 480,
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border, #363a45)',
  },
  title: {
    color: 'var(--text, #d1d4dc)',
    fontSize: 14,
    fontWeight: 600,
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    padding: 4,
    cursor: 'pointer',
    color: 'var(--text2, #787b86)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid var(--border, #363a45)',
  },
  tab: {
    padding: '10px 20px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--text2, #787b86)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabActive: {
    color: 'var(--text, #d1d4dc)',
    borderBottomColor: 'var(--text, #d1d4dc)',
  },
  body: {
    padding: 16,
    overflowY: 'auto' as const,
    flex: 1,
    minHeight: 120,
  },
  group: {
    marginBottom: 16,
  },
  groupTitle: {
    color: 'var(--text2, #787b86)',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  formRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  label: {
    color: 'var(--text, #d1d4dc)',
    fontSize: 12,
    flex: 1,
  },
  tooltip: {
    color: 'var(--text3, #5d606b)',
    fontSize: 10,
    marginTop: 2,
  },
  input: {
    backgroundColor: 'var(--background2, #131722)',
    border: '1px solid var(--border, #363a45)',
    borderRadius: 4,
    padding: '6px 10px',
    color: 'var(--text, #d1d4dc)',
    fontSize: 12,
    width: 120,
    outline: 'none',
  },
  select: {
    backgroundColor: 'var(--background2, #131722)',
    border: '1px solid var(--border, #363a45)',
    borderRadius: 4,
    padding: '6px 10px',
    color: 'var(--text, #d1d4dc)',
    fontSize: 12,
    width: 140,
    outline: 'none',
    cursor: 'pointer',
  },
  checkbox: {
    width: 16,
    height: 16,
    cursor: 'pointer',
  },
  colorInput: {
    width: 60,
    height: 28,
    padding: 2,
    border: '1px solid var(--border, #363a45)',
    borderRadius: 4,
    backgroundColor: 'var(--background2, #131722)',
    cursor: 'pointer',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    padding: '12px 16px',
    borderTop: '1px solid var(--border, #363a45)',
  },
  button: {
    padding: '8px 16px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    outline: 'none',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    border: '1px solid var(--border, #363a45)',
    color: 'var(--text2, #787b86)',
  },
  applyButton: {
    backgroundColor: 'var(--buy-color, #26a69a)',
    color: '#fff',
  },
  // Style tab specific
  styleRow: {
    marginBottom: 20,
    padding: '12px 0',
    borderBottom: '1px solid var(--border, #363a45)',
  },
  styleRowHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  styleRowLabel: {
    color: 'var(--text, #d1d4dc)',
    fontSize: 13,
    fontWeight: 500,
    flex: 1,
  },
  styleControls: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
  },
  controlRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  controlLabel: {
    color: 'var(--text2, #787b86)',
    fontSize: 11,
    width: 60,
    flexShrink: 0,
  },
  buttonGroup: {
    display: 'flex',
    gap: 3,
  },
  optionButton: {
    width: 32,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--background2, #131722)',
    border: '1px solid var(--border, #363a45)',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  optionButtonActive: {
    backgroundColor: 'var(--text2, #787b86)',
    borderColor: 'var(--text2, #787b86)',
  },
  opacitySlider: {
    flex: 1,
    height: 4,
    WebkitAppearance: 'none' as const,
    appearance: 'none' as const,
    backgroundColor: 'var(--background2, #131722)',
    borderRadius: 2,
    cursor: 'pointer',
  },
  opacityValue: {
    width: 45,
    textAlign: 'right' as const,
    color: 'var(--text, #d1d4dc)',
    fontSize: 11,
  },
  // Compact plot style row (TradingView style)
  plotStyleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 0',
    borderBottom: '1px solid var(--border, #363a45)',
    cursor: 'pointer',
  },
  plotStyleRowLast: {
    borderBottom: 'none',
  },
  plotCheckbox: {
    width: 18,
    height: 18,
    cursor: 'pointer',
  },
  plotName: {
    flex: 1,
    color: 'var(--text, #d1d4dc)',
    fontSize: 13,
  },
  plotPreview: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    backgroundColor: 'var(--background2, #131722)',
    borderRadius: 4,
    border: '1px solid var(--border, #363a45)',
    cursor: 'pointer',
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 4,
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  linePreviewSvg: {
    width: 40,
    height: 16,
  },
  // Style popover
  stylePopoverOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1001,
  },
  stylePopover: {
    position: 'absolute' as const,
    backgroundColor: 'var(--background, #1e222d)',
    borderRadius: 8,
    border: '1px solid var(--border, #363a45)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    padding: 16,
    zIndex: 1002,
  },
  colorPickerWrapper: {
    marginBottom: 12,
  },
  hexInputRow: {
    display: 'flex',
    alignItems: 'center',
    marginTop: 8,
  },
  hexPrefix: {
    color: 'var(--text2, #787b86)',
    fontSize: 12,
    marginRight: 4,
  },
  hexInput: {
    flex: 1,
    backgroundColor: 'var(--background2, #131722)',
    border: '1px solid var(--border, #363a45)',
    borderRadius: 4,
    padding: '6px 8px',
    color: 'var(--text, #d1d4dc)',
    fontSize: 12,
    outline: 'none',
  },
};

// ============================================================================
// Props
// ============================================================================

export interface IndicatorSettingsModalProps {
  /** The indicator being configured */
  indicator: ActiveIndicator;
  /** Input definitions from the Tealscript */
  inputDefinitions: InputDefinition[];
  /** Plots from the indicator (for style configuration) */
  plots?: PlotOutput[];
  /** Current style overrides */
  styleOverrides?: PlotStyleOverride[];
  /** Callback when settings are saved */
  onSave: (inputs: Record<string, unknown>, styleOverrides?: PlotStyleOverride[]) => void;
  /** Callback to close the modal */
  onClose: () => void;
}

// ============================================================================
// Icons
// ============================================================================

const CloseIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ============================================================================
// Source options for 'source' type inputs
// ============================================================================

const SOURCE_OPTIONS = [
  { value: 'close', label: 'Close' },
  { value: 'open', label: 'Open' },
  { value: 'high', label: 'High' },
  { value: 'low', label: 'Low' },
  { value: 'hl2', label: 'HL2' },
  { value: 'hlc3', label: 'HLC3' },
  { value: 'ohlc4', label: 'OHLC4' },
  { value: 'hlcc4', label: 'HLCC4' },
];

// Line thickness options (pixel values)
const LINE_THICKNESS_OPTIONS = [1, 2, 3, 4];

// Line style options
const LINE_STYLE_OPTIONS: { value: LineStyle; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
];

// ============================================================================
// Component
// ============================================================================

export const IndicatorSettingsModal: React.FC<IndicatorSettingsModalProps> = memo(({
  indicator,
  inputDefinitions,
  plots,
  styleOverrides: initialStyleOverrides,
  onSave,
  onClose,
}) => {
  // Translations
  const t = useChartTranslations();

  // Tab state
  const [activeTab, setActiveTab] = useState<'inputs' | 'style'>('inputs');

  // Initialize form values from indicator's current inputs
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const def of inputDefinitions) {
      // Use current value from indicator if available, otherwise use default
      initial[def.id] = indicator.inputs[def.id] ?? def.defval;
    }
    return initial;
  });

  // Initialize style overrides from props or create defaults from plots
  const [styleOverrides, setStyleOverrides] = useState<PlotStyleOverride[]>(() => {
    if (initialStyleOverrides && initialStyleOverrides.length > 0) {
      return initialStyleOverrides;
    }
    // Create default overrides from plots
    if (plots) {
      return plots.map(plot => {
        // Extract color - could be string or array
        let color: string | undefined;
        if (typeof plot.color === 'string') {
          color = plot.color;
        } else if (Array.isArray(plot.color)) {
          color = plot.color.find(c => c !== null) ?? undefined;
        }
        return {
          plotId: plot.id,
          color,
          linewidth: plot.linewidth ?? 1,
          lineStyle: 'solid' as LineStyle,
          opacity: 100,
        };
      });
    }
    return [];
  });

  // Group inputs by their group property
  const groupedInputs = useMemo(() => {
    const groups = new Map<string, InputDefinition[]>();
    for (const def of inputDefinitions) {
      const group = def.group || 'Settings';
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(def);
    }
    return groups;
  }, [inputDefinitions]);

  // Handle value change
  const handleChange = useCallback((id: string, value: unknown) => {
    setValues(prev => ({ ...prev, [id]: value }));
  }, []);

  // Handle style override change
  const handleStyleChange = useCallback((
    plotId: string,
    key: 'color' | 'linewidth' | 'lineStyle' | 'opacity',
    value: string | number | LineStyle
  ) => {
    setStyleOverrides(prev => {
      const existing = prev.find(o => o.plotId === plotId);
      if (existing) {
        return prev.map(o => o.plotId === plotId ? { ...o, [key]: value } : o);
      }
      return [...prev, { plotId, [key]: value }];
    });
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    onSave(values, styleOverrides.length > 0 ? styleOverrides : undefined);
    onClose();
  }, [values, styleOverrides, onSave, onClose]);

  // Handle overlay click (close modal)
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.title}>{indicator.name}</h3>
          <button style={styles.closeButton} onClick={onClose} title={t.close}>
            <CloseIcon />
          </button>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'inputs' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('inputs')}
          >
            {t.inputs}
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'style' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('style')}
          >
            {t.style}
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Inputs Tab */}
          {activeTab === 'inputs' && (
            <>
              {Array.from(groupedInputs.entries()).map(([groupName, inputs]) => (
                <div key={groupName} style={styles.group}>
                  {groupedInputs.size > 1 && (
                    <div style={styles.groupTitle}>{groupName}</div>
                  )}
                  {inputs.map((def) => (
                    <FormInput
                      key={def.id}
                      definition={def}
                      value={values[def.id]}
                      onChange={(value) => handleChange(def.id, value)}
                    />
                  ))}
                </div>
              ))}
              {inputDefinitions.length === 0 && (
                <div style={{ color: 'var(--text2, #787b86)', fontSize: 12 }}>
                  {t.noConfigurableInputs}
                </div>
              )}
            </>
          )}

          {/* Style Tab */}
          {activeTab === 'style' && (
            <>
              {plots && plots.length > 0 ? (
                plots.map((plot, index) => {
                  const override = styleOverrides.find(o => o.plotId === plot.id);
                  // Get color - could be string or array, take first non-null color if array
                  let baseColor: string = '#2196f3';
                  if (typeof plot.color === 'string') {
                    baseColor = plot.color;
                  } else if (Array.isArray(plot.color)) {
                    const firstColor = plot.color.find(c => c !== null);
                    if (firstColor) baseColor = firstColor;
                  }
                  const currentColor = override?.color ?? baseColor;
                  const currentLinewidth = override?.linewidth ?? plot.linewidth ?? 1;
                  const currentLineStyle = override?.lineStyle ?? 'solid';
                  const currentOpacity = override?.opacity ?? 100;

                  return (
                    <PlotStyleRow
                      key={plot.id}
                      plotId={plot.id}
                      title={plot.title || plot.id}
                      color={currentColor}
                      linewidth={currentLinewidth}
                      lineStyle={currentLineStyle}
                      opacity={currentOpacity}
                      isLast={index === plots.length - 1}
                      onStyleChange={handleStyleChange}
                      toggleVisibilityLabel={t.toggleVisibility}
                      clickToEditStyleLabel={t.clickToEditStyle}
                      thicknessLabel={t.thickness}
                      lineStyleLabel={t.lineStyle}
                    />
                  );
                })
              ) : (
                <div style={{ color: 'var(--text2, #787b86)', fontSize: 12 }}>
                  {t.noStyleOptions}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            style={{ ...styles.button, ...styles.cancelButton }}
            onClick={onClose}
          >
            {t.cancel}
          </button>
          <button
            style={{ ...styles.button, ...styles.applyButton }}
            onClick={handleSave}
          >
            {t.apply}
          </button>
        </div>
      </div>
    </div>
  );
});

IndicatorSettingsModal.displayName = 'IndicatorSettingsModal';

// ============================================================================
// NumberInput Component - handles string state for better UX
// ============================================================================

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  isInteger: boolean;
  min?: number;
  max?: number;
  step?: number;
}

const NumberInput: React.FC<NumberInputProps> = memo(({
  value,
  onChange,
  isInteger,
  min,
  max,
  step,
}) => {
  const [localValue, setLocalValue] = useState(() => String(value));

  // Sync local value when external value changes
  React.useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const str = e.target.value;
    setLocalValue(str);

    // Parse and update if valid
    const parsed = isInteger ? parseInt(str, 10) : parseFloat(str);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    // On blur, ensure we have a valid number
    const parsed = isInteger ? parseInt(localValue, 10) : parseFloat(localValue);
    if (isNaN(parsed)) {
      // Reset to current value
      setLocalValue(String(value));
    } else {
      // Clamp to min/max if specified
      let clamped = parsed;
      if (min !== undefined && clamped < min) clamped = min;
      if (max !== undefined && clamped > max) clamped = max;
      if (clamped !== parsed) {
        onChange(clamped);
        setLocalValue(String(clamped));
      }
    }
  };

  return (
    <input
      type="number"
      style={styles.input}
      value={localValue}
      min={min}
      max={max}
      step={step ?? (isInteger ? 1 : 0.1)}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
});

NumberInput.displayName = 'NumberInput';

// ============================================================================
// FormInput Component
// ============================================================================

interface FormInputProps {
  definition: InputDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}

const FormInput: React.FC<FormInputProps> = memo(({ definition, value, onChange }) => {
  const { type, title, tooltip, minval, maxval, step, options } = definition;

  const renderInput = () => {
    switch (type) {
      case 'int':
        return (
          <NumberInput
            value={value as number}
            onChange={onChange}
            isInteger={true}
            min={minval}
            max={maxval}
            step={step}
          />
        );

      case 'float':
        return (
          <NumberInput
            value={value as number}
            onChange={onChange}
            isInteger={false}
            min={minval}
            max={maxval}
            step={step}
          />
        );

      case 'bool':
        return (
          <input
            type="checkbox"
            style={styles.checkbox}
            checked={value as boolean}
            onChange={(e) => onChange(e.target.checked)}
          />
        );

      case 'string':
        if (options && options.length > 0) {
          return (
            <select
              style={styles.select}
              value={value as string}
              onChange={(e) => onChange(e.target.value)}
            >
              {options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          );
        }
        return (
          <input
            type="text"
            style={styles.input}
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case 'source':
        return (
          <select
            style={styles.select}
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
          >
            {SOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'color':
        return (
          <input
            type="color"
            style={styles.colorInput}
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      default:
        return (
          <input
            type="text"
            style={styles.input}
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  };

  return (
    <div style={styles.formRow}>
      <div>
        <div style={styles.label}>{title}</div>
        {tooltip && <div style={styles.tooltip}>{tooltip}</div>}
      </div>
      {renderInput()}
    </div>
  );
});

FormInput.displayName = 'FormInput';

// ============================================================================
// PlotStyleRow Component - Compact row with popover for style editing
// ============================================================================

interface PlotStyleRowProps {
  plotId: string;
  title: string;
  color: string;
  linewidth: number;
  lineStyle: LineStyle;
  opacity: number;
  isLast: boolean;
  onStyleChange: (plotId: string, key: 'color' | 'linewidth' | 'lineStyle' | 'opacity', value: string | number | LineStyle) => void;
  toggleVisibilityLabel: string;
  clickToEditStyleLabel: string;
  thicknessLabel: string;
  lineStyleLabel: string;
}

const PlotStyleRow: React.FC<PlotStyleRowProps> = memo(({
  plotId,
  title,
  color,
  linewidth,
  lineStyle,
  opacity,
  isLast,
  onStyleChange,
  toggleVisibilityLabel,
  clickToEditStyleLabel,
  thicknessLabel,
  lineStyleLabel,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    if (!isPopoverOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsPopoverOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPopoverOpen]);

  // Get stroke dasharray for line style preview
  const getDashArray = (style: LineStyle): string => {
    switch (style) {
      case 'dashed': return '4,3';
      case 'dotted': return '1,2';
      default: return 'none';
    }
  };

  // Apply opacity to color for preview
  const colorWithOpacity = opacity < 100
    ? `${color}${Math.round(opacity * 2.55).toString(16).padStart(2, '0')}`
    : color;

  return (
    <div
      style={{
        ...styles.plotStyleRow,
        ...(isLast ? styles.plotStyleRowLast : {}),
      }}
    >
      {/* Checkbox (placeholder for visibility toggle) */}
      <input
        type="checkbox"
        style={styles.plotCheckbox}
        checked={true}
        readOnly
        title={toggleVisibilityLabel}
      />

      {/* Plot name */}
      <span style={styles.plotName}>{title}</span>

      {/* Color swatch + line preview button */}
      <div
        ref={buttonRef}
        style={styles.plotPreview}
        onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        title={clickToEditStyleLabel}
      >
        <div style={{ ...styles.colorSwatch, backgroundColor: colorWithOpacity }} />
        <svg style={styles.linePreviewSvg} viewBox="0 0 40 16">
          <line
            x1="2"
            y1="8"
            x2="38"
            y2="8"
            stroke={colorWithOpacity}
            strokeWidth={linewidth}
            strokeDasharray={getDashArray(lineStyle)}
          />
        </svg>
      </div>

      {/* Style popover */}
      {isPopoverOpen && (
        <>
          <div
            style={styles.stylePopoverOverlay}
            onClick={() => setIsPopoverOpen(false)}
          />
          <div
            ref={popoverRef}
            style={{
              ...styles.stylePopover,
              top: buttonRef.current
                ? buttonRef.current.offsetTop + buttonRef.current.offsetHeight + 8
                : 0,
              right: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Color picker */}
            <div style={styles.colorPickerWrapper}>
              <HexAlphaColorPicker
                color={colorWithOpacity}
                onChange={(newColor) => {
                  // Extract color without alpha, and alpha separately
                  const hexColor = newColor.slice(0, 7);
                  const alphaHex = newColor.slice(7);
                  onStyleChange(plotId, 'color', hexColor);
                  if (alphaHex) {
                    const alphaValue = Math.round((parseInt(alphaHex, 16) / 255) * 100);
                    onStyleChange(plotId, 'opacity', alphaValue);
                  }
                }}
              />
              <div style={styles.hexInputRow}>
                <span style={styles.hexPrefix}>#</span>
                <HexColorInput
                  color={color}
                  onChange={(newColor) => onStyleChange(plotId, 'color', newColor)}
                  style={styles.hexInput}
                />
              </div>
            </div>

            {/* Line thickness */}
            <div style={{ ...styles.controlRow, marginBottom: 10 }}>
              <span style={styles.controlLabel}>{thicknessLabel}</span>
              <div style={styles.buttonGroup}>
                {LINE_THICKNESS_OPTIONS.map((thickness) => (
                  <button
                    key={thickness}
                    style={{
                      ...styles.optionButton,
                      ...(linewidth === thickness ? styles.optionButtonActive : {}),
                    }}
                    onClick={() => onStyleChange(plotId, 'linewidth', thickness)}
                    title={`${thickness}px`}
                  >
                    <svg width="20" height="12" viewBox="0 0 20 12">
                      <line
                        x1="2"
                        y1="6"
                        x2="18"
                        y2="6"
                        stroke={linewidth === thickness ? '#131722' : '#787b86'}
                        strokeWidth={thickness}
                      />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* Line style */}
            <div style={styles.controlRow}>
              <span style={styles.controlLabel}>{lineStyleLabel}</span>
              <div style={styles.buttonGroup}>
                {LINE_STYLE_OPTIONS.map((styleOpt) => (
                  <button
                    key={styleOpt.value}
                    style={{
                      ...styles.optionButton,
                      width: 40,
                      ...(lineStyle === styleOpt.value ? styles.optionButtonActive : {}),
                    }}
                    onClick={() => onStyleChange(plotId, 'lineStyle', styleOpt.value)}
                    title={styleOpt.label}
                  >
                    <svg width="24" height="12" viewBox="0 0 24 12">
                      <line
                        x1="2"
                        y1="6"
                        x2="22"
                        y2="6"
                        stroke={lineStyle === styleOpt.value ? '#131722' : '#787b86'}
                        strokeWidth="2"
                        strokeDasharray={getDashArray(styleOpt.value)}
                      />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

PlotStyleRow.displayName = 'PlotStyleRow';
