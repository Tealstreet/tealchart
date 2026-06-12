import { describe, expect, it, vi } from 'vitest';
import { createTradingViewWidgetAdapter, type TradingViewWidgetLike } from './widgetAdapter';
import { TRADINGVIEW_ADAPTER_HOOK_KEY, type TradingViewHookHost } from './types';

describe('TradingView widget adapter', () => {
  it('installs hooks before creating the widget and disposes both', () => {
    const beforeBars = vi.fn();
    const remove = vi.fn();
    const hookHost: TradingViewHookHost = {};
    const constructionOrder: string[] = [];

    class Widget implements TradingViewWidgetLike {
      remove = remove;

      constructor() {
        constructionOrder.push(
          hookHost[TRADINGVIEW_ADAPTER_HOOK_KEY]?.beforeBars === beforeBars ? 'hooks-installed' : 'hooks-missing'
        );
      }
    }

    const adapter = createTradingViewWidgetAdapter({
      widget: Widget,
      widgetOptions: {},
      hooks: { beforeBars },
      hookHost,
    });

    expect(constructionOrder).toEqual(['hooks-installed']);
    expect(hookHost[TRADINGVIEW_ADAPTER_HOOK_KEY]?.beforeBars).toBe(beforeBars);

    adapter.dispose();

    expect(remove).toHaveBeenCalledOnce();
    expect(hookHost[TRADINGVIEW_ADAPTER_HOOK_KEY]).toBeUndefined();
  });
});
