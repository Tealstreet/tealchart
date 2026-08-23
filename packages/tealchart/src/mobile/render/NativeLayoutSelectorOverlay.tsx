import type { CurrentLayoutState, SaveStatus } from '../../state/chartState';
import type { LayoutMetadata } from '../../transformer/saveLoadIntegration';

import React, { useEffect, useState } from 'react';

import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { NativeDrawingIcon } from './NativeDrawingIcon';
import { NativeFloatingOverlay } from './NativeFloatingOverlay';

export interface NativeLayoutSelectorOverlayProps {
  backgroundColor: string;
  currentLayout: CurrentLayoutState;
  errorText?: string | null;
  gridColor: string;
  layouts: readonly LayoutMetadata[];
  loading?: boolean;
  mutedTextColor: string;
  onClose: () => void;
  onDelete: (layoutId: string | number) => void;
  onLoad: (layoutId: string | number) => void;
  onRefresh: () => void;
  onRename: (layoutId: string | number, nextName: string) => void;
  onSave: () => void;
  onSaveAs: (layoutName: string) => void;
  saveStatus: SaveStatus;
  textColor: string;
}

export interface NativeLayoutSelectorOverlayViewProps extends NativeLayoutSelectorOverlayProps {
  onRenameValueChange: (value: string) => void;
  onRenamingLayoutIdChange: (layoutId: string | number | null) => void;
  onSaveAsNameChange: (value: string) => void;
  renameValue: string;
  renamingLayoutId: string | number | null;
  saveAsName: string;
}

export function NativeLayoutSelectorOverlayViewImpl({
  backgroundColor,
  currentLayout,
  errorText,
  gridColor,
  layouts,
  loading,
  mutedTextColor,
  onClose,
  onDelete,
  onLoad,
  onRefresh,
  onRename,
  onSave,
  onSaveAs,
  onSaveAsNameChange,
  onRenameValueChange,
  onRenamingLayoutIdChange,
  renameValue,
  renamingLayoutId,
  saveStatus,
  saveAsName,
  textColor,
}: NativeLayoutSelectorOverlayViewProps) {
  const currentLayoutId = currentLayout.layoutId != null ? String(currentLayout.layoutId) : null;
  const currentLayoutName = currentLayout.layoutName?.trim() || '';
  const hasCurrentLayout = currentLayoutId != null && currentLayoutName.length > 0;
  const saveButtonText = saveStatus === 'saving' ? 'Saving' : hasCurrentLayout ? 'Save' : 'Save Default';

  const commitSaveAs = () => {
    const name = saveAsName.trim();
    if (!name) return;
    onSaveAs(name);
    onSaveAsNameChange('');
  };

  const commitRename = () => {
    if (!renamingLayoutId) return;
    const name = renameValue.trim();
    if (!name) return;
    onRename(renamingLayoutId, name);
    onRenamingLayoutIdChange(null);
    onRenameValueChange('');
  };

  return (
    <NativeFloatingOverlay
      backdropAccessibilityLabel="Close chart layouts"
      backdropColor="rgba(0,0,0,0.18)"
      contentContainerStyle={styles.root}
      onRequestClose={onClose}
      visible
    >
      <View
        style={[
          styles.surface,
          {
            backgroundColor,
            borderColor: gridColor,
          },
        ]}
      >
        <View style={[styles.header, { borderBottomColor: gridColor }]}>
          <Text style={[styles.title, { color: textColor }]}>Chart Layouts</Text>
          <Pressable
            accessibilityLabel="Close chart layouts"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.iconButton}
          >
            <Text style={[styles.closeText, { color: mutedTextColor }]}>x</Text>
          </Pressable>
        </View>

        <View style={[styles.actionRow, { borderBottomColor: gridColor }]}>
          <Pressable
            accessibilityLabel={saveButtonText}
            accessibilityRole="button"
            disabled={loading}
            onPress={onSave}
            style={[styles.primaryButton, { borderColor: gridColor }]}
          >
            <Text style={[styles.primaryButtonText, { color: textColor }]}>{saveButtonText}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Refresh chart layouts"
            accessibilityRole="button"
            disabled={loading}
            onPress={onRefresh}
            style={[styles.iconButton, { borderColor: gridColor }]}
          >
            <Text style={[styles.iconText, { color: mutedTextColor }]}>↻</Text>
          </Pressable>
        </View>

        <View style={[styles.formRow, { borderBottomColor: gridColor }]}>
          <TextInput
            accessibilityLabel="New layout name"
            autoCapitalize="words"
            editable={!loading}
            onChangeText={onSaveAsNameChange}
            onSubmitEditing={commitSaveAs}
            placeholder="Save as"
            placeholderTextColor={mutedTextColor}
            returnKeyType="done"
            style={[styles.input, { borderColor: gridColor, color: textColor }]}
            value={saveAsName}
          />
          <Pressable
            accessibilityLabel="Save as new layout"
            accessibilityRole="button"
            disabled={loading}
            onPress={commitSaveAs}
            style={[styles.smallButton, { borderColor: gridColor }]}
          >
            <Text style={[styles.smallButtonText, { color: textColor }]}>Save As</Text>
          </Pressable>
        </View>

        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
        {loading ? <Text style={[styles.statusText, { color: mutedTextColor }]}>Loading layouts</Text> : null}

        <ScrollView keyboardShouldPersistTaps="handled" style={styles.list}>
          {layouts.map((layout) => {
            const selected = currentLayoutId === String(layout.id);
            const renaming = renamingLayoutId != null && String(renamingLayoutId) === String(layout.id);
            return (
              <View key={String(layout.id)} style={[styles.layoutRow, { borderBottomColor: gridColor }]}>
                {renaming ? (
                  <>
                    <TextInput
                      accessibilityLabel="Rename layout"
                      autoCapitalize="words"
                      autoFocus
                      editable={!loading}
                      onChangeText={onRenameValueChange}
                      onSubmitEditing={commitRename}
                      returnKeyType="done"
                      style={[styles.renameInput, { borderColor: gridColor, color: textColor }]}
                      value={renameValue}
                    />
                    <Pressable
                      accessibilityLabel="Confirm rename layout"
                      accessibilityRole="button"
                      disabled={loading}
                      onPress={commitRename}
                      style={styles.rowIconButton}
                    >
                      <Text style={[styles.rowActionText, { color: textColor }]}>✓</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel="Cancel rename layout"
                      accessibilityRole="button"
                      onPress={() => onRenamingLayoutIdChange(null)}
                      style={styles.rowIconButton}
                    >
                      <Text style={[styles.rowActionText, { color: mutedTextColor }]}>x</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable
                      accessibilityLabel={`Load ${layout.name}`}
                      accessibilityRole="button"
                      disabled={loading}
                      onPress={() => onLoad(layout.id)}
                      style={styles.layoutNameButton}
                    >
                      <Text
                        numberOfLines={1}
                        style={[styles.layoutName, { color: selected ? textColor : mutedTextColor }]}
                      >
                        {layout.name}
                      </Text>
                      {selected ? <Text style={styles.currentBadge}>Current</Text> : null}
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Rename ${layout.name}`}
                      accessibilityRole="button"
                      disabled={loading}
                      onPress={() => onRenamingLayoutIdChange(layout.id)}
                      style={styles.rowIconButton}
                    >
                      <Text style={[styles.rowActionText, { color: mutedTextColor }]}>Edit</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Delete ${layout.name}`}
                      accessibilityRole="button"
                      disabled={loading}
                      onPress={() => onDelete(layout.id)}
                      style={styles.rowIconButton}
                    >
                      <NativeDrawingIcon name="trash" size={17} color="#ff4d73" strokeWidth={2} />
                    </Pressable>
                  </>
                )}
              </View>
            );
          })}
          {!loading && layouts.length === 0 ? (
            <Text style={[styles.emptyText, { color: mutedTextColor }]}>No saved layouts</Text>
          ) : null}
        </ScrollView>
      </View>
    </NativeFloatingOverlay>
  );
}

