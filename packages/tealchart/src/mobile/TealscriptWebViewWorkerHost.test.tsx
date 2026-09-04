import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native-webview', () => ({
  default: () => null,
}));

import { TealscriptWebViewWorkerBridge } from './TealscriptWebViewWorkerHost';
import { stringifyTealscriptWebViewBridgeMessage } from './tealscriptWebViewBridgeCodec';

describe('TealscriptWebViewWorkerBridge diagnostics', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports a ready timeout to queued workers instead of queueing forever', () => {
    vi.useFakeTimers();
    const bridge = new TealscriptWebViewWorkerBridge({ readyTimeoutMs: 25 });
    const worker = bridge.createWorker();
    const onError = vi.fn();
    worker.onerror = onError;

    bridge.setWebView({ injectJavaScript: vi.fn() } as never);
    bridge.handleLoadEnd({ nativeEvent: {} } as never);

    vi.advanceTimersByTime(25);

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('WebView load ended but runtime-ready did not post'),
      }),
    );
  });

  it('reports native WebView load errors to queued workers', () => {
    const bridge = new TealscriptWebViewWorkerBridge();
    const worker = bridge.createWorker();
    const onError = vi.fn();
    worker.onerror = onError;

    bridge.handleWebViewError({
      nativeEvent: { description: 'The operation could not be completed' },
    } as never);

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Tealscript WebView runtime failed to load: The operation could not be completed',
      }),
    );
  });

  it('reports page-level runtime errors to queued workers', () => {
    const bridge = new TealscriptWebViewWorkerBridge();
    const worker = bridge.createWorker();
    const onError = vi.fn();
    worker.onerror = onError;

    bridge.handleMessage({
      nativeEvent: {
        data: stringifyTealscriptWebViewBridgeMessage({
          type: 'runtime-error',
          message: 'Worker is not defined',
        }),
      },
    } as never);

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Tealscript WebView runtime error: Worker is not defined',
      }),
    );
  });

  it('clears the ready timeout once the runtime posts runtime-ready', () => {
    vi.useFakeTimers();
    const bridge = new TealscriptWebViewWorkerBridge({ readyTimeoutMs: 25 });
    const worker = bridge.createWorker();
    const onError = vi.fn();
    const injectJavaScript = vi.fn();
    worker.onerror = onError;

    bridge.setWebView({ injectJavaScript } as never);
    bridge.handleMessage({
      nativeEvent: { data: stringifyTealscriptWebViewBridgeMessage({ type: 'runtime-ready' }) },
    } as never);
    vi.advanceTimersByTime(25);

    expect(onError).not.toHaveBeenCalled();
    expect(injectJavaScript).toHaveBeenCalledWith(expect.stringContaining('create-worker'));
  });
});
