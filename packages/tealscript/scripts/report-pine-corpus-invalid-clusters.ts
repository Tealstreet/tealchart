#!/usr/bin/env tsx

import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';

import v5Manifest from '../reports/external-pine-corpus-v5.manifest.json' with { type: 'json' };
import v6Manifest from '../reports/external-pine-corpus-v6.manifest.json' with { type: 'json' };
import v7GapPool from '../reports/external-pine-corpus-v7.current-gap-pool-bbcbf3d220-v1.json' with { type: 'json' };

interface ManifestScript {
  localPath: string;
  sourceRepoUrl: string;
  sourceFilePath: string;
  commitSha: string;
  sourceSha256?: string;
}

interface InvalidRow {
  corpus: 'v5' | 'v6' | 'v7';
  id: string;
  declaredVersion: number | null;
  stage: string;
  shape: string;
  shapeKind: 'syntax' | 'semantic' | 'runtime' | 'source-incomplete' | 'corpus-fixture' | 'unknown';
  compileEvidence: 'recommended' | 'watch' | 'not-recommended';
  evidence: string;
  diagnostic?: string;
  sourceRepoUrl: string;
  sourceFilePath: string;
  localPath: string;
  commitSha: string;
}

const packageRoot = resolve(dirname(dirname(new URL(import.meta.url).pathname)));
const outJson = join(packageRoot, 'reports/pine-corpus-invalid-clusters-v1.json');
const outMd = join(packageRoot, 'reports/pine-corpus-invalid-clusters-v1.md');
const compileEvidenceMd = join(packageRoot, 'reports/pine-compile-evidence-request-v1.md');
const expectedInvalidRows = { v5: 32, v6: 54, v7: 63 };

function currentCommit(): string {
  return execFileSync('git', ['rev-parse', '--short=10', 'HEAD'], { encoding: 'utf8' }).trim();
}

function manifestById(manifest: any): Map<string, ManifestScript> {
  const map = new Map<string, ManifestScript>();
  for (const script of manifest.scripts as ManifestScript[]) {
    const match = script.localPath.match(/sources\/(\d{4})__/);
    if (match) map.set(match[1], script);
  }
  return map;
}

