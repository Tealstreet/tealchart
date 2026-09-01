import { describe, expect, it, vi } from 'vitest';

import { getTealchartApiLineRenderSnapshot, TealchartApi } from './TealchartApi';

// Mirrors LINE_REMOVAL_COALESCE_MS; the constant is module-private.
const LINE_REMOVAL_COALESCE_MS_FOR_TEST = 250;

describe('TealchartApi TradingView compatibility', () => {
  it('supports TradingView-style time scale setters and subscriptions', () => {
    const api = new TealchartApi('BTCUSDT', '60');
    const timeScale = api.getTimeScale();
    const defaultOffsetListener = vi.fn();
    const barSpacingListener = vi.fn();
    const rightOffsetListener = vi.fn();

    timeScale.defaultRightOffset().subscribe(defaultOffsetListener);
    timeScale.barSpacingChanged().subscribe(null, barSpacingListener);
    timeScale.rightOffsetChanged().subscribe(null, rightOffsetListener);

    timeScale.defaultRightOffset().setValue(80);
    timeScale.setBarSpacing(12);
    timeScale.setRightOffset(30);

    expect(timeScale.defaultRightOffset().value()).toBe(80);
    expect(defaultOffsetListener).toHaveBeenCalledWith(80);
    expect(barSpacingListener).toHaveBeenCalledWith(12);
    expect(rightOffsetListener).toHaveBeenCalledWith(30);
  });

  it('emits TradingView-style onDataLoaded subscriptions', () => {
    const api = new TealchartApi('BTCUSDT', '60');
    const listener = vi.fn();

    api.onDataLoaded().subscribe(null, listener);
    api.emitDataLoaded();

    expect(listener).toHaveBeenCalledOnce();
  });
});

describe('TealchartApi studies', () => {
  it('notifies when study visibility changes', async () => {
    const api = new TealchartApi('BTCUSDT', '60');
    const onVisibilityChange = vi.fn();
    const study = await api.createStudy('SMA');

    expect(study).not.toBeNull();
    if (!study) throw new Error('Expected study to be created');
    const studyId = study.getId();
    api.setOnStudyVisibilityChange(onVisibilityChange);
    api.toggleStudyVisibility(studyId);

    expect(api.getAllStudies()[0]).toMatchObject({ id: studyId, isVisible: false });
    expect(onVisibilityChange).toHaveBeenCalledWith(studyId, false);
  });

  it('notifies when a study adapter removes itself', async () => {
    const api = new TealchartApi('BTCUSDT', '60');
    const onRemove = vi.fn();
    const study = await api.createStudy('SMA');

    expect(study).not.toBeNull();
    if (!study) throw new Error('Expected study to be created');
    const studyId = study.getId();
    api.setOnStudyRemove(onRemove);
    study.remove();

    expect(api.getAllStudies()).toHaveLength(0);
    expect(onRemove).toHaveBeenCalledWith(studyId);
  });
});

// A host reconciling its feed removes a stale line in one store update and
// creates its replacement in the next. Painting between them draws a frame with
// no line - the flap when dragging an order. Web hides it behind the browser's
// animation frame; Skia commits per notification and draws it.
describe('TealchartApi line removal coalescing', () => {
  it('keeps a removed line in the snapshot until its replacement arrives', async () => {
    const api = new TealchartApi('BTCUSDT', '60');
    const line = await api.createOrderLine();
    line.setPrice(100);

    line.remove();

    // The removal is deferred, so nothing can paint the gap.
    expect(getTealchartApiLineRenderSnapshot(api).orderLines).toHaveLength(1);

    const replacement = await api.createOrderLine();
    replacement.setPrice(110);

    // Creating the replacement flushes it: one line, at the new price.
    const lines = getTealchartApiLineRenderSnapshot(api).orderLines;
    expect(lines).toHaveLength(1);
    expect(lines[0].price).toBe(110);

    api.dispose();
  });

  // The other ordering. An amend is a cancel and a place, and the place can reach
  // us first - then the create flushes an empty map and the line it replaced sits
  // out the whole coalesce window drawn over its own replacement, which is one
  // line to look at but two price-axis tags and two hit zones.
  it('drops a removed line at once when its replacement is already there', async () => {
    const api = new TealchartApi('BTCUSDT', '60');
    const line = await api.createOrderLine();
    line.setPrice(100);

    const replacement = await api.createOrderLine();
    replacement.setPrice(100);
    line.remove();

    const lines = getTealchartApiLineRenderSnapshot(api).orderLines;
    expect(lines).toHaveLength(1);
    expect(lines[0].price).toBe(100);

    api.dispose();
  });

  // The case the price match could never see. An amend's whole point is a new
  // price, so "another line is already sitting at mine" was false exactly when
  // it mattered, and the replaced line sat out the full window drawn over its
  // own replacement.
  it('drops a removed line at once when its replacement took a new price', async () => {
    const api = new TealchartApi('BTCUSDT', '60');
    const line = await api.createOrderLine();
    line.setPrice(100);

    const replacement = await api.createOrderLine();
    replacement.setPrice(250);
    line.remove();

    const lines = getTealchartApiLineRenderSnapshot(api).orderLines;
    expect(lines).toHaveLength(1);
    expect(lines[0].price).toBe(250);

    api.dispose();
  });

  // Creation order is the signal, so the protection a cancel needs survives:
  // nothing came after this line, so nothing is standing in for it, and it
  // still lands a beat later rather than flashing out.
  it('still defers when only older lines are on the book', async () => {
    const api = new TealchartApi('BTCUSDT', '60');
    const older = await api.createOrderLine();
    older.setPrice(250);

    const line = await api.createOrderLine();
    line.setPrice(100);
    line.remove();

    expect(getTealchartApiLineRenderSnapshot(api).orderLines).toHaveLength(2);

    api.dispose();
  });

  it('lets a removal with nothing behind it land on its own', async () => {
    vi.useFakeTimers();
    try {
      const api = new TealchartApi('BTCUSDT', '60');
      const line = await api.createOrderLine();
      line.remove();

      expect(getTealchartApiLineRenderSnapshot(api).orderLines).toHaveLength(1);

      vi.advanceTimersByTime(LINE_REMOVAL_COALESCE_MS_FOR_TEST);

      expect(getTealchartApiLineRenderSnapshot(api).orderLines).toHaveLength(0);
      api.dispose();
    } finally {
      vi.useRealTimers();
    }
  });
});
