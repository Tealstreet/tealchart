import type { ReactNode } from 'react';

import React from 'react';
import { vi } from 'vitest';

function createGesture() {
  const gesture: Record<string, unknown> = {};
  const proxy = new Proxy(gesture, {
    get(target, prop: string) {
      target[prop] ??= () => proxy;
      return target[prop];
    },
  });
  return proxy;
}

export const Gesture = {
  Exclusive: vi.fn(() => createGesture()),
  LongPress: vi.fn(() => createGesture()),
  Pan: vi.fn(() => createGesture()),
  Pinch: vi.fn(() => createGesture()),
  Race: vi.fn(() => createGesture()),
  Simultaneous: vi.fn(() => createGesture()),
  Tap: vi.fn(() => createGesture()),
};

export function GestureDetector({ children }: { children?: ReactNode }) {
  return <div>{children}</div>;
}
