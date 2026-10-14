// @vitest-environment node

import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { runInNewContext } from 'node:vm';

import { version as esbuildVersion } from 'esbuild';

import { beforeAll, expect, it } from 'vitest';

import type { FromWorkerMessage, InitMessage } from '../../../tealscript/src/worker/protocol';
import { buildMobileTealscriptWebViewRuntime } from '../../scripts/build-mobile-tealscript-webview-runtime';

let generated: Awaited<ReturnType<typeof buildMobileTealscriptWebViewRuntime>>;
let committed: string;
let workerScript: string;

beforeAll(async () => {
  generated = await buildMobileTealscriptWebViewRuntime();
  committed = await readFile(new URL('./generatedTealscriptWebViewRuntimeHtml.ts', import.meta.url), 'utf8');
  const html = JSON.parse(
    committed
      .slice(committed.indexOf(' = ') + 3)
      .trim()
      .replace(/;$/, ''),
  ) as string;
  workerScript = JSON.parse(/const workerScript = (".*?");\n/.exec(html)![1]) as string;
});

it('keeps the committed mobile runtime fresh for all worker dependencies and the generator', () => {
  expect(
    /Source fingerprint: ([a-f0-9]{64})/.exec(committed)?.[1],
    'Regenerate with yarn workspace @tealstreet/tealchart build:mobile-tealscript-runtime',
  ).toBe(generated.sourceFingerprint);
  const generatedWith = /with esbuild (\S+)\./.exec(committed.slice(0, 200))?.[1];
  if (generatedWith === esbuildVersion) {
    expect(
      committed === generated.source,
      'The committed runtime must equal the production generator output byte for byte',
    ).toBe(true);
  }
});

it('executes omitted-anchor VWAP source holes in the committed mobile worker', () => {
  const messages: FromWorkerMessage[] = [];
  const self = {
    postMessage: (message: FromWorkerMessage) => messages.push(message),
    onmessage: undefined as undefined | ((event: { data: InitMessage }) => void),
  };
  runInNewContext(workerScript, { self, console, performance });
  expect(messages).toEqual([{ type: 'ready' }]);
  const bars = [10, 20, 30].map((close, index) => ({
    time: 1700000000000 + index * 60000,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
  }));
  self.onmessage!({
    data: {
      type: 'init',
      scriptId: 'vwap-source-hole',
      inputs: {},
      bars,
      script: '//@version=6\nindicator("vwap source hole")\nsrc = bar_index == 1 ? na : close\nplot(ta.vwap(src))',
    },
  });
  expect(messages.filter(({ type }) => type === 'error' || type === 'parseError' || type === 'semanticError')).toEqual(
    [],
  );
  const result = messages.find((message) => message.type === 'result');
  expect(result?.type).toBe('result');
  if (result?.type !== 'result') throw new Error('Mobile worker did not produce a result');
  expect(result.output.plots).toHaveLength(1);
  expect(result.output.plots[0].values).toEqual([10, null, null]);
});

it('ships the current advisory and historical box-creation guard', () => {
  expect(workerScript).toContain('PINE_VERSION_OUTDATED');
  expect(workerScript).toContain('validateBoxCreationHistory');
});
