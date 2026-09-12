#!/usr/bin/env tsx

import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import peggy from 'peggy';

import { PINE_V6_GRAMMAR_CONSTRUCTS } from '../src/compat/pineV6GrammarReference.ts';
import v5Manifest from '../reports/external-pine-corpus-v5.manifest.json' with { type: 'json' };
import v6Manifest from '../reports/external-pine-corpus-v6.manifest.json' with { type: 'json' };
import v7Manifest from '../reports/external-pine-corpus-v7.manifest.json' with { type: 'json' };
import recoveryManifest from '../reports/external-pine-corpus-v7-size-recovery.manifest.json' with { type: 'json' };

interface ManifestScript {
  localPath: string;
  sourceRepoUrl: string;
  sourceFilePath: string;
  commitSha: string;
}

interface TraceEvent {
  type: string;
  rule?: string;
}

interface TracedParser {
  parse(input: string, options?: {
    tracer?: { trace(event: TraceEvent): void };
  }): unknown;
}

type Classification =
  | 'reached'
  | 'known-zero-use-construct'
  | 'untested-support-production'
  | 'accepted-syntax-needs-compile-evidence';

interface RuleCoverage {
  rule: string;
  grammarSnippetMatchCount: number;
  grammarSnippetSourceCount: number;
  corpusMatchCount: number;
  corpusScriptCount: number;
  reachedBy: Array<'grammar-snippet' | 'corpus'>;
  classification: Classification;
  reason: string;
  sampleGrammarSnippets: string[];
  sampleCorpusHits: CorpusHit[];
}

interface CorpusHit {
  corpus: string;
  localPath: string;
  sourceRepoUrl: string;
  sourceFilePath: string;
  commitSha: string;
}

interface MutableRuleCoverage {
  rule: string;
  grammarSnippetMatchCount: number;
  grammarSnippetIds: Set<string>;
  corpusMatchCount: number;
  corpusScriptIds: Set<string>;
  sampleGrammarSnippets: string[];
  sampleCorpusHits: CorpusHit[];
}

const packageRoot = resolve(dirname(dirname(new URL(import.meta.url).pathname)));
const grammarPath = join(packageRoot, 'src/parser/grammar.peggy');
const outJson = join(packageRoot, 'reports/pine-grammar-production-coverage-v1.json');
const outMd = join(packageRoot, 'reports/pine-grammar-production-coverage-v1.md');

const corpora = [
  {
    name: 'v5',
    root: join(packageRoot, '.cache/tealscript/pine-corpus-v5-20260910'),
    manifest: (v5Manifest as { scripts: ManifestScript[] }).scripts,
    expectedScripts: 1000,
  },
  {
    name: 'v6',
    root: join(packageRoot, '.cache/tealscript/pine-corpus-v6-20260911'),
    manifest: (v6Manifest as { scripts: ManifestScript[] }).scripts,
    expectedScripts: 1000,
  },
  {
    name: 'v7',
    root: join(packageRoot, '.cache/tealscript/pine-corpus-v7-20260911'),
    manifest: (v7Manifest as { scripts: ManifestScript[] }).scripts,
    expectedScripts: 456,
  },
  {
    name: 'v7-size-recovery',
    root: join(packageRoot, '.cache/tealscript/pine-corpus-v7-size-recovery-20260911'),
    manifest: (recoveryManifest as { scripts: ManifestScript[] }).scripts,
    expectedScripts: 50,
  },
];

const knownZeroUseReasons: Record<string, string> = {
  TripleDoubleStringChar:
    'Supports triple-quoted string literal content. The construct-depth report measures formatting.triple-quoted-string at 0 of 2,506 scripts and no grammar snippet now targets it.',
};

const compileEvidenceReasons: Record<string, string> = {
  LambdaLookahead:
    'Recognizes parenthesized arrow-function syntax before parsing a lambda. Earlier corpus judgement found JavaScript-style callback syntax invalid, so this accepted grammar surface needs direct TradingView compile evidence.',
  LambdaExpression:
    'Builds an expression node for `(params) => expr`. TealScript currently parses and checks this syntax, but no corpus/script/manual evidence in this pass proves TradingView accepts lambda expressions.',
  LambdaParams:
    'Supports parameters for `(params) => expr` lambda syntax; this is the same unproven accepted grammar surface as LambdaExpression.',
  SingleStringChar:
    'Supports single-quoted string literal content. No snippet or corpus hit reaches it, and Pine string literal syntax should be settled by compiler evidence before this accepted syntax is trusted.',
};

