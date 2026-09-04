import type { ReactElement } from 'react';
import type { WebViewMessageEvent, WebViewProps } from 'react-native-webview';

import React, { useMemo, useRef } from 'react';

import { StyleSheet, View } from 'react-native';
import WebView from 'react-native-webview';

import { TEALSCRIPT_WEBVIEW_RUNTIME_HTML } from './generatedTealscriptWebViewRuntimeHtml';
import {
  parseTealscriptWebViewBridgeMessage,
  stringifyTealscriptWebViewBridgeMessage,
} from './tealscriptWebViewBridgeCodec';

const NativeWebView = WebView as unknown as React.ComponentType<WebViewProps & React.RefAttributes<WebView>>;

// Device-visible trace for the WebView runtime. The bridge queues silently when
// the page never reports ready, so without this a dead runtime is indistinguishable
// from an indicator that simply drew nothing.
export function logTealscriptWebView(message: string): void {
  const scope = globalThis as unknown as {
    __TEALSCRIPT_LOG__?: string[];
    __TEALSCRIPT_LOG_NOTIFY__?: () => void;
  };
  const buffer = (scope.__TEALSCRIPT_LOG__ ??= []);
  buffer.push(`${new Date().toISOString().slice(11, 23)} ${message}`);
  if (buffer.length > 300) buffer.shift();
  scope.__TEALSCRIPT_LOG_NOTIFY__?.();
}
const DEFAULT_READY_TIMEOUT_MS = 10_000;
const RUNTIME_HTML_BYTES = TEALSCRIPT_WEBVIEW_RUNTIME_HTML.length;

// Without a baseUrl, iOS loads this through loadHTMLString into an OPAQUE origin,
// where `new Worker(URL.createObjectURL(blob))` is blocked. The runtime creates its
// workers exactly that way, so the origin is load-bearing rather than cosmetic.
const RUNTIME_BASE_URL = 'https://tealchart.invalid/';

// Runs after the document loads, independently of the page's own script. It answers
// the one question the page cannot: whether postMessage works at all. If this probe
// arrives and runtime-ready does not, the transport is fine and the runtime script
// is at fault; if neither arrives, nothing can post back and every other signal is
// unreliable for the same reason.
const RUNTIME_PROBE_JS = `(function () {
  try {
    var hasBridge = !!(window.ReactNativeWebView && window.ReactNativeWebView.postMessage);
    if (!hasBridge) { document.title = 'tealscript:no-rnwebview'; return; }
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'runtime-error',
      message: 'probe title=' + document.title + ' worker=' + (typeof Worker) + ' blob=' + (typeof Blob),
    }));
  } catch (probeError) {
    document.title = 'tealscript:probe-threw';
  }
})();
true;`;

type BridgeToWebViewMessage =
  | { type: 'create-worker'; workerId: string }
  | { type: 'worker-message'; workerId: string; data: unknown }
  | { type: 'terminate-worker'; workerId: string };

type BridgeFromWebViewMessage =
  | { type: 'runtime-ready' }
  | { type: 'runtime-error'; message: string; filename?: string; lineno?: number; colno?: number }
  | { type: 'worker-message'; workerId: string; data: unknown }
  | { type: 'worker-error'; workerId: string; message: string; filename?: string; lineno?: number; colno?: number };

type WebViewWorkerListener = (event: MessageEvent) => void;
type WebViewWorkerErrorListener = (event: ErrorEvent) => void;
type NativeWebViewErrorEvent = Parameters<NonNullable<WebViewProps['onError']>>[0];
type NativeWebViewHttpErrorEvent = Parameters<NonNullable<WebViewProps['onHttpError']>>[0];
type NativeWebViewLoadEvent = Parameters<NonNullable<WebViewProps['onLoadEnd']>>[0];
type NativeWebViewNavigationEvent = Parameters<NonNullable<WebViewProps['onNavigationStateChange']>>[0];

interface TealscriptWebViewWorkerBridgeOptions {
  readyTimeoutMs?: number;
}

class WebViewBackedWorker implements Worker {
  onmessage: ((this: Worker, event: MessageEvent) => unknown) | null = null;
  onmessageerror: ((this: Worker, event: MessageEvent) => unknown) | null = null;
  onerror: ((this: AbstractWorker, event: ErrorEvent) => unknown) | null = null;

  private readonly messageListeners = new Set<WebViewWorkerListener>();
  private readonly errorListeners = new Set<WebViewWorkerErrorListener>();
  private readonly objectListenerCallbacks = new WeakMap<EventListenerObject, EventListener>();

  constructor(
    private readonly workerId: string,
    private readonly postToBridge: (message: BridgeToWebViewMessage) => void,
  ) {}

