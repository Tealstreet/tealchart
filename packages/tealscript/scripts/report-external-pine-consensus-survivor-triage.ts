import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const PACKAGE_ROOT = resolve(import.meta.dirname, '..');
const REPO_ROOT = resolve(PACKAGE_ROOT, '../..');
const CROSSCHECK_PATH = resolve(PACKAGE_ROOT, 'reports/external-pine-consensus-vector-crosscheck-v1.json');
const CONSENSUS_PATH = resolve(PACKAGE_ROOT, 'reports/external-pine-consensus-full-v1.json');
const PINETS_GRAMMAR_AUDIT_PATH = resolve(PACKAGE_ROOT, 'reports/external-pine-consensus-pinets-grammar-precedence-audit-v1.json');
const OUT_JSON = resolve(PACKAGE_ROOT, 'reports/external-pine-consensus-survivor-triage-v1.json');
const OUT_MD = resolve(PACKAGE_ROOT, 'reports/external-pine-consensus-survivor-triage-v1.md');

type Provenance = 'external-consensus' | 'pinets-sole' | 'pine-a-script-sole' | 'none';

interface CrosscheckRow {
  key: string;
  cause: string;
  provenance: Provenance;
  differenceClass: string;
  firstDifference: string;
  disposition: string;
  reason: string;
}

interface ConsensusRow {
  corpus: string;
  rowId: string;
  localPath: string;
}

interface PineTSContaminationFamily {
  id: string;
  why: string;
  count: number;
  allKeys: string[];
}

interface PineTSGrammarAudit {
  summary: {
    contaminatedSurvivingValueCandidates: number;
    contaminatedPinetsSoleCanonRows: number;
    contaminatedPinetsSoleDifferingRows: number;
    verdict: string;
  };
  contamination: {
    survivorTotal: number;
    pinetsSoleCanonTotal: number;
    pinetsSoleDifferingTotal: number;
    survivors: PineTSContaminationFamily[];
    pinetsSoleCanon: PineTSContaminationFamily[];
    pinetsSoleDiffering: PineTSContaminationFamily[];
  };
}

interface ParsedPlotDifference {
  plotIndex: number;
  barIndex: number;
  canonicalValue: number | null;
  tealscriptValue: number | null;
}

interface RefusalClassification {
  key: string;
  classification: 'correct-refusal-invalid-pine' | 'correct-refusal-host-or-request-context' | 'real-tealscript-gap';
  evidence: string;
  owner?: string;
}