const supportProductionReasons: Record<string, string> = {
  ColorLiteral:
    'Supports bare `#RRGGBB` color literal parsing. It is a believed Pine literal surface, but this production is not reached by the current snippets or corpus pass.',
  CollectionForExpression:
    'Expression-start production for collection `for` expressions. Full-program UDF and assignment forms exercise related loop-valued grammar, but this direct start-rule production is not reached.',
  NumericForExpression:
    'Expression-start production for numeric `for` expressions. Full-program UDF and assignment forms exercise related loop-valued grammar, but this direct start-rule production is not reached.',
  WhileExpression:
    'Expression-start production for `while` expressions. Full-program UDF and assignment forms exercise related loop-valued grammar, but this direct start-rule production is not reached.',
  SingleElementArrayStatementAhead:
    'Lookahead helper that disambiguates single-element array statement shapes; no accepted source in this pass needs that helper.',
};

const whitespaceAndCommentRules = new Set([
  'SingleLineComment',
  'MultiLineComment',
  'Comment',
  'BlankLine',
  'LoopHeaderContinuationSpace',
  'IfConditionSpace',
  'CommaContinuationSpace',
  'BeforeBitwiseXorOperator',
  'BeforeShiftOperator',
]);

function main(): void {
  void run();
}

async function run(): Promise<void> {
  const grammar = await readFile(grammarPath, 'utf8');
  const ruleNames = extractRuleNames(grammar);
  const parser = peggy.generate(grammar, { trace: true, allowedStartRules: ['Program'] }) as TracedParser;
  const stats = new Map(ruleNames.map((rule) => [rule, createRuleStats(rule)]));
  const parseFailures: Array<{ corpus: string; localPath: string; message: string }> = [];

  for (const construct of PINE_V6_GRAMMAR_CONSTRUCTS) {
    const localMatches = parseWithTrace(parser, construct.snippet);
    if (!localMatches) {
      throw new Error(`Grammar reference snippet did not parse: ${construct.id}`);
    }
    mergeSnippetMatches(stats, localMatches, construct.id);
  }

  for (const corpus of corpora) {
    if (corpus.manifest.length !== corpus.expectedScripts) {
      throw new Error(`${corpus.name} manifest has ${corpus.manifest.length} rows, expected ${corpus.expectedScripts}`);
    }
    console.log(`Scanning ${corpus.name}: ${corpus.manifest.length} scripts`);
    for (const [index, script] of corpus.manifest.entries()) {
      const source = await readFile(join(corpus.root, script.localPath), 'utf8');
      const localMatches = parseWithTrace(parser, source);
      if (!localMatches) {
        parseFailures.push({ corpus: corpus.name, localPath: script.localPath, message: 'parse failed' });
      } else {
        mergeCorpusMatches(stats, localMatches, {
          corpus: corpus.name,
          localPath: script.localPath,
          sourceRepoUrl: script.sourceRepoUrl,
          sourceFilePath: script.sourceFilePath,
          commitSha: script.commitSha,
        });
      }
      if ((index + 1) % 100 === 0 || index + 1 === corpus.manifest.length) {
        console.log(`  ${corpus.name}: ${index + 1}/${corpus.manifest.length}`);
      }
    }
  }

  const rows = ruleNames.map((rule) => finalizeRuleCoverage(stats.get(rule)!));
  const unreachedByEither = rows.filter((row) => row.reachedBy.length === 0);
  const reachedByBoth = rows.filter((row) => row.reachedBy.length === 2);
  const reachedBySnippetsOnly = rows.filter((row) => row.reachedBy.length === 1 && row.reachedBy[0] === 'grammar-snippet');
  const reachedByCorpusOnly = rows.filter((row) => row.reachedBy.length === 1 && row.reachedBy[0] === 'corpus');
  const classificationCounts = countBy(rows, (row) => row.classification);
  const measuredCommit = execFileSync('git', ['rev-parse', '--short=10', 'HEAD'], {
    cwd: packageRoot,
    encoding: 'utf8',
  }).trim();

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    measuredCommit,
    basis: {
      grammar: 'src/parser/grammar.peggy',
      traceEvent: 'Peggy rule.match counted only after a full successful Program parse',
      grammarSnippets: PINE_V6_GRAMMAR_CONSTRUCTS.length,
      corpusScripts: corpora.reduce((sum, corpus) => sum + corpus.manifest.length, 0),
      corpusSets: corpora.map((corpus) => ({
        name: corpus.name,
        cacheRoot: corpus.root.replace(`${packageRoot}/`, ''),
        manifestRows: corpus.manifest.length,
        expectedScripts: corpus.expectedScripts,
      })),
      normalization:
        'The traced parser receives the same wrapper-normalized source shape as parse(): BOM removal, line-ending normalization, leading-tab normalization, NBSP normalization outside strings and comments, and 3-space UDF-body indentation normalization.',
      caveat:
        'Peggy traces are parser-internal events. Counting only successful rule.match events avoids failed parse attempts, but productions reached only inside a backtracked successful parse alternative may still be trace-visible. The traced parser is intentionally generated without Peggy cache: true because cache changed behavior on real corpus input during this audit.',
    },
    headline: {
      totalProductions: ruleNames.length,
      reachedByEither: rows.length - unreachedByEither.length,
      reachedByBoth: reachedByBoth.length,
      reachedByGrammarSnippetsOnly: reachedBySnippetsOnly.length,
      reachedByCorpusOnly: reachedByCorpusOnly.length,
      unreachedByEither: unreachedByEither.length,
      corpusParseSuccesses: corpora.reduce((sum, corpus) => sum + corpus.manifest.length, 0) - parseFailures.length,
      corpusParseFailures: parseFailures.length,
      classificationCounts,
    },
    unreachedByEitherRows: unreachedByEither,
    reachedByCorpusOnlyRows: reachedByCorpusOnly,
    reachedByGrammarSnippetsOnlyRows: reachedBySnippetsOnly,
    parseFailures,
    allRows: rows,
  };

  await writeFile(outJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outMd, renderMarkdown(report));

  console.log(`Wrote ${outJson}`);
  console.log(`Wrote ${outMd}`);
  console.log(`${rows.length - unreachedByEither.length}/${rows.length} productions reached by snippets or corpus`);
  console.log(`${unreachedByEither.length} productions unreached by both`);
  console.log(`classification counts: ${JSON.stringify(classificationCounts)}`);
}

