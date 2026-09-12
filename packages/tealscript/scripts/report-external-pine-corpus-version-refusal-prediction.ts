import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

type CorpusName = 'v5' | 'v6' | 'v7';
type RuleId = 'v5-generic-input-type-integer' | 'v5-global-sma' | 'v4-untyped-na' | 'v3-bool-number-arithmetic';

interface CorpusReportRow {
  localPath: string;
  sourceRepoUrl: string;
  sourceFilePath: string;
  commitSha: string;
  sourceSha256: string;
  declaredVersion: number;
  outcome: string;
  firstFailedStage: string | null;
}

interface CorpusReport {
  inputDir: string;
  measurementCommitSha?: string;
  rows: CorpusReportRow[];
}

interface Match {
  corpus: CorpusName;
  localPath: string;
  sourceRepoUrl: string;
  sourceFilePath: string;
  commitSha: string;
  sourceSha256: string;
  declaredVersion: number;
  outcome: string;
  firstFailedStage: string | null;
  line: number;
  snippet: string;
  confidence: 'predicted-drop' | 'shadowed-or-definition' | 'scan-candidate';
  note: string;
}

interface RuleSummary {
  rule: RuleId;
  sourceRows: number;
  producingRows: number;
  predictedOutputDropLow: number;
  predictedOutputDropHigh: number;
  notes: string;
}

const PACKAGE_ROOT = resolve(new URL('../', import.meta.url).pathname);
const DEFAULT_OUTPUT_BASE = resolve(PACKAGE_ROOT, 'reports/external-pine-corpus-version-refusal-prediction-v1');

const CORPORA: Array<{ corpus: CorpusName; reportPath: string }> = [
  { corpus: 'v5', reportPath: resolve(PACKAGE_ROOT, 'reports/external-pine-corpus-v5.daily-rerun-8db55d66ae.json') },
  { corpus: 'v6', reportPath: resolve(PACKAGE_ROOT, 'reports/external-pine-corpus-v6.daily-rerun-8db55d66ae.json') },
  { corpus: 'v7', reportPath: resolve(PACKAGE_ROOT, 'reports/external-pine-corpus-v7.daily-rerun-8db55d66ae.json') },
];

