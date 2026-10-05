import type { PlotOutput } from '@tealstreet/tealscript';
import type { PlotStyleOverride } from '../../state/chartState';

import React from 'react';

import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { filterNativeIndicatorStyles } from '../nativeIndicatorStyles';
import { NativeFloatingOverlay } from './NativeFloatingOverlay';

export interface NativeIndicatorStyleOverlayProps {
  plots: readonly PlotOutput[];
  overrides: readonly PlotStyleOverride[];
  backgroundColor: string;
  textColor: string;
  name: string;
  onClose: () => void;
  onSave: (overrides: PlotStyleOverride[]) => void;
}
export function NativeIndicatorStyleColorInput({
  value,
  title,
  textColor,
  onChange,
}: {
  value: string;
  title: string;
  textColor: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);
  return (
    <TextInput
      accessibilityLabel={`${title} color`}
      value={draft}
      autoCapitalize="none"
      style={{ color: textColor, padding: 6, borderColor: textColor, borderWidth: 1, borderRadius: 4 }}
      onChangeText={(value) => {
        setDraft(value);
        if (/^#[\da-f]{6}([\da-f]{2})?$/i.test(value)) onChange(value);
      }}
    />
  );
}
export function NativeIndicatorStyleOverlayView({
  plots,
  overrides,
  backgroundColor,
  textColor,
  name,
  onClose,
  onSave,
  onChange,
}: NativeIndicatorStyleOverlayProps & { onChange: (plotId: string, patch: Partial<PlotStyleOverride>) => void }) {
  return (
    <NativeFloatingOverlay
      visible
      onRequestClose={onClose}
      backdropAccessibilityLabel="Close indicator Style"
      contentContainerStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <ScrollView style={{ backgroundColor, padding: 16, borderRadius: 8, maxHeight: '80%', width: '85%' }}>
        <Text style={{ color: textColor, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>{name} Style</Text>
        {plots
          .filter((plot) => plot.editable !== false)
          .map((plot) => {
            const override = overrides.find((value) => value.plotId === plot.id);
            const color = override?.color ?? (Array.isArray(plot.color) ? plot.color.find(Boolean) : plot.color) ?? '';
            const widths = plot.type === 'plot' || plot.type === 'hline';
            return (
              <View key={plot.id} style={{ marginBottom: 16 }}>
                <Text style={{ color: textColor, fontWeight: '600', marginBottom: 6 }}>{plot.title}</Text>
                <Text style={{ color: textColor }}>Color</Text>
                <NativeIndicatorStyleColorInput
                  value={color}
                  title={plot.title}
                  textColor={textColor}
                  onChange={(color) => onChange(plot.id, { color })}
                />
                <View style={{ flexDirection: 'row', marginVertical: 6 }}>
                  {['#2196F3', '#F23645', '#4CAF50', '#FF9800', '#FFFFFF'].map((color) => (
                    <Pressable
                      key={color}
                      accessibilityLabel={`${plot.title} color ${color}`}
                      onPress={() => onChange(plot.id, { color })}
                      style={{ width: 24, height: 24, backgroundColor: color, marginRight: 8, borderRadius: 3 }}
                    />
                  ))}
                </View>
                {widths ? (
                  <>
                    <Text style={{ color: textColor }}>Width</Text>
                    <TextInput
                      accessibilityLabel={`${plot.title} width`}
                      keyboardType="numeric"
                      value={String(override?.linewidth ?? plot.linewidth ?? 1)}
                      style={{ color: textColor, padding: 6, borderColor: textColor, borderWidth: 1 }}
                      onChangeText={(value) => {
                        const width = Number(value);
                        if (Number.isFinite(width) && width > 0 && width <= 100)
                          onChange(plot.id, { linewidth: width });
                      }}
                    />
                    <View style={{ flexDirection: 'row', marginVertical: 6 }}>
                      {(['solid', 'dashed', 'dotted'] as const).map((lineStyle) => (
                        <Pressable
                          key={lineStyle}
                          accessibilityLabel={`${plot.title} ${lineStyle}`}
                          accessibilityState={{
                            selected:
                              (override?.lineStyle ??
                                plot.lineStyle ??
                                (plot.type === 'hline' ? 'dashed' : 'solid')) === lineStyle,
                          }}
                          onPress={() => onChange(plot.id, { lineStyle })}
                          style={{ padding: 8 }}
                        >
                          <Text style={{ color: textColor }}>{lineStyle}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                ) : null}
                <Text style={{ color: textColor }}>Opacity</Text>
                <TextInput
                  accessibilityLabel={`${plot.title} opacity`}
                  keyboardType="numeric"
                  value={String(override?.opacity ?? 100)}
                  style={{ color: textColor, padding: 6, borderColor: textColor, borderWidth: 1 }}
                  onChangeText={(value) => {
                    const opacity = Number(value);
                    if (value !== '' && Number.isFinite(opacity) && opacity >= 0 && opacity <= 100)
                      onChange(plot.id, { opacity });
                  }}
                />
              </View>
            );
          })}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Pressable accessibilityRole="button" onPress={() => onSave([])} style={{ padding: 10 }}>
            <Text style={{ color: textColor }}>Reset to script</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onClose} style={{ padding: 10 }}>
            <Text style={{ color: textColor }}>Cancel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => onSave(filterNativeIndicatorStyles(plots, overrides))}
            style={{ padding: 10 }}
          >
            <Text style={{ color: textColor }}>Apply</Text>
          </Pressable>
        </View>
      </ScrollView>
    </NativeFloatingOverlay>
  );
}
export function NativeIndicatorStyleOverlay(props: NativeIndicatorStyleOverlayProps) {
  const [values, setValues] = React.useState<readonly PlotStyleOverride[]>(props.overrides);
  const onChange = React.useCallback(
    (plotId: string, patch: Partial<PlotStyleOverride>) =>
      setValues((previous) => {
        const existing = previous.find((value) => value.plotId === plotId);
        return [...previous.filter((value) => value.plotId !== plotId), { ...existing, plotId, ...patch }];
      }),
    [],
  );
  return <NativeIndicatorStyleOverlayView {...props} overrides={values} onChange={onChange} />;
}