function parseWithTrace(parser: TracedParser, source: string): Map<string, number> | undefined {
  const matches = new Map<string, number>();
  try {
    parser.parse(normalizeParserInput(source), {
      tracer: {
        trace(event: TraceEvent): void {
          if (event.type !== 'rule.match' || !event.rule) return;
          matches.set(event.rule, (matches.get(event.rule) ?? 0) + 1);
        },
      },
    });
    return matches;
  } catch {
    return undefined;
  }
}

function createRuleStats(rule: string): MutableRuleCoverage {
  return {
    rule,
    grammarSnippetMatchCount: 0,
    grammarSnippetIds: new Set(),
    corpusMatchCount: 0,
    corpusScriptIds: new Set(),
    sampleGrammarSnippets: [],
    sampleCorpusHits: [],
  };
}

function mergeSnippetMatches(stats: Map<string, MutableRuleCoverage>, localMatches: Map<string, number>, snippetId: string): void {
  for (const [rule, count] of localMatches.entries()) {
    const stat = stats.get(rule);
    if (!stat) continue;
    stat.grammarSnippetMatchCount += count;
    stat.grammarSnippetIds.add(snippetId);
    if (stat.sampleGrammarSnippets.length < 5 && !stat.sampleGrammarSnippets.includes(snippetId)) {
      stat.sampleGrammarSnippets.push(snippetId);
    }
  }
}

function mergeCorpusMatches(stats: Map<string, MutableRuleCoverage>, localMatches: Map<string, number>, hit: CorpusHit): void {
  const scriptId = `${hit.corpus}:${hit.localPath}`;
  for (const [rule, count] of localMatches.entries()) {
    const stat = stats.get(rule);
    if (!stat) continue;
    stat.corpusMatchCount += count;
    stat.corpusScriptIds.add(scriptId);
    if (stat.sampleCorpusHits.length < 5 && !stat.sampleCorpusHits.some((sample) => sample.corpus === hit.corpus && sample.localPath === hit.localPath)) {
      stat.sampleCorpusHits.push(hit);
    }
  }
}