  postMessage(message: unknown): void {
    this.postToBridge({ type: 'worker-message', workerId: this.workerId, data: message });
  }

  terminate(): void {
    this.postToBridge({ type: 'terminate-worker', workerId: this.workerId });
    this.messageListeners.clear();
    this.errorListeners.clear();
  }

  dispatchMessage(data: unknown): void {
    const event = { data } as MessageEvent;
    this.onmessage?.call(this, event);
    for (const listener of this.messageListeners) listener(event);
  }

  dispatchError(error: Omit<Extract<BridgeFromWebViewMessage, { type: 'worker-error' }>, 'type' | 'workerId'>): void {
    const event = {
      colno: error.colno ?? 0,
      filename: error.filename ?? '',
      message: error.message,
      lineno: error.lineno ?? 0,
    } as ErrorEvent;
    this.onerror?.call(this, event);
    for (const listener of this.errorListeners) listener(event);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null): void {
    if (!listener) return;
    const callback = this.getListenerCallback(listener);
    if (type === 'message') {
      this.messageListeners.add(callback as WebViewWorkerListener);
    } else if (type === 'error') {
      this.errorListeners.add(callback as WebViewWorkerErrorListener);
    }
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null): void {
    if (!listener) return;
    const callback = this.getListenerCallback(listener);
    if (type === 'message') {
      this.messageListeners.delete(callback as WebViewWorkerListener);
    } else if (type === 'error') {
      this.errorListeners.delete(callback as WebViewWorkerErrorListener);
    }
  }

  dispatchEvent(): boolean {
    return false;
  }

  private getListenerCallback(listener: EventListenerOrEventListenerObject): EventListener {
    if (typeof listener === 'function') return listener;

    let callback = this.objectListenerCallbacks.get(listener);
    if (!callback) {
      callback = (event) => listener.handleEvent(event);
      this.objectListenerCallbacks.set(listener, callback);
    }

    return callback;
  }
}

export class TealscriptWebViewWorkerBridge {
  private webView: WebView | null = null;
  private ready = false;
  private didLoadEnd = false;
  private didLoadError = false;
  private didHttpError = false;
  private readyTimeout: ReturnType<typeof setTimeout> | null = null;
  private nextWorkerId = 0;
  private readonly workers = new Map<string, WebViewBackedWorker>();
  private readonly pendingMessages: BridgeToWebViewMessage[] = [];

  constructor(private readonly options: TealscriptWebViewWorkerBridgeOptions = {}) {}

  createWorker = (): Worker => {
    const workerId = `tealscript-${++this.nextWorkerId}`;
    logTealscriptWebView(`createWorker ${workerId}`);
    const worker = new WebViewBackedWorker(workerId, this.postToWebView);
    this.workers.set(workerId, worker);
    this.postToWebView({ type: 'create-worker', workerId });
    return worker;
  };

  setWebView = (webView: WebView | null): void => {
    this.webView = webView;
    if (webView && !this.ready) {
      logTealscriptWebView(`WebView attached htmlBytes=${RUNTIME_HTML_BYTES}`);
      this.startReadyTimeout();
    } else if (!webView) {
      logTealscriptWebView('WebView detached');
      this.clearReadyTimeout();
    }
  };

