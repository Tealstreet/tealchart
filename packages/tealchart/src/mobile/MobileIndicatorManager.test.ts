import type { Bar } from '../types';

import { describe, expect, it, vi } from 'vitest';

import { MobileIndicatorManager } from './MobileIndicatorManager';

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

describe('MobileIndicatorManager custom Tealscript indicators', () => {
  it('adds caller-provided Tealscript and tags plots with the returned instance ID', () => {
    const manager = new MobileIndicatorManager();
    manager.setBars(makeBars(3));

    const instanceId = manager.addTealscriptIndicator({
      id: 'ai-wma',
      name: 'AI WMA',
      overlay: true,
      code: 'indicator("AI WMA", overlay=true)\nplot(close)',
    });

    expect(instanceId).toBe('ai-wma');
    expect(manager.getIndicator(instanceId)?.indicator.name).toBe('AI WMA');
    expect(manager.getIndicatorPaneInfo()[instanceId]).toMatchObject({
      name: 'AI WMA',
      overlay: true,
    });
    expect(manager.getPlots()).toHaveLength(1);
    expect(manager.getPlots()[0]).toMatchObject({
      scriptId: instanceId,
      type: 'plot',
    });
    expect(manager.getPlots()[0].values).toEqual([101, 102, 103]);
  });

  it('removes custom Tealscript plots and pane metadata by instance ID', () => {
    const manager = new MobileIndicatorManager();
    manager.setBars(makeBars(2));

    const instanceId = manager.addTealscriptIndicator({
      id: 'ai-close',
      code: 'indicator("AI Close")\nplot(close)',
    });

    expect(manager.getPlots()).toHaveLength(1);

    manager.removeIndicator(instanceId);

    expect(manager.getPlots()).toHaveLength(0);
    expect(manager.getIndicator(instanceId)).toBeUndefined();
    expect(manager.getIndicatorPaneInfo()[instanceId]).toBeUndefined();
  });

  it('returns an instance ID and reports parse errors for invalid Tealscript', () => {
    const manager = new MobileIndicatorManager();
    const onError = vi.fn();
    manager.setOnError(onError);
    manager.setBars(makeBars(2));

    const instanceId = manager.addTealscriptIndicator({
      id: 'broken-parse',
      code: 'indicator("Broken"\nplot(close)',
    });

    expect(instanceId).toBe('broken-parse');
    expect(manager.getIndicator(instanceId)).toBeDefined();
    expect(manager.getPlots()).toHaveLength(0);
    expect(onError).toHaveBeenCalledWith(
      instanceId,
      expect.objectContaining({
        type: 'parse',
        message: expect.any(String),
        line: expect.any(Number),
        column: expect.any(Number),
      }),
    );
  });

  it('reports runtime errors once until the error changes', () => {
    const manager = new MobileIndicatorManager();
    const onError = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    manager.setOnError(onError);
    manager.setBars(makeBars(2));

    const instanceId = manager.addTealscriptIndicator({
      id: 'broken-runtime',
      code: 'indicator("Broken Runtime")\nplot(ta.missing(close))',
    });

    manager.setBars(makeBars(3));

    expect(instanceId).toBe('broken-runtime');
    expect(manager.getPlots()).toHaveLength(0);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      instanceId,
      expect.objectContaining({
        type: 'runtime',
        message: expect.stringContaining('ta.missing'),
      }),
    );

    consoleError.mockRestore();
  });
});
