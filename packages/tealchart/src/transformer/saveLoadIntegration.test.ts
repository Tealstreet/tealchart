import type { ChartSettings } from '../state/chartState';
import type { ISaveLoadAdapter } from './saveLoadIntegration';
import type { TvChartContent, TvChartData } from './types';

import { describe, expect, it } from 'vitest';

import { loadAsTealchart, saveTealchartLayout } from './saveLoadIntegration';

function createAdapter(initialContent = ''): ISaveLoadAdapter & { saved?: TvChartData } {
  return {
    saved: undefined,
    async saveChart(chartData) {
      this.saved = chartData;
      return 'saved-1';
    },
    async getChartContent() {
      return initialContent;
    },
    async getAllCharts() {
      return [];
    },
    async removeChart() {},
  };
}

function createForeignTvLayout(): TvChartContent {
  return {
    mainSourceId: 'main',
    sources: [
      {
        id: 'main',
        type: 'MainSeries',
        state: {
          symbol: 'BTCUSDT',
          interval: '60',
          style: 1,
        },
      },
      {
        id: 'tv_only_1',
        type: 'Study',
        metaInfo: {
          fullId: 'USER;PrivatePine@custom-1',
          id: 'USER;PrivatePine@custom-1',
        },
        state: {
          inputs: { length: 21 },
          visible: true,
          customPayload: { preserved: true },
        },
      },
    ],
    panes: [
      { sources: ['main'], mainSeriesPane: true, height: 0.7 },
      { sources: ['tv_only_1'], height: 0.3 },
    ],
    version: 1,
  };
}

describe('save/load indicator engine interop', () => {
  it('preserves TradingView-only study sources through adapter load and save', async () => {
    const loadAdapter = createAdapter(JSON.stringify(createForeignTvLayout()));
    const loaded = await loadAsTealchart('layout-1', loadAdapter);
    expect(loaded.data.preservedTradingViewStudies).toHaveLength(1);

    const saveAdapter = createAdapter();
    await saveTealchartLayout(loaded.data as ChartSettings, 'Saved layout', saveAdapter);

    const savedContent = JSON.parse(saveAdapter.saved?.content ?? '') as TvChartContent;
    expect(savedContent.sources.find((source) => source.id === 'tv_only_1')).toEqual(
      createForeignTvLayout().sources[1],
    );
    expect(savedContent.panes.some((pane) => pane.sources.includes('tv_only_1'))).toBe(true);
  });
});
