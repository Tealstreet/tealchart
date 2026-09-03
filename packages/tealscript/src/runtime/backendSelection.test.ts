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
  it('honors explicit overrides before defaults', () => {
    expect(
      () => selectTealscriptExecutionBackend(
        { executionBackendOverride: 'unknown-backend' } as unknown as Parameters<typeof selectTealscriptExecutionBackend>[0],
      ),
    ).toThrow('Unsupported TealScript execution backend');
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

  it('fails loudly when compiled cannot execute', () => {
    const ast = parse(`//@version=6
indicator("Fallback")
plot(request.security("EXT", "1", close))`);

    const result = executeSelectedTealscriptBackend(ast, makeBars(3));

    expect(new Set(result.errors.map((error) => error.message))).toEqual(new Set([
      'request.security requires a request datafeed',
    ]));
    expect(result.profile.executionMode).toBe('compiled');
  });
});