export function NativeLayoutSelectorOverlayImpl(props: NativeLayoutSelectorOverlayProps) {
  const [saveAsName, setSaveAsName] = useState('');
  const [renamingLayoutId, setRenamingLayoutId] = useState<string | number | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    if (!renamingLayoutId) return;
    const layout = props.layouts.find((item) => String(item.id) === String(renamingLayoutId));
    setRenameValue(layout?.name ?? '');
  }, [props.layouts, renamingLayoutId]);

  return (
    <NativeLayoutSelectorOverlayViewImpl
      {...props}
      onRenameValueChange={setRenameValue}
      onRenamingLayoutIdChange={setRenamingLayoutId}
      onSaveAsNameChange={setSaveAsName}
      renameValue={renameValue}
      renamingLayoutId={renamingLayoutId}
      saveAsName={saveAsName}
    />
  );
}

export const NativeLayoutSelectorOverlay = React.memo(NativeLayoutSelectorOverlayImpl);
NativeLayoutSelectorOverlay.displayName = 'NativeLayoutSelectorOverlay';

const styles = StyleSheet.create({
  actionRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  closeText: {
    fontSize: 20,
    lineHeight: 20,
  },
  currentBadge: {
    color: '#12c48b',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    padding: 16,
    textAlign: 'center',
  },
  errorText: {
    color: '#ff4d73',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  formRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 4,
    justifyContent: 'center',
    minHeight: 30,
    minWidth: 34,
  },
  iconText: {
    fontSize: 18,
  },
  input: {
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  layoutName: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  layoutNameButton: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 40,
  },
  layoutRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  list: {
    maxHeight: 300,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    minHeight: 34,
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  renameInput: {
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  root: {
    bottom: 0,
    justifyContent: 'flex-start',
    left: 0,
    paddingHorizontal: 12,
    paddingTop: 42,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 40,
  },
  rowActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rowIconButton: {
    alignItems: 'center',
    borderRadius: 4,
    minHeight: 34,
    minWidth: 40,
    justifyContent: 'center',
  },
  smallButton: {
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 10,
  },
  smallButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 12,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  surface: {
    alignSelf: 'stretch',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: 520,
    overflow: 'hidden',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0,
  },
});
