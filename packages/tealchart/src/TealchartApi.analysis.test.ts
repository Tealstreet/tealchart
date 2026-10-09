import type { LoadedAnalysisContext } from './analysis';

import { describe, expect, it, vi } from 'vitest';

import { TealchartApi } from './TealchartApi';

const values = Array.from({ length: 12 }, (_, index) => ({
  time: (index + 1) * 1000,
  open: 100 + (index % 5),
  high: 105 + (index % 5),
  low: 90 + (index % 5),
  close: 101 + (index % 5),
  volume: 1,
}));
function fixture() {
  const api = new TealchartApi('TEST', '1');
  const context: LoadedAnalysisContext = {
    bars: values,
    symbol: 'TEST',
    interval: '1',
    contextRevision: 1,
    visibleRange: { from: 1000, to: 5000 },
  };
  api.setAnalysisContextReader(() => ({ status: 'ready', context }));
  const revision = () => {
    const result = api.getAnalysisSnapshot();
    if (result.status !== 'ready') throw new Error('Expected snapshot');
    return result.snapshot.contextRevision;
  };
  return { api, context, revision };
}

describe('Tealchart analysis API', () => {
  it('requires an explicit saved-indicator owner and revokes it on disposal', async () => {
    const api = new TealchartApi('TEST', '1');
    await expect(api.addBuiltinIndicator('rsi')).rejects.toThrow(/does not support saved/);
    const add = vi.fn(async () => null);
    api.setOnBuiltinIndicatorAdd(add);
    expect(await api.addBuiltinIndicator('rsi')).toBeNull();
    expect(add).toHaveBeenCalledOnce();
    api.dispose();
    await expect(api.addBuiltinIndicator('rsi')).rejects.toThrow(/no longer available/);
    expect(add).toHaveBeenCalledOnce();
  });
  it('is unavailable until an owner installs a reader and after disposal', () => {
    const api = new TealchartApi('TEST', '1');
    expect(api.getAnalysisSnapshot()).toEqual({ status: 'unavailable', reason: 'unsupported' });
    api.setAnalysisContextReader(() => ({ status: 'unavailable', reason: 'loading' }));
    expect(api.findSimilarPatterns({ range: { from: 1000, to: 5000 } })).toEqual({
      status: 'unavailable',
      reason: 'loading',
    });
    api.dispose();
    expect(api.getAnalysisSnapshot()).toEqual({ status: 'unavailable', reason: 'disposed' });
  });

  it('pins revisions through A→B→A, interval/account/reset transitions while ticks/pans stay stable', () => {
    const { api, context, revision } = fixture();
    const first = revision();
    context.visibleRange = { from: 2000, to: 6000 };
    context.bars = values.map((bar) => ({ ...bar, close: bar.close + 1 }));
    expect(revision()).toBe(first);
    api.setSymbol('OTHER');
    api.setSymbol('TEST');
    const returned = revision();
    expect(returned).toBeGreaterThan(first);
    api.setResolution('5');
    api.setResolution('1');
    expect(revision()).toBeGreaterThan(returned);
    const beforeAccount = revision();
    api.setAccount('private-account');
    expect(revision()).toBeGreaterThan(beforeAccount);
    const beforeReset = revision();
    api.resetData();
    expect(revision()).toBeGreaterThan(beforeReset);
    const beforeHistory = revision();
    context.contextRevision++;
    expect(revision()).toBeGreaterThan(beforeHistory);
    expect(JSON.stringify(api.getAnalysisSnapshot())).not.toContain('private-account');
  });

  it('uses the same context revision for snapshots and matching results', () => {
    const { api, revision } = fixture();
    const expected = revision();
    expect(api.findSimilarPatterns({ range: { from: 1000, to: 5000 } })).toMatchObject({
      status: 'ready',
      contextRevision: expected,
    });
  });
});
