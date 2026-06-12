import { createPatchedTradingViewScript, type LoadedPatchedTradingViewScript } from './scriptLoader';
import type { TradingViewPatchOptions, TradingViewPatchSpec } from './types';

export interface TradingViewScriptPatchRule {
  spec: TradingViewPatchSpec;
  matches: string | RegExp | ((url: string) => boolean);
  patchOptions?: TradingViewPatchOptions;
}

export interface InstallTradingViewScriptPatchInterceptorOptions {
  rules: readonly TradingViewScriptPatchRule[];
  document?: Document;
  fetch?: typeof fetch;
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
}

export interface TradingViewScriptPatchInterceptorHandle {
  patchedScripts: readonly Promise<LoadedPatchedTradingViewScript>[];
  dispose: () => void;
}

interface PatchedTarget {
  target: HTMLElement;
  appendChild: typeof HTMLElement.prototype.appendChild;
  insertBefore: typeof HTMLElement.prototype.insertBefore;
}

export function installTradingViewScriptPatchInterceptor(
  options: InstallTradingViewScriptPatchInterceptorOptions
): TradingViewScriptPatchInterceptorHandle {
  const documentRef = options.document ?? globalThis.document;
  if (!documentRef) {
    throw new Error('A Document is required to intercept TradingView scripts');
  }

  const patchedScripts: Promise<LoadedPatchedTradingViewScript>[] = [];
  const loadedScripts: LoadedPatchedTradingViewScript[] = [];
  const targets = [documentRef.head, documentRef.body, documentRef.documentElement].filter(
    (target): target is HTMLElement => Boolean(target)
  );
  const originals: PatchedTarget[] = targets.map((target) => ({
    target,
    appendChild: target.appendChild,
    insertBefore: target.insertBefore,
  }));

  for (const original of originals) {
    original.target.appendChild = ((node: Node) => {
      const intercepted = interceptScriptAppend(original, node, null);
      if (intercepted) return intercepted;
      return original.appendChild.call(original.target, node);
    }) as typeof HTMLElement.prototype.appendChild;

    original.target.insertBefore = ((node: Node, child: Node | null) => {
      const intercepted = interceptScriptAppend(original, node, child);
      if (intercepted) return intercepted;
      return original.insertBefore.call(original.target, node, child);
    }) as typeof HTMLElement.prototype.insertBefore;
  }

  function interceptScriptAppend(original: PatchedTarget, node: Node, before: Node | null): Node | null {
    if (!(node instanceof documentRef.defaultView!.HTMLScriptElement) || !node.src) {
      return null;
    }

    const rule = findMatchingRule(node.src, options.rules);
    if (!rule) {
      return null;
    }

    const placeholder = documentRef.createComment(`tealchart patched tradingview script: ${node.src}`);
    original.insertBefore.call(original.target, placeholder, before);

    const promise = createPatchedTradingViewScript({
      url: node.src,
      spec: rule.spec,
      patchOptions: rule.patchOptions,
      document: documentRef,
      fetch: options.fetch,
      createObjectURL: options.createObjectURL,
      revokeObjectURL: options.revokeObjectURL,
      scriptAttributes: copyScriptAttributes(node),
    })
      .then((loaded) => {
        loaded.element.onload = () => node.dispatchEvent(new Event('load'));
        loaded.element.onerror = () => node.dispatchEvent(new Event('error'));
        original.insertBefore.call(original.target, loaded.element, placeholder);
        placeholder.remove();
        loadedScripts.push(loaded);
        return loaded;
      })
      .catch((error) => {
        placeholder.remove();
        node.dispatchEvent(new ErrorEvent('error', { error, message: String(error) }));
        throw error;
      });

    patchedScripts.push(promise);
    return node;
  }

  return {
    patchedScripts,
    dispose: () => {
      for (const original of originals) {
        original.target.appendChild = original.appendChild;
        original.target.insertBefore = original.insertBefore;
      }
      for (const loaded of loadedScripts) {
        loaded.dispose();
      }
    },
  };
}

function findMatchingRule(
  url: string,
  rules: readonly TradingViewScriptPatchRule[]
): TradingViewScriptPatchRule | undefined {
  return rules.find((rule) => {
    if (typeof rule.matches === 'string') return url.includes(rule.matches);
    if (rule.matches instanceof RegExp) return rule.matches.test(url);
    return rule.matches(url);
  });
}

function copyScriptAttributes(script: HTMLScriptElement): Record<string, string | boolean> {
  const attributes: Record<string, string | boolean> = {};
  for (const attribute of Array.from(script.attributes)) {
    if (attribute.name === 'src') continue;
    attributes[attribute.name] = attribute.value || true;
  }
  return attributes;
}
