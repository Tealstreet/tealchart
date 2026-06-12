import {
  TRADINGVIEW_ADAPTER_HOOK_KEY,
  type TradingViewHookHost,
  type TradingViewPatchCallbacks,
  type TradingViewPatchHandle,
} from './types';

export interface InstallTradingViewHooksOptions {
  host?: TradingViewHookHost;
  installOnTop?: boolean;
}

export function installTradingViewHooks(
  callbacks: TradingViewPatchCallbacks,
  options: InstallTradingViewHooksOptions = {}
): TradingViewPatchHandle {
  const host = options.host ?? (globalThis.window as TradingViewHookHost | undefined);
  if (!host) {
    return { dispose: () => undefined };
  }

  const targets = collectHookTargets(host, options.installOnTop ?? true);
  const previous = targets.map((target) => ({
    target,
    callbacks: target[TRADINGVIEW_ADAPTER_HOOK_KEY],
  }));

  for (const target of targets) {
    target[TRADINGVIEW_ADAPTER_HOOK_KEY] = {
      ...target[TRADINGVIEW_ADAPTER_HOOK_KEY],
      ...callbacks,
    };
  }

  return {
    dispose: () => {
      for (const { target, callbacks: previousCallbacks } of previous) {
        if (previousCallbacks) {
          target[TRADINGVIEW_ADAPTER_HOOK_KEY] = previousCallbacks;
        } else {
          delete target[TRADINGVIEW_ADAPTER_HOOK_KEY];
        }
      }
    },
  };
}

function collectHookTargets(host: TradingViewHookHost, installOnTop: boolean): TradingViewHookHost[] {
  const targets = [host];
  const top = installOnTop ? getWindowTop(host) : undefined;

  if (top && top !== host) {
    targets.push(top as TradingViewHookHost);
  }

  return targets;
}

function getWindowTop(host: TradingViewHookHost): Window | undefined {
  try {
    return host.top ?? undefined;
  } catch {
    return undefined;
  }
}