  handleMessage = (event: WebViewMessageEvent): void => {
    let message: BridgeFromWebViewMessage;
    try {
      message = parseTealscriptWebViewBridgeMessage(event.nativeEvent.data) as BridgeFromWebViewMessage;
    } catch (error) {
      this.reportBridgeError(
        `Tealscript WebView bridge posted an invalid message: ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }

    if (message.type === 'runtime-ready') {
      const flushedCount = this.pendingMessages.length;
      logTealscriptWebView(`runtime-ready flush=${flushedCount}`);
      this.ready = true;
      this.clearReadyTimeout();
      this.flushPendingMessages();
      return;
    }

    if (message.type === 'runtime-error') {
      logTealscriptWebView(`runtime error ${message.message}`);
      this.reportBridgeError(`Tealscript WebView runtime error: ${message.message}`);
      return;
    }

    const worker = this.workers.get(message.workerId);
    if (!worker) {
      logTealscriptWebView(`unmatched ${message.type} worker=${message.workerId}`);
      return;
    }

    if (message.type === 'worker-message') {
      worker.dispatchMessage(message.data);
    } else {
      worker.dispatchError(message);
    }
  };

  handleNavigationStateChange = (event: NativeWebViewNavigationEvent): void => {
    const title = typeof event.title === 'string' && event.title.length > 0 ? event.title : '(no title)';
    logTealscriptWebView(`WebView title ${title}`);
  };

  handleLoadEnd = (_event: NativeWebViewLoadEvent): void => {
    this.didLoadEnd = true;
    logTealscriptWebView('WebView loadEnd');
  };

  handleWebViewError = (event: NativeWebViewErrorEvent): void => {
    this.didLoadError = true;
    const nativeEvent = event.nativeEvent;
    logTealscriptWebView(`WebView error ${nativeEvent.description || nativeEvent.domain || 'unknown'}`);
    this.reportBridgeError(
      `Tealscript WebView runtime failed to load: ${nativeEvent.description || nativeEvent.domain || 'unknown WebView error'}`,
    );
  };

  handleWebViewHttpError = (event: NativeWebViewHttpErrorEvent): void => {
    this.didHttpError = true;
    const nativeEvent = event.nativeEvent;
    logTealscriptWebView(`WebView http ${nativeEvent.statusCode}`);
    this.reportBridgeError(
      `Tealscript WebView runtime returned HTTP ${nativeEvent.statusCode} while loading ${nativeEvent.url || 'inline HTML'}`,
    );
  };

  terminate(): void {
    this.clearReadyTimeout();
    for (const workerId of this.workers.keys()) {
      this.postToWebView({ type: 'terminate-worker', workerId });
    }
    this.workers.clear();
    this.pendingMessages.length = 0;
    this.ready = false;
    this.webView = null;
  }

  private postToWebView = (message: BridgeToWebViewMessage): void => {
    if (!this.ready || !this.webView) {
      this.pendingMessages.push(message);
      logTealscriptWebView(`queued ${message.type} count=${this.pendingMessages.length}`);
      return;
    }

    const payload = stringifyTealscriptWebViewBridgeMessage(message);
    this.webView.injectJavaScript(
      `window.__TEALCHART_HANDLE_NATIVE_TEALSCRIPT_MESSAGE__(${JSON.stringify(payload)}); true;`,
    );
  };

  private flushPendingMessages(): void {
    const messages = this.pendingMessages.splice(0);
    for (const message of messages) this.postToWebView(message);
  }

  private startReadyTimeout(): void {
    if (this.readyTimeout) return;
    this.readyTimeout = setTimeout(() => {
      const loadState = this.didLoadError
        ? 'WebView load error fired'
        : this.didHttpError
          ? 'WebView HTTP error fired'
          : this.didLoadEnd
            ? 'WebView load ended but runtime-ready did not post'
            : 'WebView load did not finish';
      logTealscriptWebView(`ready timeout queued=${this.pendingMessages.length}`);
      this.reportBridgeError(
        `Tealscript WebView runtime did not become ready within ${this.readyTimeoutMs()}ms (${loadState}; htmlBytes=${RUNTIME_HTML_BYTES}; pendingMessages=${this.pendingMessages.length})`,
      );
    }, this.readyTimeoutMs());
  }

  private readyTimeoutMs(): number {
    return this.options.readyTimeoutMs ?? DEFAULT_READY_TIMEOUT_MS;
  }

  private clearReadyTimeout(): void {
    if (!this.readyTimeout) return;
    clearTimeout(this.readyTimeout);
    this.readyTimeout = null;
  }

  private reportBridgeError(message: string): void {
    this.pendingMessages.length = 0;
    for (const worker of this.workers.values()) {
      worker.dispatchError({ message });
    }
  }
}

export function useTealscriptWebViewWorkerBridge(): {
  createWorker: () => Worker;
  hostElement: ReactElement;
} {
  const bridgeRef = useRef<TealscriptWebViewWorkerBridge | null>(null);
  if (!bridgeRef.current) bridgeRef.current = new TealscriptWebViewWorkerBridge();
  const bridge = bridgeRef.current;

  const hostElement = useMemo(
    () => (
      <View pointerEvents="none" style={styles.host}>
        <NativeWebView
          injectedJavaScript={RUNTIME_PROBE_JS}
          javaScriptEnabled
          onError={bridge.handleWebViewError}
          onHttpError={bridge.handleWebViewHttpError}
          onLoadEnd={bridge.handleLoadEnd}
          onMessage={bridge.handleMessage}
          onNavigationStateChange={bridge.handleNavigationStateChange}
          originWhitelist={['*']}
          ref={bridge.setWebView}
          source={{ baseUrl: RUNTIME_BASE_URL, html: TEALSCRIPT_WEBVIEW_RUNTIME_HTML }}
        />
      </View>
    ),
    [bridge],
  );

  return { createWorker: bridge.createWorker, hostElement };
}

const styles = StyleSheet.create({
  host: {
    height: 1,
    left: -10_000,
    opacity: 0,
    position: 'absolute',
    top: -10_000,
    width: 1,
  },
});
