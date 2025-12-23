/**
 * ContextMenuComponent - Quick action menu at crosshair position
 *
 * Shows a list of actions when user taps the "+" button on the crosshair.
 * Actions are provided by the parent via the onContextMenu callback.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';

import type { ContextMenuItem } from '../../types';

export interface ContextMenuComponentProps {
  /** Whether the menu is visible */
  visible: boolean;
  /** Menu items to display */
  items: ContextMenuItem[];
  /** Position X (where the "+" button was) */
  x: number;
  /** Position Y (where the "+" button was) */
  y: number;
  /** Price at the crosshair position */
  price: number;
  /** Time at the crosshair position */
  time: number;
  /** Price precision for display */
  pricePrecision?: number;
  /** Callback when menu is closed */
  onClose: () => void;
}

const MENU_WIDTH = 160;
const ITEM_HEIGHT = 40;
const HEADER_HEIGHT = 32;

export const ContextMenuComponent: React.FC<ContextMenuComponentProps> = ({
  visible,
  items,
  x,
  y,
  price,
  time,
  pricePrecision = 2,
  onClose,
}) => {
  // Handle item press
  const handleItemPress = useCallback((item: ContextMenuItem) => {
    if (item.enabled !== false) {
      item.click();
      onClose();
    }
  }, [onClose]);

  // Format price for display
  const formattedPrice = price.toFixed(pricePrecision);

  // Format time for display
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Calculate menu position (avoid going off screen)
  const menuHeight = HEADER_HEIGHT + items.length * ITEM_HEIGHT + 8;
  const menuY = y + menuHeight > 400 ? y - menuHeight : y;
  const menuX = x + MENU_WIDTH > 350 ? x - MENU_WIDTH : x;

  // Separate items by position
  const topItems = items.filter(item => item.position === 'top');
  const bottomItems = items.filter(item => item.position === 'bottom');

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.menu, { left: menuX, top: menuY }]}>
              {/* Header with price/time */}
              <View style={styles.header}>
                <Text style={styles.headerText}>
                  {formattedPrice} @ {formatTime(time)}
                </Text>
              </View>

              {/* Top position items */}
              {topItems.map((item, index) => (
                <Pressable
                  key={`top-${index}`}
                  onPress={() => handleItemPress(item)}
                  style={({ pressed }) => [
                    styles.menuItem,
                    item.enabled === false && styles.menuItemDisabled,
                    pressed && item.enabled !== false && styles.menuItemPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.menuItemText,
                      item.enabled === false && styles.menuItemTextDisabled,
                    ]}
                  >
                    {item.text}
                  </Text>
                </Pressable>
              ))}

              {/* Separator if both top and bottom items exist */}
              {topItems.length > 0 && bottomItems.length > 0 && (
                <View style={styles.separator} />
              )}

              {/* Bottom position items */}
              {bottomItems.map((item, index) => (
                <Pressable
                  key={`bottom-${index}`}
                  onPress={() => handleItemPress(item)}
                  style={({ pressed }) => [
                    styles.menuItem,
                    item.enabled === false && styles.menuItemDisabled,
                    pressed && item.enabled !== false && styles.menuItemPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.menuItemText,
                      item.enabled === false && styles.menuItemTextDisabled,
                    ]}
                  >
                    {item.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    backgroundColor: '#1e222d',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#363a45',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  header: {
    height: HEADER_HEIGHT,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#131722',
    borderBottomWidth: 1,
    borderBottomColor: '#363a45',
  },
  headerText: {
    fontSize: 12,
    color: '#787b86',
    fontWeight: '500',
  },
  menuItem: {
    height: ITEM_HEIGHT,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  menuItemPressed: {
    backgroundColor: '#363a45',
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemText: {
    fontSize: 14,
    color: '#d1d4dc',
  },
  menuItemTextDisabled: {
    color: '#787b86',
  },
  separator: {
    height: 1,
    backgroundColor: '#363a45',
    marginVertical: 4,
  },
});

export default ContextMenuComponent;
