import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = dirname(fileURLToPath(import.meta.url));
const sourceRoot = resolve(testDir, '../..');

const runtimeCriticalFiles = [
  'mobile/interaction/nativePaneDivider.ts',
  'mobile/interaction/nativeViewportGestureState.ts',
  'mobile/interaction/nativeViewportGestures.ts',
  'mobile/interaction/useNativeSkiaInteractionRuntime.ts',
  'mobile/render/nativePaneRangeOverride.ts',
  'mobile/render/NativePaneDividerResizeLayer.tsx',
  'mobile/render/NativeIndicatorPlotLayer.tsx',
  'mobile/render/NativeIndicatorPaneAxisLayer.tsx',
  'mobile/render/NativeIndicatorOutputAxisLabelLayer.tsx',
];

const lifecycleHookPattern =
  /\b(?:useEffect|useLayoutEffect|useInsertionEffect|React\.useEffect|React\.useLayoutEffect|React\.useInsertionEffect)\b/;

describe('native runtime lifecycle boundary', () => {
  it.each(runtimeCriticalFiles)('keeps %s free of React lifecycle hooks', (relativePath) => {
    const source = readFileSync(resolve(sourceRoot, relativePath), 'utf8');

    expect(source).not.toMatch(lifecycleHookPattern);
  });
});
