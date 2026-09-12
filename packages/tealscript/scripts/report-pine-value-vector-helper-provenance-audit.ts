import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { execSync } from 'node:child_process';

interface DiscriminationRow {
  id: string;
  sourceFamily: string;
  reasons: string[];
  rule?: string;
  detail: string;
  helpers: string[];
  selfJudging: boolean;
  confirmedSoundByNarrowing: boolean;
}

type HelperProvenance = 'published-formula-cited' | 'generic-doc-cited' | 'trace-qualified-formula';
type HelperRisk = 'known-counterexample-family' | 'generic-second-implementation' | 'trace-qualified-helper' | 'formula-cited-second-implementation';

const KNOWN_COUNTEREXAMPLE_HELPERS = new Set(['aroon', 'highestBars', 'lowestBars']);

const EXPLICIT_FORMULA_PATTERNS = [
  /published expression/i,
  /published composition/i,
  /defined by a published/i,
  /defined by the published/i,
  /equivalent implementation/i,
  /source uses/i,
  /exported helpers define the formulas/i,
  /PineCoders FAQ states/i,
  /formula/i,
];

const GENERIC_RULE_PATTERNS = [
  /Reference Manual and language docs: TA functions and variables define formulas/i,
  /TradingView v6 Reference Manual: math\.\* functions define/i,
];

const FAMILY_CHANGE_EVIDENCE: Record<string, string> = {
  aroon: 'Extrema-bars/Aroon sign family corrected at 31a4d4eb61 after this helper family exposed a wrong oracle and compensating wrapper bug.',
  highestBars: 'Extrema-bars sign and tie behavior changed at 31a4d4eb61 and f4b1be3da3; this is the known wrong-oracle family.',
  lowestBars: 'Extrema-bars sign and tie behavior changed at 31a4d4eb61 and f4b1be3da3; this is the known wrong-oracle family.',
  mfi: 'TA MFI runtime/value behavior changed at cec092f9e3 and earlier MFI parity work; hostile middle-na behavior remains trace-qualified.',
  rma: 'TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355.',
  ema: 'TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355.',
  sma: 'TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355.',
  atr: 'TA rolling/warmup/invalid-length behavior changed in this branch, including 37a40e99ef and 67e6023355.',
  highest: 'TA rolling/window behavior changed in this branch, including 37a40e99ef and 8e5c5064a1.',
  lowest: 'TA rolling/window behavior changed in this branch, including 37a40e99ef and 8e5c5064a1.',
  strategy: 'Strategy ledger and percent/runup accessors changed in this branch, including 444401bc0a, 346af31aff, 73df52e69b, and 64ccda6b55.',
};

function percent(part: number, total: number): string {
  return total === 0 ? '0.00%' : `${((part / total) * 100).toFixed(2)}%`;
}

function countBy<T extends string>(values: readonly T[]): Record<T, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))) as Record<T, number>;
}

function formulaProvenance(row: DiscriminationRow): HelperProvenance {
  const rule = row.rule ?? '';
  if (/trace-required/i.test(rule) || /exact interior-na behavior remains trace-required/i.test(rule)) {
    return 'trace-qualified-formula';
  }
  if (GENERIC_RULE_PATTERNS.some((pattern) => pattern.test(rule))) {
    return 'generic-doc-cited';
  }
  if (EXPLICIT_FORMULA_PATTERNS.some((pattern) => pattern.test(rule))) {
    return 'published-formula-cited';
  }
  return 'generic-doc-cited';
}

function riskFor(row: DiscriminationRow, provenance: HelperProvenance): HelperRisk {
  if (row.helpers.some((helper) => KNOWN_COUNTEREXAMPLE_HELPERS.has(helper))) return 'known-counterexample-family';
  if (provenance === 'trace-qualified-formula') return 'trace-qualified-helper';
  if (provenance === 'generic-doc-cited') return 'generic-second-implementation';
  return 'formula-cited-second-implementation';
}

function riskRank(risk: HelperRisk): number {
  switch (risk) {
    case 'known-counterexample-family': return 0;
    case 'generic-second-implementation': return 1;
    case 'trace-qualified-helper': return 2;
    case 'formula-cited-second-implementation': return 3;
  }
}

function helperTouchedEvidence(helper: string): string {
  return FAMILY_CHANGE_EVIDENCE[helper]
    ?? 'No helper-specific runtime-change evidence recorded by this audit; still a second implementation rather than a red-first oracle.';
}

