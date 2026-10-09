import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const testFiles = ['./src/**/*.test.{js,ts}', './tests/**/*.test.{js,ts}'];

const packageRoot = fileURLToPath(new URL('.', import.meta.url));
const TEST_FILE = /\.test\.(js|ts)$/;

/** Whether `oracle-probes` appears outside comments, i.e. the test reads it. */
const readsOracleProbes = (source: string): boolean =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .some((line) => {
      const trimmed = line.trim();
      return !trimmed.startsWith('//') && !trimmed.startsWith('*') && trimmed.includes('oracle-probes');
    });

/**
 * `oracle-probes/` is 5 GB of capture fixtures kept in the monorepo only; the
 * public tealchart mirror does not carry it. There, the tests that read it are
 * excluded, and said so, rather than failing. The monorepo CI still runs them.
 */
const oracleProbeTests = (): string[] => {
  if (existsSync(`${packageRoot}oracle-probes`)) return [];
  const dependent = ['src', 'tests'].flatMap((dir) =>
    readdirSync(`${packageRoot}${dir}`, { recursive: true, encoding: 'utf8' })
      .filter((file) => TEST_FILE.test(file))
      .map((file) => `${dir}/${file}`)
      .filter((file) => readsOracleProbes(readFileSync(`${packageRoot}${file}`, 'utf8'))),
  );
  console.warn(
    `[tealscript] oracle-probes/ is absent: excluding ${dependent.length} test files that read it. ` +
      'They run in the tealstreet-next monorepo, which holds the fixtures.',
  );
  return dependent.map((file) => `./${file}`);
};

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    passWithNoTests: true,
    testTimeout: 30_000,
    cache: {
      dir: '../../.cache/vitest/tealscript',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'clover'],
      include: ['src/**/*.ts'],
    },
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    include: testFiles,
    exclude: ['**/node_modules/**', '**/dist/**', '**/.{idea,git,cache,output,temp}/**', ...oracleProbeTests()],
  },
});
