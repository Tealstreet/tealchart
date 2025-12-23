/**
 * Rendering abstraction layer
 *
 * Exports the CanvasContext interface and implementations for
 * cross-platform rendering (Web Canvas 2D, React Native Skia).
 */

export type { CanvasContext } from './CanvasContext';
export { isCanvasContext } from './CanvasContext';
export { WebCanvasContext } from './WebCanvasContext';
