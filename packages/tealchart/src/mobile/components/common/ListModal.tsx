/**
 * ListModal - Reusable modal with optional search for displaying lists.
 *
 * Self-contained version bundled with tealchart so the mobile chart's
 * indicator picker has no dependency on a host app's design-system
 * components. Uses plain React Native primitives and a small built-in
 * dark palette. Consuming apps that want their own styling can render a
 * custom picker instead of `IndicatorsModalMobile`.
 */

import React, { useCallback } from 'react';

import { AntDesign } from '@expo/vector-icons';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

// =============================================================================
// Palette (self-contained — no host theme dependency)
// =============================================================================

export const listModalColors = {
  background: '#1a1d24',
  border: 'rgba(255, 255, 255, 0.1)',
  inputBackground: 'rgba(255, 255, 255, 0.05)',
  foreground: '#e6edf3',
  foregroundTransparent: 'rgba(230, 237, 243, 0.5)',
  accent: '#26a69a',
};

// =============================================================================
// Types
// =============================================================================

export interface ListModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Modal title */
  title: string;
  /** Optional search placeholder text */
  searchPlaceholder?: string;
  /** Search value (controlled) */
  searchValue?: string;
  /** Search change handler */
  onSearchChange?: (value: string) => void;
  /** Content to render in the scrollable body */
  children: React.ReactNode;
  /** Max height of the modal */
  maxHeight?: number;
}

export interface ListItemProps {
  /** Label text to display */
  label: string;
  /** Optional sublabel text */
  sublabel?: string;
  /** Whether this item is currently active/selected */
  isActive?: boolean;
  /** Callback when item is pressed */
  onPress: () => void;
  /** Optional right element (e.g., checkmark) */
  rightElement?: React.ReactNode;
}

export interface CategoryHeaderProps {
  /** Category label */
  label: string;
}

// =============================================================================
// Sub-components
// =============================================================================

export const ListItem: React.FC<ListItemProps> = ({ label, sublabel, isActive = false, onPress, rightElement }) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.listItem,
        isActive && styles.listItemActive,
        pressed && !isActive && styles.listItemPressed,
      ]}
    >
      <View>
        <Text style={[styles.listItemLabel, isActive && styles.listItemLabelActive]}>{label}</Text>
        {sublabel ? <Text style={styles.listItemSublabel}>{sublabel}</Text> : null}
      </View>
      {rightElement}
    </Pressable>
  );
};

export const CategoryHeader: React.FC<CategoryHeaderProps> = ({ label }) => {
  return (
    <View style={styles.categoryHeader}>
      <Text style={styles.categoryHeaderText}>{label}</Text>
    </View>
  );
};

export const EmptyState: React.FC<{ message: string }> = ({ message }) => {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>{message}</Text>
    </View>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export const ListModal: React.FC<ListModalProps> = ({
  visible,
  onClose,
  title,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  children,
  maxHeight,
}) => {
  const showSearch = Boolean(searchPlaceholder && onSearchChange);

  const containerStyle: ViewStyle[] = [styles.container, maxHeight ? { maxHeight } : {}];

  const handleOverlayPress = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={handleOverlayPress}>
        <Pressable style={containerStyle} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <AntDesign name="close" size={18} color={listModalColors.foregroundTransparent} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          {showSearch && (
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder={searchPlaceholder}
                placeholderTextColor={listModalColors.foregroundTransparent}
                value={searchValue}
                onChangeText={onSearchChange}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          {/* Content */}
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ListModal;

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
  container: {
    backgroundColor: listModalColors.background,
    borderRadius: 8,
    width: '90%',
    maxWidth: 340,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: listModalColors.border,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: listModalColors.foreground,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: listModalColors.border,
  },
  searchInput: {
    backgroundColor: listModalColors.inputBackground,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: listModalColors.foreground,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    paddingBottom: 8,
  },
  listItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listItemActive: {
    backgroundColor: 'rgba(41, 98, 255, 0.15)',
  },
  listItemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  listItemLabel: {
    fontSize: 13,
    color: listModalColors.foreground,
  },
  listItemLabelActive: {
    color: listModalColors.accent,
  },
  listItemSublabel: {
    fontSize: 11,
    color: listModalColors.foregroundTransparent,
    marginTop: 2,
  },
  categoryHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  categoryHeaderText: {
    fontSize: 10,
    fontWeight: '600',
    color: listModalColors.foregroundTransparent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyState: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 13,
    color: listModalColors.foregroundTransparent,
  },
});
