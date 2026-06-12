import { describe, expect, it, vi } from 'vitest';
import { installTradingViewHooks } from './hooks';
import { TRADINGVIEW_ADAPTER_HOOK_KEY, type TradingViewHookHost } from './types';

describe('TradingView hook installer', () => {
  it('installs callbacks on the host and restores previous callbacks', () => {
    const beforeBars = vi.fn();
    const previousAfterBars = vi.fn();
    const host: TradingViewHookHost = {
      [TRADINGVIEW_ADAPTER_HOOK_KEY]: { afterBars: previousAfterBars },
    };
    host.top = host as Window;

    const handle = installTradingViewHooks({ beforeBars }, { host });

    expect(host[TRADINGVIEW_ADAPTER_HOOK_KEY]?.beforeBars).toBe(beforeBars);
    expect(host[TRADINGVIEW_ADAPTER_HOOK_KEY]?.afterBars).toBe(previousAfterBars);

    handle.dispose();

    expect(host[TRADINGVIEW_ADAPTER_HOOK_KEY]).toEqual({ afterBars: previousAfterBars });
  });

  it('also installs callbacks on window.top when accessible', () => {
    const beforeBars = vi.fn();
    const top: TradingViewHookHost = {};
    const host: TradingViewHookHost = { top: top as Window };

    const handle = installTradingViewHooks({ beforeBars }, { host });

    expect(host[TRADINGVIEW_ADAPTER_HOOK_KEY]?.beforeBars).toBe(beforeBars);
    expect(top[TRADINGVIEW_ADAPTER_HOOK_KEY]?.beforeBars).toBe(beforeBars);

    handle.dispose();

    expect(host[TRADINGVIEW_ADAPTER_HOOK_KEY]).toBeUndefined();
    expect(top[TRADINGVIEW_ADAPTER_HOOK_KEY]).toBeUndefined();
  });
});
