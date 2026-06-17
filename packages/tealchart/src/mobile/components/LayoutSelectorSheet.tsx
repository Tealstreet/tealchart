import type { LayoutMetadata } from '../../transformer';

import React, { memo, useCallback, useEffect, useState } from 'react';

import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export interface LayoutSelectorSheetProps {
  visible: boolean;
  layouts: LayoutMetadata[];
  currentLayoutId?: string | number | null;
  /** Save the current chart as a new named layout. */
  onSaveAs: (name: string) => void;
  /** Load a saved layout by id. */
  onLoad: (id: string | number) => void;
  /** Rename a saved layout. */
  onRename: (id: string | number, name: string) => void;
  /** Delete a saved layout. */
  onDelete: (id: string | number) => void;
  onClose: () => void;
  /** Optional: overwrite the active layout with the current chart. */
  onSaveCurrent?: () => void;
  title?: string;
}

function sameId(a: string | number | null | undefined, b: string | number): boolean {
  return a != null && String(a) === String(b);
}

export const LayoutSelectorSheet = memo(
  ({
    visible,
    layouts,
    currentLayoutId,
    onSaveAs,
    onLoad,
    onRename,
    onDelete,
    onClose,
    onSaveCurrent,
    title = 'Layouts',
  }: LayoutSelectorSheetProps) => {
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [editingName, setEditingName] = useState('');

    // Exit the rename editor if the edited layout disappears (deleted elsewhere).
    useEffect(() => {
      if (editingId !== null && !layouts.some((l) => sameId(editingId, l.id))) {
        setEditingId(null);
        setEditingName('');
      }
    }, [editingId, layouts]);

    const submitNew = useCallback(() => {
      const name = newName.trim();
      if (!name) return;
      onSaveAs(name);
      setNewName('');
    }, [newName, onSaveAs]);

    const beginRename = useCallback((layout: LayoutMetadata) => {
      setEditingId(layout.id);
      setEditingName(layout.name);
    }, []);

    const cancelRename = useCallback(() => {
      setEditingId(null);
      setEditingName('');
    }, []);

    const commitRename = useCallback(() => {
      const name = editingName.trim();
      if (editingId !== null && name) onRename(editingId, name);
      setEditingId(null);
      setEditingName('');
    }, [editingId, editingName, onRename]);

    const confirmDelete = useCallback(
      (layout: LayoutMetadata) => {
        Alert.alert('Delete layout', `Delete "${layout.name}"?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => onDelete(layout.id) },
        ]);
      },
      [onDelete],
    );

    if (!visible) return null;

    return (
      <Modal visible transparent animationType="fade" onRequestClose={onClose}>
        <Pressable accessibilityLabel="Dismiss layouts" style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            <Text>{title}</Text>
            <Pressable accessibilityLabel="Close layouts" onPress={onClose}>
              <Text>✕</Text>
            </Pressable>
          </View>

          <View style={styles.newRow}>
            <TextInput
              accessibilityLabel="New layout name"
              value={newName}
              onChangeText={setNewName}
              onSubmitEditing={submitNew}
              placeholder="New layout name"
              style={styles.input}
            />
            <Pressable accessibilityLabel="Save new layout" disabled={!newName.trim()} onPress={submitNew}>
              <Text>Save</Text>
            </Pressable>
          </View>

          {onSaveCurrent && currentLayoutId != null ? (
            <Pressable accessibilityLabel="Update current layout" onPress={onSaveCurrent}>
              <Text>Update current</Text>
            </Pressable>
          ) : null}

          <ScrollView>
            {layouts.length === 0 ? (
              <Text>No saved layouts</Text>
            ) : (
              layouts.map((layout) => {
                const isCurrent = sameId(currentLayoutId, layout.id);
                if (editingId !== null && sameId(editingId, layout.id)) {
                  return (
                    <View key={String(layout.id)} style={styles.row}>
                      <TextInput
                        accessibilityLabel="Edit layout name"
                        value={editingName}
                        onChangeText={setEditingName}
                        onSubmitEditing={commitRename}
                        style={styles.input}
                      />
                      <Pressable accessibilityLabel="Confirm rename" onPress={commitRename}>
                        <Text>✓</Text>
                      </Pressable>
                      <Pressable accessibilityLabel="Cancel rename" onPress={cancelRename}>
                        <Text>✕</Text>
                      </Pressable>
                    </View>
                  );
                }
                return (
                  <View key={String(layout.id)} style={styles.row}>
                    <Pressable
                      accessibilityLabel={`Load layout ${layout.name}`}
                      accessibilityState={{ selected: isCurrent }}
                      onPress={() => onLoad(layout.id)}
                      style={styles.name}
                    >
                      <Text>{isCurrent ? `• ${layout.name}` : layout.name}</Text>
                    </Pressable>
                    <Pressable accessibilityLabel={`Rename layout ${layout.name}`} onPress={() => beginRename(layout)}>
                      <Text>Rename</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Delete layout ${layout.name}`}
                      onPress={() => confirmDelete(layout)}
                    >
                      <Text>Delete</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  },
);

LayoutSelectorSheet.displayName = 'LayoutSelectorSheet';

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 80,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#1a1a1a',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  newRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  input: { flex: 1, color: '#fff', paddingVertical: 6, paddingHorizontal: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  name: { flex: 1 },
});