function repoName(url: string): string {
  const match = url.match(/github\.com\/([^/]+\/[^/#?]+)/);
  return match?.[1] ?? url;
}

function authorName(url: string): string {
  const match = url.match(/github\.com\/([^/]+)/);
  return match?.[1] ?? url;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function v5Shape(text: string): Pick<InvalidRow, 'shape' | 'shapeKind' | 'compileEvidence'> {
  if (text.includes('simple') && text.includes('series values')) {
    return { shape: 'series value passed to simple UDF parameter', shapeKind: 'semantic', compileEvidence: 'watch' };
  }
  if (text.includes('undeclared identifiers')) {
    return { shape: 'standalone source references undeclared identifiers', shapeKind: 'source-incomplete', compileEvidence: 'not-recommended' };
  }
  if (text.includes('camelCase `strategy()` arguments')) {
    return { shape: 'camelCase strategy declaration arguments', shapeKind: 'semantic', compileEvidence: 'recommended' };
  }
  if (text.includes('float/`na` ternary')) {
    return { shape: 'v6 bool assigned float/na ternary', shapeKind: 'semantic', compileEvidence: 'watch' };
  }
  if (text.includes('indicator fixture calls `strategy.entry')) {
    return { shape: 'indicator script calls strategy.entry', shapeKind: 'corpus-fixture', compileEvidence: 'not-recommended' };
  }
  if (text.includes('duplicate `lab` declaration')) {
    return { shape: 'duplicate same-scope value declaration', shapeKind: 'semantic', compileEvidence: 'watch' };
  }
  if (text.includes('empty-array `pop()`')) {
    return { shape: 'empty array pop runtime constraint', shapeKind: 'runtime', compileEvidence: 'not-recommended' };
  }
  if (text.includes('invalid/minimal import fixture')) {
    return { shape: 'malformed import fixture', shapeKind: 'corpus-fixture', compileEvidence: 'not-recommended' };
  }
  if (text.includes('invalid table position')) {
    return { shape: 'invalid table position constant', shapeKind: 'semantic', compileEvidence: 'not-recommended' };
  }
  if (text.includes('matrix pivot loop indexes past')) {
    return { shape: 'matrix loop indexes past collection bounds', shapeKind: 'runtime', compileEvidence: 'not-recommended' };
  }
  if (text.includes('inclusive-loop off-by-one')) {
    return { shape: 'inclusive loop reads array index at size', shapeKind: 'runtime', compileEvidence: 'not-recommended' };
  }
  if (text.includes('script-authored `runtime.error')) {
    return { shape: 'script-authored runtime.error guard', shapeKind: 'runtime', compileEvidence: 'not-recommended' };
  }
  if (text.includes('assigns `x / 2` to `int x`')) {
    return { shape: 'v6 division float assigned to int', shapeKind: 'semantic', compileEvidence: 'watch' };
  }
  if (text.includes('exported parameters inside a `request.security()` expression')) {
    return { shape: 'exported library parameter captured by request.security expression', shapeKind: 'semantic', compileEvidence: 'recommended' };
  }
  return { shape: normalizeWhitespace(text), shapeKind: 'unknown', compileEvidence: 'watch' };
}

function v7Shape(row: any): Pick<InvalidRow, 'shape' | 'shapeKind' | 'compileEvidence'> {
  const construct = row.construct as string;
  if (construct.includes('matrix.sum used as')) return { shape: 'matrix.sum used as zero/one-argument aggregate', shapeKind: 'semantic', compileEvidence: 'recommended' };
  if (construct.includes('table.cell_set_text_wrap')) return { shape: 'table.cell_set_text_wrap helper/member', shapeKind: 'semantic', compileEvidence: 'recommended' };
  if (construct.includes('request.footprint')) return { shape: 'request.footprint one-argument form', shapeKind: 'semantic', compileEvidence: 'recommended' };
  if (construct.includes('numeric enum member values')) return { shape: 'v6 enum fields with numeric values', shapeKind: 'syntax', compileEvidence: 'recommended' };
  if (construct.includes('Pine v6 bool cannot hold na') || construct.includes('float series assigned to bool')) return { shape: 'v6 bool assigned na/float value', shapeKind: 'semantic', compileEvidence: 'watch' };
  if (construct.includes('incompatible matrix/array element types')) return { shape: 'incompatible matrix/array element type fixture', shapeKind: 'corpus-fixture', compileEvidence: 'not-recommended' };
  if (construct.includes('block-local variable used outside')) return { shape: 'block-local variable used outside scope', shapeKind: 'semantic', compileEvidence: 'recommended' };
  if (construct.includes('missing source symbol') || construct.includes('missing MACD input symbols')) return { shape: 'standalone source references undeclared identifiers', shapeKind: 'source-incomplete', compileEvidence: 'not-recommended' };
  if (construct.includes('matrix.add_col dimension mismatch')) return { shape: 'matrix.add_col dimension mismatch', shapeKind: 'runtime', compileEvidence: 'not-recommended' };
  if (construct.includes('hline price is not numeric')) return { shape: 'hline price is not numeric', shapeKind: 'semantic', compileEvidence: 'not-recommended' };
  if (construct.includes('matrix column index')) return { shape: 'matrix column index invalid', shapeKind: 'runtime', compileEvidence: 'not-recommended' };
  if (construct.includes('array cleared before indexed access')) return { shape: 'array cleared before indexed access', shapeKind: 'runtime', compileEvidence: 'not-recommended' };
  if (construct.includes('matrix eigenvalues require') || construct.includes('matrix.det requires') || construct.includes('matrix.eigenvectors require')) return { shape: 'matrix algebra requires square matrix', shapeKind: 'runtime', compileEvidence: 'not-recommended' };
  if (construct.includes('comma-chained import')) return { shape: 'comma-chained import statements', shapeKind: 'syntax', compileEvidence: 'recommended' };
  if (construct.includes('generic input step')) return { shape: 'generic input step argument under v5', shapeKind: 'semantic', compileEvidence: 'recommended' };
  if (construct.includes('strategy.close_all unknown when')) return { shape: 'strategy.close_all when argument', shapeKind: 'semantic', compileEvidence: 'recommended' };
  if (construct.includes('unknown table.cell text_wrap')) return { shape: 'table.cell text_wrap argument', shapeKind: 'semantic', compileEvidence: 'recommended' };
  if (construct.includes('invalid trailing stop offset')) return { shape: 'strategy.exit trail offset without trail price', shapeKind: 'semantic', compileEvidence: 'not-recommended' };
  if (construct.includes('function-call expressions used as tuple lvalues')) return { shape: 'function-call expression used as tuple lvalue', shapeKind: 'syntax', compileEvidence: 'recommended' };
  if (construct.includes('unknown math.cbrt')) return { shape: 'unknown math.cbrt builtin', shapeKind: 'semantic', compileEvidence: 'recommended' };
  return { shape: construct, shapeKind: row.stage === 'parse' ? 'syntax' : row.stage === 'execute' ? 'runtime' : 'semantic', compileEvidence: 'watch' };
}

function normalizeV6Shape(evidence: string): Pick<InvalidRow, 'shape' | 'shapeKind' | 'compileEvidence'> {
  if (evidence.includes('unknown-identifier')) return { shape: 'standalone source references undeclared identifiers', shapeKind: 'source-incomplete', compileEvidence: 'not-recommended' };
  if (evidence.includes('unknown-function: Unknown function: polyline')) return { shape: 'polyline used in declared v5 script', shapeKind: 'semantic', compileEvidence: 'watch' };
  if (evidence.includes('unknown-function: Unknown function: runtime.log')) return { shape: 'unknown runtime.log builtin', shapeKind: 'semantic', compileEvidence: 'recommended' };
  if (evidence.includes('invalid-type-template')) return { shape: 'nested collection template type', shapeKind: 'semantic', compileEvidence: 'recommended' };
  if (evidence.includes('Cannot use udt value as udt array element') || evidence.includes('Cannot use float value as int array element')) return { shape: 'typed array element mismatch', shapeKind: 'semantic', compileEvidence: 'not-recommended' };
  if (evidence.includes('na x cannot be a boolean') || evidence.includes('float/na ternary assigned to bool')) return { shape: 'v6 bool assigned na/float value', shapeKind: 'semantic', compileEvidence: 'watch' };
  if (evidence.includes('series value to simple parameter') || evidence.includes('series value to simple parameter')) return { shape: 'series value passed to simple UDF parameter', shapeKind: 'semantic', compileEvidence: 'watch' };
  if (evidence.includes('Unknown argument') && evidence.includes('strategy()')) return { shape: 'unknown strategy declaration argument', shapeKind: 'semantic', compileEvidence: 'watch' };
  if (evidence.includes('Unknown argument')) return { shape: 'unknown named argument', shapeKind: 'semantic', compileEvidence: 'watch' };
  if (evidence.includes('ta.vwma() expects') || evidence.includes('ta.ao() expects') || evidence.includes('ta.pivothigh() expects')) return { shape: 'TA function arity misuse', shapeKind: 'semantic', compileEvidence: 'not-recommended' };
  if (evidence.includes('str.length source must be a string')) return { shape: 'wrong argument type for builtin', shapeKind: 'semantic', compileEvidence: 'not-recommended' };
  if (evidence.includes('strategy.exit requires')) return { shape: 'strategy.exit without exit price', shapeKind: 'semantic', compileEvidence: 'not-recommended' };
  if (evidence.includes('input.float defval must be greater than or equal to minval')) return { shape: 'input.float defval below minval', shapeKind: 'semantic', compileEvidence: 'not-recommended' };
  if (evidence.includes('alertcondition() must be called from the global scope')) return { shape: 'alertcondition in local scope', shapeKind: 'semantic', compileEvidence: 'not-recommended' };
  if (evidence.includes('Tuple declaration expects')) return { shape: 'tuple branch arity mismatch', shapeKind: 'semantic', compileEvidence: 'not-recommended' };
  if (evidence.includes('Matrix power must be')) return { shape: 'matrix power exponent invalid', shapeKind: 'runtime', compileEvidence: 'not-recommended' };
  if (evidence.includes('Cannot create an array with a negative size')) return { shape: 'negative array size runtime constraint', shapeKind: 'runtime', compileEvidence: 'not-recommended' };
  if (evidence.includes('Array index') && evidence.includes('out of bounds')) return { shape: 'array index out of bounds', shapeKind: 'runtime', compileEvidence: 'not-recommended' };
  if (evidence.includes('Array is too large')) return { shape: 'array maximum size runtime constraint', shapeKind: 'runtime', compileEvidence: 'not-recommended' };
  if (evidence.includes('semicolons are not valid')) return { shape: 'semicolon statement separators', shapeKind: 'syntax', compileEvidence: 'not-recommended' };
  if (evidence.includes('JavaScript-style inline callback')) return { shape: 'JavaScript-style inline callback function', shapeKind: 'syntax', compileEvidence: 'not-recommended' };
  if (evidence.includes('`if` statements do not use `then`')) return { shape: 'if statement uses then keyword', shapeKind: 'syntax', compileEvidence: 'not-recommended' };
  if (evidence.includes('`||` is not valid')) return { shape: 'JavaScript-style logical OR operator', shapeKind: 'syntax', compileEvidence: 'not-recommended' };
  return { shape: normalizeWhitespace(evidence), shapeKind: 'unknown', compileEvidence: 'watch' };
}

function rowFromManifest(corpus: 'v5' | 'v6', id: string, manifest: Map<string, ManifestScript>, shape: Pick<InvalidRow, 'shape' | 'shapeKind' | 'compileEvidence'>, evidence: string): InvalidRow {
  const script = manifest.get(id);
  if (!script) throw new Error(`Missing ${corpus} manifest row ${id}`);
  return {
    corpus,
    id,
    declaredVersion: null,
    stage: shape.shapeKind === 'runtime' ? 'execute' : shape.shapeKind === 'syntax' ? 'parse' : 'semantic',
    ...shape,
    evidence: normalizeWhitespace(evidence),
    sourceRepoUrl: script.sourceRepoUrl,
    sourceFilePath: script.sourceFilePath,
    localPath: script.localPath,
    commitSha: script.commitSha,
  };
}

function parseMarkdownTable(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split(' | ').map((cell) => cell.trim());
}

function groupBy<T>(values: readonly T[], key: (value: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const value of values) {
    const groupKey = key(value);
    const group = groups.get(groupKey) ?? [];
    group.push(value);
    groups.set(groupKey, group);
  }
  return groups;
}

async function collectV5Rows(manifest: Map<string, ManifestScript>): Promise<InvalidRow[]> {
  const text = await readFile(join(packageRoot, 'reports/external-pine-corpus-v5.dispatch-routing-audit-v1.md'), 'utf8');
  const sectionStart = text.split('### Invalid Pine or incomplete corpus sources')[1];
  if (!sectionStart) throw new Error('Missing v5 invalid-Pine section in external-pine-corpus-v5.dispatch-routing-audit-v1.md');
  const section = sectionStart.split('## Already Fixed')[0];
  const rows: InvalidRow[] = [];
  for (const line of section.split('\n').filter((row) => row.startsWith('- `'))) {
    const ids = [...line.matchAll(/`(\d{4})`/g)].map((match) => match[1]);
    const evidence = line.replace(/^- /, '');
    const shape = v5Shape(evidence);
    for (const id of ids) rows.push(rowFromManifest('v5', id, manifest, shape, evidence));
  }
  return rows;
}

async function collectV6Rows(manifest: Map<string, ManifestScript>): Promise<InvalidRow[]> {
  const text = await readFile(join(packageRoot, 'reports/external-pine-corpus-v6.current-gap-pool-a75ebd88d7-v1.md'), 'utf8');
  const section = text.split('## Row Classification')[1];
  if (!section) throw new Error('Missing v6 row classification section in external-pine-corpus-v6.current-gap-pool-a75ebd88d7-v1.md');
  const rows: InvalidRow[] = [];
  for (const line of section.split('\n').filter((row) => row.startsWith('| ') && !row.includes('---') && !row.startsWith('| Row'))) {
    const [id, version, _kind, stage, bucket, _owner, evidence] = parseMarkdownTable(line);
    if (bucket !== 'invalid-pine') continue;
    const shape = normalizeV6Shape(evidence);
    const row = rowFromManifest('v6', id, manifest, shape, evidence);
    row.declaredVersion = Number(version.replace(/^v/, ''));
    row.stage = stage;
    const diag = evidence.match(/; (.*)$/)?.[1];
    if (diag) row.diagnostic = diag;
    rows.push(row);
  }
  return rows;
}

function collectV7Rows(): InvalidRow[] {
  return ((v7GapPool as any).rows as any[])
    .filter((row) => row.bucket === 'invalid-pine')
    .map((row) => ({
      corpus: 'v7',
      id: row.id,
      declaredVersion: row.declaredVersion,
      stage: row.stage,
      ...v7Shape(row),
      evidence: row.evidence,
      diagnostic: row.diagnostic,
      sourceRepoUrl: row.sourceRepoUrl,
      sourceFilePath: row.sourceFilePath,
      localPath: `sources/${row.id}`,
      commitSha: row.commitSha,
    }));
}

function assertExpectedRowCount(corpus: keyof typeof expectedInvalidRows, rows: readonly InvalidRow[]): void {
  const expected = expectedInvalidRows[corpus];
  if (rows.length !== expected) {
    throw new Error(`${corpus} expected ${expected} invalid-Pine rows from the source audit, got ${rows.length}`);
  }
}

function table(headers: string[], rows: string[][]): string {
  const escape = (value: string) => value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escape).join(' | ')} |`),
  ].join('\n');
}

async function updateCompileEvidenceRequest(clusters: any[]): Promise<void> {
  const existing = await readFile(compileEvidenceMd, 'utf8');
  const marker = '## Priority 5: Invalid-Pine Cluster Acceptance Questions';
  const before = existing.includes(marker) ? existing.slice(0, existing.indexOf(marker)).trimEnd() : existing.trimEnd();
  const candidates = clusters.filter((cluster) => cluster.compileEvidencePriority === 'recommended');
  const watch = clusters.filter((cluster) => cluster.compileEvidencePriority === 'watch' && cluster.rows.some((row: InvalidRow) => row.compileEvidence === 'recommended'));
  const rowsFor = (shape: string): InvalidRow[] => clusters.find((cluster) => cluster.shape === shape)?.rows ?? [];
  const section = [
    marker,
    '',
    'These questions come from `pine-corpus-invalid-clusters-v1.md`: rows previously classified invalid Pine, clustered by repeated shape and independent repos. They are acceptance checks only; rejected means the invalid classification holds.',
    '',
    '### Q5A: `request.footprint()` one-argument form',
    '',
    'Rows settled if accepted/rejected:',
    '',
    ...rowsFor('request.footprint one-argument form').map((row) => `- v7 invalid cluster: \`${row.id}\` (${repoName(row.sourceRepoUrl)})`),
    '',
    'Paste:',
    '',
    '```pine',
    '//@version=6',
    'indicator("compile evidence footprint arity")',
    'fp = request.footprint(10)',
    'plot(footprint.total_volume(fp))',
    '```',
    '',
    'Accepted means `request.footprint` has a legal one-argument overload. Rejected confirms the cluster is invalid Pine.',
    '',
    '### Q5B: `matrix.sum()` zero/one-argument aggregate forms',
    '',
    'Rows settled if accepted/rejected:',
    '',
    ...rowsFor('matrix.sum used as zero/one-argument aggregate').map((row) => `- v7 invalid cluster: \`${row.id}\` (${repoName(row.sourceRepoUrl)})`),
    '',
    'Paste:',
    '',
    '```pine',
    '//@version=6',
    'indicator("compile evidence matrix sum arity")',
    'm = matrix.new<float>(2, 2, 1.0)',
    'plot(matrix.sum(m))',
    '```',
    '',
    'Accepted means TealScript is missing a legal aggregate overload. Rejected confirms that the repeated v7 rows are invalid Pine.',
    '',
    '### Cluster Ranking',
    '',
    table(
      ['Shape', 'Rows', 'Repos', 'Authors', 'Priority'],
      candidates.map((cluster) => [
        cluster.shape,
        String(cluster.rowCount),
        String(cluster.distinctRepoCount),
        String(cluster.distinctAuthorCount),
        cluster.compileEvidencePriority,
      ]),
    ),
    '',
    '### Lower-Independence Watch',
    '',
    'These shapes look acceptance-like but are concentrated in one repo or otherwise lack independent-source support. They should be pasted only after the multi-repo questions above, or if nearby compile evidence is already being collected.',
    '',
    table(
      ['Shape', 'Rows', 'Repos', 'Authors', 'Why not promoted'],
      watch.map((cluster) => [
        cluster.shape,
        String(cluster.rowCount),
        String(cluster.distinctRepoCount),
        String(cluster.distinctAuthorCount),
        cluster.distinctRepoCount < 2 ? 'single source/repo family' : 'lower-frequency acceptance shape',
      ]),
    ),
    '',
  ].join('\n');
  await writeFile(compileEvidenceMd, `${before}\n\n${section}`, 'utf8');
}

