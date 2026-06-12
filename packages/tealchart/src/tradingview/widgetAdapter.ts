import { installTradingViewHooks } from './hooks';
import type {
  TradingViewHookHost,
  TradingViewPatchCallbacks,
  TradingViewPatchHandle,
} from './types';

export interface TradingViewWidgetLike {
  remove?: () => void;
  onChartReady?: (callback: () => void) => void;
}

export interface TradingViewWidgetConstructor<TWidget extends TradingViewWidgetLike = TradingViewWidgetLike> {
  new (options: Record<string, unknown>): TWidget;
}

export interface CreateTradingViewWidgetAdapterOptions<
  TWidget extends TradingViewWidgetLike = TradingViewWidgetLike,
> {
  widget: TradingViewWidgetConstructor<TWidget>;
  widgetOptions: Record<string, unknown>;
  hooks?: TradingViewPatchCallbacks;
  hookHost?: TradingViewHookHost;
}

export interface TradingViewWidgetAdapter<TWidget extends TradingViewWidgetLike = TradingViewWidgetLike> {
  widget: TWidget;
  hooks: TradingViewPatchHandle;
  dispose: () => void;
}

export function createTradingViewWidgetAdapter<TWidget extends TradingViewWidgetLike>(
  options: CreateTradingViewWidgetAdapterOptions<TWidget>
): TradingViewWidgetAdapter<TWidget> {
  const hooks = installTradingViewHooks(options.hooks ?? {}, { host: options.hookHost });
  const widget = new options.widget(options.widgetOptions);

  return {
    widget,
    hooks,
    dispose: () => {
      widget.remove?.();
      hooks.dispose();
    },
  };
}
