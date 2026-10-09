import type { AnalysisContextReadResult, AnalysisTimeRange } from '../analysis/types';
import type { ChartWidgetCore } from '../core/ChartWidgetCore';

export function readNativeAnalysisContext({
  core,
  disposed,
  currentSymbol,
  currentInterval,
  requestedSymbol,
  requestedInterval,
  pendingProps,
  renderBlocked,
  visibleRange,
}: {
  core: Pick<ChartWidgetCore, 'getAnalysisContext'> | null;
  disposed: boolean;
  currentSymbol: string;
  currentInterval: string;
  requestedSymbol: string;
  requestedInterval: string;
  pendingProps: boolean;
  renderBlocked: boolean;
  visibleRange: AnalysisTimeRange;
}): AnalysisContextReadResult {
  if (disposed) return { status: 'unavailable', reason: 'disposed' };
  if (pendingProps || currentSymbol !== requestedSymbol || currentInterval !== requestedInterval)
    return { status: 'unavailable', reason: 'stale-market' };
  if (renderBlocked) return { status: 'unavailable', reason: 'loading' };
  return core?.getAnalysisContext(visibleRange) ?? { status: 'unavailable', reason: 'no-data' };
}