async function main(): Promise<void> {
  const v5ById = manifestById(v5Manifest);
  const v6ById = manifestById(v6Manifest);
  const v5Rows = await collectV5Rows(v5ById);
  const v6Rows = await collectV6Rows(v6ById);
  const v7Rows = collectV7Rows();
  assertExpectedRowCount('v5', v5Rows);
  assertExpectedRowCount('v6', v6Rows);
  assertExpectedRowCount('v7', v7Rows);
  const invalidRows = [
    ...v5Rows,
    ...v6Rows,
    ...v7Rows,
  ];

  const clusters = [...groupBy(invalidRows, (row) => row.shape).entries()].map(([shape, rows]) => {
    const repos = [...new Set(rows.map((row) => repoName(row.sourceRepoUrl)))].sort();
    const authors = [...new Set(rows.map((row) => authorName(row.sourceRepoUrl)))].sort();
    const stages = Object.fromEntries([...groupBy(rows, (row) => row.stage).entries()].map(([stage, stageRows]) => [stage, stageRows.length]).sort());
    const corpora = Object.fromEntries([...groupBy(rows, (row) => row.corpus).entries()].map(([corpus, corpusRows]) => [corpus, corpusRows.length]).sort());
    const intrinsicRecommendation = rows.some((row) => row.compileEvidence === 'recommended');
    const enoughIndependence = rows.length >= 4 && repos.length >= 2;
    const compileEvidencePriority = intrinsicRecommendation && enoughIndependence ? 'recommended' : rows.some((row) => row.compileEvidence === 'watch' || row.compileEvidence === 'recommended') ? 'watch' : 'not-recommended';
    return {
      shape,
      shapeKind: rows[0].shapeKind,
      rowCount: rows.length,
      distinctRepoCount: repos.length,
      distinctAuthorCount: authors.length,
      compileEvidencePriority,
      suspicionScore: Number((rows.length + repos.length * 2 + authors.length * 1.5).toFixed(2)),
      corpora,
      stages,
      repos,
      authors,
      rows,
      sampleRows: rows.slice(0, 8),
    };
  }).sort((left, right) =>
    right.suspicionScore - left.suspicionScore
    || right.rowCount - left.rowCount
    || right.distinctRepoCount - left.distinctRepoCount
    || left.shape.localeCompare(right.shape),
  );

  const recommended = clusters.filter((cluster) => cluster.compileEvidencePriority === 'recommended');
  const watch = clusters.filter((cluster) => cluster.compileEvidencePriority === 'watch');
  const json = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    measuredCommit: currentCommit(),
    sourceReports: {
      v5: 'external-pine-corpus-v5.dispatch-routing-audit-v1.md',
      v6: 'external-pine-corpus-v6.current-gap-pool-a75ebd88d7-v1.md',
      v7: 'external-pine-corpus-v7.current-gap-pool-bbcbf3d220-v1.json',
    },
    headline: {
      invalidRows: invalidRows.length,
      clusters: clusters.length,
      recommendedCompileEvidenceClusters: recommended.length,
      watchClusters: watch.length,
      conclusion: recommended.length > 0
        ? 'Most invalid-Pine shapes remain small or source-specific, but several repeated shapes deserve TradingView compile evidence before the invalid label is allowed to disappear into the denominator.'
        : 'Invalid-Pine labels cluster mostly as isolated/source-specific author errors; no high-frequency independent acceptance question emerged.',
    },
    method: {
      clustering: 'Rows classified invalid Pine in the current v5 dispatch audit, v6 current gap pool audit, and v7 current gap pool audit are normalized to construct/error shapes.',
      independence: 'Independent exposure is counted by distinct pinned source rows plus distinct GitHub owner/repo and owner names.',
      compileEvidencePriority: 'recommended requires a compile-evidence-shaped cluster plus at least 4 rows across at least 2 repos. watch means source-only judgement may still be worth revisiting, or the shape is acceptance-like but lacks independent-source support.',
    },
    clusters,
  };

  const rankedTable = clusters.map((cluster) => [
    cluster.shape,
    cluster.shapeKind,
    String(cluster.rowCount),
    String(cluster.distinctRepoCount),
    String(cluster.distinctAuthorCount),
    cluster.compileEvidencePriority,
    Object.entries(cluster.corpora).map(([key, value]) => `${key} ${value}`).join(', '),
    cluster.repos.slice(0, 4).join('<br>'),
  ]);
  const sampleTable = recommended.flatMap((cluster) => cluster.sampleRows.slice(0, 5).map((row: InvalidRow) => [
    cluster.shape,
    row.corpus,
    row.id,
    `v${row.declaredVersion ?? '?'}`,
    row.stage,
    repoName(row.sourceRepoUrl),
    row.sourceFilePath,
    row.diagnostic ?? row.evidence,
  ]));

  const md = [
    '# Pine Corpus Invalid Cluster Audit V1',
    '',
    `Generated at ${json.generatedAt}. Measured at commit \`${json.measuredCommit}\`.`,
    '',
    '## Headline',
    '',
    `The current invalid-Pine pool contains ${json.headline.invalidRows} rows across ${json.headline.clusters} normalized shapes.`,
    '',
    `${json.headline.recommendedCompileEvidenceClusters} shapes are promoted to compile-evidence questions; ${json.headline.watchClusters} more are watch-list shapes rather than paste-queue items.`,
    '',
    json.headline.conclusion,
    '',
    'Most high-count clusters are either source-incomplete standalone files or deliberate runtime/domain violations. The compile-evidence set is narrower: repeated signatures where public authors or targeted fixtures may be pointing at a legal Pine acceptance shape we currently reject.',
    '',
    '## Method',
    '',
    `- Sources: \`${json.sourceReports.v5}\`, \`${json.sourceReports.v6}\`, \`${json.sourceReports.v7}\`.`,
    `- Clustering: ${json.method.clustering}`,
    `- Independence: ${json.method.independence}`,
    `- Promotion rule: ${json.method.compileEvidencePriority}`,
    '',
    '## Ranked Clusters',
    '',
    table(['Shape', 'Kind', 'Rows', 'Repos', 'Authors', 'Compile evidence', 'Corpora', 'Sample repos'], rankedTable),
    '',
    '## Promoted Compile-Evidence Samples',
    '',
    sampleTable.length === 0
      ? 'No cluster met the compile-evidence promotion rule.'
      : table(['Shape', 'Corpus', 'Row', 'Version', 'Stage', 'Repo', 'Path', 'Diagnostic/evidence'], sampleTable),
    '',
    '## Interpretation',
    '',
    '- A one-row shape remains an author/source error unless other evidence appears.',
    '- A high row count inside one synthetic/fixture repo is weaker than the same count across independent authors; it stays watch-listed unless independent-source support appears.',
    '- Rejected compile evidence keeps these rows in invalid-Pine. Accepted compile evidence reopens the corresponding parser/semantic/runtime ownership route.',
    '',
  ].join('\n');

  await writeFile(outJson, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  await writeFile(outMd, md, 'utf8');
  await updateCompileEvidenceRequest(clusters);
  process.stdout.write(`${JSON.stringify(json.headline, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
