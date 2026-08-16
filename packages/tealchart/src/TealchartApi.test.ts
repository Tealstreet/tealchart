import { describe, expect, it, vi } from 'vitest';

import { getTealchartApiLineRenderSnapshot, TealchartApi } from './TealchartApi';

// Mirrors LINE_REMOVAL_COALESCE_MS; the constant is module-private.
const LINE_REMOVAL_COALESCE_MS_FOR_TEST = 250;

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
