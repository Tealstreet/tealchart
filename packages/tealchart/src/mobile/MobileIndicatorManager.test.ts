import type { BuiltinIndicator } from '../indicators/builtinIndicators';
import type { Bar } from '../types';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
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
  afterEach(() => {
    clearChartStoreCache();
  });

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
    expect(manager.getDeclaration(instanceId)).toMatchObject({
      title: 'AI WMA',
      overlay: true,
    });
    expect(manager.getIndicator(instanceId)?.declaration).toMatchObject({
      title: 'AI WMA',
      overlay: true,
    });
  });

  it('retains Tealscript drawings and tags them with the returned instance ID', () => {
    const manager = new MobileIndicatorManager();
    manager.setBars(makeBars(2));

    const instanceId = manager.addTealscriptIndicator({
      id: 'drawing-study',
      name: 'Drawing Study',
      overlay: true,
      code: 'indicator("Drawing Study", overlay=true)\nlabel.new(bar_index, close, text="mark")',
    });

    expect(manager.getDrawings()).toHaveLength(2);
    expect(manager.getDrawings()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scriptId: instanceId,
          type: 'label',
          text: 'mark',
        }),
      ]),
    );
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
    expect(manager.getDrawings()).toHaveLength(0);
    expect(manager.getIndicator(instanceId)).toBeUndefined();
    expect(manager.getIndicatorPaneInfo()[instanceId]).toBeUndefined();
  });

  it('returns an instance ID and reports parse errors for invalid Tealscript', () => {
    const manager = new MobileIndicatorManager();
    const onError = vi.fn();
    manager.onErrorSubscribe(onError);
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

  it('reports parse errors from built-in indicators', () => {
    const manager = new MobileIndicatorManager();
    const onError = vi.fn();
    manager.onErrorSubscribe(onError);
    manager.setBars(makeBars(2));

    const indicator: BuiltinIndicator = {
      id: 'broken-builtin',
      name: 'Broken Builtin',
      category: 'other',
      overlay: false,
      code: 'indicator("Broken Builtin"\nplot(close)',
    };
    const instanceId = manager.addIndicator(indicator);

    expect(manager.getIndicator(instanceId)).toBeDefined();
    expect(manager.getPlots()).toHaveLength(0);
    expect(onError).toHaveBeenCalledWith(
      instanceId,
      expect.objectContaining({
        type: 'parse',
        message: expect.any(String),
      }),
    );
  });

  it('upserts caller-stable custom Tealscript IDs', () => {
    const manager = new MobileIndicatorManager();
    manager.setBars(makeBars(2));

    const firstId = manager.addTealscriptIndicator({
      id: 'stable-study',
      name: 'First',
      code: 'indicator("First")\nplot(close)',
    });
    const secondId = manager.addTealscriptIndicator({
      id: 'stable-study',
      name: 'Second',
      code: 'indicator("Second")\nplot(open)',
    });

    expect(secondId).toBe(firstId);
    expect(manager.getIndicators()).toHaveLength(1);
    expect(manager.getIndicator(secondId)?.indicator.name).toBe('Second');
    expect(manager.getPlots()).toHaveLength(1);
    expect(manager.getPlots()[0].scriptId).toBe(secondId);
    expect(manager.getPlots()[0].values).toEqual([100, 101]);
  });

  it('reports runtime errors once until the error changes', () => {
    const manager = new MobileIndicatorManager();
    const onError = vi.fn();
    manager.onErrorSubscribe(onError);
    manager.setBars(makeBars(2));

    const instanceId = manager.addTealscriptIndicator({
      id: 'broken-runtime',
      code: 'indicator("Broken Runtime")\nplot(missingRuntime(close))',
    });

    manager.setBars(makeBars(3));

    expect(instanceId).toBe('broken-runtime');
    expect(manager.getPlots()).toHaveLength(0);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      instanceId,
      expect.objectContaining({
        type: 'runtime',
        message: expect.stringContaining('missingRuntime'),
      }),
    );
  });
});
