import type { ResolutionString } from '../../types';
import type { NativeTopBarActionCommand } from '../utils/topBarLayout';

export interface NativeTopBarActionHandlers {
  currentInterval: ResolutionString;
  setInterval: (interval: ResolutionString) => void;
  onSymbolClick?: () => void;
  onIndicatorsClick?: () => void;
  redoUserDrawingCommand?: () => boolean;
  undoUserDrawingCommand?: () => boolean;
}

export function commitNativeTopBarAction(
  action: NativeTopBarActionCommand,
  handlers: NativeTopBarActionHandlers,
): boolean {
  if (action.type === 'symbol') {
    if (!handlers.onSymbolClick) return false;
    handlers.onSymbolClick();
    return true;
  }

  if (action.type === 'timeframe') {
    if (!action.interval || action.interval === handlers.currentInterval) return false;
    handlers.setInterval(action.interval);
    return true;
  }

  if (action.type === 'indicators') {
    if (!handlers.onIndicatorsClick) return false;
    handlers.onIndicatorsClick();
    return true;
  }

  if (action.type === 'undo') {
    return handlers.undoUserDrawingCommand?.() === true;
  }

  if (action.type === 'redo') {
    return handlers.redoUserDrawingCommand?.() === true;
  }

  return false;
}
