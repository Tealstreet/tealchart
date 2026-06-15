import type {
  UserDrawingPropertiesSurface,
  UserDrawingPropertiesSurfaceCommand,
  UserDrawingPropertiesSurfaceControl,
} from '../../drawings';

import React, { memo, useCallback } from 'react';

import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';

export interface UserDrawingPropertiesSheetProps {
  visible: boolean;
  surface: UserDrawingPropertiesSurface;
  onDispatch: (command: UserDrawingPropertiesSurfaceCommand) => boolean;
  onClose: () => void;
}

function getControlText(control: UserDrawingPropertiesSurfaceControl): string {
  if (control.type === 'swatch') return '';
  return control.icon ?? String(control.value);
}

export const UserDrawingPropertiesSheet: React.FC<UserDrawingPropertiesSheetProps> = memo(
  ({ visible, surface, onDispatch, onClose }) => {
    const dispatchControl = useCallback(
      (control: UserDrawingPropertiesSurfaceControl) => {
        if (!control.enabled) return;
        onDispatch(control.command);
      },
      [onDispatch],
    );

    if (!visible) return null;

    const title = surface.drawing ? `${surface.drawing.kind} properties` : 'Drawing properties';

    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View
                accessibilityLabel="Drawing properties"
                style={styles.sheet}
                onStartShouldSetResponder={() => true}
              >
                <View style={styles.header}>
                  <Text style={styles.title} numberOfLines={1}>
                    {title}
                  </Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="Close drawing properties" onPress={onClose}>
                    <Text style={styles.closeText}>x</Text>
                  </Pressable>
                </View>

                <ScrollView style={styles.body}>
                  {!surface.drawing || surface.groups.length === 0 ? (
                    <Text style={styles.emptyText}>No editable drawing</Text>
                  ) : (
                    surface.groups.map((group) => (
                      <View key={group.id} style={styles.group}>
                        <Text style={styles.groupLabel}>{group.label}</Text>
                        <View accessibilityLabel={`Drawing properties controls for ${group.label}`} style={styles.controls}>
                          {group.controls.map((control) => (
                            <Pressable
                              key={control.id}
                              accessibilityRole="button"
                              accessibilityLabel={control.label}
                              accessibilityState={{ selected: control.selected, disabled: !control.enabled }}
                              disabled={!control.enabled}
                              onPress={() => dispatchControl(control)}
                              style={({ pressed }) => [
                                styles.controlButton,
                                control.selected && styles.controlButtonSelected,
                                !control.enabled && styles.controlButtonDisabled,
                                control.enabled && pressed && styles.controlButtonPressed,
                              ]}
                            >
                              {control.type === 'swatch' ? (
                                <View style={[styles.swatch, { backgroundColor: control.value }]} />
                              ) : (
                                <Text style={styles.controlText}>{getControlText(control)}</Text>
                              )}
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    ))
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

UserDrawingPropertiesSheet.displayName = 'UserDrawingPropertiesSheet';

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
    minWidth: 0,
    flexShrink: 1,
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
  group: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(120, 123, 134, 0.14)',
  },
  groupLabel: {
    paddingHorizontal: 2,
    paddingBottom: 8,
    color: '#787b86',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  controlButton: {
    minWidth: 34,
    height: 32,
    paddingHorizontal: 9,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(120, 123, 134, 0.22)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonSelected: {
    borderColor: 'rgba(41, 98, 255, 0.72)',
    backgroundColor: 'rgba(41, 98, 255, 0.2)',
  },
  controlButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  controlButtonDisabled: {
    opacity: 0.38,
  },
  controlText: {
    color: '#d1d4dc',
    fontSize: 12,
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.42)',
  },
});