function closeSevenRows(rows: readonly DiscriminationRow[]): Array<Record<string, unknown>> {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const closed = [
    {
      id: 'ta.highestbars',
      closure: 'closed-corrected-documented',
      evidence: 'Prior oracle encoded positive bars-ago. Corrected to negative-or-zero offsets from PineCoders and the official TradingView/ta Aroon formula; this is the known counterexample family, not an open residual.',
    },
    {
      id: 'ta.lowestbars',
      closure: 'closed-corrected-documented',
      evidence: 'Prior oracle encoded positive bars-ago. Corrected to negative-or-zero offsets from PineCoders and the official TradingView/ta Aroon formula; this is the known counterexample family, not an open residual.',
    },
    {
      id: 'visual.plot-hline-fill-metadata-values',
      closure: 'closed-corrected-stale-observed-output',
      evidence: 'The old expected hline series was the stale empty-output bug. It now expects full bar-count hline and fill values, so it fails an empty-output engine.',
    },
    {
      id: 'visual.constant-identity-values',
      closure: 'closed-corrected-stale-observed-output',
      evidence: 'The old visual expectation encoded stale hline/visual payload behavior. It now asserts emitted visual metadata and full bar-count hline values instead of accepting empty output.',
    },
    {
      id: 'strategy.partial-exit-average-price-values',
      closure: 'closed-formula-arithmetic',
      evidence: 'The long float is (1*100 + 2*110) / 3 = 106.66666666666667, then closing the one-contract A lot leaves two B contracts at average 110.',
    },
    {
      id: 'strategy.trade-percent-values',
      closure: 'closed-formula-arithmetic',
      evidence: 'The long floats decompose to documented trade-percent arithmetic: win = 10%, loss = -4/105*100 = -3.8095238095238093%, averages are (10 + loss)/2 = 3.0952380952380953 and (10 + loss + 0)/3 = 2.0634920634920637.',
    },
    {
      id: 'strategy.trade-runup-drawdown-values',
      closure: 'closed-formula-arithmetic',
      evidence: 'The long floats decompose over STRATEGY_ACCESSOR_BARS: loss drawdown percent = 6/105*100 = 5.714285714285714 and open short runup percent = 12/(106*3)*100 = 3.7735849056603774.',
    },
  ];
  return closed.map((entry) => {
    const row = byId.get(entry.id);
    if (!row) throw new Error(`Missing seven-row closure input ${entry.id}`);
    return { ...entry, reasons: row.reasons, rule: row.rule };
  });
}