const RUNTIME_REFUSALS: RefusalClassification[] = [
  {
    key: 'v5 0902',
    classification: 'correct-refusal-invalid-pine',
    evidence: 'Line 34 calls empty_pop.pop() on a freshly empty array. Pine runtime errors on pop() from an empty array; PineTS treats it as na.',
  },
  {
    key: 'v5 0927',
    classification: 'correct-refusal-invalid-pine',
    evidence: 'Lines 3-4 are an import-negative fixture: import notlib as n, with the source comment stating the imported script has no library() declaration.',
  },
  {
    key: 'v5 0945',
    classification: 'correct-refusal-invalid-pine',
    evidence: 'Line 82 passes math.round(y * tc) as a table row. y depends on early-bar TA output and is na, so the row coordinate becomes NaN.',
  },
  {
    key: 'v5 0984',
    classification: 'correct-refusal-host-or-request-context',
    evidence: 'Line 80 calls request.security_lower_tf(..., tf, ...), and tf defaults to an empty timeframe on the daily chart fixture. That is not lower than the chart timeframe.',
  },
  {
    key: 'v6 0168',
    classification: 'correct-refusal-invalid-pine',
    evidence: 'Line 5 calls matrix.copy(values).pow(-1). Matrix powers must be non-negative integers.',
  },
  {
    key: 'v6 0266',
    classification: 'correct-refusal-host-or-request-context',
    evidence: 'Same LuxAlgo daily lower-timeframe source as v5 0984: request.security_lower_tf uses the default empty timeframe against the daily chart fixture.',
  },
  {
    key: 'v6 0317',
    classification: 'correct-refusal-invalid-pine',
    evidence: 'Lines 3-4 create a 2x1 table and then write column 2, row 0; valid columns are 0 and 1 only.',
  },
  {
    key: 'v6 0444',
    classification: 'correct-refusal-invalid-pine',
    evidence: 'Lines 3-4 create a 2x1 table and then write row 1; valid row is 0 only.',
  },
  {
    key: 'v6 0513',
    classification: 'correct-refusal-invalid-pine',
    evidence: 'Lines 3-4 create a 2x1 table and merge through column 2; valid columns are 0 and 1 only.',
  },
  {
    key: 'v6 0556',
    classification: 'correct-refusal-invalid-pine',
    evidence: 'Lines 39-41 are a script-authored runtime.error when the supply/demand timeframe is below the chart timeframe; the deterministic chart context trips that guard.',
  },
  {
    key: 'v6 0670',
    classification: 'correct-refusal-invalid-pine',
    evidence: 'Lines 3-4 create array.new_int(100000) and then array.unshift another element, exceeding Pine array size limits.',
  },
  {
    key: 'v6 0681',
    classification: 'correct-refusal-invalid-pine',
    evidence: 'Lines 3-4 create a 2x1 table and then set row 1; valid row is 0 only.',
  },
  {
    key: 'v6 0910',
    classification: 'correct-refusal-invalid-pine',
    evidence: 'Line 67 uses JavaScript-style || in a Pine expression. Pine uses word operators such as or.',
  },
  {
    key: 'v7 0002',
    classification: 'correct-refusal-invalid-pine',
    evidence: 'Lines 7 and 10 add a length-3 array as a column to a 1-row matrix; the column length does not match the row count.',
  },
  {
    key: 'v7 0004',
    classification: 'correct-refusal-invalid-pine',
    evidence: 'Lines 6 and 10 add a length-3 array as a column to a 1-row matrix; the column length does not match the row count.',
  },
  {
    key: 'v7 0149',
    classification: 'correct-refusal-invalid-pine',
    evidence: 'Lines 4-5 call matrix.eigenvalues() on a 2x3 matrix. Eigenvalues require a square matrix.',
  },
  {
    key: 'v7 0153',
    classification: 'correct-refusal-invalid-pine',
    evidence: 'Lines 6-10 mutate float_rows to 2x3, then add a length-2 eigenvalue row; row length does not match the column count.',
  },
  {
    key: 'v7 0159',
    classification: 'real-tealscript-gap',
    owner: 'runtime/codegen',
    evidence: 'The source is a declared-v6 coverage fixture whose matrix.det target is a 2x2 matrix at line 12. TealScript later reports determinant on a 4x2 matrix; source read does not justify the refusal.',
  },
  {
    key: 'v7 0162',
    classification: 'correct-refusal-invalid-pine',
    evidence: 'Lines 4-5 call matrix.eigenvectors() on a 2x3 matrix. Eigenvectors require a square matrix.',
  },
  {
    key: 'v7 0192',
    classification: 'correct-refusal-invalid-pine',
    evidence: 'Lines 4-5 remove column 1 from a 1x1 matrix; valid column is 0 only.',
  },
  {
    key: 'v7 0193',
    classification: 'correct-refusal-invalid-pine',
    evidence: 'Lines 4-5 remove column int(na) from a 1x1 matrix; NaN is not a valid column index.',
  },
  {
    key: 'v7 0213',
    classification: 'correct-refusal-invalid-pine',
    evidence: 'Lines 4-5 swap column 1 in a 1x1 matrix; valid column is 0 only.',
  },
  {
    key: 'v7 0214',
    classification: 'correct-refusal-invalid-pine',
    evidence: 'Lines 4-5 swap column int(na) in a 1x1 matrix; NaN is not a valid column index.',
  },
  {
    key: 'v7-size-recovery 0009',
    classification: 'real-tealscript-gap',
    owner: 'runtime/codegen',
    evidence: 'Large declared-v6 Pine-A-Script source uses ordinary receiver methods with receiver parameter named this at lines 142, 256, and 279. TealScript fails during generated-JS compilation, not with a Pine-facing source diagnostic.',
  },
  {
    key: 'v7-size-recovery 0022',
    classification: 'correct-refusal-invalid-pine',
    evidence: 'Lines 21 and 428-505 declare max_bars_back=0 and then repeatedly read label handles with [1]. The explicit zero history budget cannot satisfy those history reads.',
  },
];

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function gitHead(): string {
  return execFileSync('git', ['-C', REPO_ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

function gitDirtyIgnoringOutputs(): boolean {
  const ignored = new Set([
    'packages/tealscript/reports/external-pine-consensus-survivor-triage-v1.json',
    'packages/tealscript/reports/external-pine-consensus-survivor-triage-v1.md',
  ]);
  return execFileSync('git', ['-C', REPO_ROOT, 'status', '--porcelain'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .some((line) => !ignored.has(line.slice(3)));
}

function countBy<T extends string>(items: T[]): Record<T, number> {
  const out = {} as Record<T, number>;
  for (const item of items) out[item] = (out[item] ?? 0) + 1;
  return out;
}

function provenanceCounts(rows: CrosscheckRow[]): Record<string, number> {
  return countBy(rows.map((row) => row.provenance));
}

function sourceFamily(localPath: string): string {
  const base = basename(localPath, '.pine').replace(/^\d+__/, '');
  if (base.includes('pine-compat-runtime')) return 'pine-compat-runtime fixtures';
  if (base.includes('coverage-')) return 'coverage fixtures';
  return base.split('__')[0].replace(/[-_]?\d+$/, '').slice(0, 80);
}

function renderGroupTable(groups: Array<{ label: string; rows: CrosscheckRow[]; provenance: Record<string, number>; examples: string[] }>): string[] {
  const lines = ['| Cluster | Rows | Provenance | Examples |', '|---|---:|---|---|'];
  for (const group of groups) {
    const provenance = Object.entries(group.provenance).map(([key, value]) => `${key}:${value}`).join(', ').replace(/\|/g, '\\|');
    lines.push(`| ${group.label.replace(/\|/g, '\\|')} | ${group.rows.length} | ${provenance} | ${group.examples.join('<br>').replace(/\|/g, '\\|')} |`);
  }
  return lines;
}

function contaminationByKey(families: PineTSContaminationFamily[]): Map<string, PineTSContaminationFamily[]> {
  const out = new Map<string, PineTSContaminationFamily[]>();
  for (const family of families) {
    for (const key of family.allKeys) {
      const rows = out.get(key) ?? [];
      rows.push(family);
      out.set(key, rows);
    }
  }
  return out;
}

function contaminationFamilyCounts(rows: CrosscheckRow[], contaminated: Map<string, PineTSContaminationFamily[]>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    for (const family of contaminated.get(row.key) ?? []) counts[family.id] = (counts[family.id] ?? 0) + 1;
  }
  return counts;
}

function parseValue(value: string): number | null {
  if (value === 'null') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Unexpected non-finite plot difference value: ${value}`);
  return parsed;
}

function parsePlotDifference(row: CrosscheckRow): ParsedPlotDifference {
  const match = row.firstDifference.match(/^plot\[(\d+)\]\[(\d+)\] ([^ ]+) != ([^ ]+)$/);
  if (!match) throw new Error(`Cannot parse plot value difference for ${row.key}: ${row.firstDifference}`);
  return {
    plotIndex: Number(match[1]),
    barIndex: Number(match[2]),
    canonicalValue: parseValue(match[3]),
    tealscriptValue: parseValue(match[4]),
  };
}

function rowExample(row: CrosscheckRow): string {
  return `\`${row.key}\` ${row.firstDifference}`;
}

function splitLaterNaVsFinite(rows: CrosscheckRow[]): Record<string, unknown> {
  const enriched = rows.map((row) => ({ row, parsed: parsePlotDifference(row) }));
  const tealscriptNull = enriched.filter(({ parsed }) => parsed.canonicalValue !== null && parsed.tealscriptValue === null);
  const externalNull = enriched.filter(({ parsed }) => parsed.canonicalValue === null && parsed.tealscriptValue !== null);
  const deepTealscriptNull = tealscriptNull.filter(({ parsed }) => parsed.barIndex >= 10);
  const deepExternalNull = externalNull.filter(({ parsed }) => parsed.barIndex >= 10);
  return {
    note: 'firstDifference stores canonical external value first and TealScript value second',
    rows: rows.length,
    tealscriptNullExternalFinite: {
      rows: tealscriptNull.length,
      deepRowsAtBar10OrLater: deepTealscriptNull.length,
      barIndices: tealscriptNull.map(({ parsed }) => parsed.barIndex).sort((a, b) => a - b),
      examples: tealscriptNull.slice(0, 12).map(({ row }) => rowExample(row)),
    },
    externalNullTealscriptFinite: {
      rows: externalNull.length,
      deepRowsAtBar10OrLater: deepExternalNull.length,
      barIndices: externalNull.map(({ parsed }) => parsed.barIndex).sort((a, b) => a - b),
      examples: externalNull.slice(0, 12).map(({ row }) => rowExample(row)),
    },
  };
}

function splitFiniteValueMismatch(rows: CrosscheckRow[]): Record<string, unknown> {
  if (rows.length === 0) {
    return {
      rows: 0,
      method: 'precision-like means absDiff <= 0.001 or relativeDiff <= 0.0001, excluding sign flips',
      precisionOrAccumulationOrder: { rows: 0, examples: [] },
      materialValueMismatch: { rows: 0, examples: [] },
      signFlip: { rows: 0, examples: [] },
      decimalPlaceObservation: {
        canonicalMaxDecimalPlaces: 0,
        tealscriptMaxDecimalPlaces: 0,
        canonicalValuesAt10DecimalsOrFewer: 0,
        tealscriptValuesAt10DecimalsOrFewer: 0,
        conclusion: 'No finite-value-mismatch rows remain after the current filter.',
      },
    };
  }
  const enriched = rows.map((row) => {
    const parsed = parsePlotDifference(row);
    if (parsed.canonicalValue === null || parsed.tealscriptValue === null) throw new Error(`Expected finite values for ${row.key}: ${row.firstDifference}`);
    const absDiff = Math.abs(parsed.canonicalValue - parsed.tealscriptValue);
    const denom = Math.max(Math.abs(parsed.canonicalValue), Math.abs(parsed.tealscriptValue), 1);
    const relDiff = absDiff / denom;
    const signFlip = Math.sign(parsed.canonicalValue) !== Math.sign(parsed.tealscriptValue)
      && parsed.canonicalValue !== 0
      && parsed.tealscriptValue !== 0;
    const precisionLike = !signFlip && (absDiff <= 0.001 || relDiff <= 0.0001);
    return { row, parsed, absDiff, relDiff, signFlip, precisionLike };
  });
  const precisionLike = enriched.filter((item) => item.precisionLike);
  const signFlip = enriched.filter((item) => item.signFlip);
  const material = enriched.filter((item) => !item.precisionLike && !item.signFlip);
  const canonicalDecimalPlaces = enriched.map(({ parsed }) => decimalPlaces(parsed.canonicalValue as number));
  const tealscriptDecimalPlaces = enriched.map(({ parsed }) => decimalPlaces(parsed.tealscriptValue as number));
  return {
    rows: rows.length,
    method: 'precision-like means absDiff <= 0.001 or relativeDiff <= 0.0001, excluding sign flips',
    precisionOrAccumulationOrder: {
      rows: precisionLike.length,
      examples: precisionLike.slice(0, 12).map(({ row, absDiff, relDiff }) => `${rowExample(row)} (abs=${absDiff}, rel=${relDiff})`),
    },
    materialValueMismatch: {
      rows: material.length,
      examples: material.slice(0, 12).map(({ row, absDiff, relDiff }) => `${rowExample(row)} (abs=${absDiff}, rel=${relDiff})`),
    },
    signFlip: {
      rows: signFlip.length,
      examples: signFlip.map(({ row, absDiff, relDiff }) => `${rowExample(row)} (abs=${absDiff}, rel=${relDiff})`),
    },
    decimalPlaceObservation: {
      canonicalMaxDecimalPlaces: Math.max(...canonicalDecimalPlaces),
      tealscriptMaxDecimalPlaces: Math.max(...tealscriptDecimalPlaces),
      canonicalValuesAt10DecimalsOrFewer: canonicalDecimalPlaces.filter((places) => places <= 10).length,
      tealscriptValuesAt10DecimalsOrFewer: tealscriptDecimalPlaces.filter((places) => places <= 10).length,
      conclusion: 'The stored examples do not support a PineTS-is-truncated-to-10dp claim; many canonical external values carry more than 10 decimal places. Several TealScript values are rounded to 10 decimals, so precision-looking rows need source/function triage before being called defects.',
    },
  };
}

function decimalPlaces(value: number): number {
  const text = String(value);
  if (!text.includes('.')) return 0;
  return text.split('.')[1].replace(/e.*/i, '').length;
}

async function main(): Promise<void> {
  const crosscheckRaw = await readFile(CROSSCHECK_PATH, 'utf8');
  const consensusRaw = await readFile(CONSENSUS_PATH, 'utf8');
  const pinetsAuditRaw = await readFile(PINETS_GRAMMAR_AUDIT_PATH, 'utf8');
  const crosscheck = JSON.parse(crosscheckRaw) as { measuredCommitSha: string; rows: CrosscheckRow[]; summary: Record<string, unknown> };
  const consensus = JSON.parse(consensusRaw) as { rows: ConsensusRow[] };
  const pinetsAudit = JSON.parse(pinetsAuditRaw) as PineTSGrammarAudit;
  const consensusByKey = new Map(consensus.rows.map((row) => [`${row.corpus} ${row.rowId}`, row]));
  const runtimeRows = crosscheck.rows.filter((row) => row.disposition === 'runtime-refusal-needs-source-read');
  const survivorRows = crosscheck.rows.filter((row) => row.disposition === 'survives-for-triage');
  const contaminatedByKey = contaminationByKey(pinetsAudit.contamination.survivors);
  const struckRows = survivorRows.filter((row) => contaminatedByKey.has(row.key));
  const untaintedSurvivorRows = survivorRows.filter((row) => !contaminatedByKey.has(row.key));
  const refusalByKey = new Map(RUNTIME_REFUSALS.map((row) => [row.key, row]));
  const missing = runtimeRows.filter((row) => !refusalByKey.has(row.key)).map((row) => row.key);
  if (missing.length > 0) throw new Error(`Missing runtime refusal classifications: ${missing.join(', ')}`);
  if (RUNTIME_REFUSALS.length !== runtimeRows.length) throw new Error(`Expected ${runtimeRows.length} refusal classifications, found ${RUNTIME_REFUSALS.length}`);

  const causeClusters = Object.values(
    untaintedSurvivorRows.reduce<Record<string, { label: string; rows: CrosscheckRow[]; provenance: Record<string, number>; examples: string[] }>>((acc, row) => {
      const group = acc[row.cause] ?? { label: row.cause, rows: [], provenance: {}, examples: [] };
      group.rows.push(row);
      group.provenance[row.provenance] = (group.provenance[row.provenance] ?? 0) + 1;
      if (group.examples.length < 8) group.examples.push(`\`${row.key}\` ${row.firstDifference}`);
      acc[row.cause] = group;
      return acc;
    }, {}),
  ).sort((a, b) => b.rows.length - a.rows.length || a.label.localeCompare(b.label));

  const sourceFamilyClusters = Object.values(
    untaintedSurvivorRows.reduce<Record<string, { label: string; rows: CrosscheckRow[]; provenance: Record<string, number>; examples: string[] }>>((acc, row) => {
      const family = sourceFamily(consensusByKey.get(row.key)?.localPath ?? 'unknown');
      const key = `${row.cause} | ${family}`;
      const group = acc[key] ?? { label: key, rows: [], provenance: {}, examples: [] };
      group.rows.push(row);
      group.provenance[row.provenance] = (group.provenance[row.provenance] ?? 0) + 1;
      if (group.examples.length < 8) group.examples.push(`\`${row.key}\` ${row.firstDifference}`);
      acc[key] = group;
      return acc;
    }, {}),
  ).sort((a, b) => b.rows.length - a.rows.length || a.label.localeCompare(b.label));

  const refusalRows = runtimeRows.map((row) => ({
    ...row,
    ...(refusalByKey.get(row.key) as RefusalClassification),
    localPath: consensusByKey.get(row.key)?.localPath,
  }));
  const rowsByCause = new Map(causeClusters.map((cluster) => [cluster.label, cluster.rows]));
  const laterNaVsFiniteSplit = splitLaterNaVsFinite(rowsByCause.get('later-na-vs-finite') ?? []);
  const finiteValueMismatchSplit = splitFiniteValueMismatch(rowsByCause.get('finite-value-mismatch') ?? []);
  const originalRowsByCause = new Map(
    Object.values(
      survivorRows.reduce<Record<string, { label: string; rows: CrosscheckRow[] }>>((acc, row) => {
        const group = acc[row.cause] ?? { label: row.cause, rows: [] };
        group.rows.push(row);
        acc[row.cause] = group;
        return acc;
      }, {}),
    ).map((group) => [group.label, group.rows]),
  );
  const originalLaterNaVsFiniteSplit = splitLaterNaVsFinite(originalRowsByCause.get('later-na-vs-finite') ?? []);
  const originalFiniteValueMismatchSplit = splitFiniteValueMismatch(originalRowsByCause.get('finite-value-mismatch') ?? []);
  const heldRows = [
    ...(originalRowsByCause.get('warmup-finite-seed-value') ?? []),
    ...(originalRowsByCause.get('warmup-na-vs-finite') ?? []),
    ...((originalRowsByCause.get('finite-value-mismatch') ?? []).filter((row) => {
      const parsed = parsePlotDifference(row);
      if (parsed.canonicalValue === null || parsed.tealscriptValue === null) return false;
      const absDiff = Math.abs(parsed.canonicalValue - parsed.tealscriptValue);
      const denom = Math.max(Math.abs(parsed.canonicalValue), Math.abs(parsed.tealscriptValue), 1);
      const relDiff = absDiff / denom;
      const signFlip = Math.sign(parsed.canonicalValue) !== Math.sign(parsed.tealscriptValue)
        && parsed.canonicalValue !== 0
        && parsed.tealscriptValue !== 0;
      const precisionLike = !signFlip && (absDiff <= 0.001 || relDiff <= 0.0001);
      return !precisionLike && !signFlip;
    })),
  ];
  const struckRowDetails = struckRows.map((row) => ({
    ...row,
    contaminationFamilies: (contaminatedByKey.get(row.key) ?? []).map((family) => ({ id: family.id, why: family.why })),
  }));

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    measuredCommitSha: gitHead(),
    measuredWorkingTreeDirty: gitDirtyIgnoringOutputs(),
    inputs: {
      crosscheckReport: 'reports/external-pine-consensus-vector-crosscheck-v1.json',
      crosscheckMeasuredCommitSha: crosscheck.measuredCommitSha,
      crosscheckSha256: sha256(crosscheckRaw),
      consensusReport: 'reports/external-pine-consensus-full-v1.json',
      consensusSha256: sha256(consensusRaw),
      pineTSGrammarAudit: 'reports/external-pine-consensus-pinets-grammar-precedence-audit-v1.json',
      pineTSGrammarAuditSha256: sha256(pinetsAuditRaw),
    },
    summary: {
      rawTealscriptDifferences: crosscheck.summary.defectRows,
      automaticValueCandidates: survivorRows.length,
      automaticValueCandidateProvenance: provenanceCounts(survivorRows),
      corroboratedAutomaticValueCandidates: survivorRows.filter((row) => row.provenance === 'external-consensus').length,
      struckByDocumentedPineTSContamination: struckRows.length,
      survivingAfterPineTSContaminationFilter: untaintedSurvivorRows.length,
      survivingAfterFilterProvenance: provenanceCounts(untaintedSurvivorRows),
      runtimeRefusalRows: runtimeRows.length,
      runtimeRefusalClassifications: countBy(refusalRows.map((row) => row.classification)),
      runtimeRefusalRealGaps: refusalRows.filter((row) => row.classification === 'real-tealscript-gap').length,
    },
    pineTSCanonTaint: {
      auditReport: 'external-pine-consensus-pinets-grammar-precedence-audit-v1.md',
      auditCommit: 'dc2fbac78e',
      verdict: pinetsAudit.summary.verdict,
      contaminatedSurvivingValueCandidates: pinetsAudit.summary.contaminatedSurvivingValueCandidates,
      survivorTotal: pinetsAudit.contamination.survivorTotal,
      contaminatedPinetsSoleCanonRows: pinetsAudit.summary.contaminatedPinetsSoleCanonRows,
      pinetsSoleCanonTotal: pinetsAudit.contamination.pinetsSoleCanonTotal,
      contaminatedPinetsSoleDifferingRows: pinetsAudit.summary.contaminatedPinetsSoleDifferingRows,
      pinetsSoleDifferingTotal: pinetsAudit.contamination.pinetsSoleDifferingTotal,
      contaminatedFamilies: pinetsAudit.contamination.survivors.map((family) => ({
        id: family.id,
        why: family.why,
        survivorRows: family.count,
      })),
    },
    runtimeRefusalRows: refusalRows,
    struckCandidateRows: struckRowDetails,
    candidateCauseClustersBeforePineTSContaminationFilter: Object.values(
      survivorRows.reduce<Record<string, { label: string; rows: CrosscheckRow[]; provenance: Record<string, number>; examples: string[] }>>((acc, row) => {
        const group = acc[row.cause] ?? { label: row.cause, rows: [], provenance: {}, examples: [] };
        group.rows.push(row);
        group.provenance[row.provenance] = (group.provenance[row.provenance] ?? 0) + 1;
        if (group.examples.length < 8) group.examples.push(`\`${row.key}\` ${row.firstDifference}`);
        acc[row.cause] = group;
        return acc;
      }, {}),
    ).sort((a, b) => b.rows.length - a.rows.length || a.label.localeCompare(b.label)),
    candidateCauseClusters: causeClusters,
    candidateClusterSplits: {
      originalLaterNaVsFinite: originalLaterNaVsFiniteSplit,
      laterNaVsFinite: laterNaVsFiniteSplit,
      originalFiniteValueMismatch: originalFiniteValueMismatchSplit,
      finiteValueMismatch: finiteValueMismatchSplit,
    },
    heldSetPineTSTaint: {
      materialFiniteValueMismatch: {
        total: (originalFiniteValueMismatchSplit.materialValueMismatch as { rows: number }).rows,
        struck: (originalRowsByCause.get('finite-value-mismatch') ?? []).filter((row) => {
          const parsed = parsePlotDifference(row);
          if (parsed.canonicalValue === null || parsed.tealscriptValue === null) return false;
          const absDiff = Math.abs(parsed.canonicalValue - parsed.tealscriptValue);
          const denom = Math.max(Math.abs(parsed.canonicalValue), Math.abs(parsed.tealscriptValue), 1);
          const relDiff = absDiff / denom;
          const signFlip = Math.sign(parsed.canonicalValue) !== Math.sign(parsed.tealscriptValue)
            && parsed.canonicalValue !== 0
            && parsed.tealscriptValue !== 0;
          const precisionLike = !signFlip && (absDiff <= 0.001 || relDiff <= 0.0001);
          return !precisionLike && !signFlip && contaminatedByKey.has(row.key);
        }).length,
      },
      warmupAndSeeding: {
        total: (originalRowsByCause.get('warmup-finite-seed-value') ?? []).length + (originalRowsByCause.get('warmup-na-vs-finite') ?? []).length,
        struck: [
          ...(originalRowsByCause.get('warmup-finite-seed-value') ?? []),
          ...(originalRowsByCause.get('warmup-na-vs-finite') ?? []),
        ].filter((row) => contaminatedByKey.has(row.key)).length,
      },
      combinedHeldTotal: heldRows.length,
      combinedHeldStruck: heldRows.filter((row) => contaminatedByKey.has(row.key)).length,
      familyCounts: contaminationFamilyCounts(heldRows, contaminatedByKey),
    },
    candidateSourceFamilyClusters: sourceFamilyClusters,
  };

  await writeFile(OUT_JSON, `${JSON.stringify(report)}\n`);
  await writeFile(OUT_MD, renderMarkdown(report));
  console.log(`external-pine-consensus-survivor-triage-v1.md: ${survivorRows.length} candidates, ${struckRows.length} struck, ${untaintedSurvivorRows.length} survive, ${runtimeRows.length} runtime refusals`);
}

function renderMarkdown(report: any): string {
  const lines: string[] = [];
  lines.push('# External Pine Consensus Survivor Triage v1');
  lines.push('');
  lines.push(`Measured commit: \`${report.measuredCommitSha}\``);
  if (report.measuredWorkingTreeDirty) lines.push('Measurement tree: dirty.');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Headline');
  lines.push('');
  lines.push('This report starts where `external-pine-consensus-vector-crosscheck-v1.md` stopped. It classifies the `25` runtime-refusal rows from source, then filters and clusters the `119` automatic value candidates. It does not route the `123` semantic-surface rows; those are parked for the parser/semantic lane.');
  lines.push('');
  lines.push('The strongest tier remains empty: `867 -> 119 -> 0 corroborated`. All `119` automatic value candidates are sole-voter rows (`112` pinets-sole, `7` pine-a-script-sole); `0` are two-voter external-consensus rows.');
  lines.push('');
  lines.push(`PineTS grammar/value-vector trust audit \`${report.pineTSCanonTaint.auditReport}\` at \`${report.pineTSCanonTaint.auditCommit}\` proves PineTS is unsafe as blanket sole canon for named documented families. Strike result: \`${report.summary.struckByDocumentedPineTSContamination}\` / \`${report.summary.automaticValueCandidates}\` automatic value candidates struck; \`${report.summary.survivingAfterPineTSContaminationFilter}\` remain for triage. This is documented-oracle evidence outranking a sole external vote, the same rule that killed the percentile string-coercion row.`);
  lines.push('');
  lines.push(`Headline canon taint: \`${report.pineTSCanonTaint.contaminatedPinetsSoleCanonRows}\` / \`${report.pineTSCanonTaint.pinetsSoleCanonTotal}\` PineTS-sole canon rows and \`${report.pineTSCanonTaint.contaminatedPinetsSoleDifferingRows}\` / \`${report.pineTSCanonTaint.pinetsSoleDifferingTotal}\` PineTS-sole differing rows overlap PineTS-wrong documented families. Any PineTS-sole canon figure must carry that caveat until the positive trust map lands.`);
  lines.push('');
  lines.push('## Runtime Refusal Rows');
  lines.push('');
  lines.push('| Classification | Rows |');
  lines.push('|---|---:|');
  for (const [key, value] of Object.entries(report.summary.runtimeRefusalClassifications)) lines.push(`| ${key} | ${value} |`);
  lines.push('');
  lines.push('Two rows are real TealScript runtime/codegen acceptance candidates; the other `23` are correct refusals or host/request-context boundaries where loose external engines ran invalid or unserviceable source.');
  lines.push('');
  lines.push('| Row | Classification | Provenance | Evidence |');
  lines.push('|---|---|---|---|');
  for (const row of report.runtimeRefusalRows) {
    const owner = row.owner ? ` Owner: ${row.owner}.` : '';
    lines.push(`| \`${row.key}\` | ${row.classification} | ${row.provenance} | ${row.evidence}${owner} |`);
  }
  lines.push('');
  lines.push('## Candidate Clusters');
  lines.push('');
  lines.push('These are triage candidates, not fixes. Rows in PineTS-wrong documented families are struck, not deferred. Before any remaining cluster lands, the full value-vector suite is a hard gate: a proposed PineTS-sole or Pine-A-Script-sole convention that reds an existing documented or hand-derived vector is rejected as external-engine behavior, not adopted as TealScript behavior.');
  lines.push('');
  lines.push('### PineTS Contamination Strike');
  lines.push('');
  lines.push('| Family | Struck survivor rows | Reason |');
  lines.push('|---|---:|---|');
  for (const family of report.pineTSCanonTaint.contaminatedFamilies) {
    lines.push(`| ${family.id} | ${family.survivorRows} | ${family.why} |`);
  }
  lines.push('');
  lines.push('| Row | Cause | Provenance | PineTS contamination family | First difference |');
  lines.push('|---|---|---|---|---|');
  for (const row of report.struckCandidateRows) {
    const families = row.contaminationFamilies.map((family: { id: string }) => family.id).join(', ');
    lines.push(`| \`${row.key}\` | ${row.cause} | ${row.provenance} | ${families} | ${row.firstDifference} |`);
  }
  lines.push('');
  lines.push('### By Cause');
  lines.push('');
  lines.push(...renderGroupTable(report.candidateCauseClusters));
  lines.push('');
  const topThreeRows = report.candidateCauseClusters.slice(0, 3).reduce((sum: number, group: { rows: unknown[] }) => sum + group.rows.length, 0);
  lines.push(`After the PineTS contamination strike, the top three cause clusters carry \`${topThreeRows}/${report.summary.survivingAfterPineTSContaminationFilter}\` rows. This is a small set of convention decisions, not independent row defects.`);
  lines.push('');
  lines.push('### Held Sets Re-Scored Against PineTS Contamination');
  lines.push('');
  lines.push('| Held set | Rows | Struck by PineTS documented-family audit | Remaining |');
  lines.push('|---|---:|---:|---:|');
  const material = report.heldSetPineTSTaint.materialFiniteValueMismatch;
  const warmup = report.heldSetPineTSTaint.warmupAndSeeding;
  lines.push(`| material finite-value mismatches | ${material.total} | ${material.struck} | ${material.total - material.struck} |`);
  lines.push(`| warmup / seeding | ${warmup.total} | ${warmup.struck} | ${warmup.total - warmup.struck} |`);
  lines.push(`| combined held set | ${report.heldSetPineTSTaint.combinedHeldTotal} | ${report.heldSetPineTSTaint.combinedHeldStruck} | ${report.heldSetPineTSTaint.combinedHeldTotal - report.heldSetPineTSTaint.combinedHeldStruck} |`);
  lines.push('');
  lines.push('### Cluster 2 Direction Split: later-na-vs-finite');
  lines.push('');
  lines.push('`firstDifference` stores the canonical external value first and the TealScript value second. The direction split is therefore external-left vs TealScript-right. Counts below are after striking PineTS-contaminated rows; the original unfiltered split is retained in JSON under `candidateClusterSplits.originalLaterNaVsFinite`.');
  lines.push('');
  lines.push('| Direction | Rows | Deep rows (bar >= 10) | Bar indices | Examples |');
  lines.push('|---|---:|---:|---|---|');
  const laterSplit = report.candidateClusterSplits.laterNaVsFinite;
  lines.push(`| TealScript null, external finite | ${laterSplit.tealscriptNullExternalFinite.rows} | ${laterSplit.tealscriptNullExternalFinite.deepRowsAtBar10OrLater} | ${laterSplit.tealscriptNullExternalFinite.barIndices.join(', ')} | ${laterSplit.tealscriptNullExternalFinite.examples.join('<br>')} |`);
  lines.push(`| External null, TealScript finite | ${laterSplit.externalNullTealscriptFinite.rows} | ${laterSplit.externalNullTealscriptFinite.deepRowsAtBar10OrLater} | ${laterSplit.externalNullTealscriptFinite.barIndices.join(', ')} | ${laterSplit.externalNullTealscriptFinite.examples.join('<br>')} |`);
  lines.push('');
  const originalLater = report.candidateClusterSplits.originalLaterNaVsFinite;
  const originalTealNull = originalLater.tealscriptNullExternalFinite;
  const filteredTealNull = report.candidateClusterSplits.laterNaVsFinite.tealscriptNullExternalFinite;
  lines.push(`The original TealScript-null/external-finite direction had \`${originalTealNull.rows}\` rows, \`${originalTealNull.deepRowsAtBar10OrLater}\` deep. The PineTS documented-family strike removes \`${originalTealNull.rows - filteredTealNull.rows}\`, leaving \`${filteredTealNull.rows}\` TealScript-null rows, \`${filteredTealNull.deepRowsAtBar10OrLater}\` deep. The remaining TealScript-null direction is the higher-priority diagnosis target because it can indicate output/history exhaustion after a script has already produced values. The opposite direction is weaker evidence because the sole external voter may have stopped producing.`);
  lines.push('');
  lines.push('### Cluster 3 Magnitude Split: finite-value-mismatch');
  lines.push('');
  const finiteSplit = report.candidateClusterSplits.finiteValueMismatch;
  lines.push(`Method: ${finiteSplit.method}.`);
  lines.push('');
  lines.push('| Split | Rows | Examples |');
  lines.push('|---|---:|---|');
  lines.push(`| precision / accumulation-order sized | ${finiteSplit.precisionOrAccumulationOrder.rows} | ${finiteSplit.precisionOrAccumulationOrder.examples.join('<br>')} |`);
  lines.push(`| material value mismatch | ${finiteSplit.materialValueMismatch.rows} | ${finiteSplit.materialValueMismatch.examples.join('<br>')} |`);
  lines.push(`| sign flip | ${finiteSplit.signFlip.rows} | ${finiteSplit.signFlip.examples.join('<br>')} |`);
  lines.push('');
  if (finiteSplit.rows > 0) {
    lines.push(`Decimal-place check: canonical external max decimal places = ${finiteSplit.decimalPlaceObservation.canonicalMaxDecimalPlaces}; TealScript max decimal places = ${finiteSplit.decimalPlaceObservation.tealscriptMaxDecimalPlaces}; canonical values at <=10 decimals = ${finiteSplit.decimalPlaceObservation.canonicalValuesAt10DecimalsOrFewer}/${finiteSplit.rows}; TealScript values at <=10 decimals = ${finiteSplit.decimalPlaceObservation.tealscriptValuesAt10DecimalsOrFewer}/${finiteSplit.rows}. ${finiteSplit.decimalPlaceObservation.conclusion}`);
  } else {
    const originalFinite = report.candidateClusterSplits.originalFiniteValueMismatch;
    lines.push(`The pre-filter finite-value-mismatch split remains in JSON under \`candidateClusterSplits.originalFiniteValueMismatch\`: ${originalFinite.precisionOrAccumulationOrder.rows} precision/accumulation-sized, ${originalFinite.materialValueMismatch.rows} material, ${originalFinite.signFlip.rows} sign flip. After the PineTS strike, no finite-value-mismatch rows remain in this cluster.`);
  }
  lines.push('');
  lines.push('### By Cause And Source Family');
  lines.push('');
  lines.push(...renderGroupTable(report.candidateSourceFamilyClusters.slice(0, 30)));
  lines.push('');
  lines.push('## Inputs');
  lines.push('');
  lines.push(`Cross-check JSON: \`${report.inputs.crosscheckReport}\`, measured at \`${report.inputs.crosscheckMeasuredCommitSha}\`, sha256 \`${report.inputs.crosscheckSha256}\`.`);
  lines.push(`Consensus JSON: \`${report.inputs.consensusReport}\`, sha256 \`${report.inputs.consensusSha256}\`.`);
  lines.push(`PineTS grammar/precedence audit JSON: \`${report.inputs.pineTSGrammarAudit}\`, sha256 \`${report.inputs.pineTSGrammarAuditSha256}\`.`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
