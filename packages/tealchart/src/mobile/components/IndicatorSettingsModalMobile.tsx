/**
 * IndicatorSettingsModalMobile - Modal for configuring indicator settings on mobile
 *
 * Mobile implementation of the web's IndicatorSettingsModal.
 * Provides two tabs (Inputs and Style) with form controls for indicator configuration.
 * Uses React Native Modal for consistent presentation.
 */

import type { InputDefinition, PlotOutput } from '@tealstreet/tealscript';
import type { LineStyle, PlotStyleOverride } from '../../state/chartState';

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

// =============================================================================
// Types
// =============================================================================

export interface IndicatorSettingsData {
  /** Indicator instance ID */
  id: string;
  /** Display name */
  name: string;
  /** Current input values */
  inputs: Record<string, unknown>;
  /** Current style overrides */
  styleOverrides?: PlotStyleOverride[];
}

export interface IndicatorSettingsModalMobileProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** The indicator to configure */
  indicator: IndicatorSettingsData | null;
  /** Input definitions from the tealscript */
  inputDefinitions: InputDefinition[];
  /** Plot outputs for style configuration */
  plots: PlotOutput[];
  /** Callback when settings are saved */
  onSave: (inputs: Record<string, unknown>, styleOverrides?: PlotStyleOverride[]) => void;
}

// Source options for 'source' type inputs
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

// Line thickness options
const LINE_THICKNESS_OPTIONS = [1, 2, 3, 4];

// Line style options
const LINE_STYLE_OPTIONS: { value: LineStyle; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
];

// =============================================================================
// Component
// =============================================================================

