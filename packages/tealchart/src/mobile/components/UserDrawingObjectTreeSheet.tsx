import type {
  UserDrawingObjectTreeDispatchAction,
  UserDrawingObjectTreeModel,
  UserDrawingObjectTreeRow,
  UserDrawingObjectTreeRowActionType,
} from '../../drawings';

import React, { memo, useCallback } from 'react';

import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';

import { resolveUserDrawingObjectTreeRowDispatchAction } from '../../drawings';

export interface UserDrawingObjectTreeSheetProps {
  visible: boolean;
  model: UserDrawingObjectTreeModel;
  onDispatch: (action: UserDrawingObjectTreeDispatchAction) => boolean;
  onClose: () => void;
}

const RENDERED_ROW_ACTIONS: readonly UserDrawingObjectTreeRowActionType[] = [
  'hide',
  'show',
  'lock',
  'unlock',
  'duplicate',
  'delete',
  'bringForward',
  'sendBackward',
];

const ACTION_LABELS: Partial<Record<UserDrawingObjectTreeRowActionType, string>> = {
  hide: 'Hide',
  show: 'Show',
  lock: 'Lock',
  unlock: 'Unlock',
  duplicate: 'Copy',
  delete: 'Del',
  bringForward: 'Up',
  sendBackward: 'Down',
};

export const UserDrawingObjectTreeSheet: React.FC<UserDrawingObjectTreeSheetProps> = memo(
  ({ visible, model, onDispatch, onClose }) => {
    const dispatchRowAction = useCallback(
      (row: UserDrawingObjectTreeRow, actionType: UserDrawingObjectTreeRowActionType) => {
        const action = resolveUserDrawingObjectTreeRowDispatchAction(row, actionType);
        if (action) onDispatch(action);
      },
      [onDispatch],
    );

    const rowsById = new Map(model.rows.map((row) => [row.id, row]));

    if (!visible) return null;

    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View
                accessibilityLabel="Drawing object tree"
                style={styles.sheet}
                onStartShouldSetResponder={() => true}
              >
                <View style={styles.header}>
                  <Text style={styles.title}>Drawings ({model.drawingCount})</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close drawing object tree"
                    onPress={onClose}
                  >
                    <Text style={styles.closeText}>x</Text>
                  </Pressable>
                </View>

                <ScrollView style={styles.body}>
                  {model.rows.length === 0 ? (
                    <Text style={styles.emptyText}>No drawings</Text>
                  ) : (
                    (model.groups ?? [{ id: 'all', label: 'Drawings', rowIds: model.rows.map((row) => row.id) }]).map(
                      (group) => (
                        <View key={group.id}>
                          <Text style={styles.groupLabel}>{group.label}</Text>
                          {group.rowIds.map((rowId) => {
                            const row = rowsById.get(rowId);
                            if (!row) return null;
                            return (
                              <View key={row.id} style={[styles.row, row.selected && styles.rowSelected]}>
                                <Pressable
                                  accessibilityRole="button"
                                  accessibilityLabel={`Select ${row.label}`}
                                  accessibilityState={{ selected: row.selected }}
                                  onPress={() => onDispatch({ type: 'select', drawingId: row.drawingId })}
                                  style={({ pressed }) => [styles.rowSelect, pressed && styles.rowPressed]}
                                >
                                  <View style={styles.rowText}>
                                    <Text style={styles.rowIcon}>{row.icon}</Text>
                                    <Text style={styles.rowLabel} numberOfLines={1}>
                                      {row.label}
                                    </Text>
                                    <Text style={styles.rowMeta} numberOfLines={1}>
                                      {`${row.visible ? '' : 'hidden '}${row.locked ? 'locked' : ''}`.trim()}
                                    </Text>
                                  </View>
                                </Pressable>
                                <View style={styles.rowActions}>
                                  {RENDERED_ROW_ACTIONS.map((actionType) => {
                                    const descriptor = row.actions?.find((action) => action.type === actionType);
                                    if (!descriptor) return null;
                                    return (
                                      <Pressable
                                        key={actionType}
                                        accessibilityRole="button"
                                        accessibilityLabel={descriptor.label}
                                        accessibilityState={{ disabled: !descriptor.enabled }}
                                        disabled={!descriptor.enabled}
                                        onPress={() => dispatchRowAction(row, actionType)}
                                        style={({ pressed }) => [
                                          styles.actionButton,
                                          !descriptor.enabled && styles.actionButtonDisabled,
                                          descriptor.enabled && pressed && styles.actionButtonPressed,
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            styles.actionText,
                                            descriptor.destructive && styles.destructiveText,
                                            !descriptor.enabled && styles.actionTextDisabled,
                                          ]}
                                        >
                                          {ACTION_LABELS[actionType] ?? descriptor.label}
                                        </Text>
                                      </Pressable>
                                    );
                                  })}
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      ),
                    )
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  },
);

UserDrawingObjectTreeSheet.displayName = 'UserDrawingObjectTreeSheet';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  sheet: {
    maxHeight: '72%',
    backgroundColor: 'rgba(17, 19, 26, 0.98)',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(120, 123, 134, 0.28)',
    overflow: 'hidden',
  },
  header: {
    height: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(120, 123, 134, 0.18)',
    backgroundColor: 'rgba(30, 34, 45, 0.9)',
  },
  title: {
    color: '#d1d4dc',
    fontSize: 14,
    fontWeight: '600',
  },
  closeText: {
    color: '#9ca3af',
    fontSize: 20,
    lineHeight: 24,
  },
  body: {
    padding: 8,
  },
  emptyText: {
    paddingVertical: 28,
    textAlign: 'center',
    color: '#787b86',
  },
  groupLabel: {
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 4,
    color: '#787b86',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  row: {
    minHeight: 44,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowSelected: {
    backgroundColor: 'rgba(41, 98, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(41, 98, 255, 0.36)',
  },
  rowPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  rowSelect: {
    minWidth: 0,
    flex: 1,
    minHeight: 36,
    paddingLeft: 8,
    paddingRight: 4,
    borderRadius: 5,
    justifyContent: 'center',
  },
  rowText: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowIcon: {
    width: 18,
    color: '#9ca3af',
    textAlign: 'center',
  },
  rowLabel: {
    minWidth: 0,
    flexShrink: 1,
    color: '#d1d4dc',
    fontSize: 13,
  },
  rowMeta: {
    color: '#787b86',
    fontSize: 11,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    minWidth: 30,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionButtonDisabled: {
    opacity: 0.38,
  },
  actionText: {
    color: '#9ca3af',
    fontSize: 11,
  },
  destructiveText: {
    color: '#f87171',
  },
  actionTextDisabled: {
    color: '#787b86',
  },
});
