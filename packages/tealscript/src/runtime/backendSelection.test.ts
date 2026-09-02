import { describe, expect, it } from 'vitest';

import { parse } from '../parser/parser';
import type { Bar } from './context';
import { executeSelectedTealscriptBackend } from './executeSelected';
import { selectTealscriptExecutionBackend } from './backendSelection';

function makeBars(count: number): Bar[] {
  return Array.from({ length: count }, (_, index) => ({
    time: 1_700_000_000_000 + index * 60_000,
    open: 100 + index,
    high: 102 + index,
    low: 99 + index,
    close: 101 + index,
    volume: 1000 + index,
  }));
}

describe('Tealscript backend selection', () => {
  it('honors explicit overrides before rollout flags and defaults', () => {
    expect(
      selectTealscriptExecutionBackend({
        executionBackendOverride: 'interpreter',
        enableClosureBackend: true,
      }),
    ).toEqual({ backend: 'interpreter', source: 'explicit' });
    expect(selectTealscriptExecutionBackend({ enableClosureBackend: true })).toEqual({
      backend: 'closure',
      source: 'flag',
    });
    expect(selectTealscriptExecutionBackend(undefined)).toEqual({
      backend: 'compiled',
      source: 'default',
    });
  });

  it('annotates the selected and actual backend on compiled defaults', () => {
    const ast = parse('indicator("Backend")\nplot(close)');
    const result = executeSelectedTealscriptBackend(ast, makeBars(3));

    expect(result.errors).toEqual([]);
    expect(result.profile.executionMode).toBe('compiled');
    expect(result.profile.selectedBackend).toBe('compiled');
    expect(result.profile.backendSelectionSource).toBe('default');
    expect(result.plots[0]?.values).toEqual([101, 102, 103]);
  });

  it('selects closure from the rollout flag without changing the default', () => {
    const ast = parse('indicator("Backend")\nplot(close + 1)');
    const result = executeSelectedTealscriptBackend(ast, makeBars(3), undefined, {
      runtime: {
        backend: {
          enableClosureBackend: true,
        },
      },
    });

    expect(result.errors).toEqual([]);
    expect(result.profile.executionMode).toBe('closure');
    expect(result.profile.selectedBackend).toBe('closure');
    expect(result.profile.backendSelectionSource).toBe('flag');
    expect(result.plots[0]?.values).toEqual([102, 103, 104]);
  });

  it('keeps selected backend visible when compiled falls back', () => {
    const ast = parse(`//@version=6
indicator("Fallback")
plot(request.security("EXT", "1", close))`);
    const result = executeSelectedTealscriptBackend(ast, makeBars(3));

    expect(result.profile.executionMode).toBe('interpreter');
    expect(result.profile.selectedBackend).toBe('compiled');
    expect(result.profile.backendSelectionSource).toBe('default');
    expect(result.profile.fallbackReason).toBe('missing-request-datafeed');
    expect(result.errors[0]?.message).toContain('request.security requires a request datafeed');
  });
});
