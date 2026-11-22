import type { ReactNode } from 'react';

import React from 'react';

interface PressableProps {
  accessibilityLabel?: string;
  accessibilityState?: { disabled?: boolean; expanded?: boolean; selected?: boolean };
  children?: ReactNode | ((state: { pressed: boolean }) => ReactNode);
  disabled?: boolean;
  onPress?: () => void;
}

interface TextInputProps {
  accessibilityLabel?: string;
  autoFocus?: boolean;
  multiline?: boolean;
  onBlur?: () => void;
  onChangeText?: (value: string) => void;
  onKeyPress?: (event: { nativeEvent: { key: string } }) => void;
  onSubmitEditing?: () => void;
  style?: unknown;
  value?: string;
}

interface ModalProps {
  animationType?: string;
  children?: ReactNode;
  onRequestClose?: () => void;
  transparent?: boolean;
  visible?: boolean;
}

interface TouchableWithoutFeedbackProps {
  children?: ReactNode;
  onPress?: () => void;
}

interface ViewProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  onStartShouldSetResponder?: () => boolean;
  pointerEvents?: string;
  style?: unknown;
}

function serializeStyle(style: unknown): string | undefined {
  if (style === undefined) return undefined;
  return JSON.stringify(style);
}

export function View({ accessibilityLabel, children, onStartShouldSetResponder, pointerEvents, style }: ViewProps) {
  return (
    <div
      aria-label={accessibilityLabel}
      data-pointer-events={pointerEvents}
      data-start-should-set-responder={onStartShouldSetResponder?.() ? 'true' : undefined}
      data-style={serializeStyle(style)}
    >
      {children}
    </div>
  );
}

interface TextProps {
  allowFontScaling?: boolean;
  children?: ReactNode;
  maxFontSizeMultiplier?: number;
}

export function Text({ allowFontScaling, children, maxFontSizeMultiplier }: TextProps) {
  return (
    <span
      data-allow-font-scaling={allowFontScaling === undefined ? undefined : String(allowFontScaling)}
      data-max-font-size-multiplier={maxFontSizeMultiplier}
    >
      {children}
    </span>
  );
}

export function TextInput({
  accessibilityLabel,
  onBlur,
  onChangeText,
  onKeyPress,
  onSubmitEditing,
  style,
  value,
}: TextInputProps) {
  return (
    <textarea
      aria-label={accessibilityLabel}
      data-style={serializeStyle(style)}
      onBlur={onBlur}
      onChange={(event) => onChangeText?.(event.currentTarget.value)}
      onKeyDown={(event) => {
        onKeyPress?.({ nativeEvent: { key: event.key } });
        if (event.key === 'Enter') onSubmitEditing?.();
      }}
      value={value}
    />
  );
}

export function ScrollView({ children }: { children?: ReactNode }) {
  return <div>{children}</div>;
}

export function Pressable({ accessibilityLabel, accessibilityState, children, disabled, onPress }: PressableProps) {
  const isDisabled = disabled || accessibilityState?.disabled || false;
  return (
    <button
      aria-disabled={isDisabled ? 'true' : undefined}
      aria-expanded={accessibilityState?.expanded === undefined ? undefined : accessibilityState.expanded ? 'true' : 'false'}
      aria-label={accessibilityLabel}
      aria-pressed={accessibilityState?.selected ? 'true' : 'false'}
      disabled={isDisabled}
      onClick={
        isDisabled
          ? undefined
          : (event) => {
              event.stopPropagation();
              onPress?.();
            }
      }
      type="button"
    >
      {typeof children === 'function' ? children({ pressed: false }) : children}
    </button>
  );
}

export function TouchableOpacity({ accessibilityLabel, accessibilityState, children, disabled, onPress }: PressableProps) {
  return (
    <button
      aria-disabled={disabled ? 'true' : undefined}
      aria-expanded={accessibilityState?.expanded === undefined ? undefined : accessibilityState.expanded ? 'true' : 'false'}
      aria-label={accessibilityLabel}
      disabled={disabled}
      onClick={
        disabled
          ? undefined
          : (event) => {
              event.stopPropagation();
              onPress?.();
            }
      }
      type="button"
    >
      {typeof children === 'function' ? children({ pressed: false }) : children}
    </button>
  );
}

export function Modal({ children, visible }: ModalProps) {
  if (!visible) return null;
  return <div>{children}</div>;
}

export function TouchableWithoutFeedback({ children, onPress }: TouchableWithoutFeedbackProps) {
  return (
    <div
      onClick={(event) => {
        event.stopPropagation();
        onPress?.();
      }}
    >
      {children}
    </div>
  );
}

export const StyleSheet = {
  create: <T,>(styles: T): T => styles,
  hairlineWidth: 1,
};

export const Platform = {
  OS: 'ios',
};

export interface AlertButton {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

// Records the buttons from the most recent Alert.alert call so tests can
// simulate the user pressing one (the native dialog is not rendered here).
export const Alert = {
  lastButtons: [] as AlertButton[],
  alert(_title?: string, _message?: string, buttons?: AlertButton[]): void {
    Alert.lastButtons = buttons ?? [];
  },
};

type AppStateListener = (next: string) => void;
const appStateListeners = new Set<AppStateListener>();

// Tests drive app focus through `AppState.emit`, which updates `currentState`
// before notifying listeners, as React Native does.
export const AppState = {
  currentState: 'active',
  addEventListener(_type: 'change', listener: AppStateListener) {
    appStateListeners.add(listener);
    return { remove: () => appStateListeners.delete(listener) };
  },
  emit(next: string): void {
    AppState.currentState = next;
    for (const listener of [...appStateListeners]) listener(next);
  },
};

type DimensionsListener = () => void;
const dimensionsListeners = new Set<DimensionsListener>();
let windowFontScale = 1;

// Tests drive the system text size through `Dimensions.setFontScale`, which
// notifies 'change' listeners as a Larger Text change does on a device.
export const Dimensions = {
  get(_dimension: 'window' | 'screen') {
    return { fontScale: windowFontScale, height: 844, scale: 3, width: 390 };
  },
  addEventListener(_type: 'change', listener: DimensionsListener) {
    dimensionsListeners.add(listener);
    return { remove: () => dimensionsListeners.delete(listener) };
  },
  setFontScale(fontScale: number): void {
    windowFontScale = fontScale;
    for (const listener of [...dimensionsListeners]) listener();
  },
};