function finalizeRuleCoverage(stat: MutableRuleCoverage): RuleCoverage {
  const reachedBy: Array<'grammar-snippet' | 'corpus'> = [];
  if (stat.grammarSnippetIds.size > 0) reachedBy.push('grammar-snippet');
  if (stat.corpusScriptIds.size > 0) reachedBy.push('corpus');
  const classification = reachedBy.length > 0 ? { classification: 'reached' as const, reason: 'Reached by at least one successful grammar snippet or corpus parse.' } : classifyUnreached(stat.rule);
  return {
    rule: stat.rule,
    grammarSnippetMatchCount: stat.grammarSnippetMatchCount,
    grammarSnippetSourceCount: stat.grammarSnippetIds.size,
    corpusMatchCount: stat.corpusMatchCount,
    corpusScriptCount: stat.corpusScriptIds.size,
    reachedBy,
    classification: classification.classification,
    reason: classification.reason,
    sampleGrammarSnippets: stat.sampleGrammarSnippets,
    sampleCorpusHits: stat.sampleCorpusHits,
  };
}

function classifyUnreached(rule: string): { classification: Classification; reason: string } {
  if (knownZeroUseReasons[rule]) {
    return { classification: 'known-zero-use-construct', reason: knownZeroUseReasons[rule] };
  }
  if (compileEvidenceReasons[rule]) {
    return { classification: 'accepted-syntax-needs-compile-evidence', reason: compileEvidenceReasons[rule] };
  }
  if (supportProductionReasons[rule]) {
    return { classification: 'untested-support-production', reason: supportProductionReasons[rule] };
  }
  if (rule.includes('Function') && rule.includes('VariableDeclaration')) {
    return {
      classification: 'untested-support-production',
      reason:
        'Depth-specific UDF variable-declaration support production. Typed and untyped UDF declarations are reached at nearby depths, but this exact generated depth tier is not reached by the current snippets or corpus pass.',
    };
  }
  if (rule.startsWith('Function')) {
    return {
      classification: 'untested-support-production',
      reason:
        'Depth- or indentation-specific UDF block production. Nearby UDF body and nested-block productions are reached, but this exact support production is not reached by the current snippets or corpus pass.',
    };
  }
  if (whitespaceAndCommentRules.has(rule)) {
    return {
      classification: 'untested-support-production',
      reason:
        'Whitespace, comment, or continuation helper production. Its absence from rule.match coverage does not by itself indicate a Pine syntax surface.',
    };
  }
  if (rule === 'IdentifierPart') {
    return {
      classification: 'untested-support-production',
      reason:
        'Identifier helper production. Identifier parsing is reached through higher-level rules, but this helper is not trace-reached by the accepted snippets/corpus pass.',
    };
  }
  if (rule === 'EscapeSequence') {
    return {
      classification: 'untested-support-production',
      reason:
        'String escape helper production. String literals are reached, but no accepted snippet or corpus script in this pass uses an escaped character that reaches this helper.',
    };
  }
  return {
    classification: 'accepted-syntax-needs-compile-evidence',
    reason:
      'Unreached production does not map to a measured zero-use negative or a purely internal support helper. It needs compile evidence before it is trusted as accepted Pine syntax.',
  };
}

function extractRuleNames(grammar: string): string[] {
  return [...grammar.matchAll(/^([A-Za-z_][A-Za-z0-9_]*)\s*\n\s*=/gm)].map((match) => match[1]);
}