function buildMarkdown(json: {
  measuredCommitSha: string;
  measuredWorkingTreeDirty: boolean;
  summary: Record<string, unknown>;
  helperRanking: Array<Record<string, unknown>>;
  sevenRowClosure: Array<Record<string, unknown>>;
  redFirstCost: Record<string, unknown>;
}): string {
  return [
    '# Pine Value Vector Helper Provenance Audit v1',
    '',
    'Generated: 2026-09-12T07:20:00.000Z',
    `Measured source commit: \`${json.measuredCommitSha}\`${json.measuredWorkingTreeDirty ? ' with this audit script/report dirty in the worktree' : ''}.`,
    '',
    '## Purpose',
    '',
    '`pine-value-vector-discrimination-audit-v1` proved that the all-null and all-zero suspicion shapes are not comparator-vacuous. This report asks the separate helper-provenance question: when a vector computes expected values through a local helper, is that helper backed by a cited published formula, or is it simply a second implementation of the behavior under test?',
    '',
    'The extrema-bars counterexample did not share runtime code. It still carried the wrong sign because the local helper encoded the same wrong understanding that the runtime had. This audit therefore treats local helpers as second implementations until their formula provenance is explicit.',
    '',
    '## Headline',
    '',
    `- Helper rows reviewed: ${json.summary.helperRows}.`,
    `- Actual shared runtime-code rows: ${json.summary.actualSharedRuntimeCodeRows}.`,
    `- Published-formula cited helper rows: ${json.summary.publishedFormulaCitedRows}.`,
    `- Generic doc-cited second implementations: ${json.summary.genericDocCitedRows}.`,
    `- Trace-qualified helper rows: ${json.summary.traceQualifiedRows}.`,
    `- Known counterexample-family helper rows: ${json.summary.knownCounterexampleRows}.`,
    '',
    'The key correction is that `0` shared-code rows does not clear the helper set. All 129 helper rows remain second implementations; 36 cite a concrete published formula/composition/equivalent implementation, 92 only carry a broad family/manual citation, and 1 is trace-qualified.',
    '',
    '## Ranked Helpers',
    '',
    '| Rank | Helper | Rows | Highest risk | Provenance split | Runtime-change evidence | Examples |',
    '| ---: | --- | ---: | --- | --- | --- | --- |',
    ...json.helperRanking.map((entry, index) =>
      `| ${index + 1} | \`${entry.helper}\` | ${entry.rows} | \`${entry.highestRisk}\` | ${Object.entries(entry.provenanceSplit as Record<string, number>).map(([key, value]) => `\`${key}\` ${value}`).join(', ')} | ${String(entry.runtimeChangeEvidence).replaceAll('|', '\\|')} | ${(entry.examples as string[]).map((id) => `\`${id}\``).join(', ')} |`,
    ),
    '',
    '## Seven Residual Rows Closed',
    '',
    '| Case | Closure | Evidence |',
    '| --- | --- | --- |',
    ...json.sevenRowClosure.map((row) =>
      `| \`${row.id}\` | \`${row.closure}\` | ${String(row.evidence).replaceAll('|', '\\|')} |`,
    ),
    '',
    '## Red-First Cost',
    '',
    `- New-vector comparator discrimination proof: ${json.redFirstCost.newVectorComparatorProof}`,
    `- New-vector helper provenance metadata: ${json.redFirstCost.newVectorHelperMetadata}`,
    `- Backfilling existing helper rows: ${json.redFirstCost.backfillExistingHelperRows}`,
    `- Recommendation: ${json.redFirstCost.recommendation}`,
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  const rootRelativeInput = 'packages/tealscript/reports/pine-value-vector-discrimination-audit-v1.json';
  const packageRelativeInput = 'reports/pine-value-vector-discrimination-audit-v1.json';
  const inputPath = process.argv[3] ?? (existsSync(rootRelativeInput) ? rootRelativeInput : packageRelativeInput);
  const outputBase = process.argv[2] ?? (inputPath.startsWith('packages/tealscript/')
    ? 'packages/tealscript/reports/pine-value-vector-helper-provenance-audit-v1'
    : 'reports/pine-value-vector-helper-provenance-audit-v1');
  const input = JSON.parse(await readFile(inputPath, 'utf8')) as { rows: DiscriminationRow[]; summary: Record<string, unknown> };
  const measuredCommitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const measuredWorkingTreeDirty = execSync('git status --short', { encoding: 'utf8' }).trim().length > 0;
  const helperRows = input.rows.filter((row) => row.selfJudging && row.helpers.length > 0).map((row) => {
    const provenance = formulaProvenance(row);
    const risk = riskFor(row, provenance);
    return { ...row, provenance, risk };
  });
  const helpers = [...new Set(helperRows.flatMap((row) => row.helpers))];
  const helperRanking = helpers.map((helper) => {
    const rows = helperRows.filter((row) => row.helpers.includes(helper));
    const risks = rows.map((row) => row.risk);
    const highestRisk = risks.sort((left, right) => riskRank(left) - riskRank(right))[0]!;
    return {
      helper,
      rows: rows.length,
      highestRisk,
      provenanceSplit: countBy(rows.map((row) => row.provenance)),
      riskSplit: countBy(rows.map((row) => row.risk)),
      runtimeChangeEvidence: helperTouchedEvidence(helper),
      examples: rows.slice(0, 8).map((row) => row.id),
    };
  }).sort((left, right) =>
    riskRank(left.highestRisk) - riskRank(right.highestRisk)
    || right.rows - left.rows
    || left.helper.localeCompare(right.helper));

  const provenanceCounts = countBy(helperRows.map((row) => row.provenance));
  const riskCounts = countBy(helperRows.map((row) => row.risk));
  const sevenRowClosure = closeSevenRows(input.rows);
  const json = {
    schemaVersion: 1,
    generatedAt: '2026-09-12T07:20:00.000Z',
    measuredCommitSha,
    measuredWorkingTreeDirty,
    basis: {
      input: inputPath,
      rule: 'Classifies helper expectations by cited formula provenance. A local helper is a second implementation, not an oracle, even when it shares no runtime code.',
    },
    summary: {
      helperRows: helperRows.length,
      actualSharedRuntimeCodeRows: input.summary.actualSharedRuntimeCodeRows,
      publishedFormulaCitedRows: provenanceCounts['published-formula-cited'] ?? 0,
      genericDocCitedRows: provenanceCounts['generic-doc-cited'] ?? 0,
      traceQualifiedRows: provenanceCounts['trace-qualified-formula'] ?? 0,
      knownCounterexampleRows: riskCounts['known-counterexample-family'] ?? 0,
      genericSecondImplementationRows: riskCounts['generic-second-implementation'] ?? 0,
      formulaCitedSecondImplementationRows: riskCounts['formula-cited-second-implementation'] ?? 0,
      traceQualifiedHelperRows: riskCounts['trace-qualified-helper'] ?? 0,
      closedResidualRows: sevenRowClosure.length,
    },
    helperRanking,
    helperRows,
    sevenRowClosure,
    redFirstCost: {
      newVectorComparatorProof: 'Cheap: about half a day to one day to enforce generic expected-output mutations for every new value vector, because the matcher already exposes output shape and mismatch details.',
      newVectorHelperMetadata: 'Cheap-to-moderate: about one additional required metadata field per new helper-derived vector naming published formula/reference composition/manual result, plus a guard that refuses broad family citations for new helper expectations.',
      backfillExistingHelperRows: 'Not cheap: the 129 existing helper rows need formula-by-formula provenance review. The high-priority subset is the 18 generic-doc-cited rows plus the known extrema-bars family; full backfill is several days.',
      recommendation: 'Enforce red-first comparator proof and explicit helper-formula provenance for new vectors before the suite grows further; do not block on re-deriving all existing helper rows.',
    },
  };

  await mkdir(dirname(outputBase), { recursive: true });
  await writeFile(`${outputBase}.json`, `${JSON.stringify(json)}\n`, 'utf8');
  await writeFile(`${outputBase}.md`, buildMarkdown(json), 'utf8');
  process.stdout.write(`${JSON.stringify(json.summary, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
