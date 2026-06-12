import { patchTradingViewBundle } from './runtimePatcher';
import type { TradingViewPatchOptions, TradingViewPatchResult, TradingViewPatchSpec } from './types';

export interface LoadPatchedTradingViewScriptOptions {
  url: string;
  spec: TradingViewPatchSpec;
  patchOptions?: TradingViewPatchOptions;
  document?: Document;
  fetch?: typeof fetch;
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
  scriptAttributes?: Record<string, string | boolean>;
}

export interface LoadedPatchedTradingViewScript {
  element: HTMLScriptElement;
  objectUrl: string;
  patchResult: TradingViewPatchResult;
  dispose: () => void;
}

export async function createPatchedTradingViewScript(
  options: LoadPatchedTradingViewScriptOptions
): Promise<LoadedPatchedTradingViewScript> {
  const documentRef = options.document ?? globalThis.document;
  const fetchRef = options.fetch ?? globalThis.fetch;

  if (!documentRef) {
    throw new Error('A Document is required to load a patched TradingView script');
  }
  if (!fetchRef) {
    throw new Error('fetch is required to load a patched TradingView script');
  }
  if (!options.createObjectURL && !globalThis.URL?.createObjectURL) {
    throw new Error('URL.createObjectURL is required to load a patched TradingView script');
  }

  const createObjectURL = options.createObjectURL ?? globalThis.URL.createObjectURL.bind(globalThis.URL);
  const revokeObjectURL =
    options.revokeObjectURL ?? globalThis.URL.revokeObjectURL?.bind(globalThis.URL) ?? (() => undefined);

  const response = await fetchRef(options.url);
  if (!response.ok) {
    throw new Error(`Failed to fetch TradingView script: ${options.url}`);
  }

  const source = await response.text();
  const patchResult = await patchTradingViewBundle(source, options.spec, options.patchOptions);
  const blob = new Blob([patchResult.code], { type: 'text/javascript' });
  const objectUrl = createObjectURL(blob);
  const element = documentRef.createElement('script');

  element.src = objectUrl;
  element.async = false;
  element.dataset.tealchartTradingviewPatched = options.spec.id;

  for (const [key, value] of Object.entries(options.scriptAttributes ?? {})) {
    if (typeof value === 'boolean') {
      if (value) {
        element.setAttribute(key, '');
      }
      continue;
    }
    element.setAttribute(key, value);
  }

  return {
    element,
    objectUrl,
    patchResult,
    dispose: () => {
      element.remove();
      revokeObjectURL(objectUrl);
    },
  };
}

export async function loadPatchedTradingViewScript(
  options: LoadPatchedTradingViewScriptOptions
): Promise<LoadedPatchedTradingViewScript> {
  const loaded = await createPatchedTradingViewScript(options);
  const documentRef = options.document ?? globalThis.document;
  documentRef.head.appendChild(loaded.element);
  return loaded;
}
