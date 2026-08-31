import frontendConfig from '../../eslint.config.frontend.mjs';

const nativeRuntimeCriticalFiles = [
  'src/mobile/interaction/nativePaneDivider.ts',
  'src/mobile/interaction/nativeViewportGestureState.ts',
  'src/mobile/interaction/nativeViewportGestures.ts',
  'src/mobile/interaction/useNativeSkiaInteractionRuntime.ts',
  'src/mobile/render/nativePaneRangeOverride.ts',
  'src/mobile/render/NativePaneDividerResizeLayer.tsx',
  'src/mobile/render/NativeIndicatorPlotLayer.tsx',
  'src/mobile/render/NativeIndicatorPaneAxisLayer.tsx',
  'src/mobile/render/NativeIndicatorOutputAxisLabelLayer.tsx',
];

export default [
  ...frontendConfig,
  {
    files: nativeRuntimeCriticalFiles,
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "ImportDeclaration[source.value='react'] ImportSpecifier[imported.name=/^(useEffect|useLayoutEffect|useInsertionEffect)$/]",
          message:
            'Native Skia runtime/preview correctness must not depend on React lifecycle timing. Use explicit runtime state instead.',
        },
        {
          selector:
            "CallExpression[callee.name=/^(useEffect|useLayoutEffect|useInsertionEffect)$/]",
          message:
            'Native Skia runtime/preview correctness must not depend on React lifecycle timing. Use explicit runtime state instead.',
        },
        {
          selector:
            "CallExpression[callee.object.name='React'][callee.property.name=/^(useEffect|useLayoutEffect|useInsertionEffect)$/]",
          message:
            'Native Skia runtime/preview correctness must not depend on React lifecycle timing. Use explicit runtime state instead.',
        },
      ],
    },
  },
];
