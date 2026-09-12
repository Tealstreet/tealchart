#!/usr/bin/env tsx

import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';

interface HelperAuditRow {
  id: string;
  helpers: string[];
  officialMembers: string[];
  provenance: string;
  risk: string;
  reasons: string[];
  rule?: string;
}

interface HelperAudit {
  measuredCommitSha: string;
  summary: {
    genericDocCitedRows: number;
  };
  helperRanking: Array<{
    helper: string;
    runtimeChangeEvidence: string;
  }>;
  helperRows: HelperAuditRow[];
}

interface CorpusDepthRow {
  member: string;
  corpusScriptCount: number;
  corpusReferenceCount: number;
  corpusCallSiteCount: number;
  vectorCaseCount: number;
  sampleCorpusHits: string[];
}

interface CorpusDepthReport {
  measuredCommit: string;
  rankedRows: CorpusDepthRow[];
}

interface PriorityRow {
  rank: number;
  id: string;
  helper: string;
  member: string;
  runtimeChangedFamily: boolean;
  runtimeChangeEvidence: string;
  corpusScriptCount: number;
  corpusCallSiteCount: number;
  corpusReferenceCount: number;
  vectorCaseCount: number;
  priorityScore: number;
  reasons: string[];
  sampleCorpusHits: string[];
}

const packageRoot = resolve(dirname(dirname(new URL(import.meta.url).pathname)));
const helperAuditPath = join(packageRoot, 'reports/pine-value-vector-helper-provenance-audit-v1.json');
const depthGapPath = join(packageRoot, 'reports/pine-corpus-vector-depth-gap-v1.json');
const outJson = join(packageRoot, 'reports/pine-value-vector-helper-backfill-priority-v1.json');
const outMd = join(packageRoot, 'reports/pine-value-vector-helper-backfill-priority-v1.md');

const helperToPrimaryMember: Record<string, string> = {
  accdist: 'ta.accdist',
  alma: 'ta.alma',
  anchoredVwapBands: 'ta.vwap',
  atr: 'ta.atr',
  bollingerBands: 'ta.bb',
  bollingerWidth: 'ta.bbw',
  cci: 'ta.cci',
  chandelier: 'ta.highest',
  cmo: 'ta.cmo',
  cog: 'ta.cog',
  dema: 'ta.ema',
  dmi: 'ta.dmi',
  donchian: 'ta.highest',
  ema: 'ta.ema',
  emaValues: 'ta.ema',
  highest: 'ta.highest',
  highestBars: 'ta.highestbars',
  hma: 'ta.hma',
  keltner: 'ta.kc',
  keltnerWidth: 'ta.kcw',
  kst: 'ta.roc',
  linreg: 'ta.linreg',
  lowest: 'ta.lowest',
  lowestBars: 'ta.lowestbars',
  macd: 'ta.macd',
  median: 'ta.median',
  mfi: 'ta.mfi',
  mfiFromSource: 'ta.mfi',
  obvWithSourceVolume: 'ta.obv',
  percentagePriceOscillator: 'ta.ema',
  rma: 'ta.rma',
  rocValues: 'ta.roc',
  rsi: 'ta.rsi',
  sma: 'ta.sma',
  smaValues: 'ta.sma',
  stdev: 'ta.stdev',
  stdevUnbiased: 'ta.stdev',
  stochastic: 'ta.stoch',
  supertrend: 'ta.supertrend',
  swma: 'ta.swma',
  tema: 'ta.ema',
  tripleExponentialAverageOscillator: 'ta.ema',
  tsi: 'ta.tsi',
  variance: 'ta.variance',
  varianceUnbiased: 'ta.variance',
  williamsR: 'ta.wpr',
  wma: 'ta.wma',
  wmaValues: 'ta.wma',
  wvad: 'ta.wvad',
};

function currentCommit(): string {
  return execFileSync('git', ['rev-parse', '--short=10', 'HEAD'], { encoding: 'utf8' }).trim();
}

