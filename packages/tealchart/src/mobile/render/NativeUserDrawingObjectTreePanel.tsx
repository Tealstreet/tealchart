import type {
  UserDrawingObjectTreeDispatchAction,
  UserDrawingObjectTreeModel,
  UserDrawingObjectTreeRow,
  UserDrawingObjectTreeRowActionType,
} from '../../drawings';

import React, { useState } from 'react';

import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  resolveUserDrawingObjectTreeRowDispatchAction,
  USER_DRAWING_OBJECT_TREE_COMPACT_ACTION_LABELS,
  USER_DRAWING_OBJECT_TREE_RENDERED_ROW_ACTIONS,
} from '../../drawings';
import { NativeDrawingIcon } from './NativeDrawingIcon';

export interface NativeUserDrawingObjectTreePanelProps {
  backgroundColor: string;
  gridColor: string;
  model: UserDrawingObjectTreeModel;
  mutedTextColor: string;
  onClose: () => void;
  onDispatch: (action: UserDrawingObjectTreeDispatchAction) => boolean;
  textColor: string;
}

/** Rename state is lifted so the view renders as a plain function under test. */
export interface NativeUserDrawingObjectTreePanelViewProps extends NativeUserDrawingObjectTreePanelProps {
  onRenameValueChange: (value: string) => void;
  onRenamingDrawingIdChange: (drawingId: string | null) => void;
  renameValue: string;
  renamingDrawingId: string | null;
}

export function resolveNativeUserDrawingObjectTreeRowActions(
  row: UserDrawingObjectTreeRow,
): readonly UserDrawingObjectTreeRowActionType[] {
  return USER_DRAWING_OBJECT_TREE_RENDERED_ROW_ACTIONS.filter((type) =>
    row.actions?.some((action) => action.type === type && action.enabled),
  );
}

/** Rows the tree groups, in group order, with ungrouped rows kept in model order. */
export function resolveNativeUserDrawingObjectTreeSections(
  model: UserDrawingObjectTreeModel,
): Array<{ id: string; label: string | null; rows: UserDrawingObjectTreeRow[] }> {
  if (!model.groups?.length) {
    return model.rows.length ? [{ id: 'all', label: null, rows: [...model.rows] }] : [];
  }

  const rowsById = new Map(model.rows.map((row) => [row.id, row]));
  return model.groups.map((group) => ({
    id: group.id,
    label: group.label,
    rows: group.rowIds.map((rowId) => rowsById.get(rowId)).filter((row): row is UserDrawingObjectTreeRow => Boolean(row)),
  }));
}