export const IndicatorSettingsModalMobile: React.FC<IndicatorSettingsModalMobileProps> = memo(
  ({ visible, onClose, indicator, inputDefinitions, plots, onSave }) => {
    const [activeTab, setActiveTab] = useState<'inputs' | 'style'>('inputs');
    const [values, setValues] = useState<Record<string, unknown>>({});
    const [styleOverrides, setStyleOverrides] = useState<PlotStyleOverride[]>([]);

    // Initialize values when indicator changes
    useEffect(() => {
      if (!visible || !indicator) return;

      // Initialize input values
      const initialValues: Record<string, unknown> = {};
      for (const def of inputDefinitions) {
        initialValues[def.id] = indicator.inputs[def.id] ?? def.defval;
      }
      setValues(initialValues);

      // Initialize style overrides
      if (indicator.styleOverrides && indicator.styleOverrides.length > 0) {
        setStyleOverrides([...indicator.styleOverrides]);
      } else if (plots && plots.length > 0) {
        setStyleOverrides(
          plots.map((plot) => {
            let color: string | undefined;
            if (typeof plot.color === 'string') {
              color = plot.color;
            } else if (Array.isArray(plot.color)) {
              color = plot.color.find((c) => c !== null) ?? undefined;
            }
            return {
              plotId: plot.id,
              color,
              linewidth: plot.linewidth ?? 1,
              lineStyle: 'solid' as LineStyle,
              opacity: 100,
            };
          }),
        );
      } else {
        setStyleOverrides([]);
      }

      setActiveTab('inputs');
    }, [visible, indicator, inputDefinitions, plots]);

    // Update a single input value
    const updateValue = useCallback((id: string, value: unknown) => {
      setValues((prev) => ({ ...prev, [id]: value }));
    }, []);

    // Update a style override property
    const updateStyleOverride = useCallback(
      (plotId: string, key: keyof PlotStyleOverride, value: string | number | LineStyle) => {
        setStyleOverrides((prev) => {
          const existing = prev.find((o) => o.plotId === plotId);
          if (existing) {
            return prev.map((o) => (o.plotId === plotId ? { ...o, [key]: value } : o));
          }
          return [...prev, { plotId, [key]: value }];
        });
      },
      [],
    );

    // Handle save
    const handleSave = useCallback(() => {
      const overrides = styleOverrides.length > 0 ? styleOverrides : undefined;
      onSave(values, overrides);
      onClose();
    }, [values, styleOverrides, onSave, onClose]);

    if (!indicator) return null;

    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={1}>
                {indicator.name}
              </Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <Text style={styles.closeButton}>{'×'}</Text>
              </Pressable>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
              <Pressable
                style={[styles.tab, activeTab === 'inputs' && styles.tabActive]}
                onPress={() => setActiveTab('inputs')}
              >
                <Text style={[styles.tabText, activeTab === 'inputs' && styles.tabTextActive]}>Inputs</Text>
              </Pressable>
              <Pressable
                style={[styles.tab, activeTab === 'style' && styles.tabActive]}
                onPress={() => setActiveTab('style')}
              >
                <Text style={[styles.tabText, activeTab === 'style' && styles.tabTextActive]}>Style</Text>
              </Pressable>
            </View>

            {/* Body */}
            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
              {activeTab === 'inputs' ? (
                <InputsTab inputDefinitions={inputDefinitions} values={values} onUpdateValue={updateValue} />
              ) : (
                <StyleTab plots={plots} styleOverrides={styleOverrides} onUpdateStyleOverride={updateStyleOverride} />
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <Pressable style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.applyButton} onPress={handleSave}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  },
);

IndicatorSettingsModalMobile.displayName = 'IndicatorSettingsModalMobile';

// =============================================================================
// Inputs Tab
// =============================================================================

interface InputsTabProps {
  inputDefinitions: InputDefinition[];
  values: Record<string, unknown>;
  onUpdateValue: (id: string, value: unknown) => void;
}

const InputsTab: React.FC<InputsTabProps> = memo(({ inputDefinitions, values, onUpdateValue }) => {
  if (inputDefinitions.length === 0) {
    return <Text style={styles.emptyState}>No configurable inputs</Text>;
  }

  // Group inputs
  const groups = useMemo(() => {
    const map = new Map<string, InputDefinition[]>();
    for (const def of inputDefinitions) {
      const group = def.group || 'Settings';
      if (!map.has(group)) {
        map.set(group, []);
      }
      map.get(group)!.push(def);
    }
    return map;
  }, [inputDefinitions]);

  return (
    <>
      {Array.from(groups.entries()).map(([groupName, inputs]) => (
        <View key={groupName} style={styles.group}>
          {groups.size > 1 && <Text style={styles.groupTitle}>{groupName}</Text>}
          {inputs.map((def) => (
            <FormInput key={def.id} definition={def} value={values[def.id] ?? def.defval} onUpdate={onUpdateValue} />
          ))}
        </View>
      ))}
    </>
  );
});

InputsTab.displayName = 'InputsTab';

// =============================================================================
// Form Input
// =============================================================================

interface FormInputProps {
  definition: InputDefinition;
  value: unknown;
  onUpdate: (id: string, value: unknown) => void;
}

const FormInput: React.FC<FormInputProps> = memo(({ definition, value, onUpdate }) => {
  const def = definition;
  const active = def.active === undefined ? true : Boolean(def.active);

  const label = (
    <View style={styles.labelContainer}>
      <Text style={[styles.label, !active && styles.disabledText]}>{def.title}</Text>
      {def.tooltip ? <Text style={styles.tooltip}>{def.tooltip}</Text> : null}
    </View>
  );

  const renderOptionGroup = (options: unknown[], selectedValue: unknown) => (
    <View style={styles.optionGroup}>
      {options.map((opt) => {
        const optionValue = String(opt);
        const selected = optionValue === String(selectedValue);
        return (
          <Pressable
            key={optionValue}
            disabled={!active}
            style={[styles.optionBtn, selected && styles.optionBtnActive, !active && styles.disabledControl]}
            onPress={() => onUpdate(def.id, opt)}
          >
            <Text style={[styles.optionBtnText, selected && styles.optionBtnTextActive]}>{optionValue}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  switch (def.type) {
    case 'int':
    case 'float':
      if (def.options && def.options.length > 0) {
        return (
          <View style={styles.formRow}>
            {label}
            {renderOptionGroup(def.options, value)}
          </View>
        );
      }
      return (
        <View style={styles.formRow}>
          {label}
          <TextInput
            style={[styles.numberInput, !active && styles.disabledControl]}
            editable={active}
            value={String(value)}
            keyboardType="numeric"
            onChangeText={(text) => {
              const val = def.type === 'int' ? parseInt(text, 10) : parseFloat(text);
              onUpdate(def.id, isNaN(val) ? def.defval : val);
            }}
          />
        </View>
      );

    case 'bool':
      return (
        <View style={styles.formRow}>
          {label}
          <Switch
            disabled={!active}
            value={Boolean(value)}
            onValueChange={(val) => onUpdate(def.id, val)}
            trackColor={{ false: '#363a45', true: '#26a69a' }}
            thumbColor="#d1d4dc"
          />
        </View>
      );

    case 'string':
      if (def.options && def.options.length > 0) {
        return (
          <View style={styles.formRow}>
            {label}
            {renderOptionGroup(def.options, value)}
          </View>
        );
      }
      return (
        <View style={styles.formRow}>
          {label}
          <TextInput
            style={[styles.textInput, !active && styles.disabledControl]}
            editable={active}
            value={String(value)}
            onChangeText={(text) => onUpdate(def.id, text)}
          />
        </View>
      );

    case 'timeframe':
    case 'symbol':
    case 'session':
      return (
        <View style={styles.formRow}>
          {label}
          {def.options && def.options.length > 0 ? (
            renderOptionGroup(def.options, value)
          ) : (
            <TextInput
              style={[styles.textInput, !active && styles.disabledControl]}
              editable={active}
              value={String(value)}
              onChangeText={(text) => onUpdate(def.id, text)}
            />
          )}
        </View>
      );

    case 'price':
      return (
        <View style={styles.formRow}>
          {label}
          <TextInput
            style={[styles.numberInput, !active && styles.disabledControl]}
            editable={active}
            value={String(value)}
            keyboardType="numeric"
            onChangeText={(text) => {
              const val = parseFloat(text);
              onUpdate(def.id, isNaN(val) ? def.defval : val);
            }}
          />
        </View>
      );

    case 'time':
      return (
        <View style={styles.formRow}>
          {label}
          <TextInput
            style={[styles.numberInput, !active && styles.disabledControl]}
            editable={active}
            value={String(value)}
            keyboardType="numeric"
            onChangeText={(text) => {
              const val = parseInt(text, 10);
              onUpdate(def.id, isNaN(val) ? def.defval : val);
            }}
          />
        </View>
      );

    case 'text_area':
      return (
        <View style={styles.formRow}>
          {label}
          <TextInput
            style={[styles.textInput, styles.textAreaInput, !active && styles.disabledControl]}
            editable={active}
            multiline
            value={String(value)}
            onChangeText={(text) => onUpdate(def.id, text)}
          />
        </View>
      );

    case 'source':
      const selectedSource = typeof value === 'string' ? value : 'close';
      return (
        <View style={styles.formRow}>
          {label}
          <View style={styles.optionGroup}>
            {SOURCE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                disabled={!active}
                style={[
                  styles.optionBtn,
                  opt.value === selectedSource && styles.optionBtnActive,
                  !active && styles.disabledControl,
                ]}
                onPress={() => onUpdate(def.id, opt.value)}
              >
                <Text style={[styles.optionBtnText, opt.value === selectedSource && styles.optionBtnTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      );

    case 'color':
      return (
        <View style={styles.formRow}>
          {label}
          <View style={[styles.colorSwatch, { backgroundColor: String(value) }, !active && styles.disabledControl]} />
        </View>
      );

    default:
      return (
        <View style={styles.formRow}>
          {label}
          <TextInput
            style={[styles.textInput, !active && styles.disabledControl]}
            editable={active}
            value={String(value)}
            onChangeText={(text) => onUpdate(def.id, text)}
          />
        </View>
      );
  }
});

FormInput.displayName = 'FormInput';

// =============================================================================
// Style Tab
// =============================================================================

interface StyleTabProps {
  plots: PlotOutput[];
  styleOverrides: PlotStyleOverride[];
  onUpdateStyleOverride: (plotId: string, key: keyof PlotStyleOverride, value: string | number | LineStyle) => void;
}

const StyleTab: React.FC<StyleTabProps> = memo(({ plots, styleOverrides, onUpdateStyleOverride }) => {
  if (!plots || plots.length === 0) {
    return <Text style={styles.emptyState}>No style options available</Text>;
  }

  return (
    <>
      {plots.map((plot, index) => (
        <PlotStyleRow
          key={plot.id}
          plot={plot}
          override={styleOverrides.find((o) => o.plotId === plot.id)}
          isLast={index === plots.length - 1}
          onUpdateStyleOverride={onUpdateStyleOverride}
        />
      ))}
    </>
  );
});

StyleTab.displayName = 'StyleTab';

// =============================================================================
// Plot Style Row
// =============================================================================

interface PlotStyleRowProps {
  plot: PlotOutput;
  override: PlotStyleOverride | undefined;
  isLast: boolean;
  onUpdateStyleOverride: (plotId: string, key: keyof PlotStyleOverride, value: string | number | LineStyle) => void;
}

const PlotStyleRow: React.FC<PlotStyleRowProps> = memo(({ plot, override, isLast, onUpdateStyleOverride }) => {
  const [expanded, setExpanded] = useState(false);

  // Get base color from plot
  let baseColor = '#2196f3';
  if (typeof plot.color === 'string') {
    baseColor = plot.color;
  } else if (Array.isArray(plot.color)) {
    const firstColor = plot.color.find((c) => c !== null);
    if (firstColor) baseColor = firstColor;
  }

  const currentColor = override?.color ?? baseColor;
  const currentLinewidth = override?.linewidth ?? plot.linewidth ?? 1;
  const currentLineStyle = override?.lineStyle ?? 'solid';

  return (
    <View style={[styles.plotRow, isLast && styles.plotRowLast]}>
      {/* Plot name + color swatch */}
      <Pressable style={styles.plotHeader} onPress={() => setExpanded(!expanded)}>
        <View style={[styles.plotColorSwatch, { backgroundColor: currentColor }]} />
        <Text style={styles.plotName}>{plot.title || plot.id}</Text>
        <Text style={styles.expandIcon}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>

      {/* Expanded controls */}
      {expanded && (
        <View style={styles.plotControls}>
          {/* Line thickness */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Thickness</Text>
            <View style={styles.controlButtonGroup}>
              {LINE_THICKNESS_OPTIONS.map((thickness) => (
                <Pressable
                  key={thickness}
                  style={[styles.controlButton, currentLinewidth === thickness && styles.controlButtonActive]}
                  onPress={() => onUpdateStyleOverride(plot.id, 'linewidth', thickness)}
                >
                  <View
                    style={[
                      styles.thicknessLine,
                      {
                        height: thickness,
                        backgroundColor: currentLinewidth === thickness ? '#131722' : '#787b86',
                      },
                    ]}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Line style */}
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Line Style</Text>
            <View style={styles.controlButtonGroup}>
              {LINE_STYLE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.controlButton,
                    styles.controlButtonWide,
                    currentLineStyle === opt.value && styles.controlButtonActive,
                  ]}
                  onPress={() => onUpdateStyleOverride(plot.id, 'lineStyle', opt.value)}
                >
                  <Text
                    style={[styles.controlButtonText, currentLineStyle === opt.value && styles.controlButtonTextActive]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
});

PlotStyleRow.displayName = 'PlotStyleRow';

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1e222d',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#363a45',
    width: '85%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#363a45',
  },
  title: {
    color: '#d1d4dc',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    color: '#787b86',
    fontSize: 20,
    lineHeight: 20,
    paddingLeft: 8,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#363a45',
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#d1d4dc',
  },
  tabText: {
    color: '#787b86',
    fontSize: 13,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#d1d4dc',
  },

  // Body
  body: {
    flex: 1,
    minHeight: 120,
  },
  bodyContent: {
    padding: 16,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#363a45',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#363a45',
  },
  cancelButtonText: {
    color: '#787b86',
    fontSize: 12,
    fontWeight: '500',
  },
  applyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: '#26a69a',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },

  // Form
  group: {
    marginBottom: 16,
  },
  groupTitle: {
    color: '#787b86',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    color: '#d1d4dc',
    fontSize: 12,
  },
  disabledText: {
    color: '#5d606b',
  },
  tooltip: {
    color: '#5d606b',
    fontSize: 10,
    marginTop: 2,
  },
  numberInput: {
    backgroundColor: '#131722',
    borderWidth: 1,
    borderColor: '#363a45',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#d1d4dc',
    fontSize: 12,
    width: 100,
    textAlign: 'right',
  },
  textInput: {
    backgroundColor: '#131722',
    borderWidth: 1,
    borderColor: '#363a45',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#d1d4dc',
    fontSize: 12,
    width: 120,
  },
  textAreaInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  disabledControl: {
    opacity: 0.45,
  },
  colorSwatch: {
    width: 40,
    height: 28,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  optionGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  optionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#131722',
    borderWidth: 1,
    borderColor: '#363a45',
  },
  optionBtnActive: {
    backgroundColor: '#787b86',
    borderColor: '#787b86',
  },
  optionBtnText: {
    color: '#787b86',
    fontSize: 11,
  },
  optionBtnTextActive: {
    color: '#131722',
  },

  // Empty state
  emptyState: {
    color: '#787b86',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 20,
  },

  // Style tab
  plotRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#363a45',
  },
  plotRowLast: {
    borderBottomWidth: 0,
  },
  plotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  plotColorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  plotName: {
    flex: 1,
    color: '#d1d4dc',
    fontSize: 13,
  },
  expandIcon: {
    color: '#787b86',
    fontSize: 10,
  },
  plotControls: {
    paddingBottom: 10,
    paddingLeft: 32,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  controlLabel: {
    color: '#787b86',
    fontSize: 11,
    width: 60,
  },
  controlButtonGroup: {
    flexDirection: 'row',
    gap: 3,
  },
  controlButton: {
    width: 32,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#131722',
    borderWidth: 1,
    borderColor: '#363a45',
    borderRadius: 4,
  },
  controlButtonWide: {
    width: 50,
  },
  controlButtonActive: {
    backgroundColor: '#787b86',
    borderColor: '#787b86',
  },
  controlButtonText: {
    color: '#787b86',
    fontSize: 10,
  },
  controlButtonTextActive: {
    color: '#131722',
  },
  thicknessLine: {
    width: 16,
    borderRadius: 1,
  },
});

export default IndicatorSettingsModalMobile;
