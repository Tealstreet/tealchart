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

  it('toggles custom Tealscript visibility without removing layout metadata', () => {
    const manager = new MobileIndicatorManager();
    manager.setBars(makeBars(2));

    const instanceId = manager.addTealscriptIndicator({
      id: 'toggle-study',
      code: 'indicator("Toggle Study")\nplot(close)',
    });

    expect(manager.getPlots()).toHaveLength(1);

    manager.setIndicatorVisibility(instanceId, false);

    expect(manager.getPlots()).toHaveLength(0);
    expect(manager.getIndicator(instanceId)).toBeDefined();
    expect(manager.getLayoutIndicators()[0]).toMatchObject({
      id: instanceId,
      isVisible: false,
    });

    manager.toggleIndicatorVisibility(instanceId);

    expect(manager.getPlots()).toHaveLength(1);
    expect(manager.getLayoutIndicators()[0]).toMatchObject({
      id: instanceId,
      isVisible: true,
    });
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

  it('auto-scales non-overlay indicator panes from computed plot values', () => {
    const manager = new MobileIndicatorManager();
    manager.setBars(makeBars(3));

    const instanceId = manager.addTealscriptIndicator({
      id: 'pane-study',
      code: 'indicator("Pane Study")\nplot(close)',
      overlay: false,
    });

    const indicatorPane = manager
      .getUnifiedLayout()
      .panes.find((pane) => pane.type === 'indicator' && pane.indicatorIds?.includes(instanceId));

    expect(indicatorPane).toBeDefined();
    expect(indicatorPane?.yMin).toBeLessThan(101);
    expect(indicatorPane?.yMax).toBeGreaterThan(103);
  });

  it('exports built-in indicator metadata for layout persistence', () => {
    const manager = new MobileIndicatorManager();

    const instanceId = manager.addTealscriptIndicator({
      id: 'study_1',
      builtinId: 'sma',
      code: 'indicator("SMA", overlay=true)\nplot(close)',
      name: 'SMA',
      overlay: true,
      inputs: { length: 20 },
    });

    expect(manager.getLayoutIndicators()).toEqual([
      {
        id: instanceId,
        name: 'SMA',
        builtinId: 'sma',
        inputs: { length: 20 },
        styleOverrides: undefined,
        isVisible: true,
        createdAt: 0,
      },
    ]);
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

describe('MobileIndicatorManager recomputation cache', () => {
  afterEach(() => {
    clearChartStoreCache();
  });

  function addTwo(manager: MobileIndicatorManager) {
    const left = manager.addTealscriptIndicator({
      id: 'left',
      name: 'Left',
      code: 'indicator("Left")\nplot(close)',
    });
    const right = manager.addTealscriptIndicator({
      id: 'right',
      name: 'Right',
      code: 'indicator("Right")\nplot(open)',
    });
    return { left, right };
  }

  function plotsFor(manager: MobileIndicatorManager, scriptId: string) {
    return manager.getPlots().filter((plot) => plot.scriptId === scriptId);
  }

  it('leaves the other indicators untouched when one is hidden', () => {
    const manager = new MobileIndicatorManager();
    manager.setBars(makeBars(4));
    const { left, right } = addTwo(manager);
    const beforeLeft = plotsFor(manager, left);

    manager.setIndicatorVisibility(right, false);

    expect(plotsFor(manager, right)).toHaveLength(0);
    expect(plotsFor(manager, left)).toEqual(beforeLeft);
    // Reference identity is the assertion: a re-execution would mint new objects.
    expect(plotsFor(manager, left)[0]).toBe(beforeLeft[0]);
  });

  it('leaves the existing indicators untouched when another is added or removed', () => {
    const manager = new MobileIndicatorManager();
    manager.setBars(makeBars(4));
    const { left } = addTwo(manager);
    const beforeLeft = plotsFor(manager, left)[0];

    const added = manager.addTealscriptIndicator({ id: 'third', code: 'indicator("Third")\nplot(high)' });
    expect(plotsFor(manager, left)[0]).toBe(beforeLeft);

    manager.removeIndicator(added);
    expect(plotsFor(manager, left)[0]).toBe(beforeLeft);
    expect(plotsFor(manager, added)).toHaveLength(0);
  });

  it('re-executes only the indicator whose inputs changed', () => {
    const manager = new MobileIndicatorManager();
    manager.setBars(makeBars(6));
    const { left } = addTwo(manager);
    const tuned = manager.addTealscriptIndicator({
      id: 'tuned',
      code: 'indicator("Tuned")\nlength = input.int(2, "length")\nplot(ta.sma(close, length))',
    });
    const beforeLeft = plotsFor(manager, left)[0];
    const beforeTuned = plotsFor(manager, tuned)[0];

    // The engine registers inputs as `input_<title>`, so a bare `length` key
    // would re-execute with the default and prove nothing.
    manager.updateInputs(tuned, { input_length: 4 });

    expect(plotsFor(manager, left)[0]).toBe(beforeLeft);
    expect(plotsFor(manager, tuned)[0]).not.toBe(beforeTuned);
    expect(plotsFor(manager, tuned)[0]?.values).not.toEqual(beforeTuned?.values);
  });

  it('re-executes everything when bars advance, including an appended live bar', () => {
    const manager = new MobileIndicatorManager();
    const bars = makeBars(4);
    manager.setBars(bars);
    const { left } = addTwo(manager);
    const beforeLeft = plotsFor(manager, left)[0];

    // ChartWidgetCore appends the live bar in place and re-passes the same array,
    // so an identity-keyed cache would freeze the plots here.
    bars.push({ time: 1_700_000_240_000, open: 104, high: 106, low: 103, close: 105, volume: 1004 });
    manager.setBars(bars);

    expect(plotsFor(manager, left)[0]).not.toBe(beforeLeft);
    expect(plotsFor(manager, left)[0]?.values).toHaveLength(5);
  });

  it('separates the plot revision from the indicator revision', () => {
    const manager = new MobileIndicatorManager();
    manager.setBars(makeBars(4));
    const { right } = addTwo(manager);

    const indicatorsAfterAdd = manager.getIndicatorsRevision();
    const plotsAfterAdd = manager.getPlotsRevision();

    manager.setBars(makeBars(5));
    expect(manager.getIndicatorsRevision()).toBe(indicatorsAfterAdd);
    expect(manager.getPlotsRevision()).toBeGreaterThan(plotsAfterAdd);

    const plotsAfterBars = manager.getPlotsRevision();
    manager.setIndicatorVisibility(right, false);
    expect(manager.getIndicatorsRevision()).toBeGreaterThan(indicatorsAfterAdd);
    expect(manager.getPlotsRevision()).toBeGreaterThan(plotsAfterBars);
  });

  it('advances the indicator revision for a style override', () => {
    const manager = new MobileIndicatorManager();
    manager.setBars(makeBars(4));
    const { left } = addTwo(manager);
    const before = manager.getIndicatorsRevision();

    manager.updateStyleOverrides(left, [{ plotIndex: 0, color: '#ff0000' }]);

    expect(manager.getIndicatorsRevision()).toBeGreaterThan(before);
  });

  it('keeps the plot arrays when bars go empty on an already empty chart', () => {
    const manager = new MobileIndicatorManager();
    manager.setBars([]);
    const before = manager.getPlots();
    const revisionBefore = manager.getPlotsRevision();

    manager.setBars([]);

    expect(manager.getPlots()).toBe(before);
    expect(manager.getPlotsRevision()).toBe(revisionBefore);
  });

  it('keeps the plot array identity when a recompute changes nothing', () => {
    const manager = new MobileIndicatorManager();
    manager.setBars(makeBars(4));
    const { left } = addTwo(manager);
    const before = manager.getPlots();
    const revisionBefore = manager.getPlotsRevision();

    manager.updateInputs(left, {});

    expect(manager.getPlots()).toBe(before);
    expect(manager.getPlotsRevision()).toBe(revisionBefore);
  });
});
