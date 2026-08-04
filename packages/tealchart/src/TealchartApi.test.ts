import { describe, expect, it, vi } from 'vitest';

import { TealchartApi } from './TealchartApi';

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
