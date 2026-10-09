import { describe, expect, it, vi } from 'vitest';

import { readNativeAnalysisContext } from './nativeAnalysisContext';

function fixture() {
  const getAnalysisContext = vi.fn(() => ({
    status: 'ready' as const,
    context: {
      symbol: 'TEST',
      interval: '1',
      contextRevision: 1,
      bars: [],
    },
  }));
  return {
    core: { getAnalysisContext },
    disposed: false,
    currentSymbol: 'TEST',
    currentInterval: '1',
    requestedSymbol: 'TEST',
    requestedInterval: '1',
    pendingProps: false,
    renderBlocked: false,
    visibleRange: { from: 1000, to: 5000 },
  };
}

describe('native authoritative analysis reader', () => {
  it('refuses a held or blocked render frame before reading current bars', () => {
    const state = fixture();
    state.renderBlocked = true;
    expect(readNativeAnalysisContext(state)).toEqual({ status: 'unavailable', reason: 'loading' });
    expect(state.core.getAnalysisContext).not.toHaveBeenCalled();
    state.renderBlocked = false;
    expect(readNativeAnalysisContext(state).status).toBe('ready');
    expect(state.core.getAnalysisContext).toHaveBeenCalledWith(state.visibleRange);
  });

  it.each([
    [{ disposed: true }, 'disposed'],
    [{ pendingProps: true }, 'stale-market'],
    [{ requestedSymbol: 'OTHER' }, 'stale-market'],
    [{ requestedInterval: '5' }, 'stale-market'],
  ] as const)('refuses an unavailable native owner (%#)', (changes, reason) => {
    const state = fixture();
    expect(readNativeAnalysisContext({ ...state, ...changes })).toEqual({ status: 'unavailable', reason });
    expect(state.core.getAnalysisContext).not.toHaveBeenCalled();
  });
});
