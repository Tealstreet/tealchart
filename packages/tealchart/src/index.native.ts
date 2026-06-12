/**
 * @tealstreet/tealchart - React Native entry point
 *
 * This file is automatically resolved by Metro bundler for React Native apps.
 * It re-exports everything from the main index plus React Native specific components.
 */

// Re-export everything from main index (web-compatible exports)
export * from './index';

// React Native Skia component
export { SkiaTealchart } from './SkiaTealchart';
export type { SkiaTealchartHandle, SkiaTealchartProps, SkiaTealscriptIndicatorOptions } from './SkiaTealchart';

// Mobile-specific components
export { ChartTopBarComponent } from './mobile/components/ChartTopBarComponent';
export type { ChartTopBarComponentProps } from './mobile/components/ChartTopBarComponent';
// AVAILABLE_TIMEFRAMES / TimeframeOption are defined in chartState, not the top bar component.
export { AVAILABLE_TIMEFRAMES as MOBILE_TIMEFRAMES } from './state/chartState';
export type { TimeframeOption as MobileTimeframeOption } from './state/chartState';

// Mobile interactive components
export {
  OrderLineComponent,
  PositionLineComponent,
  CrosshairComponent,
  ContextMenuComponent,
} from './mobile/components';
export type {
  OrderLineComponentProps,
  PositionLineComponentProps,
  CrosshairComponentProps,
  ContextMenuComponentProps,
} from './mobile/components';

// Mobile hooks
export { useChartGestures } from './mobile/hooks/useChartGestures';
export type { UseChartGesturesOptions, UseChartGesturesResult } from './mobile/hooks/useChartGestures';

export { useLabelCollision } from './mobile/hooks/useLabelCollision';
export type { LabelBounds } from './mobile/hooks/useLabelCollision';

// Mobile utilities
export { priceToY, yToPrice, timeToX, xToTime, getGestureZone } from './mobile/utils/coordinates';
export type { ChartDimensions, GestureZone } from './mobile/utils/coordinates';
export { resolveMobileUserDrawingInputPoint } from './mobile/utils/drawingInput';
export type { MobileUserDrawingInputPane, ResolveMobileUserDrawingInputPointOptions } from './mobile/utils/drawingInput';
export {
  exportMobileUserDrawingStateForLayout,
  importMobileUserDrawingStateFromLayout,
} from './mobile/utils/drawingPersistence';
export {
  isMobileUserDrawingTextBoxPrimitive,
  resolveMobileUserDrawingBalloonLayout,
  resolveMobileUserDrawingInfoLineLabelPosition,
  resolveMobileUserDrawingMeasurementLabelPosition,
  resolveMobileUserDrawingPriceRangeLabelPosition,
  resolveMobileUserDrawingRenderModel,
  resolveMobileUserDrawingRiskRewardLabelPosition,
  resolveMobileUserDrawingTextLabelLayout,
  resolveMobileUserDrawingTrendAngleLabelPosition,
} from './mobile/utils/drawingRenderModel';
export type {
  MobileUserDrawingAnchoredNotePrimitive,
  MobileUserDrawingAnchoredTextPrimitive,
  MobileUserDrawingArrowMarkPrimitive,
  MobileUserDrawingArrowMarkerPrimitive,
  MobileUserDrawingAnchoredVolumeProfilePrimitive,
  MobileUserDrawingAnchoredVwapPrimitive,
  MobileUserDrawingArcPrimitive,
  MobileUserDrawingBalloonLayout,
  MobileUserDrawingBalloonPrimitive,
  MobileUserDrawingBarsPatternPrimitive,
  MobileUserDrawingBrushPrimitive,
  MobileUserDrawingCirclePrimitive,
  MobileUserDrawingCrossLinePrimitive,
  MobileUserDrawingCurvePrimitive,
  MobileUserDrawingCyclicLinesPrimitive,
  MobileUserDrawingDatePriceRangePrimitive,
  MobileUserDrawingEllipsePrimitive,
  MobileUserDrawingEmojiPrimitive,
  MobileUserDrawingFibExtensionPrimitive,
  MobileUserDrawingFibRetracementPrimitive,
  MobileUserDrawingDisjointChannelPrimitive,
  MobileUserDrawingFlatTopBottomPrimitive,
  MobileUserDrawingForecastPrimitive,
  MobileUserDrawingGannBoxPrimitive,
  MobileUserDrawingGannFanPrimitive,
  MobileUserDrawingGannSquarePrimitive,
  MobileUserDrawingGannSquareFixedPrimitive,
  MobileUserDrawingHighlighterPrimitive,
  MobileUserDrawingIconPrimitive,
  MobileUserDrawingInfoLineLabelPosition,
  MobileUserDrawingInfoLinePrimitive,
  MobileUserDrawingLinePrimitive,
  MobileUserDrawingMeasurementLabelPosition,
  MobileUserDrawingCalloutPrimitive,
  MobileUserDrawingCommentPrimitive,
  MobileUserDrawingNotePrimitive,
  MobileUserDrawingPathPrimitive,
  MobileUserDrawingParallelChannelPrimitive,
  MobileUserDrawingPitchfanPrimitive,
  MobileUserDrawingPitchforkPrimitive,
  MobileUserDrawingPinPrimitive,
  MobileUserDrawingPriceNotePrimitive,
  MobileUserDrawingPriceRangePrimitive,
  MobileUserDrawingPrimitive,
  MobileUserDrawingProjectionPrimitive,
  MobileUserDrawingSectorPrimitive,
  MobileUserDrawingMeasurementLabelPrimitive,
  MobileUserDrawingMeasurementLabelTarget,
  MobileUserDrawingPriceRangeLabelPosition,
  MobileUserDrawingRegressionTrendPrimitive,
  MobileUserDrawingRotatedRectanglePrimitive,
  MobileUserDrawingRiskRewardLabelPosition,
  MobileUserDrawingRiskRewardPositionPrimitive,
  MobileUserDrawingSineLinePrimitive,
  MobileUserDrawingSignpostPrimitive,
  MobileUserDrawingStickerPrimitive,
  MobileUserDrawingTablePrimitive,
  MobileUserDrawingTextBoxPrimitive,
  MobileUserDrawingTextBounds,
  MobileUserDrawingTextLabelLayout,
  MobileUserDrawingTextLabelPrimitive,
  MobileUserDrawingTimeCyclesPrimitive,
  MobileUserDrawingTrendAngleLabelPosition,
  MobileUserDrawingTrendAnglePrimitive,
  MobileUserDrawingTrianglePrimitive,
  ResolveMobileUserDrawingRenderModelOptions,
} from './mobile/utils/drawingRenderModel';
export {
  setMobileUserDrawingIconName,
  setMobileUserDrawingImageSource,
  setMobileUserDrawingLocked,
  setMobileUserDrawingTextAlign,
  setMobileUserDrawingVisibility,
  updateMobileUserDrawingStyle,
} from './mobile/utils/drawingStyle';
