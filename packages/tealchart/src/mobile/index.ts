/**
 * Mobile-specific tealchart modules
 *
 * Provides React Native components and hooks for the interactive chart layer.
 */

// Components
export * from './components';

// Hooks
export * from './hooks';

// Utilities
export * from './utils/coordinates';
export * from './utils/drawingInput';
export * from './utils/drawingPersistence';
export * from './utils/drawingRenderModel';

// Class-based indicator management (matches web's React-agnostic pattern)
export { MobileIndicatorManager } from './MobileIndicatorManager';
export type { ActiveIndicator, IndicatorPaneInfo } from './MobileIndicatorManager';
