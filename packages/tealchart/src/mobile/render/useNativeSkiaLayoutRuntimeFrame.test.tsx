import type { UnifiedPaneLayout } from '../../types';

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useNativeSkiaLayoutRuntime } from './useNativeSkiaLayoutRuntime';

function createPaneLayout(indicatorRatio = 0.25): UnifiedPaneLayout {
  return {
    panes: [
      { id: 'main', type: 'main', heightRatio: 1 - indicatorRatio, yMin: 0, yMax: 1, fixedRange: false },
      { id: 'pane_1', type: 'indicator', heightRatio: indicatorRatio, yMin: -1, yMax: 1, fixedRange: false },
    ],
    timeAxisHeight: 26,
  };
}

function renderLayoutRuntime(paneLayout: UnifiedPaneLayout) {
  return renderHook(
    (props: { paneLayout: UnifiedPaneLayout }) =>
      useNativeSkiaLayoutRuntime({
        imperativeTheme: null,
        paneLayout: props.paneLayout,
        pricePrecision: 2,
        propHeight: 600,
        propWidth: 360,
        showTopBar: true,
        theme: 'Dark',
        topBarHeight: 36,
      }),
    { initialProps: { paneLayout } },
  );
}

describe('native Skia layout runtime frame identity', () => {
  it('holds the frame across a fresh pane layout object of the same shape', () => {
    const { result, rerender } = renderLayoutRuntime(createPaneLayout());
    const firstFrame = result.current.frame;

    expect(firstFrame).not.toBeNull();
    // The pane manager mints a new wrapper on every read; an object-keyed memo
    // rebuilt the frame - and every gesture built from it - on every render.
    rerender({ paneLayout: createPaneLayout() });

    expect(result.current.frame).toBe(firstFrame);
  });

  it('rebuilds the frame when a dragged pane height actually changes', () => {
    const { result, rerender } = renderLayoutRuntime(createPaneLayout());
    const firstFrame = result.current.frame;

    rerender({ paneLayout: createPaneLayout(0.4) });

    expect(result.current.frame).not.toBe(firstFrame);
    expect(result.current.frame?.panes[1]?.height).toBeGreaterThan(firstFrame?.panes[1]?.height ?? 0);
  });
});
