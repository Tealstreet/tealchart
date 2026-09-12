#!/usr/bin/env tsx

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

import memberMap from '../reports/pine-corpus-member-map-v1.json' with { type: 'json' };
import propertyMap from '../reports/pine-member-property-map-v3.json' with { type: 'json' };
import v7Manifest from '../reports/external-pine-corpus-v7.manifest.json' with { type: 'json' };
import recoveryManifest from '../reports/external-pine-corpus-v7-size-recovery.manifest.json' with { type: 'json' };
import recoveryRun from '../reports/external-pine-corpus-v7-size-recovery.daily-rerun-3c2c00ac84.json' with { type: 'json' };

type RecoveryClass = 'oversized' | 'undersized';

interface RecoveryScript {
  localPath: string;
  sourceRepoUrl: string;
  sourceFilePath: string;
  commitSha: string;
  sourceSha256: string;
  declarationKind: string;
  declaredVersion: number;
  matchedUntouchedMembers: string[];
  recoveryReason: string;
  recoveryClass: RecoveryClass;
  originalBytes: number;
}

interface CorpusRow {
  localPath: string;
  sourceRepoUrl: string;
  sourceFilePath: string;
  commitSha: string;
  firstFailedStage: string | null;
  outcome: string;
  output: { produced: boolean; plots: number; drawings: number; alerts: number; logs: number };
  stages: Record<string, { status: string; diagnostic?: string }>;
  validity: { bucket: string; reason: string };
}

const root = resolve(new URL('../', import.meta.url).pathname);
const recoveryCacheDir = join(root, '.cache/tealscript/pine-corpus-v7-size-recovery-20260911');
const v7CacheDir = join(root, '.cache/tealscript/pine-corpus-v7-20260911');
const outJson = join(root, 'reports/external-pine-corpus-v7-size-recovery-v1.json');
const outMd = join(root, 'reports/external-pine-corpus-v7-size-recovery-v1.md');
const expectedAcceptedV7Rows = 456;
const expectedRecoveryRows = 50;

function currentCommit(): string {
  return execFileSync('git', ['rev-parse', '--short=10', 'HEAD'], { encoding: 'utf8' }).trim();
}

const constructPatterns: Record<string, RegExp> = {
  'array-namespace': /\barray\s*\./,
  'box-namespace': /\bbox\s*\./,
  'chart-point': /\bchart\s*\.\s*point\b/,
  'enum-declaration': /^\s*enum\s+[A-Za-z_]/m,
  'fill-orders-on-standard-ohlc': /\bfill_orders_on_standard_ohlc\s*=/,
  'for-in-loop': /^\s*for\s+\S+\s+in\s+/m,
  'import-declaration': /^\s*import\s+/m,
  'library-declaration': /^\s*library\s*\(/m,
  'map-namespace': /\bmap\s*\./,
  'matrix-namespace': /\bmatrix\s*\./,
  'method-declaration': /^\s*method\s+[A-Za-z_]/m,
  'request-namespace': /\brequest\s*\./,
  'strategy-declaration': /^\s*strategy\s*\(/m,
  'strategy-risk': /\bstrategy\s*\.\s*risk\s*\./,
  'switch-expression': /\bswitch\b/,
  'table-namespace': /\btable\s*\./,
  'type-declaration': /^\s*type\s+[A-Za-z_]/m,
  'varip-declaration': /\bvarip\b/,
};

function stripPineLiteralsAndComments(source: string): string {
  return source
    .replace(/\/\/[^\n\r]*/g, '')
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

function memberPattern(member: string): RegExp {
  const escaped = member
    .split('.')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s*\\.\\s*');
  return new RegExp(`(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`);
}

function officialMembers(): string[] {
  const names = new Set<string>();
  for (const property of (propertyMap as any).properties) names.add(property.member);
  for (const skipped of (propertyMap as any).skippedMembers) names.add(skipped.member);
  for (const row of (memberMap as any).corpusMembers) names.add(row.member);
  for (const member of (memberMap as any).vectorOnlyMembers) names.add(member);
  for (const member of (memberMap as any).exercisedByNothingMembers) names.add(member);
  for (const row of (memberMap as any).corpusOnlyMembers) names.add(typeof row === 'string' ? row : row.member);
  return [...names].sort();
}

async function readSource(baseDir: string, localPath: string): Promise<string> {
  return readFile(join(baseDir, localPath), 'utf8');
}

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(full));
    else files.push(full);
  }
  return files;
}

