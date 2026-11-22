import { useSyncExternalStore } from 'react';

import { Dimensions } from 'react-native';

/**
 * The most system text scaling (iOS Larger Text, Android font size) that flex-laid-out chart
 * chrome applies. The legend sits on the plot beside Skia axis text that never scales; uncapped
 * at the largest accessibility size it ran off the pane (AGT-154).
 */
export const NATIVE_CHART_MAX_FONT_SIZE_MULTIPLIER = 1.2;

const subscribe = (onChange: () => void) => {
  const subscription = Dimensions.addEventListener('change', onChange);
  return () => subscription.remove();
};

const getFontScale = () => Dimensions.get('window').fontScale;

/** The system text scale. Re-renders only when it changes, not on rotation or resize. */
export function useNativeFontScale(): number {
  return useSyncExternalStore(subscribe, getFontScale);
}
