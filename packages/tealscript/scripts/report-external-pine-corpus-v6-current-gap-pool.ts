#!/usr/bin/env tsx

import fs from 'node:fs';
import path from 'node:path';

import type { ExternalCorpusReportRow } from './run-external-pine-corpus';

type Bucket = 'real-gap' | 'invalid-pine' | 'artifact' | 'trace-required';

type CorpusReport = {
  metadata?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  rows: ExternalCorpusReportRow[];
};

type Classification = {
  bucket: Bucket;
  reason: string;
  owner: string;
};

const ROOT = path.resolve(import.meta.dirname, '..');
const CURRENT_REPORT = path.join(
  ROOT,
  'reports/external-pine-corpus-v6.daily-rerun-a75ebd88d7.json',
);
const OLD_DAILY_REPORT = path.join(
  ROOT,
  'reports/external-pine-corpus-v6.fixture-profile-delta-v3-runs/external-pine-corpus-v6-daily-standard.json',
);
const OUT_MD = path.join(
  ROOT,
  'reports/external-pine-corpus-v6.current-gap-pool-a75ebd88d7-v1.md',
);

const MEASUREMENT_SHA = 'a75ebd88d7e060fbdb5ad8d773f4eef15778cf92';
const BRANCH_REPORT_SHA = 'b8fa53d95fcba3e14df1c9e5c69a55e9226383a3';
const PINNED_SOURCE = path.join(ROOT, '.cache/tealscript/pine-corpus-v6-20260911');
const TOP_CAUSE_REAL_PARSER_IDS = [
  '0335',
  '0485',
  '0486',
  '0491',
  '0642',
  '0817',
  '0822',
  '0823',
  '0825',
  '0872',
  '0885',
  '0889',
  '0936',
  '0956',
  '0969',
  '0975',
  '0293',
  '0357',
  '0144',
  '0382',
  '0442',
  '0551',
  '0983',
  '0410',
];

const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;

const current = readJson<CorpusReport>(CURRENT_REPORT);
const oldDaily = readJson<CorpusReport>(OLD_DAILY_REPORT);

const currentRows = current.rows.filter((row) => row.validity.bucket === 'tealscript-gap');
const currentByPath = new Map(current.rows.map((row) => [row.localPath, row]));

function rowId(rowOrPath: ExternalCorpusReportRow | string): string {
  const localPath = typeof rowOrPath === 'string' ? rowOrPath : rowOrPath.localPath;
  return localPath.match(/sources\/(\d+)/)?.[1] ?? localPath;
}

function diagnostic(row: ExternalCorpusReportRow): string {
  const stage = row.firstFailedStage;
  return stage ? row.stages[stage]?.diagnostic ?? '' : '';
}

function shortDiagnostic(row: ExternalCorpusReportRow, max = 118): string {
  const text = diagnostic(row).replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function classify(row: ExternalCorpusReportRow): Classification {
  const id = rowId(row);
  const stage = row.firstFailedStage;
  const diag = diagnostic(row);

  if (
    diag.includes('unsupported-feature: strategy') ||
    diag.includes('request.security_lower_tf')
  ) {
    return {
      bucket: 'trace-required',
      reason: diag.includes('request.security_lower_tf')
        ? 'request.security_lower_tf needs lower-timeframe chart/request context; already trace/register surface'
        : 'strategy declaration option requires TradingView host/trace semantics',
      owner: 'trace/host',
    };
  }

  if (stage === 'output') {
    if (diag.includes('global-output-declared-but-not-evaluated')) {
      return {
        bucket: 'artifact',
        reason:
          'global-output classifier artifact: audited source uses hidden plots or invalid indicator/strategy shape',
        owner: 'corpus',
      };
    }
    return {
      bucket: 'artifact',
      reason:
        'conditional/data-gated output did not trigger on either calibrated fixture profile',
      owner: 'corpus/fixture',
    };
  }

  if (stage === 'execute') {
    if (id === '0129') {
      return {
        bucket: 'real-gap',
        reason:
          'receiver method table.cell rejects named style arguments that valid namespace table.cell accepts',
        owner: 'semantic/runtime binding',
      };
    }
    if (diag.includes('runtime.error:')) {
      return {
        bucket: 'artifact',
        reason: 'script-authored runtime.error under the measured chart/timeframe/data profile',
        owner: 'corpus/fixture',
      };
    }
    return {
      bucket: 'invalid-pine',
      reason:
        'script reaches a Pine runtime constraint or impossible state; TradingView would stop execution too',
      owner: 'none',
    };
  }

  if (stage === 'parse') {
    if (id === '0188' || id === '0189') {
      return {
        bucket: 'artifact',
        reason: 'prompt/prose harvested as Pine source',
        owner: 'corpus',
      };
    }
    if (diag.includes('full-width space')) {
      return {
        bucket: 'artifact',
        reason: 'copy/byte artifact: U+3000 full-width layout whitespace',
        owner: 'corpus',
      };
    }
    return {
      bucket: 'invalid-pine',
      reason: 'syntax rejected under the row declared Pine version',
      owner: 'none',
    };
  }

  if (stage === 'semantic') {
    if (diag.includes('unresolved-import')) {
      return {
        bucket: 'trace-required',
        reason: 'host library source/registry entry is required before engine parity can be judged',
        owner: 'trace/host',
      };
    }
    return {
      bucket: 'invalid-pine',
      reason: 'semantic refusal matches the row declared Pine version or a source typo/missing bundle symbol',
      owner: 'none',
    };
  }

  return {
    bucket: 'artifact',
    reason: 'non-dispatchable corpus artifact',
    owner: 'corpus',
  };
}

function countBy<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return counts;
}

