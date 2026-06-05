import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createPineCompatibilityCoverageIndex,
  formatPineCompatibilityCoverageJson,
  formatPineCompatibilityCoverageMarkdown,
  formatPineCompatibilityCorpusJson,
  formatPineCompatibilityCorpusMarkdown,
  runPineCompatibilityCorpus,
} from '../src/compat/index.ts';
import { compatibilityCheckpointCorpus, compatibilityCheckpointLedger } from '../tests/compat/pine-ledger.ts';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, '..');
const defaultOutDir = resolve(packageRoot, 'coverage', 'pine-compatibility');

function resolveOutDir(argv: string[]): string {
  const inlineArg = argv.find((arg) => arg.startsWith('--outDir='));
  if (inlineArg) return resolve(process.cwd(), inlineArg.slice('--outDir='.length));

  const splitArgIndex = argv.indexOf('--outDir');
  if (splitArgIndex !== -1) {
    const value = argv[splitArgIndex + 1];
    if (!value) {
      throw new Error('--outDir requires a directory path');
    }
    return resolve(process.cwd(), value);
  }

  return defaultOutDir;
}

async function writeArtifact(path: string, contents: string): Promise<void> {
  await writeFile(path, contents, 'utf8');
}

async function main(): Promise<void> {
  const outDir = resolveOutDir(process.argv.slice(2));
  const corpusRun = runPineCompatibilityCorpus(compatibilityCheckpointCorpus);
  const coverageIndex = createPineCompatibilityCoverageIndex(compatibilityCheckpointLedger);

  await mkdir(outDir, { recursive: true });
  await Promise.all([
    writeArtifact(resolve(outDir, 'pine-compatibility-corpus.json'), formatPineCompatibilityCorpusJson(corpusRun)),
    writeArtifact(resolve(outDir, 'pine-compatibility-corpus.md'), formatPineCompatibilityCorpusMarkdown(corpusRun)),
    writeArtifact(resolve(outDir, 'pine-compatibility-coverage.json'), formatPineCompatibilityCoverageJson(coverageIndex)),
    writeArtifact(resolve(outDir, 'pine-compatibility-coverage.md'), formatPineCompatibilityCoverageMarkdown(coverageIndex)),
  ]);

  process.stdout.write(`Wrote Pine compatibility dashboard artifacts to ${outDir}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
