import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getOfficialTradingViewLibrary, parseTradingViewImportPath } from '../src/officialTradingViewLibraries.ts';
import type { Program } from '../src/parser/ast.ts';
import { parse } from '../src/parser/parser.ts';
import { checkProgram } from '../src/semantic/checker.ts';
import { executeCompiled, tryCompile } from '../src/runtime/codegen/execute.ts';
import { validateStrategyLedgerInvariants, type StrategyLedgerInvariantViolation } from '../src/runtime/strategyInvariants.ts';
import { createStandardCorpusBars, SyntheticExternalCorpusRequestDatafeed } from './run-external-pine-corpus.ts';

interface CorpusRoot {
  label: string;
  dir: string;
  reportPath?: string;
}

interface StrategyInvariantRow {
  corpus: string;
  localPath: string;
  stage: 'parse' | 'semantic' | 'compile' | 'execute' | 'invariant';
  status: 'skipped' | 'passed' | 'failed';
  diagnostic?: string;
  orders?: number;
  fills?: number;
  openTrades?: number;
  closedTrades?: number;
  equityCurve?: number;
  violations?: StrategyLedgerInvariantViolation[];
}

interface StrategyInvariantReport {
  generatedAt: string;
  roots: CorpusRoot[];
  summary: {
    discoveredScripts: number;
    strategies: number;
    executableStrategies: number;
    coherentStrategies: number;
    violatedStrategies: number;
    skippedByStage: Record<string, number>;
  };
  rows: StrategyInvariantRow[];
}

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(PACKAGE_ROOT, '../..');
const SUPPORTED_EXTENSIONS = new Set(['.pine', '.txt', '.pinescript']);

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const roots: CorpusRoot[] = [];
  let outputPath: string | undefined;

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--corpus') {
      const spec = args[++index];
      if (!spec) throw new Error('--corpus requires label=path');
      const separator = spec.indexOf('=');
      if (separator === -1) throw new Error(`Invalid --corpus value ${spec}; expected label=path`);
      roots.push({ label: spec.slice(0, separator), dir: resolve(spec.slice(separator + 1)) });
    } else if (arg === '--report') {
      const spec = args[++index];
      if (!spec) throw new Error('--report requires label=path');
      const separator = spec.indexOf('=');
      if (separator === -1) throw new Error(`Invalid --report value ${spec}; expected label=path`);
      const label = spec.slice(0, separator);
      const root = roots.find((candidate) => candidate.label === label);
      if (!root) throw new Error(`--report label ${label} must match an earlier --corpus label`);
      root.reportPath = resolve(spec.slice(separator + 1));
    } else if (arg === '--output') {
      outputPath = args[++index];
      if (!outputPath) throw new Error('--output requires a path');
    } else if (arg === '--help') {
      printUsage();
      return;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (roots.length === 0) {
    printUsage();
    throw new Error('At least one --corpus label=path is required');
  }

  const report = await checkStrategyLedgerInvariantsAcrossCorpora(roots);
  const markdown = formatReport(report);
  if (outputPath) {
    const resolved = resolveOutputPath(outputPath);
    await mkdir(dirname(resolved), { recursive: true });
    await writeFile(resolved, `${markdown}\n`, 'utf8');
  }
  console.log(markdown);

  if (report.summary.violatedStrategies > 0) {
    process.exitCode = 1;
  }
}

