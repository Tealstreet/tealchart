import { describe, expect, it } from 'vitest';
import { applyTradingViewPatchSpec, patchTradingViewBundle, TradingViewPatchError } from './runtimePatcher';
import type { TradingViewPatchSpec } from './types';

describe('TradingView runtime patcher', () => {
  const spec: TradingViewPatchSpec = {
    id: 'synthetic-tv-31.2.0',
    tradingViewVersion: '31.2.0',
    patches: [
      {
        id: 'inject-prelude',
        find: 'function draw(){',
        replace: 'function draw(){window.__tealchartTradingViewHooks__?.beforeBars?.(frame);',
      },
    ],
  };

  it('applies required text patches', () => {
    const result = applyTradingViewPatchSpec('function draw(){nativeDraw();}', spec);

    expect(result.code).toContain('__tealchartTradingViewHooks__');
    expect(result.appliedPatches).toEqual(['inject-prelude']);
  });

  it('fails closed when a required anchor is missing', () => {
    expect(() => applyTradingViewPatchSpec('function other(){nativeDraw();}', spec)).toThrow(
      TradingViewPatchError
    );
  });

  it('requires an explicit occurrence for ambiguous anchors', () => {
    expect(() =>
      applyTradingViewPatchSpec('function draw(){}function draw(){}', spec)
    ).toThrow(/matched 2 times/);
  });

  it('allows optional anchors to be skipped with a warning', () => {
    const result = applyTradingViewPatchSpec('function other(){}', {
      ...spec,
      patches: [{ ...spec.patches[0], required: false }],
    });

    expect(result.appliedPatches).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });

  it('verifies a caller supplied hash when requested', async () => {
    await expect(
      patchTradingViewBundle('function draw(){}', spec, { expectedSha256: 'not-a-real-hash' })
    ).rejects.toMatchObject({ code: 'hash-mismatch' });
  });
});