export function NativeUserDrawingObjectTreePanel(props: NativeUserDrawingObjectTreePanelProps) {
  const [renamingDrawingId, setRenamingDrawingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // A rename in flight against a drawing that has since gone would otherwise
  // leave the input open over a row that no longer exists.
  const renamingRowExists = props.model.rows.some((row) => row.drawingId === renamingDrawingId);
  const activeRenamingDrawingId = renamingRowExists ? renamingDrawingId : null;

  return (
    <NativeUserDrawingObjectTreePanelView
      {...props}
      onRenameValueChange={setRenameValue}
      onRenamingDrawingIdChange={(drawingId) => {
        setRenamingDrawingId(drawingId);
        if (drawingId === null) setRenameValue('');
      }}
      renameValue={renameValue}
      renamingDrawingId={activeRenamingDrawingId}
    />
  );
}

export function NativeUserDrawingObjectTreePanelView({
  backgroundColor,
  gridColor,
  model,
  mutedTextColor,
  onClose,
  onDispatch,
  onRenameValueChange,
  onRenamingDrawingIdChange,
  renameValue,
  renamingDrawingId,
  textColor,
}: NativeUserDrawingObjectTreePanelViewProps) {
  const dispatchRow = (
    row: UserDrawingObjectTreeRow,
    actionType: UserDrawingObjectTreeRowActionType,
    name?: string,
  ) => {
    const action = resolveUserDrawingObjectTreeRowDispatchAction(row, actionType, name === undefined ? {} : { name });
    if (action) onDispatch(action);
  };

  const commitRename = (row: UserDrawingObjectTreeRow) => {
    dispatchRow(row, 'rename', renameValue.trim());
    onRenamingDrawingIdChange(null);
  };

  const sections = resolveNativeUserDrawingObjectTreeSections(model);

  return (
    <View pointerEvents="auto" style={styles.root}>
      <Pressable
        accessibilityLabel="Close drawing object tree"
        accessibilityRole="button"
        onPress={onClose}
        style={styles.backdrop}
      />
      <View style={[styles.surface, { backgroundColor, borderColor: gridColor }]}>
        <View style={[styles.header, { borderBottomColor: gridColor }]}>
          <Text style={[styles.title, { color: textColor }]}>{`Drawings (${model.drawingCount})`}</Text>
          <Pressable
            accessibilityLabel="Close drawing object tree"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.iconButton}
          >
            <NativeDrawingIcon color={mutedTextColor} name="close" size={16} />
          </Pressable>
        </View>

        {model.rows.length === 0 ? (
          <Text style={[styles.empty, { color: mutedTextColor }]}>No drawings</Text>
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.list}>
            {sections.map((section) => (
              <View key={section.id}>
                {section.label ? (
                  <Text style={[styles.groupLabel, { color: mutedTextColor }]}>{section.label}</Text>
                ) : null}
                {section.rows.map((row) => {
                  const renaming = renamingDrawingId === row.drawingId;
                  return (
                    <View
                      key={row.id}
                      style={[
                        styles.row,
                        { borderBottomColor: gridColor },
                        row.selected ? { backgroundColor: gridColor } : null,
                      ]}
                    >
                      <View style={styles.rowHead}>
                        <NativeDrawingIcon color={mutedTextColor} name={row.tool} size={14} />
                        {renaming ? (
                          <TextInput
                            accessibilityLabel={`Rename ${row.label}`}
                            autoFocus
                            onChangeText={onRenameValueChange}
                            onSubmitEditing={() => commitRename(row)}
                            returnKeyType="done"
                            style={[styles.renameInput, { borderColor: gridColor, color: textColor }]}
                            value={renameValue}
                          />
                        ) : (
                          <Pressable
                            accessibilityLabel={`Select ${row.label}`}
                            accessibilityRole="button"
                            onPress={() => onDispatch({ type: 'select', drawingId: row.drawingId })}
                            style={styles.rowLabelButton}
                          >
                            <Text
                              numberOfLines={1}
                              style={[styles.rowLabel, { color: row.visible ? textColor : mutedTextColor }]}
                            >
                              {row.label}
                            </Text>
                          </Pressable>
                        )}
                      </View>

                      <ScrollView
                        contentContainerStyle={styles.actionStrip}
                        horizontal
                        keyboardShouldPersistTaps="handled"
                        showsHorizontalScrollIndicator={false}
                      >
                        {renaming ? (
                          <>
                            <RowAction
                              color={textColor}
                              label="Save"
                              onPress={() => commitRename(row)}
                              borderColor={gridColor}
                            />
                            <RowAction
                              color={mutedTextColor}
                              label="Cancel"
                              onPress={() => onRenamingDrawingIdChange(null)}
                              borderColor={gridColor}
                            />
                          </>
                        ) : (
                          <>
                            {row.actions?.some((action) => action.type === 'rename' && action.enabled) ? (
                              <RowAction
                                borderColor={gridColor}
                                color={mutedTextColor}
                                label={USER_DRAWING_OBJECT_TREE_COMPACT_ACTION_LABELS.rename ?? 'Name'}
                                onPress={() => {
                                  onRenamingDrawingIdChange(row.drawingId);
                                  onRenameValueChange(row.customName ?? row.defaultLabel);
                                }}
                              />
                            ) : null}
                            {resolveNativeUserDrawingObjectTreeRowActions(row).map((actionType) => (
                              <RowAction
                                borderColor={gridColor}
                                color={actionType === 'delete' ? '#ef5350' : mutedTextColor}
                                key={actionType}
                                label={USER_DRAWING_OBJECT_TREE_COMPACT_ACTION_LABELS[actionType] ?? actionType}
                                onPress={() => dispatchRow(row, actionType)}
                              />
                            ))}
                          </>
                        )}
                      </ScrollView>
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function RowAction({
  borderColor,
  color,
  label,
  onPress,
}: {
  borderColor: string;
  color: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={[styles.action, { borderColor }]}>
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 26,
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionStrip: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  empty: {
    fontSize: 12,
    padding: 16,
    textAlign: 'center',
  },
  groupLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    paddingHorizontal: 12,
    paddingTop: 10,
    textTransform: 'uppercase',
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
    justifyContent: 'center',
    minHeight: 30,
    minWidth: 34,
  },
  list: {
    maxHeight: 360,
  },
  renameInput: {
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    fontSize: 13,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: 42,
    zIndex: 40,
  },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  rowHead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 30,
  },
  rowLabel: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  rowLabelButton: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 30,
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
  },
});