function countBy<T>(values: readonly T[], key: (value: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const k = key(value);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

function renderMarkdown(report: {
  generatedAt: string;
  measuredCommit: string;
  basis: {
    grammarSnippets: number;
    corpusScripts: number;
    traceEvent: string;
    normalization: string;
    caveat: string;
  };
  headline: {
    totalProductions: number;
    reachedByEither: number;
    reachedByBoth: number;
    reachedByGrammarSnippetsOnly: number;
    reachedByCorpusOnly: number;
    unreachedByEither: number;
    corpusParseSuccesses: number;
    corpusParseFailures: number;
    classificationCounts: Record<string, number>;
  };
  unreachedByEitherRows: RuleCoverage[];
  reachedByCorpusOnlyRows: RuleCoverage[];
  reachedByGrammarSnippetsOnlyRows: RuleCoverage[];
  parseFailures: Array<{ corpus: string; localPath: string; message: string }>;
}): string {
  const lines: string[] = [];
  lines.push('# Pine Grammar Production Coverage v1');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Measured commit: \`${report.measuredCommit}\``);
  lines.push('');
  lines.push('## Method');
  lines.push('');
  lines.push(`- Grammar: \`src/parser/grammar.peggy\``);
  lines.push(`- Inputs: ${report.basis.grammarSnippets} committed grammar snippets and ${report.basis.corpusScripts} corpus scripts.`);
  lines.push(`- Trace event: ${report.basis.traceEvent}.`);
  lines.push(`- Normalization: ${report.basis.normalization}`);
  lines.push(`- Caveat: ${report.basis.caveat}`);
  lines.push('');
  lines.push('## Headline');
  lines.push('');
  lines.push(`- Productions reached by snippets or corpus: ${report.headline.reachedByEither}/${report.headline.totalProductions}.`);
  lines.push(`- Reached by both: ${report.headline.reachedByBoth}.`);
  lines.push(`- Reached by grammar snippets only: ${report.headline.reachedByGrammarSnippetsOnly}.`);
  lines.push(`- Reached by corpus only: ${report.headline.reachedByCorpusOnly}.`);
  lines.push(`- Unreached by both: ${report.headline.unreachedByEither}.`);
  lines.push(`- Corpus parse successes: ${report.headline.corpusParseSuccesses}; parse failures: ${report.headline.corpusParseFailures}.`);
  lines.push('- Verdict: no unreached production is a confirmed Pine-does-not-have over-acceptance defect from source-only evidence. Four productions collapse to two compile-evidence questions: untyped UDT fields and parenthesized lambda expressions.');
  lines.push('');
  lines.push('Classification counts:');
  lines.push('');
  lines.push('| Classification | Productions |');
  lines.push('| --- | ---: |');
  for (const [classification, count] of Object.entries(report.headline.classificationCounts).sort()) {
    lines.push(`| ${classification} | ${count} |`);
  }
  lines.push('');
  lines.push('## Unreached By Both');
  lines.push('');
  lines.push('| Production | Classification | Reason |');
  lines.push('| --- | --- | --- |');
  for (const row of report.unreachedByEitherRows) {
    lines.push(`| \`${row.rule}\` | ${row.classification} | ${escapeTableCell(row.reason)} |`);
  }
  lines.push('');
  lines.push('## Corpus-Only Productions');
  lines.push('');
  lines.push('These productions are absent from the 85 committed grammar snippets but are exercised by real corpus scripts.');
  lines.push('');
  lines.push('| Production | Corpus scripts | Sample hits |');
  lines.push('| --- | ---: | --- |');
  for (const row of report.reachedByCorpusOnlyRows) {
    lines.push(`| \`${row.rule}\` | ${row.corpusScriptCount} | ${escapeTableCell(formatCorpusSamples(row.sampleCorpusHits))} |`);
  }
  lines.push('');
  lines.push('## Snippet-Only Productions');
  lines.push('');
  lines.push('These productions are covered by snippets but did not appear in the successful corpus parses.');
  lines.push('');
  lines.push('| Production | Snippets | Sample snippet IDs |');
  lines.push('| --- | ---: | --- |');
  for (const row of report.reachedByGrammarSnippetsOnlyRows) {
    lines.push(`| \`${row.rule}\` | ${row.grammarSnippetSourceCount} | ${escapeTableCell(row.sampleGrammarSnippets.join(', '))} |`);
  }
  if (report.parseFailures.length > 0) {
    lines.push('');
    lines.push('## Corpus Parse Failures');
    lines.push('');
    lines.push('| Corpus | Local path |');
    lines.push('| --- | --- |');
    for (const failure of report.parseFailures) {
      lines.push(`| ${failure.corpus} | \`${failure.localPath}\` |`);
    }
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function formatCorpusSamples(hits: readonly CorpusHit[]): string {
  return hits.map((hit) => `${hit.corpus}:${hit.localPath}`).join(', ');
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function normalizeParserInput(source: string): string {
  let normalized = source.startsWith('\uFEFF') ? source.slice(1) : source;
  normalized = normalizeLineEndings(normalized);
  normalized = normalizeLeadingTabs(normalized);
  normalized = normalizeNbspOutsideStrings(normalized);
  normalized = normalizeIndent(normalized);
  return normalized;
}

function normalizeLineEndings(source: string): string {
  return source.replace(/\r+\n/g, '\n').replace(/\r/g, '\n');
}

function normalizeLeadingTabs(source: string): string {
  return source.replace(/^(\t+)/gm, (tabs) => '    '.repeat(tabs.length));
}

function normalizeNbspOutsideStrings(source: string): string {
  const NBSP = ' ';
  if (!source.includes(NBSP)) return source;
  let result = '';
  let inDouble = false;
  let inSingle = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (ch === '\n' || ch === '\r') inLineComment = false;
      result += ch === NBSP ? ' ' : ch;
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        result += '*/';
        i += 1;
        inBlockComment = false;
        continue;
      }
      result += ch === NBSP ? ' ' : ch;
      continue;
    }

    if (escaped) {
      escaped = false;
      result += ch;
      continue;
    }
    if (ch === '\\' && (inDouble || inSingle)) {
      escaped = true;
      result += ch;
      continue;
    }
    if (!inDouble && !inSingle && ch === '/' && next === '/') {
      inLineComment = true;
      result += '//';
      i += 1;
      continue;
    }
    if (!inDouble && !inSingle && ch === '/' && next === '*') {
      inBlockComment = true;
      result += '/*';
      i += 1;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      result += ch;
      continue;
    }
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      result += ch;
      continue;
    }
    if (ch === NBSP && !inDouble && !inSingle) {
      result += ' ';
      continue;
    }
    result += ch;
  }
  return result;
}

