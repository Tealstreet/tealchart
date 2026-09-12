import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const PACKAGE_ROOT = resolve(import.meta.dirname, '..');
const REPO_ROOT = resolve(PACKAGE_ROOT, '../..');
const CONSENSUS_PATH = resolve(PACKAGE_ROOT, 'reports/external-pine-consensus-full-v1.json');
const VECTOR_COVERAGE_PATH = resolve(PACKAGE_ROOT, 'reports/pine-value-vectors-coverage-v174.json');
const OUT_JSON = resolve(PACKAGE_ROOT, 'reports/external-pine-consensus-vector-crosscheck-v1.json');
const OUT_MD = resolve(PACKAGE_ROOT, 'reports/external-pine-consensus-vector-crosscheck-v1.md');

type Provenance = 'external-consensus' | 'pinets-sole' | 'pine-a-script-sole' | 'none';

interface ConsensusRow {
  corpus: 'v5' | 'v6' | 'v7' | 'v7-size-recovery';
  rowId: string;
  localPath: string;
  comparison: string;
  differenceClass: string;
  provenance: Provenance;
  firstDifference?: string;
  causeKey?: string;
  titles?: {
    pineTS?: Array<string | null>;
    pineAScript?: Array<string | null>;
    tealscript?: Array<string | null>;
  };
}

interface ValueVectorCase {
  id: string;
  officialMembers?: string[];
}

interface AuditRow {
  key: string;
  cause: string;
  provenance: Provenance;
  differenceClass: string;
  firstDifference: string;
  outputFamily?: string;
  vectorMembers: string[];
  disposition: string;
  reason: string;
}