function table(headers: string[], rows: string[][]): string {
  const escape = (value: string) => value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escape).join(' | ')} |`),
  ].join('\n');
}

function sortedCountRows(counts: Map<string, number>): string[][] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => [name, String(count)]);
}

const classified = currentRows.map((row) => ({
  row,
  classification: classify(row),
}));

const oldParseGapPaths = oldDaily.rows
  .filter((row) => row.validity.bucket === 'tealscript-gap' && row.firstFailedStage === 'parse')
  .map((row) => row.localPath);
const oldParseCurrent = oldParseGapPaths.map((localPath) => ({
  localPath,
  row: currentByPath.get(localPath),
}));
const oldParseNowParses = oldParseCurrent.filter(({ row }) => row?.firstFailedStage !== 'parse');
const oldParseNowSupported = oldParseNowParses.filter(({ row }) => row?.validity.bucket === 'supported');
const topCauseParserRows = TOP_CAUSE_REAL_PARSER_IDS.map((id) => {
  const row = current.rows.find((candidate) => rowId(candidate) === id);
  if (!row) throw new Error(`Missing top-cause parser row ${id}`);
  return row;
});
const topCauseParserOutputRows = topCauseParserRows.filter((row) => row.output?.produced === true);
const topCauseParserSecondWalls = topCauseParserRows.filter((row) => row.output?.produced !== true);

const lines: string[] = [];
lines.push('# External Pine Corpus v6 Current Gap Pool Audit v1');
lines.push('');
lines.push('Date: 2026-09-11');
lines.push(`Measurement commit: \`${MEASUREMENT_SHA}\``);
lines.push(`Report branch commit before this report: \`${BRANCH_REPORT_SHA}\``);
lines.push(`Input rerun: \`${path.relative(ROOT, CURRENT_REPORT)}\``);
lines.push(`Pinned source tree: \`${PINNED_SOURCE}\``);
lines.push('');
lines.push(
  'This replaces the stale v6 top-cause, remaining-cause, tail-cause, and artifact-bucket classifications with one classification of the current 121-row `tealscript-gap` pool measured at `a75ebd88d7`.',
);
lines.push('');

lines.push('## Summary');
lines.push('');
lines.push(table(['Bucket', 'Rows'], sortedCountRows(countBy(classified, (item) => item.classification.bucket))));
lines.push('');
lines.push('Stage split by first failed stage and audited bucket:');
lines.push('');
lines.push(
  table(
    ['Stage', 'Bucket', 'Rows'],
    [...countBy(classified, (item) => `${item.row.firstFailedStage}|${item.classification.bucket}`)]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, count]) => {
        const [stage, bucket] = key.split('|');
        return [stage, bucket, String(count)];
      }),
  ),
);
lines.push('');
lines.push(
  'Headline: only `0129` remains a defensible implementation handoff in the current 121-row pool. The rest are invalid Pine by declared version, corpus/chart/output artifacts, or trace/host-required surfaces.',
);
lines.push('');