function workingTreeDirty(): boolean {
  return execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

function percent(part: number, total: number): string {
  return total === 0 ? '0.00%' : `${((part / total) * 100).toFixed(2)}%`;
}

function table(headers: string[], rows: string[][]): string {
  const escape = (value: string) => value.replaceAll('|', '\\|').replaceAll('\n', '<br>');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escape).join(' | ')} |`),
  ].join('\n');
}

function helperChangeEvidence(helperAudit: HelperAudit): Map<string, string> {
  return new Map(helperAudit.helperRanking.map((entry) => [entry.helper, entry.runtimeChangeEvidence]));
}

function isRuntimeChanged(evidence: string): boolean {
  return !evidence.startsWith('No helper-specific runtime-change evidence');
}

function memberFor(row: HelperAuditRow, depthByMember: Map<string, CorpusDepthRow>): string {
  for (const helper of row.helpers) {
    const mapped = helperToPrimaryMember[helper];
    if (mapped) return mapped;
  }
  const explicit = row.officialMembers.find((member) => member.includes('.') && depthByMember.has(member));
  if (explicit) return explicit;
  return row.officialMembers.find((member) => depthByMember.has(member)) ?? '(unmapped)';
}

function priorityScore(row: {
  runtimeChangedFamily: boolean;
  corpusScriptCount: number;
  corpusCallSiteCount: number;
  corpusReferenceCount: number;
}): number {
  return (row.runtimeChangedFamily ? 1_000_000_000 : 0)
    + row.corpusScriptCount * 10_000
    + row.corpusCallSiteCount
    + row.corpusReferenceCount / 100;
}

function buildMarkdown(report: {
  measuredCommitSha: string;
  measuredWorkingTreeDirty: boolean;
  inputs: Record<string, string>;
  summary: Record<string, unknown>;
  rankedRows: PriorityRow[];
  byHelper: Array<Record<string, unknown>>;
}): string {
  return [
    '# Pine Value Vector Helper Backfill Priority v1',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Measured source commit: \`${report.measuredCommitSha}\`${report.measuredWorkingTreeDirty ? ' with this report script/report dirty in the worktree' : ''}.`,
    '',
    '## Purpose',
    '',
    '`pine-value-vector-helper-provenance-audit-v1` left `92` helper-derived value vectors with only broad family/manual citations. This report ranks that backlog; it does not backfill it. The ranking uses the two signals that predicted the extrema-bars failure: whether this helper/member family changed at runtime on this branch, and how many real corpus scripts use the member.',
    '',
    'Existing vectors are not failed by this report. New vectors are guarded separately by the red-first discrimination metadata gate added to `run-pine-value-vectors.ts`.',
    '',
    '## Inputs',
    '',
    `- Helper provenance audit: \`${report.inputs.helperAudit}\`.`,
    `- Corpus depth gap report: \`${report.inputs.depthGap}\`.`,
    '',
    '## Method',
    '',
    'Each broad-citation helper row is mapped to its primary official member, scored with runtime-touched families first, then by corpus script count, call-site count, and reference count. The score is `runtimeChanged ? 1,000,000,000 : 0` plus `scripts * 10,000 + callSites + references / 100`.',
    '',
    'A broad family-level doc link is not treated as a formula citation. A local helper is a second implementation until the vector cites a concrete published formula, reference composition, or manual-specified result.',
    '',
    '## Headline',
    '',
    `- Broad-citation helper rows ranked: ${report.summary.rankedRows}.`,
    `- Runtime-changed family rows: ${report.summary.runtimeChangedRows} (${report.summary.runtimeChangedPercent}).`,
    `- Distinct helpers: ${report.summary.distinctHelpers}.`,
    `- Distinct primary members: ${report.summary.distinctPrimaryMembers}.`,
    '',
    '## Ranked Rows',
    '',
    table(
      ['Rank', 'Case', 'Helper', 'Member', 'Runtime-changed', 'Corpus scripts', 'Call sites', 'Vector cases', 'Evidence'],
      report.rankedRows.map((row) => [
        String(row.rank),
        `\`${row.id}\``,
        `\`${row.helper}\``,
        `\`${row.member}\``,
        row.runtimeChangedFamily ? 'yes' : 'no',
        String(row.corpusScriptCount),
        String(row.corpusCallSiteCount),
        String(row.vectorCaseCount),
        row.runtimeChangedFamily ? row.runtimeChangeEvidence : 'No helper-specific runtime-change evidence recorded.',
      ]),
    ),
    '',
    '## Helper Summary',
    '',
    table(
      ['Helper', 'Rows', 'Runtime-changed rows', 'Max corpus scripts', 'Primary members', 'Top cases'],
      report.byHelper.map((row) => [
        `\`${row.helper}\``,
        String(row.rows),
        String(row.runtimeChangedRows),
        String(row.maxCorpusScriptCount),
        (row.members as string[]).map((member) => `\`${member}\``).join(', '),
        (row.topCases as string[]).map((id) => `\`${id}\``).join(', '),
      ]),
    ),
    '',
    '## Closed Residuals',
    '',
    '`pine-value-vector-helper-provenance-audit-v1` closed the seven residual known-counterexample/long-float rows before this ranking. Extrema-bars and visual hline were genuinely wrong or stale observed-output oracles and are now corrected. The three long-float strategy rows decompose to documented arithmetic over committed bars, so a long float literal is not automatically evidence that a value was copied from engine output.',
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  const helperAudit = await readJson<HelperAudit>(helperAuditPath);
  const depthGap = await readJson<CorpusDepthReport>(depthGapPath);
  const depthByMember = new Map(depthGap.rankedRows.map((row) => [row.member, row]));
  const evidenceByHelper = helperChangeEvidence(helperAudit);
  const broadRows = helperAudit.helperRows.filter((row) => row.provenance === 'generic-doc-cited');

  if (broadRows.length !== helperAudit.summary.genericDocCitedRows) {
    throw new Error(`Expected ${helperAudit.summary.genericDocCitedRows} broad helper rows, found ${broadRows.length}`);
  }

  const rankedRows = broadRows.map((row) => {
    const helper = row.helpers[0] ?? '(none)';
    const member = memberFor(row, depthByMember);
    const depth = depthByMember.get(member);
    const runtimeChangeEvidence = evidenceByHelper.get(helper) ?? 'No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle.';
    const runtimeChangedFamily = isRuntimeChanged(runtimeChangeEvidence);
    return {
      rank: 0,
      id: row.id,
      helper,
      member,
      runtimeChangedFamily,
      runtimeChangeEvidence,
      corpusScriptCount: depth?.corpusScriptCount ?? 0,
      corpusCallSiteCount: depth?.corpusCallSiteCount ?? 0,
      corpusReferenceCount: depth?.corpusReferenceCount ?? 0,
      vectorCaseCount: depth?.vectorCaseCount ?? 0,
      priorityScore: 0,
      reasons: row.reasons,
      sampleCorpusHits: depth?.sampleCorpusHits ?? [],
    };
  }).map((row) => ({ ...row, priorityScore: priorityScore(row) }))
    .sort((left, right) => right.priorityScore - left.priorityScore || left.id.localeCompare(right.id))
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const byHelperMap = new Map<string, PriorityRow[]>();
  for (const row of rankedRows) {
    const rows = byHelperMap.get(row.helper) ?? [];
    rows.push(row);
    byHelperMap.set(row.helper, rows);
  }
  const byHelper = [...byHelperMap.entries()].map(([helper, rows]) => ({
    helper,
    rows: rows.length,
    runtimeChangedRows: rows.filter((row) => row.runtimeChangedFamily).length,
    maxCorpusScriptCount: Math.max(...rows.map((row) => row.corpusScriptCount)),
    members: [...new Set(rows.map((row) => row.member))],
    topCases: rows.slice(0, 5).map((row) => row.id),
  })).sort((left, right) =>
    Number(right.runtimeChangedRows > 0) - Number(left.runtimeChangedRows > 0)
    || right.maxCorpusScriptCount - left.maxCorpusScriptCount
    || right.rows - left.rows
    || left.helper.localeCompare(right.helper),
  );

  const runtimeChangedRows = rankedRows.filter((row) => row.runtimeChangedFamily).length;
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    measuredCommitSha: currentCommit(),
    measuredWorkingTreeDirty: workingTreeDirty(),
    inputs: {
      helperAudit: `pine-value-vector-helper-provenance-audit-v1.json @ ${helperAudit.measuredCommitSha}`,
      depthGap: `pine-corpus-vector-depth-gap-v1.json @ ${depthGap.measuredCommit}`,
    },
    summary: {
      rankedRows: rankedRows.length,
      runtimeChangedRows,
      runtimeChangedPercent: percent(runtimeChangedRows, rankedRows.length),
      distinctHelpers: new Set(rankedRows.map((row) => row.helper)).size,
      distinctPrimaryMembers: new Set(rankedRows.map((row) => row.member)).size,
      scoring: 'runtimeChanged ? 1,000,000,000 : 0 plus corpusScriptCount * 10,000 plus corpusCallSiteCount plus corpusReferenceCount / 100',
    },
    rankedRows,
    byHelper,
  };

  await writeFile(outJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outMd, buildMarkdown(report));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
