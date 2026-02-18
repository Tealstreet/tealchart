import type { AddIndicatorOptions } from './PaneManager';

import { beforeEach, describe, expect, it } from 'vitest';

import { PaneManager } from './PaneManager';

describe('PaneManager', () => {
  let pm: PaneManager;

  beforeEach(() => {
    pm = new PaneManager();
  });

  // ============================================================================
  // Initialization
  // ============================================================================

  describe('initialization', () => {
    it('should start with a single main pane at heightRatio 1.0', () => {
      const panes = pm.getPanes();
      expect(panes).toHaveLength(1);
      expect(panes[0].heightRatio).toBe(1.0);
    });

    it('should have main pane with type "main" and id "main"', () => {
      const mainPane = pm.getMainPane();
      expect(mainPane.type).toBe('main');
      expect(mainPane.id).toBe('main');
    });

    it('should return empty array from getIndicatorPanes', () => {
      expect(pm.getIndicatorPanes()).toEqual([]);
    });
  });

  // ============================================================================
  // addIndicator - overlay
  // ============================================================================

  describe('addIndicator overlay', () => {
    it('should not create a new pane for overlay indicators', () => {
      pm.addIndicator({ indicatorId: 'ema-20', overlay: true });
      expect(pm.getPanes()).toHaveLength(1);
    });

    it('should keep only the main pane after adding overlay', () => {
      pm.addIndicator({ indicatorId: 'sma-50', overlay: true });
      const panes = pm.getPanes();
      expect(panes).toHaveLength(1);
      expect(panes[0].type).toBe('main');
    });

    it('should return true from isOverlay for overlay indicator', () => {
      pm.addIndicator({ indicatorId: 'bollinger', overlay: true });
      expect(pm.isOverlay('bollinger')).toBe(true);
    });
  });

  // ============================================================================
  // addIndicator - non-overlay
  // ============================================================================

  describe('addIndicator non-overlay', () => {
    it('should create a new indicator pane', () => {
      pm.addIndicator({ indicatorId: 'rsi', overlay: false });
      expect(pm.getIndicatorPanes()).toHaveLength(1);
      expect(pm.getPanes()).toHaveLength(2);
    });

    it('should shrink main pane from 1.0 to 0.85 when one indicator pane added', () => {
      pm.addIndicator({ indicatorId: 'rsi', overlay: false });
      const mainPane = pm.getMainPane();
      expect(mainPane.heightRatio).toBeCloseTo(0.85);
    });

    it('should never shrink main pane below 0.4', () => {
      // Add many indicator panes to push main below minimum
      for (let i = 0; i < 10; i++) {
        pm.addIndicator({ indicatorId: `ind-${i}`, overlay: false });
      }
      const mainPane = pm.getMainPane();
      expect(mainPane.heightRatio).toBeGreaterThanOrEqual(0.4);
    });

    it('should create two separate panes for two non-overlay indicators', () => {
      pm.addIndicator({ indicatorId: 'rsi', overlay: false });
      pm.addIndicator({ indicatorId: 'macd', overlay: false });
      expect(pm.getIndicatorPanes()).toHaveLength(2);
      expect(pm.getPanes()).toHaveLength(3);
    });

    it('should mark pane as fixedRange when yAxisRange is specified', () => {
      pm.addIndicator({ indicatorId: 'rsi', overlay: false, yAxisRange: { min: 0, max: 100 } });
      const pane = pm.getPaneForIndicator('rsi');
      expect(pane).not.toBeNull();
      expect(pane!.fixedRange).toBe(true);
      expect(pane!.yMin).toBe(0);
      expect(pane!.yMax).toBe(100);
    });
  });

  // ============================================================================
  // Compatible yAxisRange sharing
  // ============================================================================

  describe('compatible yAxisRange sharing', () => {
    it('should share a pane for two indicators with the same yAxisRange', () => {
      const range = { min: 0, max: 100 };
      pm.addIndicator({ indicatorId: 'rsi', overlay: false, yAxisRange: range });
      pm.addIndicator({ indicatorId: 'stoch', overlay: false, yAxisRange: range });

      expect(pm.getIndicatorPanes()).toHaveLength(1);
      const pane = pm.getPaneForIndicator('rsi');
      expect(pane).toBe(pm.getPaneForIndicator('stoch'));
      expect(pane!.indicatorIds).toContain('rsi');
      expect(pane!.indicatorIds).toContain('stoch');
    });

    it('should create separate panes for indicators with different yAxisRange', () => {
      pm.addIndicator({ indicatorId: 'rsi', overlay: false, yAxisRange: { min: 0, max: 100 } });
      pm.addIndicator({ indicatorId: 'custom', overlay: false, yAxisRange: { min: -1, max: 1 } });

      expect(pm.getIndicatorPanes()).toHaveLength(2);
      expect(pm.getPaneForIndicator('rsi')).not.toBe(pm.getPaneForIndicator('custom'));
    });
  });

  // ============================================================================
  // removeIndicator
  // ============================================================================

  describe('removeIndicator', () => {
    it('should remove an indicator from its pane', () => {
      pm.addIndicator({ indicatorId: 'rsi', overlay: false });
      expect(pm.getPaneForIndicator('rsi')).not.toBeNull();

      pm.removeIndicator('rsi');
      expect(pm.getPaneForIndicator('rsi')).toBeNull();
    });

    it('should remove pane when last indicator is removed', () => {
      pm.addIndicator({ indicatorId: 'rsi', overlay: false });
      expect(pm.getIndicatorPanes()).toHaveLength(1);

      pm.removeIndicator('rsi');
      expect(pm.getIndicatorPanes()).toHaveLength(0);
      expect(pm.getPanes()).toHaveLength(1);
    });

    it('should re-expand main pane to 1.0 after all indicators removed', () => {
      pm.addIndicator({ indicatorId: 'rsi', overlay: false });
      pm.addIndicator({ indicatorId: 'macd', overlay: false });
      expect(pm.getMainPane().heightRatio).toBeLessThan(1.0);

      pm.removeIndicator('rsi');
      pm.removeIndicator('macd');
      expect(pm.getMainPane().heightRatio).toBe(1.0);
    });
  });

  // ============================================================================
  // computeLayout
  // ============================================================================

  describe('computeLayout', () => {
    it('should give main pane full height minus time axis when alone', () => {
      const totalHeight = 1000;
      const computed = pm.computeLayout(totalHeight);

      expect(computed).toHaveLength(1);
      expect(computed[0].top).toBe(0);
      expect(computed[0].height).toBe(totalHeight - 30);
      expect(computed[0].bottom).toBe(totalHeight - 30);
    });

    it('should have pixel positions sum to totalHeight minus time axis', () => {
      pm.addIndicator({ indicatorId: 'rsi', overlay: false });
      pm.addIndicator({ indicatorId: 'macd', overlay: false });
      const totalHeight = 800;
      const computed = pm.computeLayout(totalHeight);
      const availableHeight = totalHeight - 30;

      const totalComputedHeight = computed.reduce((sum, pane) => sum + pane.height, 0);
      expect(totalComputedHeight).toBeCloseTo(availableHeight);
    });

    it('should produce pixel heights proportional to heightRatio', () => {
      pm.addIndicator({ indicatorId: 'rsi', overlay: false });
      const totalHeight = 1000;
      const availableHeight = totalHeight - 30;
      const computed = pm.computeLayout(totalHeight);

      const mainPane = pm.getMainPane();
      const indicatorPanes = pm.getIndicatorPanes();

      const mainComputed = computed.find((c) => c.id === 'main')!;
      const indComputed = computed.find((c) => c.id === indicatorPanes[0].id)!;

      expect(mainComputed.height).toBeCloseTo(availableHeight * mainPane.heightRatio);
      expect(indComputed.height).toBeCloseTo(availableHeight * indicatorPanes[0].heightRatio);
    });
  });

  // ============================================================================
  // valueToY / yToValue
  // ============================================================================

  describe('valueToY / yToValue', () => {
    it('should round-trip value through valueToY and yToValue', () => {
      pm.updatePaneRange('main', 100, 200);
      const computed = pm.computeLayout(1000);
      const mainComputed = computed[0];

      const originalValue = 150;
      const y = pm.valueToY(originalValue, mainComputed);
      const recovered = pm.yToValue(y, mainComputed);

      expect(recovered).toBeCloseTo(originalValue);
    });

    it('should map yMax to pane top', () => {
      pm.updatePaneRange('main', 100, 200);
      const computed = pm.computeLayout(1000);
      const mainComputed = computed[0];

      const y = pm.valueToY(200, mainComputed);
      expect(y).toBeCloseTo(mainComputed.top);
    });

    it('should return midpoint when range is zero', () => {
      pm.updatePaneRange('main', 50, 50);
      const computed = pm.computeLayout(1000);
      const mainComputed = computed[0];

      const y = pm.valueToY(50, mainComputed);
      expect(y).toBeCloseTo(mainComputed.top + mainComputed.height / 2);
    });
  });

  // ============================================================================
  // getPaneAtY
  // ============================================================================

  describe('getPaneAtY', () => {
    it('should return the correct pane for each region', () => {
      pm.addIndicator({ indicatorId: 'rsi', overlay: false });
      const totalHeight = 1000;
      const computed = pm.computeLayout(totalHeight);

      const mainComputed = computed.find((c) => c.type === 'main')!;
      const indComputed = computed.find((c) => c.type === 'indicator')!;

      // Point inside main pane
      const fromMain = pm.getPaneAtY(mainComputed.top + 10, computed);
      expect(fromMain).not.toBeNull();
      expect(fromMain!.id).toBe('main');

      // Point inside indicator pane
      const fromInd = pm.getPaneAtY(indComputed.top + 10, computed);
      expect(fromInd).not.toBeNull();
      expect(fromInd!.type).toBe('indicator');
    });

    it('should return null for Y in the time axis area', () => {
      const totalHeight = 1000;
      const computed = pm.computeLayout(totalHeight);

      // Time axis is the last 30 pixels
      const result = pm.getPaneAtY(totalHeight - 10, computed);
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // reset
  // ============================================================================

  describe('reset', () => {
    it('should return to a single main pane at heightRatio 1.0', () => {
      pm.addIndicator({ indicatorId: 'rsi', overlay: false });
      pm.addIndicator({ indicatorId: 'macd', overlay: false });
      expect(pm.getPanes()).toHaveLength(3);

      pm.reset();

      const panes = pm.getPanes();
      expect(panes).toHaveLength(1);
      expect(panes[0].id).toBe('main');
      expect(panes[0].type).toBe('main');
      expect(panes[0].heightRatio).toBe(1.0);
      expect(pm.getIndicatorPanes()).toEqual([]);
    });
  });
});