function matchedMembers(source: string, patterns: Map<string, RegExp>): string[] {
  const stripped = stripPineLiteralsAndComments(source);
  return [...patterns.entries()].filter(([, pattern]) => pattern.test(stripped)).map(([member]) => member).sort();
}

function matchedConstructs(source: string): string[] {
  const stripped = stripPineLiteralsAndComments(source);
  return Object.entries(constructPatterns).filter(([, pattern]) => pattern.test(stripped)).map(([name]) => name).sort();
}

function countBy<T>(values: T[], key: (value: T) => string): Record<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function rowsForClass(rows: CorpusRow[], scriptsByPath: Map<string, RecoveryScript>, recoveryClass: RecoveryClass): CorpusRow[] {
  return rows.filter((row) => scriptsByPath.get(row.localPath)?.recoveryClass === recoveryClass);
}

function funnel(rows: CorpusRow[]): Record<string, number> {
  return {
    total: rows.length,
    parse: rows.filter((row) => row.stages.parse.status === 'passed').length,
    semantic: rows.filter((row) => row.stages.semantic.status === 'passed').length,
    compile: rows.filter((row) => row.stages.compile.status === 'passed').length,
    execute: rows.filter((row) => row.stages.execute.status === 'passed').length,
    output: rows.filter((row) => row.output.produced).length,
  };
}

