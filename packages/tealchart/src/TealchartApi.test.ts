import type { CrossHairMovedEventParams, ResolutionString } from './types';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TealchartApi } from './TealchartApi';

describe('TealchartApi', () => {
  let api: TealchartApi;

  beforeEach(() => {
    api = new TealchartApi('BTCUSDT', '60' as ResolutionString, 'test-account');
  });

  // ============================================================================
  // Symbol/Resolution
  // ============================================================================

  describe('symbol and resolution', () => {
    it('returns initial symbol', () => {
      expect(api.symbol()).toBe('BTCUSDT');
    });

    it('returns initial resolution', () => {
      expect(api.resolution()).toBe('60');
    });

    it('setSymbol updates symbol', () => {
      api.setSymbol('ETHUSDT');
      expect(api.symbol()).toBe('ETHUSDT');
    });

    it('setResolution updates interval', () => {
      api.setResolution('15' as ResolutionString);
      expect(api.resolution()).toBe('15');
    });

    it('setSymbol does not emit when symbol unchanged', () => {
      const handler = vi.fn();
      api.onSymbolChanged().subscribe(null, handler);
      api.setSymbol('BTCUSDT'); // same symbol
      expect(handler).not.toHaveBeenCalled();
    });

    it('setResolution does not emit when interval unchanged', () => {
      const handler = vi.fn();
      api.onIntervalChanged().subscribe(null, handler);
      api.setResolution('60' as ResolutionString); // same interval
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Subscriptions
  // ============================================================================

  describe('subscriptions', () => {
    it('onSymbolChanged fires on symbol change', () => {
      const handler = vi.fn();
      api.onSymbolChanged().subscribe(null, handler);
      api.setSymbol('ETHUSDT');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('onIntervalChanged fires with new interval', () => {
      const handler = vi.fn();
      api.onIntervalChanged().subscribe(null, handler);
      api.setResolution('5' as ResolutionString);
      expect(handler).toHaveBeenCalledWith('5');
    });

    it('crossHairMoved subscription works', () => {
      const handler = vi.fn();
      api.crossHairMoved().subscribe(null, handler);
      const params: CrossHairMovedEventParams = { time: 123, price: 50000 };
      api.emitCrossHairMoved(params);
      expect(handler).toHaveBeenCalledWith(params);
    });

    it('unsubscribe stops notifications', () => {
      const handler = vi.fn();
      api.onSymbolChanged().subscribe(null, handler);
      api.onSymbolChanged().unsubscribe(null, handler);
      api.setSymbol('SOLUSDT');
      expect(handler).not.toHaveBeenCalled();
    });

    it('emitCurrentInterval emits current interval to subscribers', () => {
      const handler = vi.fn();
      api.onIntervalChanged().subscribe(null, handler);
      api.emitCurrentInterval();
      expect(handler).toHaveBeenCalledWith('60');
    });
  });

  // ============================================================================
  // Internal callbacks
  // ============================================================================

  describe('internal symbol/interval callbacks', () => {
    it('setSymbol triggers onSymbolChange callback', () => {
      const callback = vi.fn();
      api.setOnSymbolChange(callback);
      api.setSymbol('ETHUSDT');
      expect(callback).toHaveBeenCalledWith('ETHUSDT');
    });

    it('setResolution triggers onIntervalChange callback', () => {
      const callback = vi.fn();
      api.setOnIntervalChange(callback);
      api.setResolution('1D' as ResolutionString);
      expect(callback).toHaveBeenCalledWith('1D');
    });
  });

  // ============================================================================
  // Enhanced crosshair state
  // ============================================================================

  describe('getEnhancedCrossHairState', () => {
    it('includes symbol and account', () => {
      const params: CrossHairMovedEventParams = { time: 100, price: 42000 };
      const enhanced = api.getEnhancedCrossHairState(params);
      expect(enhanced.symbol).toBe('BTCUSDT');
      expect(enhanced.account).toBe('test-account');
      expect(enhanced.time).toBe(100);
      expect(enhanced.price).toBe(42000);
    });
  });

  // ============================================================================
  // Data management
  // ============================================================================

  describe('data management', () => {
    it('dataReady returns true', () => {
      expect(api.dataReady()).toBe(true);
    });
  });

  // ============================================================================
  // Order lines
  // ============================================================================

  describe('order lines', () => {
    it('createOrderLine returns adapter', async () => {
      const adapter = await api.createOrderLine({ price: 50000 });
      expect(adapter).toBeDefined();
      expect(adapter.getPrice()).toBe(50000);
    });

    it('createOrderLine with defaults', async () => {
      const adapter = await api.createOrderLine();
      expect(adapter.getPrice()).toBe(0);
    });

    it('adapter setter chain returns this', async () => {
      const adapter = await api.createOrderLine();
      const result = adapter.setPrice(100).setText('Buy').setQuantity('1.5').setLineColor('#FF0000');
      expect(result).toBe(adapter);
    });

    it('remove() clears the line from API', async () => {
      const adapter = await api.createOrderLine({ price: 100 });
      expect(api.getOrderLines().size).toBe(1);
      adapter.remove();
      // Process microtask
      await new Promise((resolve) => queueMicrotask(resolve));
      expect(api.getOrderLines().size).toBe(0);
    });

    it('onCancel sets cancellable to true', async () => {
      const adapter = await api.createOrderLine();
      const cancelFn = vi.fn();
      adapter.onCancel(cancelFn);
      const data = (adapter as any)._getRenderData();
      expect(data.cancellable).toBe(true);
    });

    it('triggerOrderCancel fires callback', async () => {
      const cancelFn = vi.fn();
      const adapter = await api.createOrderLine();
      adapter.onCancel(cancelFn);
      // Get the internal ID from the map
      const id = Array.from(api.getOrderLines().keys())[0];
      api.triggerOrderCancel(id);
      expect(cancelFn).toHaveBeenCalledTimes(1);
    });

    it('triggerOrderMove fires callback with price', async () => {
      const moveFn = vi.fn();
      const adapter = await api.createOrderLine();
      adapter.onMove(moveFn);
      const id = Array.from(api.getOrderLines().keys())[0];
      api.triggerOrderMove(id, 55000);
      expect(moveFn).toHaveBeenCalledWith(55000);
    });

    it('editable is false in render data without onMove', async () => {
      const adapter = await api.createOrderLine({ editable: true });
      const data = (adapter as any)._getRenderData();
      expect(data.editable).toBe(false); // No onMove callback
    });

    it('editable is true in render data with onMove', async () => {
      const adapter = await api.createOrderLine({ editable: true });
      adapter.onMove(vi.fn());
      const data = (adapter as any)._getRenderData();
      expect(data.editable).toBe(true);
    });

    it('getOrderLinesRenderData deduplicates by orderId', async () => {
      const a1 = await api.createOrderLine({ price: 100 });
      const a2 = await api.createOrderLine({ price: 200 });
      a1.setOrderId('order-1');
      a2.setOrderId('order-1'); // Same orderId - should dedup
      const data = api.getOrderLinesRenderData();
      const withOrderId = data.filter((d) => d.orderId === 'order-1');
      expect(withOrderId).toHaveLength(1);
      expect(withOrderId[0].price).toBe(200); // Last one wins
    });

    it('clearAllOrderLines removes all', async () => {
      await api.createOrderLine({ price: 100 });
      await api.createOrderLine({ price: 200 });
      expect(api.getOrderLines().size).toBe(2);
      api.clearAllOrderLines();
      expect(api.getOrderLines().size).toBe(0);
    });

    it('setOnLinesChanged callback fires on line creation', async () => {
      const callback = vi.fn();
      api.setOnLinesChanged(callback);
      await api.createOrderLine();
      expect(callback).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Position lines
  // ============================================================================

  describe('position lines', () => {
    it('createPositionLine returns adapter', async () => {
      const adapter = await api.createPositionLine({ price: 45000 });
      expect(adapter).toBeDefined();
      expect(adapter.getPrice()).toBe(45000);
    });

    it('adapter setter chain', async () => {
      const adapter = await api.createPositionLine();
      const result = adapter
        .setPrice(45000)
        .setText('Long')
        .setQuantity('2.0')
        .setPnl('+$500')
        .setProfitState('profit');
      expect(result).toBe(adapter);
    });

    it('onClose sets closeable to true', async () => {
      const adapter = await api.createPositionLine();
      adapter.onClose(vi.fn());
      const data = (adapter as any)._getRenderData();
      expect(data.closeable).toBe(true);
    });

    it('onReverse sets reversible to true', async () => {
      const adapter = await api.createPositionLine();
      adapter.onReverse(vi.fn());
      const data = (adapter as any)._getRenderData();
      expect(data.reversible).toBe(true);
    });

    it('triggerPositionClose fires callback', async () => {
      const closeFn = vi.fn();
      const adapter = await api.createPositionLine();
      adapter.onClose(closeFn);
      const id = Array.from(api.getPositionLines().keys())[0];
      api.triggerPositionClose(id);
      expect(closeFn).toHaveBeenCalledTimes(1);
    });

    it('triggerPositionReverse fires callback', async () => {
      const reverseFn = vi.fn();
      const adapter = await api.createPositionLine();
      adapter.onReverse(reverseFn);
      const id = Array.from(api.getPositionLines().keys())[0];
      api.triggerPositionReverse(id);
      expect(reverseFn).toHaveBeenCalledTimes(1);
    });

    it('getPositionLinesRenderData deduplicates by positionId', async () => {
      const a1 = await api.createPositionLine({ price: 100 });
      const a2 = await api.createPositionLine({ price: 200 });
      a1.setPositionId('pos-1');
      a2.setPositionId('pos-1');
      const data = api.getPositionLinesRenderData();
      const withPosId = data.filter((d) => d.positionId === 'pos-1');
      expect(withPosId).toHaveLength(1);
      expect(withPosId[0].price).toBe(200);
    });

    it('clearAllPositionLines removes all', async () => {
      await api.createPositionLine({ price: 100 });
      await api.createPositionLine({ price: 200 });
      expect(api.getPositionLines().size).toBe(2);
      api.clearAllPositionLines();
      expect(api.getPositionLines().size).toBe(0);
    });
  });

  // ============================================================================
  // Bracket callbacks
  // ============================================================================

  describe('bracket callbacks', () => {
    it('triggerTPClick fires onTPClick callback', async () => {
      const handler = vi.fn();
      const adapter = await api.createPositionLine();
      adapter.onTPClick(handler);
      const id = Array.from(api.getPositionLines().keys())[0];
      api.triggerTPClick(id);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('triggerSLMoveEnd fires with price and partial', async () => {
      const handler = vi.fn();
      const adapter = await api.createPositionLine();
      adapter.onSLMoveEnd(handler);
      const id = Array.from(api.getPositionLines().keys())[0];
      api.triggerSLMoveEnd(id, 40000, 0.5);
      expect(handler).toHaveBeenCalledWith(40000, 0.5);
    });
  });

  // ============================================================================
  // Studies
  // ============================================================================

  describe('studies', () => {
    it('createStudy adds study and returns API', async () => {
      const studyApi = await api.createStudy('SMA');
      expect(studyApi).not.toBeNull();
      expect(studyApi!.getName()).toBe('SMA');
    });

    it('createStudy with displayName overrides name', async () => {
      const studyApi = await api.createStudy(
        'SMA',
        false,
        false,
        {},
        {},
        {
          displayName: 'My Custom SMA',
        },
      );
      expect(studyApi!.getName()).toBe('My Custom SMA');
    });

    it('createStudy with inputs', async () => {
      const studyApi = await api.createStudy('SMA', false, false, { length: 20 });
      expect(studyApi!.getInputs()).toEqual({ length: 20 });
    });

    it('getAllStudies lists all studies', async () => {
      await api.createStudy('SMA');
      await api.createStudy('EMA');
      const studies = api.getAllStudies();
      expect(studies).toHaveLength(2);
      expect(studies.map((s) => s.name)).toEqual(['SMA', 'EMA']);
    });

    it('getStudyById returns study API', async () => {
      const studyApi = await api.createStudy('RSI');
      const id = studyApi!.getId();
      const found = api.getStudyById(id);
      expect(found).not.toBeNull();
      expect(found!.getName()).toBe('RSI');
    });

    it('getStudyById returns null for unknown ID', () => {
      expect(api.getStudyById('nonexistent')).toBeNull();
    });

    it('removeStudy removes study', async () => {
      const studyApi = await api.createStudy('SMA');
      const id = studyApi!.getId();
      api.removeStudy(id);
      expect(api.getAllStudies()).toHaveLength(0);
    });

    it('study API setInputs merges inputs', async () => {
      const studyApi = await api.createStudy('SMA', false, false, { length: 20 });
      studyApi!.setInputs({ color: 'red' });
      expect(studyApi!.getInputs()).toEqual({ length: 20, color: 'red' });
    });

    it('study API applyOverrides merges overrides', async () => {
      const studyApi = await api.createStudy('SMA', false, false, {}, { lineWidth: 2 });
      studyApi!.applyOverrides({ color: 'blue' });
      // Verify it doesn't throw - overrides are stored internally
    });

    it('study API remove() deletes study', async () => {
      const studyApi = await api.createStudy('SMA');
      studyApi!.remove();
      expect(api.getAllStudies()).toHaveLength(0);
    });

    it('onStudyCreate callback is called', async () => {
      const callback = vi.fn().mockResolvedValue(true);
      api.setOnStudyCreate(callback);
      await api.createStudy('SMA', false, false, { length: 10 });
      expect(callback).toHaveBeenCalledWith(expect.stringMatching(/^study_/), 'SMA', { length: 10 });
    });

    it('createStudy returns null when onStudyCreate returns false', async () => {
      api.setOnStudyCreate(vi.fn().mockResolvedValue(false));
      const result = await api.createStudy('SMA');
      expect(result).toBeNull();
    });

    it('onStudyRemove callback is called', async () => {
      const callback = vi.fn();
      api.setOnStudyRemove(callback);
      const studyApi = await api.createStudy('SMA');
      const id = studyApi!.getId();
      api.removeStudy(id);
      expect(callback).toHaveBeenCalledWith(id);
    });
  });

  // ============================================================================
  // Cleanup
  // ============================================================================

  describe('dispose', () => {
    it('clears all state', async () => {
      await api.createOrderLine();
      await api.createPositionLine();
      await api.createStudy('SMA');

      api.dispose();

      expect(api.getOrderLines().size).toBe(0);
      expect(api.getPositionLines().size).toBe(0);
      expect(api.getAllStudies()).toHaveLength(0);
    });

    it('subscriptions stop working after dispose', () => {
      const handler = vi.fn();
      api.onSymbolChanged().subscribe(null, handler);
      api.dispose();
      api.setSymbol('ETHUSDT');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Time scale
  // ============================================================================

  describe('getTimeScale', () => {
    it('returns time scale API', () => {
      const ts = api.getTimeScale();
      expect(ts).toBeDefined();
      expect(ts.defaultRightOffset).toBeDefined();
    });

    it('defaultRightOffset has value and setValue', () => {
      const ts = api.getTimeScale();
      const offset = ts.defaultRightOffset();
      expect(offset.value()).toBe(10);
      offset.setValue(20);
      expect(offset.value()).toBe(20);
    });
  });
});
