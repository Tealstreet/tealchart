import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(scriptDir, '..');
const repoDir = resolve(packageDir, '../..');
const workerEntry = resolve(repoDir, 'packages/tealscript/src/worker/worker.ts');
const outputFile = resolve(packageDir, 'src/mobile/generatedTealscriptWebViewRuntimeHtml.ts');

const bridgeRuntime = String.raw`
const BRIDGE_TAG = '__tealchartWebViewBridge';
const earlyNativeMessages = [];
const workerScript = __WORKER_SCRIPT__;
const workers = new Map();
let nextWorkerId = 0;

function formatErrorMessage(error) {
  if (!error) return 'unknown error';
  if (typeof error === 'string') return error;
  if (typeof error.message === 'string' && error.message.length > 0) return error.message;
  return String(error);
}

function postNative(message) {
  const nativeBridge = window.ReactNativeWebView;
  if (!nativeBridge || typeof nativeBridge.postMessage !== 'function') {
    earlyNativeMessages.push(message);
    return false;
  }
  nativeBridge.postMessage(JSON.stringify(encodeBridgeValue(message)));
  return true;
}

window.onerror = function(message, source, lineno, colno, error) {
  postNative({
    type: 'runtime-error',
    message: formatErrorMessage(error) || String(message),
    filename: source,
    lineno,
    colno,
  });
};

window.onunhandledrejection = function(event) {
  postNative({
    type: 'runtime-error',
    message: formatErrorMessage(event && event.reason),
  });
};

function encodeBridgeValue(value) {
  if (value === undefined) return { [BRIDGE_TAG]: 'undefined' };
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return { [BRIDGE_TAG]: 'number', value: 'NaN' };
    if (value === Infinity) return { [BRIDGE_TAG]: 'number', value: 'Infinity' };
    if (value === -Infinity) return { [BRIDGE_TAG]: 'number', value: '-Infinity' };
    if (Object.is(value, -0)) return { [BRIDGE_TAG]: 'number', value: '-0' };
    return value;
  }
  if (value instanceof Map) {
    return {
      [BRIDGE_TAG]: 'map',
      entries: Array.from(value.entries(), ([key, entryValue]) => [
        encodeBridgeValue(key),
        encodeBridgeValue(entryValue),
      ]),
    };
  }
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    return { [BRIDGE_TAG]: 'typed-array', name: value.constructor.name, values: Array.from(value, encodeBridgeValue) };
  }
  if (Array.isArray(value)) return value.map(encodeBridgeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entryValue]) => [key, encodeBridgeValue(entryValue)]));
  }
  return value;
}

function decodeBridgeValue(value) {
  if (value && typeof value === 'object' && typeof value[BRIDGE_TAG] === 'string') {
    if (value[BRIDGE_TAG] === 'undefined') return undefined;
    if (value[BRIDGE_TAG] === 'number') {
      if (value.value === 'NaN') return Number.NaN;
      if (value.value === 'Infinity') return Infinity;
      if (value.value === '-Infinity') return -Infinity;
      return -0;
    }
    if (value[BRIDGE_TAG] === 'map') {
      return new Map(value.entries.map(([key, entryValue]) => [decodeBridgeValue(key), decodeBridgeValue(entryValue)]));
    }
    if (value[BRIDGE_TAG] === 'typed-array') {
      const Ctor = globalThis[value.name];
      const values = value.values.map(decodeBridgeValue);
      return typeof Ctor === 'function' ? new Ctor(values) : values;
    }
  }
  if (Array.isArray(value)) return value.map(decodeBridgeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entryValue]) => [key, decodeBridgeValue(entryValue)]));
  }
  return value;
}

function createWorker(workerId) {
  if (workers.has(workerId)) return;
  const blob = new Blob([workerScript], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  workers.set(workerId, { worker, url });
  worker.onmessage = (event) => postNative({ type: 'worker-message', workerId, data: event.data });
  worker.onerror = (event) => postNative({
    type: 'worker-error',
    workerId,
    message: event.message || 'Unknown Tealscript worker error',
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
}

function terminateWorker(workerId) {
  const entry = workers.get(workerId);
  if (!entry) return;
  entry.worker.terminate();
  URL.revokeObjectURL(entry.url);
  workers.delete(workerId);
}

window.__TEALCHART_HANDLE_NATIVE_TEALSCRIPT_MESSAGE__ = function(serialized) {
  const message = decodeBridgeValue(JSON.parse(serialized));
  if (message.type === 'create-worker') {
    createWorker(message.workerId || String(++nextWorkerId));
    return;
  }
  if (message.type === 'worker-message') {
    createWorker(message.workerId);
    workers.get(message.workerId).worker.postMessage(message.data);
    return;
  }
  if (message.type === 'terminate-worker') {
    terminateWorker(message.workerId);
  }
};

postNative({ type: 'runtime-ready' });
`;

function createHtml(workerScript: string): string {
  const script = bridgeRuntime.replace('__WORKER_SCRIPT__', JSON.stringify(workerScript));
  return `<!doctype html><html><head><meta charset="utf-8"></head><body><script>${script}</script></body></html>`;
}

async function main(): Promise<void> {
  const result = await build({
    absWorkingDir: repoDir,
    bundle: true,
    entryPoints: [workerEntry],
    format: 'iife',
    logLevel: 'silent',
    platform: 'browser',
    target: ['es2020'],
    write: false,
  });

  const workerOutput = result.outputFiles[0]?.text;
  if (!workerOutput) throw new Error(`esbuild produced no output for ${workerEntry}`);

  const html = createHtml(workerOutput);
  const source = [
    '// Generated by scripts/build-mobile-tealscript-webview-runtime.ts. Do not edit by hand.',
    `export const TEALSCRIPT_WEBVIEW_RUNTIME_HTML = ${JSON.stringify(html)};`,
    '',
  ].join('\n');

  await writeFile(outputFile, source);
  console.log(`wrote ${relative(repoDir, outputFile)} (${Buffer.byteLength(html, 'utf8')} bytes html)`);
}

void main();
