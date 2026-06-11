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
  resolveMobileUserDrawingInfoLineLabelPosition,
  resolveMobileUserDrawingPriceRangeLabelPosition,
  resolveMobileUserDrawingRenderModel,
} from './mobile/utils/drawingRenderModel';
export type {
  MobileUserDrawingArrowMarkPrimitive,
  MobileUserDrawingArrowMarkerPrimitive,
  MobileUserDrawingCirclePrimitive,
  MobileUserDrawingInfoLineLabelPosition,
  MobileUserDrawingInfoLinePrimitive,
  MobileUserDrawingPathPrimitive,
  MobileUserDrawingPriceRangePrimitive,
  MobileUserDrawingPrimitive,
  MobileUserDrawingMeasurementLabelPrimitive,
  MobileUserDrawingPriceRangeLabelPosition,
  MobileUserDrawingTextBounds,
  ResolveMobileUserDrawingRenderModelOptions,
} from './mobile/utils/drawingRenderModel';
export {
  setMobileUserDrawingLocked,
  setMobileUserDrawingTextAlign,
  setMobileUserDrawingVisibility,
  updateMobileUserDrawingStyle,
} from './mobile/utils/drawingStyle';
