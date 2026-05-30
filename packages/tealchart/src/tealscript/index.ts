/**
 * Tealscript integration for tealchart
 */

export { TealscriptManager, type TealscriptManagerOptions } from './TealscriptManager';
export { useTealscript, type UseTealscriptOptions, type UseTealscriptReturn } from './useTealscript';

// Re-export commonly used types from @tealstreet/tealscript
export type {
  PlotOutput,
  PlotStyle,
  AlertEvent,
  AlertFrequency,
  AlertOutput,
  InputDefinition,
  Bar as TealscriptBar,
  WorkerResult,
  WorkerError,
} from '@tealstreet/tealscript';
