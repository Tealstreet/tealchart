// @vitest-environment node

import { readFile } from 'node:fs/promises';

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

it('keeps the committed mobile runtime byte-identical to the generator output', async () => {
  await import('../../scripts/build-mobile-tealscript-webview-runtime');
  const { path, source } = await generation.output;
  const committed = await readFile(path);
  expect(
    committed.equals(Buffer.from(source)),
    'Regenerate with yarn workspace @tealstreet/tealchart build:mobile-tealscript-runtime',
  ).toBe(true);
});
