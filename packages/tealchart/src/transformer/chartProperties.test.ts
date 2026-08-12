import { describe, expect, it } from 'vitest';

import { fromTvFormat } from './fromTvFormat';
import { toTvFormat } from './toTvFormat';
import { readTvChartProperties, writeTvChartProperties } from './chartProperties';

/**
 * Shaped after ChartModel.state() in the shipped charting library bundle:
 * each saved chart is { panes, timeScale, chartProperties: { paneProperties,
 * scalesProperties, ... }, ... } and main-series styling lives on the main
 * series source's own state.
 */
function createForeignTvLayout() {
  return {
    name: 'Foreign',
    symbol: 'BTCUSD',
    resolution: '60',
    content: JSON.stringify({
      charts: [
        {
          mainSourceId: 'main',
          panes: [
            {
              sources: [
                {
                  id: 'main',
                  type: 'MainSeries',
                  state: {
                    symbol: 'BTCUSD',
                    interval: '60',
                    style: 1,
                    candleStyle: {
                      upColor: '#26a69a',
                      downColor: '#ef5350',
                      // Not modelled by Tealchart — must survive untouched.
                      borderUpColor: '#26a69a',
                      wickUpColor: '#26a69a',
                    },
                  },
                },
              ],
              height: 0.8,
            },
          ],
          chartProperties: {
            paneProperties: {
              background: '#ffffff',
              backgroundType: 'solid',
              vertGridProperties: { color: '#e1e3e6', style: 0 },
              horzGridProperties: { color: '#e1e3e6', style: 0 },
              crossHairProperties: { color: '#9598a1' },
              legendProperties: { showVolume: false },
            },
            scalesProperties: { textColor: '#131722', fontSize: 12 },
            priceScaleSelectionStrategyName: 'auto',
          },
        },
      ],
    }),
  };
}

describe('TradingView chart property placement', () => {
  it('reads properties from the canonical layout locations', () => {
    const result = fromTvFormat(createForeignTvLayout());

    expect(result.data.chartProperties).toEqual({
      'paneProperties.background': '#ffffff',
      'paneProperties.vertGridProperties.color': '#e1e3e6',
      'paneProperties.horzGridProperties.color': '#e1e3e6',
      'paneProperties.crossHairProperties.color': '#9598a1',
      'scalesProperties.textColor': '#131722',
      'mainSeriesProperties.candleStyle.upColor': '#26a69a',
      'mainSeriesProperties.candleStyle.downColor': '#ef5350',
    });
  });

  it('ignores properties it does not model rather than importing them', () => {
    const result = fromTvFormat(createForeignTvLayout());
    const keys = Object.keys(result.data.chartProperties ?? {});

    expect(keys).not.toContain('paneProperties.backgroundType');
    expect(keys).not.toContain('scalesProperties.fontSize');
    expect(keys).not.toContain('paneProperties.legendProperties.showVolume');
  });

  it('reads nothing from a layout with no chart properties', () => {
    expect(readTvChartProperties({})).toBeUndefined();
    expect(readTvChartProperties({ chartProperties: {}, mainSeriesState: {} })).toBeUndefined();
  });

  it('merges into existing branches instead of replacing them', () => {
    const chartProperties: Record<string, unknown> = {
      paneProperties: { backgroundType: 'solid', vertGridProperties: { style: 0 } },
    };
    const mainSeriesState: Record<string, unknown> = { candleStyle: { wickUpColor: '#000' } };

    writeTvChartProperties(
      {
        'paneProperties.background': '#101418',
        'paneProperties.vertGridProperties.color': '#202124',
        'mainSeriesProperties.candleStyle.upColor': '#12c48b',
      },
      { chartProperties, mainSeriesState },
    );

    expect(chartProperties).toEqual({
      paneProperties: {
        backgroundType: 'solid',
        background: '#101418',
        vertGridProperties: { style: 0, color: '#202124' },
      },
    });
    expect(mainSeriesState).toEqual({ candleStyle: { wickUpColor: '#000', upColor: '#12c48b' } });
  });

  it('keeps unmodelled TradingView properties across an import then save', () => {
    // Saving rebuilds layout content from scratch. Without preservation, opening
    // someone's TradingView layout and letting autosave run would silently
    // delete every property Tealchart does not model.
    const imported = fromTvFormat(createForeignTvLayout());
    const resaved = toTvFormat(imported.data, 'Resaved');
    const content = JSON.parse(resaved.content) as {
      chartProperties?: Record<string, any>;
      sources?: { type: string; state?: Record<string, any> }[];
    };

    expect(content.chartProperties?.paneProperties?.backgroundType).toBe('solid');
    expect(content.chartProperties?.paneProperties?.legendProperties).toEqual({ showVolume: false });
    expect(content.chartProperties?.scalesProperties?.fontSize).toBe(12);
    expect(content.chartProperties?.priceScaleSelectionStrategyName).toBe('auto');

    const mainSeries = content.sources?.find((source) => source.type === 'MainSeries');
    expect(mainSeries?.state?.candleStyle?.borderUpColor).toBe('#26a69a');
    expect(mainSeries?.state?.candleStyle?.wickUpColor).toBe('#26a69a');
  });

  it('lets Tealchart values win over the preserved originals', () => {
    const imported = fromTvFormat(createForeignTvLayout());
    const edited = {
      ...imported.data,
      chartProperties: { 'paneProperties.background': '#101418' as const },
    };
    const content = JSON.parse(toTvFormat(edited, 'Edited').content) as {
      chartProperties?: Record<string, any>;
    };

    expect(content.chartProperties?.paneProperties?.background).toBe('#101418');
    // Sibling the user did not touch is still the imported one.
    expect(content.chartProperties?.paneProperties?.backgroundType).toBe('solid');
  });

  it('does not let a hostile layout pollute Object.prototype', () => {
    const hostile = {
      name: 'Hostile',
      symbol: 'BTCUSD',
      resolution: '60',
      content: JSON.stringify({
        charts: [
          {
            mainSourceId: 'main',
            panes: [{ sources: [{ id: 'main', type: 'MainSeries', state: { symbol: 'BTCUSD' } }] }],
            chartProperties: JSON.parse('{"__proto__":{"polluted":"yes"},"paneProperties":{"background":"#fff"}}'),
          },
        ],
      }),
    };

    const imported = fromTvFormat(hostile);
    toTvFormat(imported.data, 'Resaved');

    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(imported.data.preservedTvProperties?.chartProperties).not.toHaveProperty('__proto__');
  });

  it('refuses to walk or write prototype-polluting paths', () => {
    const chartProperties: Record<string, unknown> = {};
    const mainSeriesState: Record<string, unknown> = {};

    writeTvChartProperties({ '__proto__.polluted': 'yes' } as never, { chartProperties, mainSeriesState });

    expect(chartProperties).toEqual({});
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();

    const parsed = JSON.parse('{"paneProperties":{"__proto__":{"polluted":"yes"}}}') as unknown;
    expect(readTvChartProperties({ chartProperties: parsed })).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
