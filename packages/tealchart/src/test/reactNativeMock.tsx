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

export function Text({ children }: { children?: ReactNode }) {
  return <span>{children}</span>;
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
};

export const Platform = {
  OS: 'ios',
};
