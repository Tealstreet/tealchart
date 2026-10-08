/** Rendering and adapter seams for hosts that own the candles and viewport. */
export { TealchartApi, getTealchartApiLineRenderSnapshot } from '../TealchartApi';
export type { TealchartApiLineRenderSnapshot } from '../TealchartApi';
export { OemsTradingRuntime } from '../interaction/OemsTradingRuntime';
export type { OemsTradingRuntimeOptions } from '../interaction/OemsTradingRuntime';
export { PriceLineManager } from '../interaction/PriceLineManager';
export type { PriceLineManagerOptions } from '../interaction/PriceLineManager';
export { TealchartRenderer } from '../TealchartRenderer';
export type { ExternalOverlayProjection, ExternalOverlayRenderInput, IndicatorPaneInfo } from '../TealchartRenderer';
export { computeProjectedPriceLineLabelBounds } from '../rendering/priceLineLayout';
export type { PriceLineLayoutProjection, PriceLineLayoutMeasurements } from '../rendering/priceLineLayout';
export { drawBracketDragPreview } from '../rendering/bracketDragPreview';
export type { BracketDragPreviewState, BracketDragPreviewOptions } from '../rendering/bracketDragPreview';
export { orderLineToPriceLine, positionLineToPriceLine } from '../utils/tradingPriceLines';
export { tradingLineToBracketLines } from '../utils/tradeLineBrackets';
export { WebCanvasContext } from '../rendering/WebCanvasContext';
export type {
  OrderLineRenderData,
  PositionLineRenderData,
  ExecutionLineRenderData,
  PriceLine,
  PriceLineLabelBounds,
  ComputedPane,
  ChartMargins,
} from '../types';

export { TealscriptManager } from '../tealscript/TealscriptManager';
export type { TealscriptManagerOptions } from '../tealscript/TealscriptManager';
export { BUILTIN_INDICATORS, getIndicatorById } from '../indicators';
export type { BuiltinIndicator } from '../indicators';
export type { PlotOutput, DrawingOutput, InputDefinition, WorkerError } from '@tealstreet/tealscript';
export type { Bar, RenderOptions, Viewport, UnifiedPaneLayout, TealscriptRequestDataResolver } from '../types';
export { createTealscriptTimeframeInfo } from '../tealscript/timeframeInfo';

export { IndicatorsModal } from '../ui/IndicatorsModal';
export type { CustomIndicatorEditorActions } from '../ui/IndicatorsModal';
export { LayoutSelector } from '../ui/LayoutSelector';
export type { LayoutSelectorCallbacks } from '../ui/LayoutSelector';
export type { LayoutMetadata } from '../transformer/saveLoadIntegration';
export { IndicatorSettingsModal } from '../ui/IndicatorSettingsModal';
export type { PlotStyleOverride } from '../state/chartState';
export { HostedCanvasRecorder, replayHostedCanvasCommands, validateHostedCanvasCommands } from './canvasCommands';
export type { HostedCanvasCommand, HostedCanvasImage } from './canvasCommands';
export { JailbreakIndicatorManager } from '../jailbreak/JailbreakIndicatorManager';
export { jailbreakInputsToInputDefinitions } from '../indicators/builtinIndicators';
export { drawJailbreakTooltipGroups } from '../rendering/jailbreakTooltips';
export type { JailbreakTooltipRenderOptions } from '../rendering/jailbreakTooltips';
export type { CrossHairTooltip } from '../jailbreak/types';
export { fromTvFormat, toTvFormat, migrateSettings } from '../transformer';
export type { TvChartData } from '../transformer';
export type { ChartSettings, IndicatorInstance } from '../state/chartState';
export { safeDeepMerge } from '../state/safeDeepMerge';

export type {
  ExternalAxisDescriptor,
  ExternalAxisLabel,
  ExternalAxisLabelLayout,
  ExternalAxisObstacle,
} from '../rendering/externalAxisLabels';

export { resolveChromeThemeVars } from '../chromeTheme';

export { getChartStore } from '../state/chartState';
export type { WebOverlayHost, WebOverlayHostFactory, WebOverlayEnvironment, WebOverlayInput } from '../ui/OverlayHost';