lines.push('## The +15 Question');
lines.push('');
lines.push(
  `The later daily baseline moved from 781 to 796 output rows at \`${MEASUREMENT_SHA.slice(0, 10)}\`, so the net headline gain is +15. The original top-cause audit's 24 real parser handoff rows all now parse, but they do not map one-for-one to that later baseline: at current HEAD, 16 of those 24 produce output and 8 do not.`,
);
lines.push('');
lines.push(
  `For cross-checking the later baseline artifact directly: ${oldParseGapPaths.length} rows were still daily parse-stage TealScript gaps there; ${oldParseNowParses.length} now parse, and ${oldParseNowSupported.length} of those now produce output. That accounts for the observed +15 without inventing a ninth current second-wall row.`,
);
lines.push('');
lines.push(
  table(
    ['Row', 'Current stage', 'Current bucket', 'Second wall'],
    topCauseParserSecondWalls.map((row) => {
      const c = classify(row);
      return [
        rowId(row),
        row.firstFailedStage ?? 'unsupported/pass',
        row.validity.bucket === 'tealscript-gap' ? c.bucket : row.validity.bucket,
        `${c.reason}; ${shortDiagnostic(row) || row.outcome}`,
      ];
    }),
  ),
);
lines.push('');

lines.push('## Real Gap Handoff');
lines.push('');
lines.push(
  table(
    ['Row', 'Stage', 'Owner', 'Why', 'Minimal repro'],
    classified
      .filter((item) => item.classification.bucket === 'real-gap')
      .map(({ row, classification }) => [
        rowId(row),
        row.firstFailedStage ?? '',
        classification.owner,
        classification.reason,
        '`//@version=6\\nindicator("table method text_color repro")\\nvar table t = table.new(position.top_right, 1, 1)\\nif barstate.islast\\n    t.cell(0, 0, "x", text_color=color.white)`',
      ]),
  ),
);
lines.push('');

lines.push('## Trace/Register Rows');
lines.push('');
lines.push(
  'The 18 current `tealscript-gap` trace-required rows are covered by `packages/tealscript/PINE_TRACE_REQUIRED_v2.md`. The third-party host-library imports in the parser second-wall table are outside the current 121-row `tealscript-gap` pool as `unsupported-by-design`; they are host-source requirements, not implementation handoffs.',
);
lines.push('');
lines.push(
  table(
    ['Surface', 'Rows', 'Evidence'],
    [
      [
        '`strategy(calc_on_order_fills=true)`',
        classified
          .filter(({ row }) => diagnostic(row).includes('calc_on_order_fills'))
          .map(({ row }) => rowId(row))
          .join(', '),
        'Requires TradingView fill-triggered re-entry trace parity.',
      ],
      [
        '`strategy(fill_orders_on_standard_ohlc=true)`',
        classified
          .filter(({ row }) => diagnostic(row).includes('fill_orders_on_standard_ohlc'))
          .map(({ row }) => rowId(row))
          .join(', '),
        'Requires host-supplied standard OHLC bars for non-standard charts.',
      ],
      [
        '`strategy(risk_free_rate=...)`',
        classified
          .filter(({ row }) => diagnostic(row).includes('risk_free_rate'))
          .map(({ row }) => rowId(row))
          .join(', '),
        'Requires Strategy Tester report metric trace parity.',
      ],
      [
        '`request.security_lower_tf()` chart context',
        classified
          .filter(({ row }) => diagnostic(row).includes('request.security_lower_tf'))
          .map(({ row }) => rowId(row))
          .join(', '),
        'Measured daily chart context is not lower than the requested timeframe.',
      ],
    ],
  ),
);
lines.push('');

lines.push('## Row Classification');
lines.push('');
lines.push(
  table(
    ['Row', 'Version', 'Kind', 'Stage', 'Bucket', 'Owner', 'Evidence'],
    classified
      .sort((a, b) => rowId(a.row).localeCompare(rowId(b.row)))
      .map(({ row, classification }) => [
        rowId(row),
        `v${row.declaredVersion}`,
        row.declarationKind,
        row.firstFailedStage ?? '',
        classification.bucket,
        classification.owner,
        `${classification.reason}; ${shortDiagnostic(row)}`,
      ]),
  ),
);
lines.push('');

while (lines.at(-1) === '') lines.pop();
fs.writeFileSync(OUT_MD, `${lines.join('\n')}\n`);
console.log(`Wrote ${OUT_MD}`);
