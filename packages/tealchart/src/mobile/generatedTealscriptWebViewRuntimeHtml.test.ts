// @vitest-environment node

import { readFile } from 'node:fs/promises';

import { version as esbuildVersion } from 'esbuild';

import { expect, it, vi } from 'vitest';

const generation = vi.hoisted(() => {
  let resolve!: (output: { path: string; source: string }) => void;
  const output = new Promise<{ path: string; source: string }>((complete) => {
    resolve = complete;
  });
  return { output, resolve };
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...original,
    writeFile: vi.fn(async (path: string, source: string) => {
      generation.resolve({ path, source });
    }),
  };
});

it('keeps the committed mobile runtime byte-identical to the generator output', async (ctx) => {
  await import('../../scripts/build-mobile-tealscript-webview-runtime');
  const { path, source } = await generation.output;
  const committed = await readFile(path);
  // The bundle is only reproducible under the esbuild that generated it. The
  // monorepo and the tealchart mirror pin different esbuild versions, so only
  // the side matching the committed header can check byte-identity.
  const generatedWith = /with esbuild (\S+)\./.exec(committed.toString('utf8', 0, 200))?.[1];
  if (generatedWith !== esbuildVersion) {
    ctx.skip(`committed runtime was generated with esbuild ${generatedWith}; this install has ${esbuildVersion}`);
  }
  expect(
    committed.equals(Buffer.from(source)),
    'Regenerate with yarn workspace @tealstreet/tealchart build:mobile-tealscript-runtime',
  ).toBe(true);
});