function currentCommit(): string {
  return execFileSync('git', ['rev-parse', '--short=10', 'HEAD'], { cwd: resolve(PACKAGE_ROOT, '../..'), encoding: 'utf8' }).trim();
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

function declaredVersion(source: string, fallback: number): number {
  const match = /\/\/\s*@version\s*=\s*([0-9]+)/.exec(source);
  return match ? Number(match[1]) : fallback;
}

function stripCommentsAndStrings(source: string): string {
  let out = '';
  for (let i = 0; i < source.length;) {
    const ch = source[i]!;
    const next = source[i + 1];
    if (ch === '/' && next === '/') {
      out += '  ';
      i += 2;
      while (i < source.length && source[i] !== '\n') {
        out += source[i] === '\r' ? '\r' : ' ';
        i += 1;
      }
      continue;
    }
    if (ch === '/' && next === '*') {
      out += '  ';
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        out += source[i] === '\n' || source[i] === '\r' ? source[i]! : ' ';
        i += 1;
      }
      if (i < source.length) {
        out += '  ';
        i += 2;
      }
      continue;
    }
    if (source.startsWith('"""', i)) {
      out += '   ';
      i += 3;
      while (i < source.length && !source.startsWith('"""', i)) {
        out += source[i] === '\n' || source[i] === '\r' ? source[i]! : ' ';
        i += 1;
      }
      if (i < source.length) {
        out += '   ';
        i += 3;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      out += ' ';
      i += 1;
      while (i < source.length) {
        const c = source[i]!;
        out += c === '\n' || c === '\r' ? c : ' ';
        i += 1;
        if (c === '\\') {
          if (i < source.length) {
            out += source[i] === '\n' || source[i] === '\r' ? source[i]! : ' ';
            i += 1;
          }
          continue;
        }
        if (c === quote) break;
      }
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function lineAt(source: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i += 1) if (source.charCodeAt(i) === 10) line += 1;
  return line;
}

function snippetAt(source: string, line: number): string {
  return source.split(/\r?\n/)[line - 1]?.trim().slice(0, 220) ?? '';
}

function isIdentChar(ch: string | undefined): boolean {
  return ch != null && /[A-Za-z0-9_$]/.test(ch);
}

function findCalls(clean: string, name: string): Array<{ start: number; end: number; args: string }> {
  const calls: Array<{ start: number; end: number; args: string }> = [];
  const pattern = new RegExp(`\\b${name}\\s*\\(`, 'g');
  for (let match = pattern.exec(clean); match; match = pattern.exec(clean)) {
    const start = match.index;
    const prev = clean[start - 1];
    if (prev === '.' || isIdentChar(prev)) continue;
    const open = clean.indexOf('(', start);
    let depth = 0;
    let end = -1;
    for (let i = open; i < clean.length; i += 1) {
      if (clean[i] === '(') depth += 1;
      else if (clean[i] === ')') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) continue;
    calls.push({ start, end, args: clean.slice(open + 1, end) });
  }
  return calls;
}

function hasLocalFunctionDefinition(clean: string, name: string): boolean {
  return findCalls(clean, name).some((call) => /^\s*=>/.test(clean.slice(call.end + 1, call.end + 20)));
}

function scanV5GenericInputInteger(clean: string, source: string): Array<{ line: number; snippet: string; note: string }> {
  return findCalls(clean, 'input')
    .filter((call) => /\btype\s*=\s*input\s*\.\s*integer\b/.test(call.args))
    .map((call) => {
      const line = lineAt(clean, call.start);
      return { line, snippet: snippetAt(source, line), note: 'generic input() call passes named type=input.integer' };
    });
}

function scanV5GlobalSma(clean: string, source: string): Array<{ line: number; snippet: string; confidence: Match['confidence']; note: string }> {
  const hasLocalSma = hasLocalFunctionDefinition(clean, 'sma');
  return findCalls(clean, 'sma')
    .filter((call) => !/^\s*=>/.test(clean.slice(call.end + 1, call.end + 20)))
    .map((call) => {
      const line = lineAt(clean, call.start);
      return {
        line,
        snippet: snippetAt(source, line),
        confidence: hasLocalSma ? 'shadowed-or-definition' : 'predicted-drop',
        note: hasLocalSma ? 'bare sma() call exists, but the file also declares a local sma() function' : 'bare global sma() call with no local sma() definition detected',
      };
    });
}

function scanV4UntypedNa(clean: string, source: string): Array<{ line: number; snippet: string; note: string }> {
  const rows: Array<{ line: number; snippet: string; note: string }> = [];
  const typedPrefix = /^(?:var|varip)?\s*(?:float|int|bool|color|string|line|label|box|table|array|matrix|map|plot|hline)\b/;
  let parenDepth = 0;
  clean.split(/\r?\n/).forEach((lineText, index) => {
    const depthAtLineStart = parenDepth;
    const trimmed = lineText.trim();
    if (trimmed && depthAtLineStart === 0 && !typedPrefix.test(trimmed) && /^(?:var|varip\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=\s*na\b/.test(trimmed)) {
      const line = index + 1;
      rows.push({ line, snippet: snippetAt(source, line), note: 'v4 line-start declaration assigns bare na without an explicit type' });
    }
    for (const ch of lineText) {
      if (ch === '(') parenDepth += 1;
      else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
    }
  });
  return rows;
}

function scanV3BoolArithmetic(clean: string, source: string): Array<{ line: number; snippet: string; note: string }> {
  const boolVars = new Set<string>();
  clean.split(/\r?\n/).forEach((lineText) => {
    const literal = /^\s*(?:var|varip\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:true|false)\b/.exec(lineText);
    if (literal) boolVars.add(literal[1]!);
    const comparison = /^\s*(?:var|varip\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=.*(?:==|!=|>=|<=|>|<|\band\b|\bor\b|\bnot\b)/.exec(lineText);
    if (comparison) boolVars.add(comparison[1]!);
  });

  const rows: Array<{ line: number; snippet: string; note: string }> = [];
  clean.split(/\r?\n/).forEach((lineText, index) => {
    const literalArithmetic = /\b(?:true|false)\b\s*[-+*/%]|[-+*/%]\s*\b(?:true|false)\b/.test(lineText);
    const boolVar = [...boolVars].find((name) => {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b\\s*[-+*/%]|[-+*/%]\\s*\\b${escaped}\\b`).test(lineText);
    });
    if (literalArithmetic || boolVar) {
      const line = index + 1;
      rows.push({
        line,
        snippet: snippetAt(source, line),
        note: literalArithmetic ? 'v3 arithmetic expression directly mentions true/false' : `v3 arithmetic expression uses boolean-looking variable ${boolVar}`,
      });
    }
  });
  return rows;
}

function addMatch(matches: Record<RuleId, Match[]>, rule: RuleId, row: CorpusReportRow, corpus: CorpusName, hit: {
  line: number;
  snippet: string;
  note: string;
  confidence?: Match['confidence'];
}): void {
  matches[rule].push({
    corpus,
    localPath: row.localPath,
    sourceRepoUrl: row.sourceRepoUrl,
    sourceFilePath: row.sourceFilePath,
    commitSha: row.commitSha,
    sourceSha256: row.sourceSha256,
    declaredVersion: row.declaredVersion,
    outcome: row.outcome,
    firstFailedStage: row.firstFailedStage,
    line: hit.line,
    snippet: hit.snippet,
    confidence: hit.confidence ?? 'predicted-drop',
    note: hit.note,
  });
}

function uniqueRows(rows: Match[]): Match[] {
  const seen = new Set<string>();
  const out: Match[] = [];
  for (const row of rows) {
    const key = `${row.corpus}:${row.localPath}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function summarize(rule: RuleId, rows: Match[]): RuleSummary {
  const unique = uniqueRows(rows);
  const predictedRows = unique.filter((row) => row.confidence === 'predicted-drop');
  const producing = predictedRows.filter((row) => row.outcome === 'produced-output-compiled').length;
  return {
    rule,
    sourceRows: unique.length,
    producingRows: producing,
    predictedOutputDropLow: producing,
    predictedOutputDropHigh: producing,
    notes: rule === 'v5-global-sma'
      ? 'Rows with a local sma() definition are reported as shadowed candidates and excluded from the predicted drop range.'
      : 'Static source match under the declared Pine version; predicted drop counts only currently producing rows.',
  };
}

function renderMarkdown(report: {
  measurementCommit: string;
  baselineReports: Record<CorpusName, string>;
  baselineMeasurementCommits: Record<CorpusName, string | undefined>;
  summaries: RuleSummary[];
  matches: Record<RuleId, Match[]>;
}): string {
  const totalDrop = report.summaries.reduce((sum, row) => sum + row.predictedOutputDropHigh, 0);
  const lines: string[] = [
    '# External Pine Corpus Version-Refusal Prediction V1',
    '',
    `Date: 2026-09-12`,
    '',
    `Measurement commit for this static source scan: \`${report.measurementCommit}\`.`,
    '',
    'Baseline acceptance reports:',
    '',
    '| Corpus | Report | Measurement commit |',
    '| --- | --- | --- |',
    ...(['v5', 'v6', 'v7'] as CorpusName[]).map((corpus) => `| ${corpus} | \`${report.baselineReports[corpus]}\` | \`${report.baselineMeasurementCommits[corpus] ?? 'unknown'}\` |`),
    '',
    '## Headline',
    '',
    `Predicted output drop when the four currently-missing version refusals land: \`${totalDrop}\` rows.`,
    '',
    'The prediction is a source scan, not a rerun. It counts a row as a headline-risk',
    'row only when the construct appears under the row\'s declared Pine version and',
    'the latest baseline report says the row currently produces output.',
    '',
    'The v4 `= na` detector requires statement-level parenthesis depth zero. This',
    'intentionally excludes named arguments such as `y=na` inside `label.new(...)`,',
    'which occur in declared-v4 Everget scripts but are not untyped declarations and',
    'should not predict a version-refusal drop.',
    '',
    '| Rule | Source rows | Currently producing rows | Predicted output drop | Notes |',
    '| --- | ---: | ---: | ---: | --- |',
    ...report.summaries.map((row) => `| \`${row.rule}\` | \`${row.sourceRows}\` | \`${row.producingRows}\` | \`${row.predictedOutputDropLow}-${row.predictedOutputDropHigh}\` | ${row.notes} |`),
    '',
  ];

  for (const summary of report.summaries) {
    const rows = uniqueRows(report.matches[summary.rule]);
    lines.push(`## ${summary.rule}`, '');
    if (rows.length === 0) {
      lines.push('No corpus rows matched this shape under their declared Pine version.', '');
      continue;
    }
    lines.push('| Corpus | Version | Outcome | Path | Line | Confidence | Evidence |');
    lines.push('| --- | ---: | --- | --- | ---: | --- | --- |');
    for (const row of rows) {
      lines.push(`| ${row.corpus} | ${row.declaredVersion} | \`${row.outcome}\` | \`${row.localPath}\` | ${row.line} | \`${row.confidence}\` | ${row.note}: \`${row.snippet.replaceAll('|', '\\|')}\` |`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const outputBase = resolve(process.argv[2] ?? DEFAULT_OUTPUT_BASE);
  const matches: Record<RuleId, Match[]> = {
    'v5-generic-input-type-integer': [],
    'v5-global-sma': [],
    'v4-untyped-na': [],
    'v3-bool-number-arithmetic': [],
  };
  const baselineReports: Record<CorpusName, string> = {} as Record<CorpusName, string>;
  const baselineMeasurementCommits: Record<CorpusName, string | undefined> = {} as Record<CorpusName, string | undefined>;

  for (const spec of CORPORA) {
    const report = await readJson<CorpusReport>(spec.reportPath);
    baselineReports[spec.corpus] = spec.reportPath.replace(`${PACKAGE_ROOT}/`, '');
    baselineMeasurementCommits[spec.corpus] = report.measurementCommitSha;
    for (const row of report.rows) {
      const source = await readFile(resolve(report.inputDir, row.localPath), 'utf8');
      const version = declaredVersion(source, row.declaredVersion);
      const scanRow = { ...row, declaredVersion: version };
      const clean = stripCommentsAndStrings(source);
      if (version === 5) {
        for (const hit of scanV5GenericInputInteger(clean, source)) addMatch(matches, 'v5-generic-input-type-integer', scanRow, spec.corpus, hit);
        for (const hit of scanV5GlobalSma(clean, source)) addMatch(matches, 'v5-global-sma', scanRow, spec.corpus, hit);
      }
      if (version === 4) {
        for (const hit of scanV4UntypedNa(clean, source)) addMatch(matches, 'v4-untyped-na', scanRow, spec.corpus, hit);
      }
      if (version === 3) {
        for (const hit of scanV3BoolArithmetic(clean, source)) addMatch(matches, 'v3-bool-number-arithmetic', scanRow, spec.corpus, hit);
      }
    }
  }

  const summaries = (Object.keys(matches) as RuleId[]).map((rule) => summarize(rule, matches[rule]));
  const report = {
    schemaVersion: 1,
    measurementCommit: currentCommit(),
    baselineReports,
    baselineMeasurementCommits,
    summaries,
    matches,
  };
  await mkdir(dirname(outputBase), { recursive: true });
  await writeFile(`${outputBase}.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(`${outputBase}.md`, renderMarkdown(report), 'utf8');
  process.stdout.write(`${JSON.stringify({ measurementCommit: report.measurementCommit, summaries }, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
