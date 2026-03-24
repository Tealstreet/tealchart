import { beforeEach, describe, expect, it } from 'vitest';

import { PaneManager } from './PaneManager';

describe('PaneManager', () => {
  let pm: PaneManager;

  beforeEach(() => {
    pm = new PaneManager();
  });

  describe('initialization', () => {
    it('starts with one main pane at ratio 1.0', () => {
      const panes = pm.getPanes();
      expect(panes).toHaveLength(1);
      expect(panes[0].type).toBe('main');
      expect(panes[0].heightRatio).toBe(1.0);
    });

    it('getMainPane returns the main pane', () => {
      const main = pm.getMainPane();
      expect(main.id).toBe('main');
      expect(main.type).toBe('main');
    });

    it('getIndicatorPanes returns empty initially', () => {
      expect(pm.getIndicatorPanes()).toEqual([]);
    });
  });

  describe('addIndicator - overlay', () => {
    it('does not create a new pane for overlay indicator', () => {
      pm.addIndicator({ indicatorId: 'sma_1', overlay: true });
      expect(pm.getPanes()).toHaveLength(1); // Still just main
    });

    it('main pane ratio stays 1.0 with overlay', () => {
      pm.addIndicator({ indicatorId: 'sma_1', overlay: true });
      expect(pm.getMainPane().heightRatio).toBe(1.0);
    });
  });

  describe('addIndicator - non-overlay', () => {
    it('creates a new pane for non-overlay indicator', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      expect(pm.getPanes()).toHaveLength(2);
    });

    it('shrinks main pane to accommodate indicator', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      const main = pm.getMainPane();
      expect(main.heightRatio).toBeLessThan(1.0);
    });

    it('main pane never shrinks below 0.4', () => {
      // Add enough indicators to try to push main below minimum
      for (let i = 0; i < 10; i++) {
        pm.addIndicator({ indicatorId: `ind_${i}`, overlay: false });
      }
      expect(pm.getMainPane().heightRatio).toBeGreaterThanOrEqual(0.4);
    });

    it('new indicator pane has correct type and indicator ID', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      const indicatorPanes = pm.getIndicatorPanes();
      expect(indicatorPanes).toHaveLength(1);
      expect(indicatorPanes[0].type).toBe('indicator');
      expect(indicatorPanes[0].indicatorIds).toContain('rsi_1');
    });
  });

  describe('compatible yAxisRange pane sharing', () => {
    it('same yAxisRange shares a pane', () => {
      const range = { min: 0, max: 100 };
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false, yAxisRange: range });
      pm.addIndicator({ indicatorId: 'rsi_2', overlay: false, yAxisRange: range });
      // Should share the same pane
      const indicatorPanes = pm.getIndicatorPanes();
      expect(indicatorPanes).toHaveLength(1);
      expect(indicatorPanes[0].indicatorIds).toContain('rsi_1');
      expect(indicatorPanes[0].indicatorIds).toContain('rsi_2');
    });

    it('different yAxisRange creates separate pane', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false, yAxisRange: { min: 0, max: 100 } });
      pm.addIndicator({ indicatorId: 'macd_1', overlay: false, yAxisRange: { min: -1, max: 1 } });
      expect(pm.getIndicatorPanes()).toHaveLength(2);
    });

    it('no yAxisRange always creates new pane', () => {
      pm.addIndicator({ indicatorId: 'ind_1', overlay: false });
      pm.addIndicator({ indicatorId: 'ind_2', overlay: false });
      expect(pm.getIndicatorPanes()).toHaveLength(2);
    });
  });

  describe('removeIndicator', () => {
    it('removes empty indicator pane after last indicator removed', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      expect(pm.getPanes()).toHaveLength(2);
      pm.removeIndicator('rsi_1');
      expect(pm.getPanes()).toHaveLength(1);
      expect(pm.getPanes()[0].type).toBe('main');
    });

    it('rebalances heights after removal', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      pm.addIndicator({ indicatorId: 'macd_1', overlay: false });
      pm.removeIndicator('rsi_1');
      // Main should be bigger now
      const main = pm.getMainPane();
      const indicators = pm.getIndicatorPanes();
      expect(indicators).toHaveLength(1);
      expect(main.heightRatio + indicators[0].heightRatio).toBeCloseTo(1.0, 5);
    });

    it('restores main to 1.0 when all indicators removed', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      pm.removeIndicator('rsi_1');
      expect(pm.getMainPane().heightRatio).toBe(1.0);
    });

    it('does not remove pane if other indicators remain', () => {
      const range = { min: 0, max: 100 };
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false, yAxisRange: range });
      pm.addIndicator({ indicatorId: 'rsi_2', overlay: false, yAxisRange: range });
      pm.removeIndicator('rsi_1');
      // Pane should remain because rsi_2 is still there
      expect(pm.getIndicatorPanes()).toHaveLength(1);
      expect(pm.getIndicatorPanes()[0].indicatorIds).toEqual(['rsi_2']);
    });

    it('is a no-op for non-existent indicator', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      const panesBefore = pm.getPanes().length;
      pm.removeIndicator('nonexistent');
      expect(pm.getPanes()).toHaveLength(panesBefore);
    });
  });

  describe('computeLayout', () => {
    it('computes correct pixel positions for single main pane', () => {
      const totalHeight = 600;
      const computed = pm.computeLayout(totalHeight);
      expect(computed).toHaveLength(1);
      // timeAxisHeight = 30 by default
      expect(computed[0].top).toBe(0);
      expect(computed[0].height).toBe(570); // 600 - 30
      expect(computed[0].bottom).toBe(570);
    });

    it('pane positions do not overlap', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      pm.addIndicator({ indicatorId: 'macd_1', overlay: false });
      const computed = pm.computeLayout(600);
      for (let i = 0; i < computed.length - 1; i++) {
        expect(computed[i].bottom).toBeCloseTo(computed[i + 1].top, 5);
      }
    });

    it('total pane height equals available height (totalHeight - timeAxis)', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      const computed = pm.computeLayout(800);
      const totalPaneHeight = computed.reduce((sum, p) => sum + p.height, 0);
      expect(totalPaneHeight).toBeCloseTo(770, 5); // 800 - 30
    });

    it('each pane has correct type and id', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      const computed = pm.computeLayout(600);
      expect(computed[0].type).toBe('main');
      expect(computed[0].id).toBe('main');
      expect(computed[1].type).toBe('indicator');
    });
  });

  describe('valueToY / yToValue round-trip', () => {
    it('converts value to Y and back within a pane', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false, yAxisRange: { min: 0, max: 100 } });
      const computed = pm.computeLayout(600);
      const rsiPane = computed.find((p) => p.type === 'indicator')!;

      const testValues = [0, 25, 50, 75, 100];
      for (const val of testValues) {
        const y = pm.valueToY(val, rsiPane);
        const backVal = pm.yToValue(y, rsiPane);
        expect(backVal).toBeCloseTo(val, 5);
      }
    });

    it('returns center Y when range is zero', () => {
      const computed = pm.computeLayout(600);
      const mainPane = computed[0];
      mainPane.yMin = 50;
      mainPane.yMax = 50;
      const y = pm.valueToY(50, mainPane);
      expect(y).toBe(mainPane.top + mainPane.height / 2);
    });

    it('higher values map to lower Y (screen coordinates)', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false, yAxisRange: { min: 0, max: 100 } });
      const computed = pm.computeLayout(600);
      const rsiPane = computed.find((p) => p.type === 'indicator')!;
      const yHigh = pm.valueToY(100, rsiPane);
      const yLow = pm.valueToY(0, rsiPane);
      expect(yHigh).toBeLessThan(yLow);
    });
  });

  describe('getPaneAtY', () => {
    it('returns correct pane for Y coordinate', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      const computed = pm.computeLayout(600);
      // Y=10 should be in the main pane
      const pane = pm.getPaneAtY(10, computed);
      expect(pane?.type).toBe('main');
    });

    it('returns indicator pane for lower Y coordinate', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      const computed = pm.computeLayout(600);
      const indicatorPane = computed.find((p) => p.type === 'indicator')!;
      const pane = pm.getPaneAtY(indicatorPane.top + 5, computed);
      expect(pane?.type).toBe('indicator');
    });

    it('returns null for Y outside all panes', () => {
      const computed = pm.computeLayout(600);
      const pane = pm.getPaneAtY(9999, computed);
      expect(pane).toBeNull();
    });
  });

  describe('reset', () => {
    it('clears all indicator panes and restores main to 1.0', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      pm.addIndicator({ indicatorId: 'macd_1', overlay: false });
      pm.reset();
      expect(pm.getPanes()).toHaveLength(1);
      expect(pm.getMainPane().heightRatio).toBe(1.0);
    });
  });

  describe('getPaneForIndicator', () => {
    it('returns pane for non-overlay indicator', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      const pane = pm.getPaneForIndicator('rsi_1');
      expect(pane).not.toBeNull();
      expect(pane!.type).toBe('indicator');
    });

    it('returns null for overlay indicator', () => {
      pm.addIndicator({ indicatorId: 'sma_1', overlay: true });
      expect(pm.getPaneForIndicator('sma_1')).toBeNull();
    });

    it('returns null for unknown indicator', () => {
      expect(pm.getPaneForIndicator('unknown')).toBeNull();
    });
  });

  describe('isOverlay', () => {
    it('returns true for overlay indicator (not in any pane)', () => {
      pm.addIndicator({ indicatorId: 'sma_1', overlay: true });
      expect(pm.isOverlay('sma_1')).toBe(true);
    });

    it('returns false for non-overlay indicator', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      expect(pm.isOverlay('rsi_1')).toBe(false);
    });
  });

  describe('updatePaneRange', () => {
    it('updates yMin/yMax for non-fixed pane', () => {
      pm.addIndicator({ indicatorId: 'ind_1', overlay: false });
      const pane = pm.getIndicatorPanes()[0];
      pm.updatePaneRange(pane.id, 10, 90);
      expect(pane.yMin).toBe(10);
      expect(pane.yMax).toBe(90);
    });

    it('does not update fixed-range pane', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false, yAxisRange: { min: 0, max: 100 } });
      const pane = pm.getIndicatorPanes()[0];
      pm.updatePaneRange(pane.id, 10, 90);
      expect(pane.yMin).toBe(0);
      expect(pane.yMax).toBe(100);
    });
  });

  describe('toggleMaximizePane', () => {
    it('is a no-op when only one pane exists', () => {
      pm.toggleMaximizePane('main');
      expect(pm.isMaximized()).toBe(false);
      expect(pm.getMainPane().heightRatio).toBe(1.0);
    });

    it('maximizes a pane (gives it 1.0, others 0)', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      const rsiPane = pm.getIndicatorPanes()[0];
      pm.toggleMaximizePane(rsiPane.id);

      expect(pm.isMaximized()).toBe(true);
      expect(pm.getMaximizedPaneId()).toBe(rsiPane.id);
      expect(rsiPane.heightRatio).toBe(1.0);
      expect(pm.getMainPane().heightRatio).toBe(0);
    });

    it('maximizes the main pane (gives it 1.0, indicators 0)', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      pm.addIndicator({ indicatorId: 'macd_1', overlay: false });
      pm.toggleMaximizePane('main');

      expect(pm.isMaximized()).toBe(true);
      expect(pm.getMaximizedPaneId()).toBe('main');
      expect(pm.getMainPane().heightRatio).toBe(1.0);
      for (const pane of pm.getIndicatorPanes()) {
        expect(pane.heightRatio).toBe(0);
      }
    });

    it('restores original ratios on second toggle of same pane', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      const mainRatioBefore = pm.getMainPane().heightRatio;
      const rsiPane = pm.getIndicatorPanes()[0];
      const rsiRatioBefore = rsiPane.heightRatio;

      pm.toggleMaximizePane(rsiPane.id);
      pm.toggleMaximizePane(rsiPane.id);

      expect(pm.isMaximized()).toBe(false);
      expect(pm.getMaximizedPaneId()).toBeNull();
      expect(pm.getMainPane().heightRatio).toBeCloseTo(mainRatioBefore, 5);
      expect(rsiPane.heightRatio).toBeCloseTo(rsiRatioBefore, 5);
    });

    it('switches maximized pane when toggling a different pane', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      pm.addIndicator({ indicatorId: 'macd_1', overlay: false });
      const rsiPane = pm.getIndicatorPanes()[0];
      const macdPane = pm.getIndicatorPanes()[1];

      pm.toggleMaximizePane(rsiPane.id);
      expect(pm.getMaximizedPaneId()).toBe(rsiPane.id);

      pm.toggleMaximizePane(macdPane.id);
      expect(pm.getMaximizedPaneId()).toBe(macdPane.id);
      expect(macdPane.heightRatio).toBe(1.0);
      expect(rsiPane.heightRatio).toBe(0);
    });

    it('restores correctly after switching maximized panes', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      const mainRatioBefore = pm.getMainPane().heightRatio;
      const rsiPane = pm.getIndicatorPanes()[0];
      const rsiRatioBefore = rsiPane.heightRatio;

      pm.toggleMaximizePane(rsiPane.id);
      pm.toggleMaximizePane('main');
      pm.toggleMaximizePane('main'); // restore

      expect(pm.isMaximized()).toBe(false);
      expect(pm.getMainPane().heightRatio).toBeCloseTo(mainRatioBefore, 5);
      expect(rsiPane.heightRatio).toBeCloseTo(rsiRatioBefore, 5);
    });

    it('does nothing for non-existent pane', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      pm.toggleMaximizePane('nonexistent');
      expect(pm.isMaximized()).toBe(false);
    });

    it('restores before adding a new indicator', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      const rsiPane = pm.getIndicatorPanes()[0];
      pm.toggleMaximizePane(rsiPane.id);

      // Adding a non-overlay indicator should restore first
      pm.addIndicator({ indicatorId: 'macd_1', overlay: false });
      expect(pm.isMaximized()).toBe(false);
      expect(pm.getPanes()).toHaveLength(3); // main + rsi + macd
      // All panes should have non-zero ratios after rebalance
      for (const pane of pm.getPanes()) {
        expect(pane.heightRatio).toBeGreaterThan(0);
      }
    });

    it('restores when maximized pane is removed', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      pm.addIndicator({ indicatorId: 'macd_1', overlay: false });
      const rsiPane = pm.getIndicatorPanes()[0];

      pm.toggleMaximizePane(rsiPane.id);
      pm.removeIndicator('rsi_1');

      expect(pm.isMaximized()).toBe(false);
      expect(pm.getPanes()).toHaveLength(2); // main + macd
      // Remaining panes should have non-zero ratios
      for (const pane of pm.getPanes()) {
        expect(pane.heightRatio).toBeGreaterThan(0);
      }
    });

    it('reset clears maximize state', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      pm.toggleMaximizePane('main');
      pm.reset();

      expect(pm.isMaximized()).toBe(false);
      expect(pm.getMaximizedPaneId()).toBeNull();
      expect(pm.getPanes()).toHaveLength(1);
    });

    it('zero-height panes get zero pixels in computeLayout', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      pm.toggleMaximizePane('main');

      const computed = pm.computeLayout(600);
      const mainComputed = computed.find((p) => p.id === 'main')!;
      const rsiComputed = computed.find((p) => p.type === 'indicator')!;

      expect(mainComputed.height).toBe(570); // 600 - 30 timeAxis
      expect(rsiComputed.height).toBe(0);
    });
  });

  describe('getLayout (legacy)', () => {
    it('returns legacy PaneLayout format', () => {
      pm.addIndicator({ indicatorId: 'rsi_1', overlay: false });
      const layout = pm.getLayout();
      expect(layout.mainPaneHeight).toBeGreaterThan(0);
      expect(layout.volumePaneHeight).toBe(0);
      expect(layout.indicatorPanes).toHaveLength(1);
    });
  });
});