function table(headers: string[], rows: string[][]): string {
  const escape = (value: string) => value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escape).join(' | ')} |`),
  ].join('\n');
}

function diagnostic(row: CorpusRow): string {
  if (!row.firstFailedStage) return '';
  return row.stages[row.firstFailedStage]?.diagnostic ?? '';
}

async function main(): Promise<void> {
  const v7Scripts = (v7Manifest as any).scripts as RecoveryScript[];
  if (v7Scripts.length !== expectedAcceptedV7Rows) {
    throw new Error(`Expected ${expectedAcceptedV7Rows} accepted v7 manifest rows, got ${v7Scripts.length}`);
  }
  const members = officialMembers();
  const memberPatterns = new Map(members.map((member) => [member, memberPattern(member)]));
  const existingMemberNames = new Set<string>();
  for (const row of (memberMap as any).corpusMembers) existingMemberNames.add(row.member);
  for (const script of v7Scripts) {
    for (const member of matchedMembers(await readSource(v7CacheDir, script.localPath), memberPatterns)) {
      existingMemberNames.add(member);
    }
  }

  const recoveryScripts = (recoveryManifest as any).scripts as RecoveryScript[];
  const recoveryRows = (recoveryRun as any).rows as CorpusRow[];
  if (recoveryScripts.length !== expectedRecoveryRows) {
    throw new Error(`Expected ${expectedRecoveryRows} recovered manifest rows, got ${recoveryScripts.length}`);
  }
  if (recoveryRows.length !== expectedRecoveryRows) {
    throw new Error(`Expected ${expectedRecoveryRows} recovered daily-run rows, got ${recoveryRows.length}`);
  }
  const scriptsByPath = new Map(recoveryScripts.map((script) => [script.localPath, script]));
  const recoveryMembers = new Map<string, string[]>();
  const recoveryConstructs = new Map<string, string[]>();
  const recoveryConstructNames = new Set<string>();
  const oversizedMemberNames = new Set<string>();
  const undersizedMemberNames = new Set<string>();
  for (const script of recoveryScripts) {
    const source = await readSource(recoveryCacheDir, script.localPath);
    const scriptMembers = matchedMembers(source, memberPatterns);
    const scriptConstructs = matchedConstructs(source);
    recoveryMembers.set(script.localPath, scriptMembers);
    recoveryConstructs.set(script.localPath, scriptConstructs);
    for (const member of scriptMembers) {
      if (script.recoveryClass === 'oversized') oversizedMemberNames.add(member);
      else undersizedMemberNames.add(member);
    }
    for (const tag of scriptConstructs) recoveryConstructNames.add(tag);
  }

  const v7ConstructNames = new Set<string>();
  for (const file of await listFiles(join(v7CacheDir, 'sources'))) {
    const source = await readFile(file, 'utf8');
    for (const tag of matchedConstructs(source)) v7ConstructNames.add(tag);
  }

  const newlyCorpusTouchedMembers = [...new Set([...oversizedMemberNames, ...undersizedMemberNames])]
    .filter((member) => !existingMemberNames.has(member))
    .sort();
  const newConstructTagsVsAcceptedV7 = [...recoveryConstructNames].filter((tag) => !v7ConstructNames.has(tag)).sort();
  const classRows = {
    oversized: rowsForClass(recoveryRows, scriptsByPath, 'oversized'),
    undersized: rowsForClass(recoveryRows, scriptsByPath, 'undersized'),
  };
  const tealscriptGapRows = recoveryRows.filter((row) => row.validity.bucket === 'tealscript-gap');
  const hostRequiredRows = tealscriptGapRows.filter((row) => /fill_orders_on_standard_ohlc|host-supplied standard OHLC/.test(diagnostic(row) || row.validity.reason));

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    measuredCommit: currentCommit(),
    sourceReports: {
      rejectionAudit: 'external-pine-corpus-v7.rejection-audit-v1.json',
      recoveredManifest: 'external-pine-corpus-v7-size-recovery.manifest.json',
      dailyRun: 'external-pine-corpus-v7-size-recovery.daily-rerun-3c2c00ac84.json',
      historicalMemberMap: 'pine-corpus-member-map-v1.json',
    },
    caveats: [
      'The v7 rejection audit replay reconstructed candidate reasons because the original harvest manifest did not store per-candidate rejection records.',
      'Member novelty is checked against the v5/v6 corpus member map plus a direct scan of the accepted v7 source cache. Construct novelty is heuristic and only compared against the accepted v7 source cache because no v5/v6 construct census exists.',
      'The runner validity bucket is measurement output, not a defended ownership handoff audit. Host-required rows are called out separately when the diagnostic already identifies host-only context.',
    ],
    summary: {
      recoveredScripts: recoveryScripts.length,
      oversized: classRows.oversized.length,
      undersized: classRows.undersized.length,
      producedOutput: recoveryRows.filter((row) => row.output.produced).length,
      oversizedProducedOutput: classRows.oversized.filter((row) => row.output.produced).length,
      undersizedProducedOutput: classRows.undersized.filter((row) => row.output.produced).length,
      newlyCorpusTouchedOfficialMembers: newlyCorpusTouchedMembers.length,
      newConstructTagsVsAcceptedV7: newConstructTagsVsAcceptedV7.length,
      runnerTealscriptGapRows: tealscriptGapRows.length,
      hostRequiredWithinRunnerGapRows: hostRequiredRows.length,
    },
    byClass: {
      oversized: {
        scripts: classRows.oversized.length,
        funnel: funnel(classRows.oversized),
        validity: countBy(classRows.oversized, (row) => row.validity.bucket),
        firstFailedStage: countBy(classRows.oversized.filter((row) => row.firstFailedStage), (row) => row.firstFailedStage!),
        officialMembersTouched: oversizedMemberNames.size,
        newlyCorpusTouchedOfficialMembers: [...oversizedMemberNames].filter((member) => !existingMemberNames.has(member)).sort(),
      },
      undersized: {
        scripts: classRows.undersized.length,
        funnel: funnel(classRows.undersized),
        validity: countBy(classRows.undersized, (row) => row.validity.bucket),
        firstFailedStage: countBy(classRows.undersized.filter((row) => row.firstFailedStage), (row) => row.firstFailedStage!),
        officialMembersTouched: undersizedMemberNames.size,
        newlyCorpusTouchedOfficialMembers: [...undersizedMemberNames].filter((member) => !existingMemberNames.has(member)).sort(),
      },
    },
    coverage: {
      recoveredOfficialMembers: [...new Set([...oversizedMemberNames, ...undersizedMemberNames])].sort(),
      newlyCorpusTouchedOfficialMembers: newlyCorpusTouchedMembers,
      targetedPreviouslyUntouchedMembers: [...new Set(recoveryScripts.flatMap((script) => script.matchedUntouchedMembers))].sort(),
      newConstructTagsVsAcceptedV7,
      constructTagsInRecoveredSet: [...recoveryConstructNames].sort(),
    },
    tealscriptGapRows: tealscriptGapRows.map((row) => {
      const script = scriptsByPath.get(row.localPath)!;
      return {
        recoveryClass: script.recoveryClass,
        localPath: row.localPath,
        sourceRepoUrl: row.sourceRepoUrl,
        sourceFilePath: row.sourceFilePath,
        commitSha: row.commitSha,
        declaredVersion: script.declaredVersion,
        firstFailedStage: row.firstFailedStage,
        diagnostic: diagnostic(row),
        runnerReason: row.validity.reason,
        matchedUntouchedMembers: script.matchedUntouchedMembers,
        officialMembers: recoveryMembers.get(row.localPath),
        constructs: recoveryConstructs.get(row.localPath),
      };
    }),
    rows: recoveryRows.map((row) => {
      const script = scriptsByPath.get(row.localPath)!;
      return {
        recoveryClass: script.recoveryClass,
        localPath: row.localPath,
        sourceRepoUrl: row.sourceRepoUrl,
        sourceFilePath: row.sourceFilePath,
        commitSha: row.commitSha,
        declaredVersion: script.declaredVersion,
        byteSize: script.originalBytes,
        producedOutput: row.output.produced,
        outcome: row.outcome,
        firstFailedStage: row.firstFailedStage,
        validity: row.validity,
        diagnostic: diagnostic(row),
        matchedUntouchedMembers: script.matchedUntouchedMembers,
        officialMembers: recoveryMembers.get(row.localPath),
        constructs: recoveryConstructs.get(row.localPath),
      };
    }),
  };

  const md = [
    '# External Pine Corpus V7 Size-Recovery Report',
    '',
    `Generated at ${report.generatedAt}. Measured at commit \`${report.measuredCommit}\`.`,
    '',
    '## Headline',
    '',
    'The size filter was discarding usable Pine. Recovering the 50 suspect rows produced 27 visible-output scripts. The oversized half is valuable: 10/24 produced output and the remaining failures include 5 closed-host TradingView-library imports, 6 invalid Pine rows, and 3 runner-labeled TealScript gaps. The undersized half is mostly cheap fixture evidence: 17/26 produced output, 5 are correct no-output snippets, and 4 are runner-labeled TealScript gaps.',
    '',
    `The recovered set does **not** add a new official member beyond the accepted v5/v6/v7 corpus surface. It retouches ${report.coverage.targetedPreviouslyUntouchedMembers.length} members that v7 already reached, so its value is extra acceptance/execution evidence, not expansion of the official-member frontier.`,
    '',
    'The 180,000-byte ceiling has been removed from `harvest-external-pine-corpus-v7.ts`; byte size remains measurement metadata, not a validity filter. The 120-byte floor was removed for the same reason.',
    '',
    '## Funnel',
    '',
    table(
      ['Class', 'Scripts', 'Parse', 'Semantic', 'Compile', 'Execute', 'Output', 'Validity'],
      (['oversized', 'undersized'] as const).map((name) => {
        const bucket = report.byClass[name];
        return [
          name,
          String(bucket.scripts),
          String(bucket.funnel.parse),
          String(bucket.funnel.semantic),
          String(bucket.funnel.compile),
          String(bucket.funnel.execute),
          String(bucket.funnel.output),
          Object.entries(bucket.validity).map(([key, value]) => `${key} ${value}`).join(', '),
        ];
      }),
    ),
    '',
    '## Coverage',
    '',
    `Recovered official members touched: ${report.coverage.recoveredOfficialMembers.length}.`,
    '',
    `By class: oversized ${report.byClass.oversized.officialMembersTouched}, undersized ${report.byClass.undersized.officialMembersTouched}.`,
    '',
    `New official members versus v5/v6 plus accepted v7: ${report.coverage.newlyCorpusTouchedOfficialMembers.length}.`,
    '',
    `The undersized half adds ${report.byClass.undersized.newlyCorpusTouchedOfficialMembers.length} new official members, so it should not be used to pad the corpus unless its fixture-style rows are wanted as regression evidence.`,
    '',
    `Targeted previously-untouched members retouched by recovery: ${report.coverage.targetedPreviouslyUntouchedMembers.join(', ')}.`,
    '',
    `Heuristic construct tags not seen in accepted v7 cache: ${report.coverage.newConstructTagsVsAcceptedV7.length ? report.coverage.newConstructTagsVsAcceptedV7.join(', ') : 'none'}.`,
    '',
    '## Runner-Labeled Gaps',
    '',
    table(
      ['Class', 'Stage', 'Source', 'Version', 'Members', 'Diagnostic'],
      report.tealscriptGapRows.map((row) => [
        row.recoveryClass,
        row.firstFailedStage ?? '',
        `${row.sourceRepoUrl}/${row.sourceFilePath}`,
        String(row.declaredVersion),
        row.matchedUntouchedMembers.join(', '),
        row.diagnostic || row.runnerReason,
      ]),
    ),
    '',
    'One runner-labeled semantic row is the already-known host-required `fill_orders_on_standard_ohlc=true` case, not a direct implementation handoff from this report.',
    '',
    '## Caveats',
    '',
    ...report.caveats.map((caveat) => `- ${caveat}`),
    '',
  ].join('\n');

  await writeFile(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(outMd, md, 'utf8');
  process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
