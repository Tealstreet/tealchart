#!/usr/bin/env tsx

import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

interface IntegrityReport {
  commit: string;
  generatedAt: string;
  rows: IntegrityRow[];
}

interface IntegrityRow {
  kind: string;
  member: string;
  param?: string;
  liveSyntax?: string[];
  note: string;
}

interface CorpusMemberDepth {
  measuredCommit: string;
  rankedRows: CorpusMemberRow[];
}

interface CorpusMemberRow {
  member: string;
  corpusScriptCount: number;
  corpusReferenceCount: number;
  corpusCallSiteCount: number;
  sampleCorpusHits?: string[];
}

interface OptionalArgumentUsage {
  measuredCommit: string;
  rankedSlots: OptionalSlotRow[];
}

interface OptionalSlotRow {
  member: string;
  param: string;
  slot: string;
  scriptCount: number;
  hitCount: number;
  sampleHits?: SampleHit[];
}

interface SampleHit {
  corpus: string;
  localPath: string;
  line?: number;
  form?: string;
}

interface PriorityRow {
  kind: string;
  member: string;
  param?: string;
  candidates: string[];
  scriptCount: number;
  hitCount: number;
  slotScriptCount: number;
  slotHitCount: number;
  memberScriptCount: number;
  memberHitCount: number;
  sampleHits: SampleHit[];
  note: string;
}

const packageRoot = resolve(dirname(dirname(new URL(import.meta.url).pathname)));
const integrityPath = join(packageRoot, 'reports/pine-v6-reference-snapshot-integrity-v1.json');
const memberDepthPath = join(packageRoot, 'reports/pine-corpus-vector-depth-gap-v1.json');
const optionalUsagePath = join(packageRoot, 'reports/pine-corpus-optional-argument-usage-v1.json');
const outJson = join(packageRoot, 'reports/pine-v6-reference-drift-corpus-priority-v1.json');
const outMd = join(packageRoot, 'reports/pine-v6-reference-drift-corpus-priority-v1.md');

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

function normalizeMemberName(name: string): string {
  return name.replace(/<[^>]+>/g, '');
}