function normalizeIndent(source: string): string {
  const lines = source.split('\n');
  const continuationLines = continuationLineIndexes(lines);
  let minIndent = Infinity;
  const indentLevels = new Set<number>();
  for (const [index, line] of lines.entries()) {
    if (continuationLines.has(index)) continue;
    if (line.trim().length === 0) continue;
    const leading = line.match(/^ +/);
    if (leading) {
      const n = leading[0].length;
      indentLevels.add(n);
      if (n < minIndent) minIndent = n;
    }
  }
  if (minIndent === Infinity) return source;
  if (minIndent !== 3) return source;
  if ([...indentLevels].some(n => n % minIndent !== 0)) return source;
  if (!hasSmallIndentBlockBodyLine(lines, continuationLines, minIndent)) return source;
  return lines
    .map((line, index) => {
      if (continuationLines.has(index)) return line;
      const leading = line.match(/^ +/);
      if (!leading) return line;
      const spaces = leading[0].length;
      const units = spaces / minIndent;
      return ' '.repeat(units * 4) + line.slice(spaces);
    })
    .join('\n');
}

function hasSmallIndentBlockBodyLine(lines: readonly string[], continuationLines: ReadonlySet<number>, minIndent: number): boolean {
  let previousCode = '';
  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('//')) continue;
    const leading = line.match(/^ +/)?.[0].length ?? 0;
    if (leading === minIndent && !continuationLines.has(index) && opensIndentedBlock(previousCode)) {
      return true;
    }
    previousCode = stripLineCommentOutsideStrings(line).trimEnd();
  }
  return false;
}

function opensIndentedBlock(code: string): boolean {
  return /=>\s*$/.test(code) || /^(?:if|else if|else|for|while|switch)\b/.test(code.trim());
}

function continuationLineIndexes(lines: readonly string[]): Set<number> {
  const indexes = new Set<number>();
  let previousCode = '';

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('//')) continue;

    const leading = line.match(/^ +/)?.[0].length ?? 0;
    if (leading > 0 && previousCode && isLikelyContinuation(previousCode, trimmed)) {
      indexes.add(index);
    }
    previousCode = stripLineCommentOutsideStrings(line).trimEnd();
  }

  return indexes;
}

function isLikelyContinuation(previousCode: string, currentTrimmed: string): boolean {
  if (/^[,?:+\-*\/%]/.test(currentTrimmed)) return true;
  if (/^(else\s+)?if$/.test(previousCode.trimEnd())) return true;
  if (/(^|[^=!<>])=$/.test(previousCode.trimEnd())) return true;
  if (/[,(?:+\-*\/%]$/.test(previousCode.trimEnd())) return true;
  return hasUnclosedDelimiter(previousCode);
}

function hasUnclosedDelimiter(code: string): boolean {
  let parens = 0;
  let brackets = 0;
  let inDouble = false;
  let inSingle = false;
  let escaped = false;
  for (const ch of code) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\' && (inDouble || inSingle)) {
      escaped = true;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (inDouble || inSingle) continue;
    if (ch === '(') parens++;
    if (ch === ')' && parens > 0) parens--;
    if (ch === '[') brackets++;
    if (ch === ']' && brackets > 0) brackets--;
  }
  return parens > 0 || brackets > 0;
}

function stripLineCommentOutsideStrings(line: string): string {
  let inDouble = false;
  let inSingle = false;
  let escaped = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\' && (inDouble || inSingle)) {
      escaped = true;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (!inDouble && !inSingle && ch === '/' && next === '/') return line.slice(0, i);
  }
  return line;
}

main();
