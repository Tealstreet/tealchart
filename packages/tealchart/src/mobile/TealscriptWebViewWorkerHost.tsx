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

type BridgeToWebViewMessage =
  | { type: 'create-worker'; workerId: string }
  | { type: 'worker-message'; workerId: string; data: unknown }
  | { type: 'terminate-worker'; workerId: string };

type BridgeFromWebViewMessage =
  | { type: 'runtime-ready' }
  | { type: 'worker-message'; workerId: string; data: unknown }
  | { type: 'worker-error'; workerId: string; message: string; filename?: string; lineno?: number; colno?: number };

type WebViewWorkerListener = (event: MessageEvent) => void;
type WebViewWorkerErrorListener = (event: ErrorEvent) => void;

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
  private nextWorkerId = 0;
  private readonly workers = new Map<string, WebViewBackedWorker>();
  private readonly pendingMessages: BridgeToWebViewMessage[] = [];

  createWorker = (): Worker => {
    const workerId = `tealscript-${++this.nextWorkerId}`;
    const worker = new WebViewBackedWorker(workerId, this.postToWebView);
    this.workers.set(workerId, worker);
    this.postToWebView({ type: 'create-worker', workerId });
    return worker;
  };

  setWebView = (webView: WebView | null): void => {
    this.webView = webView;
  };

  handleMessage = (event: WebViewMessageEvent): void => {
    const message = parseTealscriptWebViewBridgeMessage(event.nativeEvent.data) as BridgeFromWebViewMessage;
    if (message.type === 'runtime-ready') {
      this.ready = true;
      this.flushPendingMessages();
      return;
    }

    const worker = this.workers.get(message.workerId);
    if (!worker) return;

    if (message.type === 'worker-message') {
      worker.dispatchMessage(message.data);
    } else {
      worker.dispatchError(message);
    }
  };

  terminate(): void {
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
          javaScriptEnabled
          onMessage={bridge.handleMessage}
          originWhitelist={['*']}
          ref={bridge.setWebView}
          source={{ html: TEALSCRIPT_WEBVIEW_RUNTIME_HTML }}
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
