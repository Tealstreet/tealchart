import { describe, expect, it, vi } from 'vitest';
import { installTradingViewScriptPatchInterceptor } from './scriptInterceptor';
import type { TradingViewPatchSpec } from './types';

describe('TradingView script patch interceptor', () => {
  const spec: TradingViewPatchSpec = {
    id: 'intercepted-library',
    tradingViewVersion: '31.2.0',
    patches: [{ id: 'marker', find: 'nativeDraw();', replace: 'patchedDraw();' }],
  };

  it('replaces matching script inserts with patched blob scripts', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      text: async () => 'nativeDraw();',
    })) as unknown as typeof fetch;
    const createObjectURL = vi.fn(() => 'blob:intercepted-tv');
    const revokeObjectURL = vi.fn();
    const handle = installTradingViewScriptPatchInterceptor({
      rules: [{ matches: '/bundles/library.', spec }],
      fetch: fetchImpl,
      createObjectURL,
      revokeObjectURL,
    });

    const script = document.createElement('script');
    script.src = 'https://cdn.example.com/charting_library/bundles/library.abc123.js';
    script.crossOrigin = 'anonymous';

    document.head.appendChild(script);
    const loaded = await handle.patchedScripts[0];

    expect(fetchImpl).toHaveBeenCalledWith(script.src);
    expect(loaded.patchResult.appliedPatches).toEqual(['marker']);
    expect(document.head.contains(script)).toBe(false);
    expect(loaded.element.src).toBe('blob:intercepted-tv');
    expect(loaded.element.crossOrigin).toBe('anonymous');

    handle.dispose();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:intercepted-tv');
    expect(document.head.contains(loaded.element)).toBe(false);
  });
});
