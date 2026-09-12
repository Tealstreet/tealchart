#!/usr/bin/env tsx

import fs from 'node:fs';
import path from 'node:path';

import { getOfficialTradingViewLibrary } from '../src/officialTradingViewLibraries.ts';
import type { Program } from '../src/parser/ast.ts';
import { parse } from '../src/parser/parser.ts';
import { checkProgram } from '../src/semantic/checker.ts';
import {
  analyzeSemanticTypeInvariantCoverage,
  checkSemanticTypeInvariants,
  type SemanticTypeInvariantCoverage,
} from '../src/semantic/semanticTypeInvariants.ts';

type CorpusName = 'v5' | 'v6' | 'v7';

interface CorpusInput {
  name: CorpusName;
  sourceDir: string;
}

interface CorpusSummary {
  total: number;
  parseFailed: number;
  semanticFailed: number;
  semanticPassed: number;
  invariantRows: number;
  invariantIssues: number;
  coverage: SemanticTypeInvariantCoverage;
  issueRows: Array<{ row: string; issues: string[] }>;
  issueMessages: Record<string, number>;
}

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_JSON = path.join(ROOT, 'reports/external-pine-corpus-semantic-type-invariant-coverage-20260911.json');
const OUT_MD = path.join(ROOT, 'reports/external-pine-corpus-semantic-type-invariant-coverage-20260911.md');

const CORPORA: CorpusInput[] = [
  {
    name: 'v5',
    sourceDir: '/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910/sources',
  },
  {
    name: 'v6',
    sourceDir: '/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-parity/packages/tealscript/.cache/tealscript/pine-corpus-v6-20260911/sources',
  },
  {
    name: 'v7',
    sourceDir: '/Users/samuelsteady/cs/tealstreet-next/.aimux/worktrees/tealscript-corpus/packages/tealscript/.cache/tealscript/pine-corpus-v7-20260911/sources',
  },
];

function listPineFiles(sourceDir: string): string[] {
  return fs.readdirSync(sourceDir)
    .filter((entry) => entry.endsWith('.pine'))
    .sort((a, b) => a.localeCompare(b))
    .map((entry) => path.join(sourceDir, entry));
}

function officialLibraries(program: Program): Map<string, Program> {
  const libraries = new Map<string, Program>();
  for (const statement of program.body) {
    if (statement.type !== 'ImportDeclaration') continue;
    const library = getOfficialTradingViewLibrary(statement.path);
    if (library?.program) libraries.set(statement.path, library.program);
  }
  return libraries;
}

function emptyCoverage(): SemanticTypeInvariantCoverage {
  return {
    totalExpressions: 0,
    typedExpressions: 0,
    knownExpressions: 0,
    tupleExpressions: 0,
    unknownExpressions: 0,
    byExpressionType: {},
    unknownCalls: {},
    unknownMembers: {},
  };
}

function mergeCoverage(target: SemanticTypeInvariantCoverage, source: SemanticTypeInvariantCoverage): void {
  target.totalExpressions += source.totalExpressions;
  target.typedExpressions += source.typedExpressions;
  target.knownExpressions += source.knownExpressions;
  target.tupleExpressions += source.tupleExpressions;
  target.unknownExpressions += source.unknownExpressions;
  mergeNestedCounts(target.byExpressionType, source.byExpressionType);
  mergeCounts(target.unknownCalls, source.unknownCalls);
  mergeCounts(target.unknownMembers, source.unknownMembers);
}

function mergeNestedCounts(
  target: Record<string, { total: number; typed: number; unknown: number }>,
  source: Record<string, { total: number; typed: number; unknown: number }>,
): void {
  for (const [key, value] of Object.entries(source)) {
    const current = target[key] ?? { total: 0, typed: 0, unknown: 0 };
    current.total += value.total;
    current.typed += value.typed;
    current.unknown += value.unknown;
    target[key] = current;
  }
}

function mergeCounts(target: Record<string, number>, source: Record<string, number>): void {
  for (const [key, value] of Object.entries(source)) target[key] = (target[key] ?? 0) + value;
}

