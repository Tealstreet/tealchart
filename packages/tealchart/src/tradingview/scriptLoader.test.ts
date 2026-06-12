import { describe, expect, it, vi } from 'vitest';
import { loadPatchedTradingViewScript } from './scriptLoader';
import type { TradingViewPatchSpec } from './types';

describe('TradingView patched script loader', () => {
  const spec: TradingViewPatchSpec = {
    id: 'synthetic-loader',
    tradingViewVersion: '31.2.0',
    patches: [
      {
        id: 'inject-hook',
        find: 'nativeDraw();',
        replace: 'window.__tealchartTradingViewHooks__?.beforeBars?.(frame);nativeDraw();',
      },
    ],
  };

  it('fetches, patches, and injects a blob script', async () => {
    const createObjectURL = vi.fn(() => 'blob:patched-tv');
    const revokeObjectURL = vi.fn();
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      text: async () => 'function draw(){nativeDraw();}',
    })) as unknown as typeof fetch;

    const result = await loadPatchedTradingViewScript({
      url: '/charting_library/bundles/library.js',
      spec,
      fetch: fetchImpl,
      createObjectURL,
      revokeObjectURL,
      scriptAttributes: { crossorigin: 'anonymous', defer: true },
    });

    expect(fetchImpl).toHaveBeenCalledWith('/charting_library/bundles/library.js');
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(result.patchResult.appliedPatches).toEqual(['inject-hook']);
    expect(result.element.src).toBe('blob:patched-tv');
    expect(result.element.dataset.tealchartTradingviewPatched).toBe('synthetic-loader');
    expect(result.element.getAttribute('crossorigin')).toBe('anonymous');
    expect(result.element.hasAttribute('defer')).toBe(true);

    result.dispose();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:patched-tv');
    expect(document.head.contains(result.element)).toBe(false);
  });
});
