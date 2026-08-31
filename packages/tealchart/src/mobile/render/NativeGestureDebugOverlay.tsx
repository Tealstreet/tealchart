import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

const NATIVE_GESTURE_DEBUG_LINE_LIMIT = 10;

interface NativeGestureDebugEntry {
  id: number;
  message: string;
}

export interface NativeGestureDebugOverlayHandle {
  append: (message: string) => void;
}

/**
 * Android-only gesture/render log, and it owns its own entries for a reason.
 *
 * Held as chart state, an append re-rendered the whole chart. A divider drag
 * logs once per gesture update, so the instrument put a full chart render on
 * every frame of the very drag it was measuring - on Android alone, since it
 * never mounts on iOS. That is the shape of an observer that changes what it
 * observes. Appends now land here through a ref and touch nothing above.
 */
export const NativeGestureDebugOverlay = forwardRef<
  NativeGestureDebugOverlayHandle,
  { summary: readonly string[]; title: string }
>(function NativeGestureDebugOverlay({ summary, title }, ref) {
  const [entries, setEntries] = useState<readonly NativeGestureDebugEntry[]>([]);
  const sequenceRef = useRef(0);
  const append = useCallback((message: string) => {
    sequenceRef.current += 1;
    const nextEntry = { id: sequenceRef.current, message };
    setEntries((current) => [nextEntry, ...current].slice(0, NATIVE_GESTURE_DEBUG_LINE_LIMIT));
  }, []);
  useImperativeHandle(ref, () => ({ append }), [append]);

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <Text style={styles.title}>{title}</Text>
      {summary.map((line) => (
        <Text key={line} style={styles.text}>
          {line}
        </Text>
      ))}
      {entries.map((entry) => (
        <Text key={entry.id} style={styles.text}>
          {entry.message}
        </Text>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderColor: 'rgba(0, 224, 255, 0.9)',
    borderRadius: 6,
    borderWidth: 1,
    left: 4,
    maxWidth: '54%',
    paddingHorizontal: 4,
    paddingVertical: 4,
    position: 'absolute',
    top: 42,
    zIndex: 10_000,
  },
  text: {
    color: '#00e0ff',
    fontFamily: Platform.select({ android: 'monospace', default: undefined }),
    fontSize: 8,
    lineHeight: 10,
  },
  title: {
    color: '#ffffff',
    fontFamily: Platform.select({ android: 'monospace', default: undefined }),
    fontSize: 8,
    fontWeight: '700',
    lineHeight: 10,
  },
});
