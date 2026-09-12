import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { ExternalCorpusReport, RunExternalPineCorpusOptions } from './run-external-pine-corpus.ts';

export interface PinnedCorpusReport extends ExternalCorpusReport {
  measurementCommitSha: string;
  measurementSource: 'git-archive';
  measurementShard?: {
    index: number;
    count: number;
  };
}

export interface RunPinnedCorpusOptions {
  commitSha: string;
  inputDir: string;
  outputPath: string;
  localPaths?: Set<string>;
  excludedPaths?: Set<string>;
  shard?: {
    index: number;
    count: number;
  };
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(SCRIPT_DIR, '..');
const REPO_ROOT = resolve(PACKAGE_ROOT, '../..');

export function selectPinnedCorpusPaths(
  paths: string[],
  shard?: { index: number; count: number },
): Set<string> {
  return new Set(paths.filter((_path, index) => !shard || index % shard.count === shard.index));
}

function resolveCommit(commitSha: string): string {
  if (!/^[0-9a-f]{7,40}$/i.test(commitSha)) {
    throw new Error(`Invalid commit SHA: ${commitSha}`);
  }
  return execFileSync('git', ['-C', REPO_ROOT, 'rev-parse', '--verify', `${commitSha}^{commit}`], {
    encoding: 'utf8',
  }).trim();
}

function exportPackage(commitSha: string, archiveRoot: string): string {
  const archive = execFileSync('git', ['-C', REPO_ROOT, 'archive', '--format=tar', commitSha, 'packages/tealscript'], {
    maxBuffer: 1024 * 1024 * 1024,
  });
  execFileSync('tar', ['-xf', '-', '-C', archiveRoot], { input: archive });
  return join(archiveRoot, 'packages/tealscript');
}

export async function runPinnedExternalPineCorpus(options: RunPinnedCorpusOptions): Promise<PinnedCorpusReport> {
  const commitSha = resolveCommit(options.commitSha);
  const archiveRoot = await mkdtemp(join(tmpdir(), 'tealscript-pine-corpus-'));
  const packageRoot = exportPackage(commitSha, archiveRoot);
  await symlink(join(REPO_ROOT, 'node_modules'), join(archiveRoot, 'node_modules'));

  const runnerUrl = pathToFileURL(join(packageRoot, 'scripts/run-external-pine-corpus.ts')).href;
  const { runExternalPineCorpus } = await import(runnerUrl) as typeof import('./run-external-pine-corpus.ts');
  const manifest = JSON.parse(await readFile(join(resolve(options.inputDir), 'manifest.json'), 'utf8')) as {
    scripts: Array<{ localPath: string }>;
  };
  const excludedPaths = options.excludedPaths ?? new Set<string>();
  const localPaths = options.localPaths
    ? new Set([...options.localPaths].filter((localPath) => !excludedPaths.has(localPath)))
    : excludedPaths.size > 0
      ? new Set(manifest.scripts.map((script) => script.localPath).filter((localPath) => !excludedPaths.has(localPath)))
      : undefined;
  const shardPaths = options.shard
    ? selectPinnedCorpusPaths(manifest.scripts.map((script) => script.localPath), options.shard)
    : undefined;
  const selectedPaths = shardPaths
    ? new Set([...shardPaths].filter((localPath) => !excludedPaths.has(localPath) && (!localPaths || localPaths.has(localPath))))
    : localPaths;
  const runOptions: RunExternalPineCorpusOptions = {
    inputDir: resolve(options.inputDir),
    outputPath: undefined,
    localPaths: selectedPaths,
  };
  const report = await runExternalPineCorpus(runOptions);
  const pinnedReport: PinnedCorpusReport = {
    ...report,
    measurementCommitSha: commitSha,
    measurementSource: 'git-archive',
    ...(options.shard ? { measurementShard: options.shard } : {}),
  };
  await writeFile(resolve(options.outputPath), `${JSON.stringify(pinnedReport, null, 2)}\n`, 'utf8');
  return pinnedReport;
}

function parseArgs(args: string[]): RunPinnedCorpusOptions {
  let commitSha = '';
  let inputDir = '';
  let outputPath = '';
  let shardIndex: number | undefined;
  let shardCount: number | undefined;
  const localPaths = new Set<string>();
  const excludedPaths = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    const value = args[++index] ?? '';
    if (arg === '--commit') commitSha = value;
    else if (arg === '--input') inputDir = value;
    else if (arg === '--output') outputPath = value;
    else if (arg === '--shard-index') shardIndex = Number(value);
    else if (arg === '--shard-count') shardCount = Number(value);
    else if (arg === '--only-script') localPaths.add(value);
    else if (arg === '--exclude-script') excludedPaths.add(value);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!commitSha || !inputDir || !outputPath) {
    throw new Error('Usage: pine:external-corpus:pinned --commit <sha> --input <dir> --output <report.json>');
  }
  if ((shardIndex === undefined) !== (shardCount === undefined)
    || (shardIndex !== undefined && (!Number.isInteger(shardIndex) || !Number.isInteger(shardCount)
      || shardCount! < 1 || shardIndex! < 0 || shardIndex! >= shardCount!))) {
    throw new Error('Shard options require --shard-index N and --shard-count N with 0 <= N < count');
  }
  return {
    commitSha,
    inputDir,
    outputPath,
    localPaths: localPaths.size > 0 ? localPaths : undefined,
    excludedPaths: excludedPaths.size > 0 ? excludedPaths : undefined,
    ...(shardIndex !== undefined && shardCount !== undefined
      ? { shard: { index: shardIndex, count: shardCount } }
      : {}),
  };
}

async function main(): Promise<void> {
  const report = await runPinnedExternalPineCorpus(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify({
    measurementCommitSha: report.measurementCommitSha,
    summary: report.summary,
  }, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
