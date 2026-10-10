import React from 'react';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NativeStableGestureDetector } from './NativeStableGestureDetector';

const detector = vi.hoisted(() => ({ renders: 0, gestures: [] as unknown[] }));

vi.mock('react-native-gesture-handler', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-native-gesture-handler')>();
  return {
    ...original,
    GestureDetector: ({ children, gesture }: any) => {
      detector.renders += 1;
      detector.gestures.push(gesture);
      return children;
    },
  };
});

afterEach(() => {
  cleanup();
  detector.renders = 0;
  detector.gestures = [];
});

describe('NativeStableGestureDetector', () => {
  it('renders new content without re-rendering the detector', () => {
    const gesture = { id: 'chart' } as any;
    const { rerender } = render(
      <NativeStableGestureDetector gesture={gesture}>
        <span>tick 1</span>
      </NativeStableGestureDetector>,
    );
    rerender(
      <NativeStableGestureDetector gesture={gesture}>
        <span>tick 2</span>
      </NativeStableGestureDetector>,
    );

    expect(screen.getByText('tick 2')).toBeTruthy();
    expect(detector.renders).toBe(1);
  });

  it('re-renders the detector when the gesture changes', () => {
    const first = { id: 'first' } as any;
    const second = { id: 'second' } as any;
    const { rerender } = render(
      <NativeStableGestureDetector gesture={first}>
        <span>content</span>
      </NativeStableGestureDetector>,
    );
    rerender(
      <NativeStableGestureDetector gesture={second}>
        <span>content</span>
      </NativeStableGestureDetector>,
    );

    expect(detector.gestures).toEqual([first, second]);
  });
});