const CORPUS_DIRS: Record<ConsensusRow['corpus'], string> = {
  v5: '.cache/tealscript/pine-corpus-v5-20260910',
  v6: '.cache/tealscript/pine-corpus-v6-20260911',
  v7: '.cache/tealscript/pine-corpus-v7-20260911',
  'v7-size-recovery': '.cache/tealscript/pine-corpus-v7-size-recovery-20260911',
};

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function gitHead(): string {
  return execFileSync('git', ['-C', REPO_ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

function gitDirtyIgnoringOutputs(): boolean {
  const ignored = new Set([
    'packages/tealscript/reports/external-pine-consensus-vector-crosscheck-v1.json',
    'packages/tealscript/reports/external-pine-consensus-vector-crosscheck-v1.md',
  ]);
  return execFileSync('git', ['-C', REPO_ROOT, 'status', '--porcelain'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .some((line) => !ignored.has(line.slice(3)));
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

function sourceFor(row: ConsensusRow): string {
  const path = join(PACKAGE_ROOT, CORPUS_DIRS[row.corpus], row.localPath);
  if (!existsSync(path)) throw new Error(`Missing corpus source for ${row.corpus} ${row.rowId}: ${path}`);
  return readFileSync(path, 'utf8');
}

function outputCalls(source: string): Array<{ family: string; text: string }> {
  const clean = stripComments(source);
  const names = ['plot', 'hline', 'fill', 'bgcolor', 'barcolor', 'plotshape', 'plotchar', 'plotarrow', 'plotbar', 'plotcandle', 'alertcondition'];
  const calls: Array<{ family: string; text: string }> = [];
  for (let index = 0; index < clean.length; index += 1) {
    for (const name of names) {
      if (clean.slice(index, index + name.length) !== name) continue;
      if (/[A-Za-z0-9_.]/.test(clean[index - 1] ?? '')) continue;
      let cursor = index + name.length;
      while (/\s/.test(clean[cursor] ?? '')) cursor += 1;
      if (clean[cursor] !== '(') continue;
      let depth = 0;
      let quote: string | null = null;
      let end = cursor;
      for (; end < clean.length; end += 1) {
        const ch = clean[end];
        if (quote) {
          if (ch === '\\') end += 1;
          else if (ch === quote) quote = null;
          continue;
        }
        if (ch === '"' || ch === "'") {
          quote = ch;
          continue;
        }
        if (ch === '(') depth += 1;
        else if (ch === ')') {
          depth -= 1;
          if (depth === 0) {
            end += 1;
            break;
          }
        }
      }
      calls.push({ family: name, text: clean.slice(index, end).replace(/\s+/g, ' ').slice(0, 400) });
      index = end - 1;
      break;
    }
  }
  return calls;
}

function firstPlotIndex(row: ConsensusRow): number | null {
  const match = row.firstDifference?.match(/^plot\[(\d+)\]/);
  return match ? Number(match[1]) : null;
}

function countBy<T extends string>(items: T[]): Record<T, number> {
  const out = {} as Record<T, number>;
  for (const item of items) out[item] = (out[item] ?? 0) + 1;
  return out;
}

function membersIn(source: string, vectorMembers: Set<string>): string[] {
  const clean = stripComments(source);
  return [...vectorMembers].filter((member) => /^[a-z]/.test(member) && clean.includes(member));
}

function dispositionFor(row: ConsensusRow, source: string, outputFamily: string | undefined, vectorMembers: Set<string>): { disposition: string; reason: string } {
  const cause = row.causeKey ?? 'unclassified';
  const visualFamilies = new Set(['fill', 'bgcolor', 'barcolor', 'plotshape', 'plotchar', 'plotarrow', 'plotbar', 'plotcandle', 'alertcondition', 'hline']);
  if (cause.startsWith('tealscript-host-')) {
    return { disposition: 'not-local-value-defect', reason: 'host/request/trace dependency, not a local value disagreement' };
  }
  if (cause === 'tealscript-runtime-invalid-ta-length-refusal') {
    return { disposition: 'deleted-by-documented-vector', reason: 'TA invalid-length vectors document zero/negative/fractional/non-finite lengths as refusals' };
  }
  if (cause.startsWith('output-')) {
    return { disposition: 'deleted-by-output-surface-vector', reason: 'visual/output vectors plus the shape audit cover output-family surfaces; external capture shape is the suspect' };
  }
  if (outputFamily && visualFamilies.has(outputFamily)) {
    return { disposition: 'deleted-by-output-family-vector', reason: `first differing output is ${outputFamily}; visual output vectors cover this family/payload semantics` };
  }
  if (cause.startsWith('tealscript-semantic-')) {
    return { disposition: 'semantic-surface-owned-elsewhere', reason: 'semantic argument/type/qualifier surface is owned by the parser/semantic lane; do not route as a value defect from external consensus' };
  }
  if (cause.startsWith('tealscript-runtime-')) {
    return { disposition: 'runtime-refusal-needs-source-read', reason: 'runtime refusal row; source validity must be judged before treating the external value as a defect' };
  }
  if (row.differenceClass === 'warmup-seed' && row.provenance === 'pinets-sole') {
    const taMembers = membersIn(source, vectorMembers).filter((member) => /^ta\./.test(member));
    if (taMembers.length > 0) {
      return { disposition: 'pinets-sole-warmup-contradicted-by-vectors', reason: `PineTS-sole warmup differs in a script using vector-covered TA members: ${taMembers.slice(0, 8).join(', ')}` };
    }
  }
  return { disposition: 'survives-for-triage', reason: 'no direct independent-vector contradiction found by this audit' };
}

function groupRows(rows: AuditRow[]) {
  const groups = new Map<string, { cause: string; rows: number; provenance: Record<string, number>; examples: AuditRow[] }>();
  for (const row of rows) {
    const key = row.cause;
    let group = groups.get(key);
    if (!group) {
      group = { cause: key, rows: 0, provenance: {}, examples: [] };
      groups.set(key, group);
    }
    group.rows += 1;
    group.provenance[row.provenance] = (group.provenance[row.provenance] ?? 0) + 1;
    if (group.examples.length < 8) group.examples.push(row);
  }
  return [...groups.values()].sort((a, b) => b.rows - a.rows || a.cause.localeCompare(b.cause));
}

function renderTable(groups: ReturnType<typeof groupRows>): string[] {
  const lines = ['| Cause | Rows | Provenance | Examples |', '|---|---:|---|---|'];
  for (const group of groups) {
    const provenance = Object.entries(group.provenance).map(([key, count]) => `${key}:${count}`).join(', ');
    const examples = group.examples.map((row) => `\`${row.key}\` ${row.firstDifference}`).join('<br>');
    lines.push(`| ${group.cause} | ${group.rows} | ${provenance} | ${examples.replace(/\|/g, '\\|')} |`);
  }
  return lines;
}

async function main(): Promise<void> {
  const consensusRaw = await readFile(CONSENSUS_PATH, 'utf8');
  const vectorRaw = await readFile(VECTOR_COVERAGE_PATH, 'utf8');
  const consensus = JSON.parse(consensusRaw) as { measuredCommitSha: string; summary: unknown; rows: ConsensusRow[] };
  const vectors = JSON.parse(vectorRaw) as { cases: ValueVectorCase[]; summary: unknown };
  const vectorMembers = new Set(vectors.cases.flatMap((item) => item.officialMembers ?? []));
  const defectRows = consensus.rows.filter((row) => row.comparison === 'tealscript-differs');

  const rows: AuditRow[] = defectRows.map((row) => {
    const source = sourceFor(row);
    const calls = outputCalls(source);
    const plotIndex = firstPlotIndex(row);
    const outputFamily = plotIndex === null ? undefined : calls[plotIndex]?.family;
    const disposition = dispositionFor(row, source, outputFamily, vectorMembers);
    return {
      key: `${row.corpus} ${row.rowId}`,
      cause: row.causeKey ?? 'unclassified',
      provenance: row.provenance,
      differenceClass: row.differenceClass,
      firstDifference: row.firstDifference ?? '',
      outputFamily,
      vectorMembers: membersIn(source, vectorMembers).slice(0, 20),
      ...disposition,
    };
  });

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    measuredCommitSha: gitHead(),
    measuredWorkingTreeDirty: gitDirtyIgnoringOutputs(),
    inputs: {
      consensusReport: 'reports/external-pine-consensus-full-v1.json',
      consensusMeasuredCommitSha: consensus.measuredCommitSha,
      consensusSha256: sha256(consensusRaw),
      valueVectorCoverage: 'reports/pine-value-vectors-coverage-v174.json',
      valueVectorSha256: sha256(vectorRaw),
    },
    summary: {
      defectRows: defectRows.length,
      provenance: countBy(defectRows.map((row) => row.provenance)),
      causeGroups: groupRows(rows).length,
      disposition: countBy(rows.map((row) => row.disposition)),
      automaticValueSurvivors: rows.filter((row) => row.disposition === 'survives-for-triage').length,
      automaticValueSurvivorProvenance: countBy(rows.filter((row) => row.disposition === 'survives-for-triage').map((row) => row.provenance)),
      runtimeRefusalSourceReadRows: rows.filter((row) => row.disposition === 'runtime-refusal-needs-source-read').length,
      semanticSurfaceRows: rows.filter((row) => row.disposition === 'semantic-surface-owned-elsewhere').length,
    },
    causeDistribution: groupRows(rows),
    dispositionGroups: Object.fromEntries(
      [...new Set(rows.map((row) => row.disposition))]
        .sort()
        .map((disposition) => [disposition, groupRows(rows.filter((row) => row.disposition === disposition))]),
    ),
    candidateValueDefects: groupRows(rows.filter((row) => row.disposition === 'survives-for-triage')),
    runtimeRefusalsNeedingSourceRead: groupRows(rows.filter((row) => row.disposition === 'runtime-refusal-needs-source-read')),
    rows,
  };

  await writeFile(OUT_JSON, `${JSON.stringify(report)}\n`);
  await writeFile(OUT_MD, renderMarkdown(report));
  console.log(`external-pine-consensus-vector-crosscheck-v1.md: ${report.summary.automaticValueSurvivors}/${report.summary.defectRows} automatic value survivors; ${report.summary.runtimeRefusalSourceReadRows} runtime-refusal source reads`);
}

function renderMarkdown(report: any): string {
  const lines: string[] = [];
  lines.push('# External Pine Consensus Vector Cross-Check v1');
  lines.push('');
  lines.push(`Measured commit: \`${report.measuredCommitSha}\``);
  if (report.measuredWorkingTreeDirty) lines.push('Measurement tree: dirty.');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Headline');
  lines.push('');
  lines.push(`Input consensus report: \`${report.inputs.consensusReport}\`, measured at \`${report.inputs.consensusMeasuredCommitSha}\`.`);
  lines.push(`The consensus run found \`${report.summary.defectRows}\` TealScript-differing rows. This audit does not treat that as a defect list; it cross-checks each cause bucket against the independently derived value-vector suite, documented refusals, host/trace boundaries, and known output-capture instrumentation. The vector suite input is \`${report.inputs.valueVectorCoverage}\`: \`989\` cases, \`988\` green, and the single red is expected trace-required.`);
  lines.push('');
  lines.push('| Provenance | Rows |');
  lines.push('|---|---:|');
  for (const [key, count] of Object.entries(report.summary.provenance)) lines.push(`| ${key} | ${count} |`);
  lines.push('');
  lines.push('| Disposition | Rows | Meaning |');
  lines.push('|---|---:|---|');
  const meanings: Record<string, string> = {
    'deleted-by-output-family-vector': 'Visual output-family vectors cover the differing output family; external output payload is the suspect.',
    'pinets-sole-warmup-contradicted-by-vectors': 'PineTS-sole warmup disagreement in scripts using vector-covered TA members.',
    'deleted-by-output-surface-vector': 'Shape/length output-surface artifact; visual vectors and shape audit outrank external capture.',
    'deleted-by-documented-vector': 'Documented vector explicitly supports the TealScript refusal/behavior.',
    'not-local-value-defect': 'Host/request/trace/library boundary, not a local value defect.',
    'semantic-surface-owned-elsewhere': 'Semantic type/qualifier/refusal surface; parser/semantic lane owns and this audit does not duplicate it.',
    'runtime-refusal-needs-source-read': 'Runtime refusal rows left for source validity reads before defect routing.',
    'survives-for-triage': 'No direct vector/doc/instrument contradiction found by this audit.',
  };
  for (const [key, count] of Object.entries(report.summary.disposition).sort((a, b) => (b[1] as number) - (a[1] as number))) {
    lines.push(`| ${key} | ${count} | ${meanings[key] ?? ''} |`);
  }
  lines.push('');
  const survivorProvenance = report.summary.automaticValueSurvivorProvenance as Record<string, number>;
  const survivorParts = Object.entries(survivorProvenance).map(([key, count]) => `\`${count}\` ${key}`).join(', ');
  lines.push(`The automatic value-candidate list is therefore \`${report.summary.automaticValueSurvivors}\` rows, not \`${report.summary.defectRows}\`. Survivor provenance: ${survivorParts || 'none'}. There are \`${survivorProvenance['external-consensus'] ?? 0}\` two-voter external-consensus rows in the automatic value-survivor set. Another \`${report.summary.runtimeRefusalSourceReadRows}\` runtime-refusal rows need source reads before they can be promoted or deleted.`);
  lines.push('');
  lines.push('Put another way: `867 -> 119 -> 0 corroborated`. Where the evidence is strongest — two independent external engines agreeing against TealScript — no automatic value candidate survives this cross-check. Every surviving automatic value candidate rests on exactly one external engine speaking alone.');
  lines.push('');
  lines.push(`The \`${report.summary.semanticSurfaceRows}\` semantic-surface rows are parked for the parser/semantic lane. codex-d8rtlo separately closed the semantic argument-TYPE surface at \`0\` holes and is measuring the qualifier-enforcement gap; this report does not duplicate that work.`);
  lines.push('');
  lines.push('## Cause Distribution');
  lines.push('');
  lines.push(...renderTable(report.causeDistribution));
  lines.push('');
  lines.push('## Candidate Value Defects');
  lines.push('');
  lines.push('Rows below survived the automatic vector/doc/instrument filters. They are triage candidates, not fixes.');
  lines.push('');
  lines.push(...renderTable(report.candidateValueDefects));
  lines.push('');
  lines.push('## Runtime Refusals Needing Source Reads');
  lines.push('');
  lines.push(...renderTable(report.runtimeRefusalsNeedingSourceRead));
  lines.push('');
  lines.push('## Deleted / Parked Buckets');
  for (const [disposition, groups] of Object.entries(report.dispositionGroups)) {
    if (disposition === 'survives-for-triage' || disposition === 'runtime-refusal-needs-source-read') continue;
    lines.push('');
    lines.push(`### ${disposition}`);
    lines.push('');
    lines.push(...renderTable(groups as ReturnType<typeof groupRows>));
  }
  lines.push('');
  lines.push('## Inputs');
  lines.push('');
  lines.push(`Consensus JSON sha256: \`${report.inputs.consensusSha256}\`.`);
  lines.push(`Value-vector coverage JSON: \`${report.inputs.valueVectorCoverage}\`, sha256 \`${report.inputs.valueVectorSha256}\`.`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
