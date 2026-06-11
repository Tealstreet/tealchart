import type { ReactNode } from 'react';

import React from 'react';

interface PressableProps {
  accessibilityLabel?: string;
  accessibilityState?: { disabled?: boolean; selected?: boolean };
  children?: ReactNode | ((state: { pressed: boolean }) => ReactNode);
  disabled?: boolean;
  onPress?: () => void;
}

export function View({ children }: { children?: ReactNode }) {
  return <div>{children}</div>;
}

export function Text({ children }: { children?: ReactNode }) {
  return <span>{children}</span>;
}

export function ScrollView({ children }: { children?: ReactNode }) {
  return <div>{children}</div>;
}

export function Pressable({ accessibilityLabel, accessibilityState, children, disabled, onPress }: PressableProps) {
  const isDisabled = disabled || accessibilityState?.disabled || false;
  return (
    <button
      aria-disabled={isDisabled ? 'true' : undefined}
      aria-label={accessibilityLabel}
      aria-pressed={accessibilityState?.selected ? 'true' : 'false'}
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onPress}
      type="button"
    >
      {typeof children === 'function' ? children({ pressed: false }) : children}
    </button>
  );
}

export const StyleSheet = {
  create: <T,>(styles: T): T => styles,
};
