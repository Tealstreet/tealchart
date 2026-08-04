import type { TealchartApi } from '../../TealchartApi';
import type { NativeTopBarActionCommand } from '../utils/topBarLayout';

import { useCallback } from 'react';

import { commitNativeTopBarAction } from './nativeTopBarActions';

export interface NativeTopBarActionRuntimeInput {
  chartApi: TealchartApi;
  onLayoutClick?: () => void;
  onSymbolClick?: () => void;
  onIndicatorsClick?: () => void;
  redoUserDrawingCommand?: () => boolean;
  undoUserDrawingCommand?: () => boolean;
}

export interface NativeTopBarActionRuntime {
  commitNativeTopBarRuntimeAction: (action: NativeTopBarActionCommand) => void;
}

export function useNativeTopBarActionRuntime({
  chartApi,
  onLayoutClick,
  onSymbolClick,
  onIndicatorsClick,
  redoUserDrawingCommand,
  undoUserDrawingCommand,
}: NativeTopBarActionRuntimeInput): NativeTopBarActionRuntime {
  const commitNativeTopBarRuntimeAction = useCallback(
    (action: NativeTopBarActionCommand) => {
      commitNativeTopBarAction(action, {
        currentInterval: chartApi.resolution(),
        setInterval: (nextInterval) => chartApi.setResolution(nextInterval),
        onLayoutClick,
        onSymbolClick,
        onIndicatorsClick,
        undoUserDrawingCommand,
        redoUserDrawingCommand,
      });
    },
    [chartApi, onIndicatorsClick, onLayoutClick, onSymbolClick, redoUserDrawingCommand, undoUserDrawingCommand],
  );

  return { commitNativeTopBarRuntimeAction };
}
