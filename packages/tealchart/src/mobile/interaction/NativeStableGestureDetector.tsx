import type { ReactNode } from 'react';
import type { NativeChartGesture } from './nativeChartGestures';

import { createContext, memo, useContext } from 'react';

import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

const GestureContentContext = createContext<ReactNode>(null);

function GestureContentSlot() {
  return <>{useContext(GestureContentContext)}</>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

// One element for every mount: the detector's props must stay identical across
// content renders, because RNGH re-applies every handler whenever they change.
const GESTURE_CONTENT_SLOT = (
  <View collapsable={false} style={styles.fill}>
    <GestureContentSlot />
  </View>
);

const MemoGestureDetector = memo(function MemoGestureDetector({ gesture }: { gesture: NativeChartGesture }) {
  return <GestureDetector gesture={gesture}>{GESTURE_CONTENT_SLOT}</GestureDetector>;
});

/**
 * A `GestureDetector` whose handlers are re-applied only when `gesture` changes. RNGH
 * re-sends every handler config from an effect keyed on all props, children included.
 */
export function NativeStableGestureDetector({
  gesture,
  children,
}: {
  gesture: NativeChartGesture;
  children: ReactNode;
}) {
  return (
    <GestureContentContext.Provider value={children}>
      <MemoGestureDetector gesture={gesture} />
    </GestureContentContext.Provider>
  );
}
