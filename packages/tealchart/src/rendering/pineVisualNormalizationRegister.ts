export type PineVisualNormalizationStatus = 'trace-undetermined' | 'visible-approximation';

export interface PineVisualNormalizationEntry {
  readonly id: string;
  readonly surface: string;
  readonly status: PineVisualNormalizationStatus;
  readonly code: readonly string[];
  readonly currentBehavior: string;
  readonly unresolvedQuestion: string;
  readonly nextEvidence: string;
}

export const PINE_VISUAL_NORMALIZATION_REGISTER = [
  {
    id: 'tealchart.label-price-coordinate-clamp',
    surface: 'TealScript label yloc.price rendering',
    status: 'trace-undetermined',
    code: ['src/rendering/TealScriptDrawingCoordinates.ts:215'],
    currentBehavior:
      'Price-located labels with y values outside the pane price range are clamped to the pane edge before projection.',
    unresolvedQuestion:
      'The Pine reference does not specify whether an off-scale label price should clamp, hide, or render outside the pane.',
    nextEvidence: 'TradingView trace or screenshot for label.new(..., y=far outside visible scale, yloc=yloc.price).',
  },
  {
    id: 'tealchart.area-fill-alpha-normalization',
    surface: 'plot.style_area and plot.style_areabr rendering',
    status: 'trace-undetermined',
    code: ['src/TealchartRenderer.ts:2900', 'src/mobile/render/NativeIndicatorPlotLayer.tsx:124'],
    currentBehavior:
      'Area plots append #33 alpha to opaque hex colors while preserving colors that already carry alpha.',
    unresolvedQuestion:
      'The Pine reference documents plot colors but does not specify the renderer alpha TradingView applies to opaque area plot colors.',
    nextEvidence:
      'TradingView visual trace comparing opaque and transparent area colors against line/histogram colors.',
  },
  {
    id: 'tealchart.plotarrow-height-floor',
    surface: 'plotarrow minheight/maxheight rendering',
    status: 'trace-undetermined',
    code: ['src/TealchartRenderer.ts:3253', 'src/mobile/render/NativeIndicatorPlotLayer.tsx:844'],
    currentBehavior: 'Renderer consumers that receive non-positive plotarrow heights floor them to 1 pixel.',
    unresolvedQuestion:
      'TealScript semantic checks reject non-positive Pine plotarrow heights, but the renderer public input behavior for direct consumers is not documented by Pine.',
    nextEvidence:
      'TradingView acceptance/runtime trace for plotarrow(..., minheight<=0 or maxheight<=0), if any declared version permits it.',
  },
  {
    id: 'tealchart.plotarrow-height-reorder',
    surface: 'plotarrow minheight/maxheight rendering',
    status: 'trace-undetermined',
    code: ['src/TealchartRenderer.ts:3254', 'src/mobile/render/NativeIndicatorPlotLayer.tsx:845'],
    currentBehavior: 'When maxheight is below the effective minheight, renderers raise maxheight to minheight.',
    unresolvedQuestion:
      'The Pine reference does not specify whether maxheight < minheight is rejected, reordered, or rendered literally.',
    nextEvidence: 'TradingView compile/runtime trace for plotarrow(..., minheight greater than maxheight).',
  },
  {
    id: 'tealchart.table-explicit-dimension-normalization',
    surface: 'table.cell width/height rendering',
    status: 'trace-undetermined',
    code: ['src/rendering/TealScriptDrawingRenderer.ts:882', 'src/rendering/TealScriptDrawingRenderer.ts:915'],
    currentBehavior:
      'Explicit table cell width/height are interpreted as percentages of available size; non-finite values fall back to auto sizing and negative percentages floor at 0.',
    unresolvedQuestion:
      'The Pine reference documents table cell width/height but does not specify invalid dynamic percent handling in the renderer.',
    nextEvidence:
      'TradingView trace for table.cell(..., width/height as na, negative, non-finite, and oversized dynamic values).',
  },
  {
    id: 'tealchart.plot-marker-textcolor-na-fallback',
    surface: 'plotshape/plotchar text rendering',
    status: 'trace-undetermined',
    code: [
      'src/TealchartRenderer.ts:3112',
      'src/TealchartRenderer.ts:3195',
      'src/mobile/render/NativeIndicatorPlotLayer.tsx:1246',
    ],
    currentBehavior:
      'A per-bar textcolor=na falls back to the first non-na text color or white instead of hiding plotshape/plotchar text.',
    unresolvedQuestion:
      'The Pine reference does not state whether textcolor=na hides marker text or falls back to a default/readable text color.',
    nextEvidence: 'TradingView visual trace for plotshape/plotchar with visible marker text and per-bar textcolor=na.',
  },
] as const satisfies readonly PineVisualNormalizationEntry[];

export function getPineVisualNormalizationEntry(id: string): PineVisualNormalizationEntry | undefined {
  return PINE_VISUAL_NORMALIZATION_REGISTER.find((entry) => entry.id === id);
}