function candidateMembers(row: IntegrityRow): string[] {
  const candidates = new Set<string>([normalizeMemberName(row.member)]);
  for (const syntax of row.liveSyntax ?? []) {
    const match = /^([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?)(?:<[^>]+>)?\(/.exec(syntax);
    if (match?.[1]) candidates.add(normalizeMemberName(match[1]));
  }
  return [...candidates];
}

function bestMemberExposure(candidates: readonly string[], memberRows: Map<string, CorpusMemberRow>): CorpusMemberRow | undefined {
  return candidates
    .map((candidate) => memberRows.get(candidate))
    .filter((row): row is CorpusMemberRow => !!row)
    .sort((a, b) => b.corpusScriptCount - a.corpusScriptCount || b.corpusReferenceCount - a.corpusReferenceCount)[0];
}

function sampleFromMemberDepth(value: string): SampleHit {
  const [corpus, localPath] = value.split(':');
  return { corpus: corpus ?? '', localPath: localPath ?? value };
}

function firstSamples(...groups: (SampleHit[] | undefined)[]): SampleHit[] {
  const result: SampleHit[] = [];
  for (const group of groups) {
    for (const sample of group ?? []) {
      result.push(sample);
      if (result.length >= 3) return result;
    }
  }
  return result;
}

function renderMarkdown(
  rows: PriorityRow[],
  commit: string,
  integrity: IntegrityReport,
  memberDepth: CorpusMemberDepth,
  optionalUsage: OptionalArgumentUsage,
): string {
  const exposed = rows.filter((row) => row.scriptCount > 0);
  const paramRows = rows.filter((row) => row.kind === 'snapshot-param-missing');
  const memberRows = rows.filter((row) => row.kind === 'live-member-missing-from-snapshot');
  const lines = [
    '# Pine v6 Reference Drift Corpus Priority V1',
    '',
    `Generated at ${new Date().toISOString()}. Measured at commit \`${commit.slice(0, 10)}\`.`,
    '',
    '## Method',
    '',
    `Input drift report: \`pine-v6-reference-snapshot-integrity-v1.json\`, measured at \`${integrity.commit.slice(0, 10)}\`.`,
    `Corpus member usage: \`pine-corpus-vector-depth-gap-v1.json\`, measured at \`${memberDepth.measuredCommit.slice(0, 10)}\`. Corpus optional-argument usage: \`pine-corpus-optional-argument-usage-v1.json\`, measured at \`${optionalUsage.measuredCommit.slice(0, 10)}\`.`,
    '',
    'This ranks only the live-documents-but-snapshot-lacks bucket: live members missing from the committed snapshot and live parameters missing from committed snapshot signatures. Method rows are normalized from live syntax, so a live method row named `abs` can rank against corpus member `array.abs`.',
    '',
    '## Headline',
    '',
    `Live-documents-but-snapshot-lacks rows: ${rows.length}.`,
    `Rows with corpus exposure: ${exposed.length}. Rows with zero measured corpus exposure: ${rows.length - exposed.length}.`,
    `Member rows: ${memberRows.length}. Parameter rows: ${paramRows.length}.`,
    '',
    'A live-documented missing row with corpus exposure is the highest-risk direction: it may be a false refusal or missing implementation in code real authors already wrote. A zero-exposure row remains a completeness gap, not an immediate user-impact claim.',
    '',
    '## Ranked Rows',
    '',
    '| Rank | Kind | Member | Param | Scripts | Hits | Candidates | Samples | Note |',
    '| ---: | --- | --- | --- | ---: | ---: | --- | --- | --- |',
  ];

  rows.forEach((row, index) => {
    const samples = row.sampleHits
      .map((sample) => `${sample.corpus}:${sample.localPath}${sample.line ? `:${sample.line}` : ''}${sample.form ? ` (${sample.form})` : ''}`)
      .join('<br>');
    lines.push(`| ${index + 1} | ${row.kind} | \`${row.member}\` | ${row.param ? `\`${row.param}\`` : ''} | ${row.scriptCount} | ${row.hitCount} | ${row.candidates.map((candidate) => `\`${candidate}\``).join(', ')} | ${samples} | ${row.note} |`);
  });

  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: packageRoot, encoding: 'utf8' }).trim();
  const integrity = await readJson<IntegrityReport>(integrityPath);
  const memberDepth = await readJson<CorpusMemberDepth>(memberDepthPath);
  const optionalUsage = await readJson<OptionalArgumentUsage>(optionalUsagePath);
  const memberRows = new Map(memberDepth.rankedRows.map((row) => [row.member, row]));
  const slotRows = new Map(optionalUsage.rankedSlots.map((row) => [row.slot, row]));

  const rows: PriorityRow[] = integrity.rows
    .filter((row) => row.kind === 'live-member-missing-from-snapshot' || row.kind === 'snapshot-param-missing')
    .map((row) => {
      const candidates = candidateMembers(row);
      const memberExposure = bestMemberExposure(candidates, memberRows);
      const slotExposure = row.param
        ? candidates.map((candidate) => slotRows.get(`${candidate}:${row.param}`)).find((slot): slot is OptionalSlotRow => !!slot)
        : undefined;
      return {
        kind: row.kind,
        member: row.member,
        param: row.param,
        candidates,
        scriptCount: slotExposure?.scriptCount ?? memberExposure?.corpusScriptCount ?? 0,
        hitCount: slotExposure?.hitCount ?? memberExposure?.corpusReferenceCount ?? 0,
        slotScriptCount: slotExposure?.scriptCount ?? 0,
        slotHitCount: slotExposure?.hitCount ?? 0,
        memberScriptCount: memberExposure?.corpusScriptCount ?? 0,
        memberHitCount: memberExposure?.corpusReferenceCount ?? 0,
        sampleHits: firstSamples(slotExposure?.sampleHits, memberExposure?.sampleCorpusHits?.map(sampleFromMemberDepth)),
        note: row.note,
      };
    })
    .sort((a, b) => b.scriptCount - a.scriptCount || b.hitCount - a.hitCount || a.member.localeCompare(b.member) || (a.param ?? '').localeCompare(b.param ?? ''));

  await writeFile(outJson, `${JSON.stringify({ generatedAt: new Date().toISOString(), measuredCommit: commit, inputs: { integrityPath, memberDepthPath, optionalUsagePath }, rows }, null, 2)}\n`);
  await writeFile(outMd, renderMarkdown(rows, commit, integrity, memberDepth, optionalUsage));
  console.log(`reference drift corpus priority: ${rows.filter((row) => row.scriptCount > 0).length}/${rows.length} rows have corpus exposure`);
}

void main();
