import type { ReactNode } from 'react';

import React from 'react';
import { vi } from 'vitest';

function serializeStyle(style: unknown): string | undefined {
  if (style === undefined) return undefined;
  return JSON.stringify(style);
}

function AnimatedView({ children, style, ...props }: { children?: ReactNode; style?: unknown }) {
  return (
    <div data-style={serializeStyle(style)} {...props}>
      {children}
    </div>
  );
}

const Animated = {
  View: AnimatedView,
};

export default Animated;
export const runOnJS = vi.fn((fn: (...args: unknown[]) => unknown) => fn);
export const useAnimatedStyle = vi.fn(() => ({}));
export const useSharedValue = vi.fn((value: unknown) => ({ value }));
export const withTiming = vi.fn((value: unknown) => value);