function pct(numerator: number, denominator: number): string {
  return denominator === 0 ? '0.00%' : `${((numerator / denominator) * 100).toFixed(2)}%`;
}

function topRows(counts: Record<string, number>, limit = 12): string[][] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name, count]) => [name, String(count)]);
}

function expressionRows(coverage: SemanticTypeInvariantCoverage): string[][] {
  return Object.entries(coverage.byExpressionType)
    .sort((a, b) => b[1].unknown - a[1].unknown || b[1].total - a[1].total || a[0].localeCompare(b[0]))
    .map(([name, value]) => [
      name,
      String(value.total),
      String(value.typed),
      String(value.unknown),
      pct(value.typed, value.total),
    ]);
}

function table(headers: string[], rows: string[][]): string {
  const escape = (value: string) => value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escape).join(' | ')} |`),
  ].join('\n');
}

function measureCorpus(corpus: CorpusInput): CorpusSummary {
  const summary: CorpusSummary = {
    total: 0,
    parseFailed: 0,
    semanticFailed: 0,
    semanticPassed: 0,
    invariantRows: 0,
    invariantIssues: 0,
    coverage: emptyCoverage(),
    issueRows: [],
    issueMessages: {},
  };

  for (const file of listPineFiles(corpus.sourceDir)) {
    summary.total += 1;
    const source = fs.readFileSync(file, 'utf8');
    let program: Program;
    try {
      program = parse(source, { grammarSource: file });
    } catch {
      summary.parseFailed += 1;
      continue;
    }

    const semantic = checkProgram(program, { libraries: officialLibraries(program) });
    if (semantic.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
      summary.semanticFailed += 1;
      continue;
    }

    summary.semanticPassed += 1;
    const issues = checkSemanticTypeInvariants(program, semantic);
    if (issues.length > 0) {
      summary.invariantRows += 1;
      summary.invariantIssues += issues.length;
      if (summary.issueRows.length < 20) {
        summary.issueRows.push({
          row: path.relative(corpus.sourceDir, file),
          issues: issues.slice(0, 5).map((issue) => issue.message),
        });
      }
      for (const issue of issues) {
        summary.issueMessages[issue.message] = (summary.issueMessages[issue.message] ?? 0) + 1;
      }
    }
    mergeCoverage(summary.coverage, analyzeSemanticTypeInvariantCoverage(program, semantic));
  }

  return summary;
}

const summaries = CORPORA.map((corpus) => ({ corpus: corpus.name, ...measureCorpus(corpus) }));
const total = summaries.reduce<CorpusSummary>((acc, summary) => {
  acc.total += summary.total;
  acc.parseFailed += summary.parseFailed;
  acc.semanticFailed += summary.semanticFailed;
  acc.semanticPassed += summary.semanticPassed;
  acc.invariantRows += summary.invariantRows;
  acc.invariantIssues += summary.invariantIssues;
  mergeCoverage(acc.coverage, summary.coverage);
  acc.issueRows.push(...summary.issueRows);
  mergeCounts(acc.issueMessages, summary.issueMessages);
  return acc;
}, {
  total: 0,
  parseFailed: 0,
  semanticFailed: 0,
  semanticPassed: 0,
  invariantRows: 0,
  invariantIssues: 0,
  coverage: emptyCoverage(),
  issueRows: [],
  issueMessages: {},
});

const report = {
  generatedAt: new Date().toISOString(),
  measurementCommit: 'CURRENT_WORKTREE',
  corpora: CORPORA,
  summaries,
  total,
};

fs.writeFileSync(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);

const lines = [
  '# External Pine Corpus Semantic Type Invariant Coverage — 2026-09-11',
  '',
  'Measures how much of the semantic-passing corpus expression surface is independently typed by `checkSemanticTypeInvariants()`. This is a coverage report for the invariant model, not an acceptance report.',
  '',
  'Baseline before this widening pass was approximately 45% of semantic-passing expressions: literals, root symbols, core operators, simple calls, and the invariant gate cases. This pass widened the cheap modeled surface to local UDT declarations and field reads, builtin input/color/string/math/TA/time families, collection constructors and scalar helpers, matrix/map helper returns, history references, and collection call-result shapes where the receiver type is locally recoverable.',
  '',
  'The model deliberately stays conservative. Unknown expression inputs now keep downstream expressions unknown instead of manufacturing a precise expected type. Collection element types are normalized to element kinds instead of carrying the const/input/series qualifier of the expression used to populate the collection.',
  '',
  '## Summary',
  '',
  table(
    ['Corpus', 'Total', 'Parse failed', 'Semantic failed', 'Semantic passed', 'Typed expressions', 'Total expressions', 'Coverage', 'Invariant rows'],
    summaries.map((summary) => [
      summary.corpus,
      String(summary.total),
      String(summary.parseFailed),
      String(summary.semanticFailed),
      String(summary.semanticPassed),
      String(summary.coverage.typedExpressions),
      String(summary.coverage.totalExpressions),
      pct(summary.coverage.typedExpressions, summary.coverage.totalExpressions),
      String(summary.invariantRows),
    ]).concat([[
      'total',
      String(total.total),
      String(total.parseFailed),
      String(total.semanticFailed),
      String(total.semanticPassed),
      String(total.coverage.typedExpressions),
      String(total.coverage.totalExpressions),
      pct(total.coverage.typedExpressions, total.coverage.totalExpressions),
      String(total.invariantRows),
    ]]),
  ),
  '',
  '## Expression-Type Coverage',
  '',
  table(['Expression type', 'Total', 'Typed', 'Unknown', 'Coverage'], expressionRows(total.coverage)),
  '',
  '## Largest Unknown Call Shapes',
  '',
  table(['Call', 'Count'], topRows(total.coverage.unknownCalls)),
  '',
  '## Largest Unknown Member Shapes',
  '',
  table(['Member', 'Count'], topRows(total.coverage.unknownMembers)),
  '',
  '## Invariant Issue Samples',
  '',
  table(
    ['Row', 'Issues'],
    total.issueRows.slice(0, 20).map((row) => [row.row, row.issues.join('<br>')]),
  ),
  '',
  '## Top Invariant Issue Messages',
  '',
  table(['Issue', 'Count'], topRows(total.issueMessages, 20)),
  '',
  '## Cheapest Next Widenings',
  '',
  '- The remaining invariant rows are one family: array call-result aggregate/member chains where the checker still reports `series unknown` or qualifier-light collection element values. Solving that cleanly means making call-result receiver typing and collection element qualifier propagation explicit in the checker, not adding more invariant guesses.',
  '- High-frequency output-only calls (`table.cell`, `plotshape`, `alertcondition`, `strategy.*`) are still intentionally unknown because they do not produce useful expression values for root declaration comparisons.',
  '- Generic `input(...)`, `request.security(...)`, and some `nz(...)` shapes remain unknown when their return type depends on an argument the invariant model cannot independently type. That is the right stop line unless the checker exposes more local expression facts.',
  '- Local temporaries and UDF return symbols remain outside comparison because `SemanticCheckResult.symbols` exposes root symbols only. Widening this requires checker result-shape work, so it is expensive and should not be done as an invariant-only pass.',
  '- Namespaced members beyond the modeled builtin families, imported/user methods, and full UDT flow through arrays/maps/matrices remain medium-to-expensive. They need either compiler evidence or broader checker-local type exposure before the invariant model should compare them.',
  '',
  '## Boundary',
  '',
  'This report counts expressions the invariant model can independently type. A typed expression count does not mean that expression is compared against a checker symbol; root declarations and tuple destructuring remain the primary comparison points. Unknown expressions are skipped, never treated as failures. The residual rows are measurement of the still-expensive collection receiver/element surface, not confirmed acceptance gaps.',
  '',
];

fs.writeFileSync(OUT_MD, `${lines.join('\n')}\n`);
console.log(`Wrote ${path.relative(ROOT, OUT_MD)}`);