async function checkStrategyLedgerInvariantsAcrossCorpora(roots: CorpusRoot[]): Promise<StrategyInvariantReport> {
  const bars = createStandardCorpusBars();
  const requestDatafeed = new SyntheticExternalCorpusRequestDatafeed(bars);
  const rows: StrategyInvariantRow[] = [];
  let discoveredScripts = 0;
  let strategies = 0;

  for (const root of roots) {
    console.error(`Scanning ${root.label} from ${root.dir}`);
    const reportRows = root.reportPath ? await readReportStrategyRows(root.reportPath) : undefined;
    const files = reportRows
      ? reportRows.filter((row) => row.executable).map((row) => join(root.dir, row.localPath))
      : await discoverScripts(root.dir);
    discoveredScripts += reportRows ? reportRows.length : files.length;
    if (reportRows) {
      strategies += reportRows.length;
      for (const row of reportRows) {
        if (!row.executable) {
          rows.push({
            corpus: root.label,
            localPath: row.localPath,
            stage: row.stage,
            status: 'skipped',
            diagnostic: row.diagnostic,
          });
        }
      }
    }
    for (const file of files) {
      const localPath = relative(root.dir, file);
      const source = await readFile(file, 'utf8');
      if (!isStrategySource(source)) {
        continue;
      }
      if (!reportRows) {
        strategies++;
      }
      rows.push(await checkStrategySource(root.label, localPath, source, bars, requestDatafeed));
    }
  }

  const skippedByStage: Record<string, number> = {};
  for (const row of rows) {
    if (row.status === 'skipped') {
      skippedByStage[row.stage] = (skippedByStage[row.stage] ?? 0) + 1;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    roots,
    summary: {
      discoveredScripts,
      strategies,
      executableStrategies: rows.filter((row) => row.stage === 'invariant').length,
      coherentStrategies: rows.filter((row) => row.stage === 'invariant' && row.status === 'passed').length,
      violatedStrategies: rows.filter((row) => row.stage === 'invariant' && row.status === 'failed').length,
      skippedByStage,
    },
    rows,
  };
}

async function readReportStrategyRows(reportPath: string): Promise<Array<{
  localPath: string;
  executable: boolean;
  stage: StrategyInvariantRow['stage'];
  diagnostic?: string;
}>> {
  const report = JSON.parse(await readFile(reportPath, 'utf8')) as {
    rows?: Array<{
      localPath?: string;
      declarationKind?: string;
      stages?: Record<string, { status?: string; diagnostic?: string }>;
      firstFailedStage?: StrategyInvariantRow['stage'] | null;
    }>;
  };
  return (report.rows ?? [])
    .filter((row): row is {
      localPath: string;
      declarationKind?: string;
      stages?: Record<string, { status?: string; diagnostic?: string }>;
      firstFailedStage?: StrategyInvariantRow['stage'] | null;
    } => row.declarationKind === 'strategy' && typeof row.localPath === 'string')
    .map((row) => {
      const executable = row.stages?.execute?.status === 'passed';
      const stage = executable ? 'invariant' : row.firstFailedStage ?? 'execute';
      return {
        localPath: row.localPath,
        executable,
        stage,
        diagnostic: executable ? undefined : row.stages?.[stage]?.diagnostic,
      };
    });
}

async function checkStrategySource(
  corpus: string,
  localPath: string,
  source: string,
  bars: ReturnType<typeof createStandardCorpusBars>,
  requestDatafeed: SyntheticExternalCorpusRequestDatafeed,
): Promise<StrategyInvariantRow> {
  let ast: Program;
  try {
    ast = parse(source);
  } catch (error) {
    return skippedRow(corpus, localPath, 'parse', error);
  }

  const libraries = buildHostLibraryRegistry(ast);
  const semantic = checkProgram(ast, { libraries });
  const semanticError = semantic.diagnostics.find((diagnostic) => diagnostic.severity === 'error');
  if (semanticError) {
    return {
      corpus,
      localPath,
      stage: 'semantic',
      status: 'skipped',
      diagnostic: `${semanticError.line ?? '?'}:${semanticError.column ?? '?'} ${semanticError.code}: ${semanticError.message}`,
    };
  }

  const compiled = tryCompile(ast, undefined, { libraries });
  if (!compiled.success) {
    return {
      corpus,
      localPath,
      stage: 'compile',
      status: 'skipped',
      diagnostic: compiled.unsupported.join('; ') || 'compiled backend did not support script',
    };
  }

  const result = executeCompiled(compiled, bars, undefined, { requestDatafeed, libraries });
  if (!result || result.errors.length > 0) {
    return {
      corpus,
      localPath,
      stage: 'execute',
      status: 'skipped',
      diagnostic: result?.errors.map((error) => error.message).join('; ') || 'compiled execution returned no result',
    };
  }

  const violations = validateStrategyLedgerInvariants(result.strategy);
  return {
    corpus,
    localPath,
    stage: 'invariant',
    status: violations.length === 0 ? 'passed' : 'failed',
    orders: result.strategy.orders.length,
    fills: result.strategy.fills.length,
    openTrades: result.strategy.openTrades.length,
    closedTrades: result.strategy.closedTrades.length,
    equityCurve: result.strategy.equityCurve.length,
    violations: violations.length === 0 ? undefined : violations,
  };
}

function skippedRow(
  corpus: string,
  localPath: string,
  stage: StrategyInvariantRow['stage'],
  error: unknown,
): StrategyInvariantRow {
  return {
    corpus,
    localPath,
    stage,
    status: 'skipped',
    diagnostic: error instanceof Error ? error.message : String(error),
  };
}

async function discoverScripts(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      files.push(...await discoverScripts(fullPath));
    } else if (entry.isFile() && SUPPORTED_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function isStrategySource(source: string): boolean {
  return /^\s*(?:\/\/\s*@version\s*=\s*\d+\s*)?(?:\r?\n\s*)*strategy\s*\(/im.test(source);
}

function buildHostLibraryRegistry(ast: Program): Map<string, Program> {
  const libraries = new Map<string, Program>();
  for (const statement of ast.body) {
    if (statement.type !== 'ImportDeclaration') {
      continue;
    }

    const parsed = parseTradingViewImportPath(statement.path);
    if (!parsed || parsed.owner !== 'TradingView') {
      continue;
    }

    const library = getOfficialTradingViewLibrary(statement.path);
    if (!library?.program) {
      continue;
    }

    libraries.set(statement.alias.name, library.program);
  }
  return libraries;
}

function formatReport(report: StrategyInvariantReport): string {
  const lines: string[] = [
    '# Strategy Ledger Invariant Sweep',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Discovered scripts: ${report.summary.discoveredScripts}`,
    `- Strategy declarations: ${report.summary.strategies}`,
    `- Executable strategies checked: ${report.summary.executableStrategies}`,
    `- Coherent strategies: ${report.summary.coherentStrategies}`,
    `- Violated strategies: ${report.summary.violatedStrategies}`,
    '',
    '## Corpus Roots',
    '',
    ...report.roots.map((root) => `- ${root.label}: ${root.dir}${root.reportPath ? ` (filtered by ${root.reportPath})` : ''}`),
    '',
    '## Skips',
    '',
  ];

  const skipEntries = Object.entries(report.summary.skippedByStage);
  if (skipEntries.length === 0) {
    lines.push('- None');
  } else {
    for (const [stage, count] of skipEntries) {
      lines.push(`- ${stage}: ${count}`);
    }
  }

  const failures = report.rows.filter((row) => row.status === 'failed');
  lines.push('', '## Violations', '');
  if (failures.length === 0) {
    lines.push('- None');
  } else {
    for (const row of failures) {
      lines.push(`### ${row.corpus}/${row.localPath}`);
      for (const violation of row.violations ?? []) {
        lines.push(`- ${violation.invariant} at ${violation.path}: expected ${violation.expected}, got ${violation.actual}. ${violation.message}`);
      }
    }
  }

  return lines.join('\n');
}

function resolveOutputPath(outputPath: string): string {
  if (outputPath.startsWith('packages/')) {
    return resolve(REPO_ROOT, outputPath);
  }
  return resolve(outputPath);
}

function printUsage(): void {
  console.log([
    'Usage:',
    '  tsx scripts/check-strategy-ledger-invariants.ts --corpus v5=/path/to/sources --report v5=/path/to/report.json --output reports/strategy-ledger-invariants.md',
  ].join('\n'));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
