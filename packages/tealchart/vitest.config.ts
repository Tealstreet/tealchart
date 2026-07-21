import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const testFiles = ['./src/**/*.test.{js,jsx,ts,tsx}'];

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      'react-native': fileURLToPath(new URL('./src/test/reactNativeMock.tsx', import.meta.url)),
      '@shopify/react-native-skia': fileURLToPath(new URL('./src/test/reactNativeSkiaMock.tsx', import.meta.url)),
      'react-native-svg': fileURLToPath(new URL('./src/test/reactNativeSvgMock.tsx', import.meta.url)),
      '@expo/vector-icons': fileURLToPath(new URL('./src/test/expoVectorIconsMock.tsx', import.meta.url)),
      'react-native-gesture-handler': fileURLToPath(new URL('./src/test/gestureHandlerMock.tsx', import.meta.url)),
      'react-native-reanimated': fileURLToPath(new URL('./src/test/reanimatedMock.tsx', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    passWithNoTests: true,
    cache: {
      dir: '../../.cache/vitest/tealchart',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'clover'],
    },
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    include: testFiles,
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/.{idea,git,cache,output,temp}/**'],
  },
});
