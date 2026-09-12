import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface MemberCount {
  member: string;
  scripts: number;
}

interface MemberHit {
  member: string;
  count: number;
}

interface CallExposure {
  member: string;
  exposure: string;
}

interface CorpusExposureRow {
  corpus: string;
  row: string;
  traceOrHostRequiredHits: MemberHit[];
  unsettledCallExposures: CallExposure[];
}

interface CorpusExposureReport {
  measurementSha: string;
  summary: {
    corpusScripts: number;
    rowsTouchingTraceOrHostRequired: number;
    rowsWithInteriorHoleExposure: number;
    rowsTouchingUnsettledNaPolicy: number;
    rowsWithUnknownExposure: number;
  };
  rows: CorpusExposureRow[];
  rowsWithInteriorHoleExposure: CorpusExposureRow[];
  traceOrHostRequiredMemberCounts: MemberCount[];
}

interface CorpusMember {
  member: string;
  hitCount: number;
}

interface CorpusMemberMap {
  basis: {
    v5Corpus?: string;
    v6Corpus?: string;
  };
  corpusMembers: CorpusMember[];
}

interface VaripExposureReport {
  measurementSha: string;
  summary: {
    scriptsWithVarip: number;
    replacementSensitiveScripts: number;
    declarationOnlyScripts: number;
  };
}

interface SurfaceSummary {
  surface: string;
  v1Rank: number | null;
  members: string[];
  scripts: number;
  note: string;
  settledSinceV1: string;
  acquisitionCost: string;
  terminalSteps: string[];
}

const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const REPORTS_DIR = join(PACKAGE_ROOT, 'reports');
const INPUT_EXPOSURE = join(REPORTS_DIR, 'pine-value-vector-corpus-exposure-v1.json');
const INPUT_MEMBER_MAP = join(REPORTS_DIR, 'pine-corpus-member-map-v1.json');
const INPUT_VARIP_EXPOSURE = join(REPORTS_DIR, 'pine-varip-trace-exposure-v1.json');
const OUTPUT_BASE = join(REPORTS_DIR, 'pine-trace-purchase-order-v2');

const PURCHASE_SURFACES: Array<{
  surface: string;
  v1Rank: number | null;
  members: string[];
  note: string;
  settledSinceV1: string;
  acquisitionCost: string;
  terminalSteps: string[];
}> = [
  {
    surface: 'Undocumented TA interior-hole policy',
    v1Rank: 10,
    members: [],
    note: 'Measured as confirmed mid-series hole routes into unsettled TA calls.',
    settledSinceV1: 'Unchanged. Clean-data arithmetic and invariants for neighboring TA functions do not settle the seven interior-hole policies in this purchase.',
    acquisitionCost: 'One static historical indicator script, one chart, one exported table/CSV containing the holed inputs and target outputs. No realtime feed, rollback, broker emulator, or alert scheduling.',
    terminalSteps: [
      'Open TradingView Pine Editor on a liquid symbol with ordinary historical bars.',
      'Paste one indicator that defines deterministic holed series, paired holed series for `ta.cross*`, and plots those inputs plus `ta.crossover`, `ta.crossunder`, `ta.cross`, `ta.bb`, `ta.rsi`, `ta.stoch`, and `ta.vwap` outputs.',
      'Add it to the chart, use Download chart data to export the CSV for those plotted columns, and save the Pine source, symbol, timeframe, input values, OHLCV, and exported rows together.',
    ],
  },
  {
    surface: 'Realtime barstate',
    v1Rank: 4,
    members: ['barstate.isnew', 'barstate.isrealtime'],
    note: 'Live same-timestamp update and new-bar state. Historical `barstate.islastconfirmedhistory` boundary is now externally closed and no longer part of this purchase.',
    settledSinceV1: 'Narrowed. Coverage v169 externally closed the historical `barstate.islastconfirmedhistory` boundary for closed-market, realtime-last-only, and multi-bar realtime-segment host shapes.',
    acquisitionCost: 'One live Pine Logs recording over repeated same-bar updates and a bar transition. Historical chart-data CSV cannot show same-timestamp replacement ticks or live new/realtime transitions, so this is a copied-log trace rather than a download-only export.',
    terminalSteps: [
      'Open TradingView on a 1-minute chart for a liquid live symbol during market hours.',
      'Paste `tradingview-realtime-barstate-trace-v1.pine`, add it to the chart, and open Pine Logs.',
      'Wait until the logs contain at least two `TS_TRACE_V1` lines with the same `time` value, then keep recording through the next bar transition.',
      'Copy the Pine Logs lines containing `TS_TRACE_V1` into a text file; the lines carry declared version, symbol, timeframe, chart session, timezone, bar timestamps, OHLCV, `timenow`, and all barstate flags.',
      'Import with `yarn workspace @tealstreet/tealscript tsx scripts/import-tradingview-realtime-trace.ts --kind barstate --input <pine-logs.txt> --output packages/tealscript/reports/tradingview-realtime-barstate-trace-expectations-v1.json`.',
    ],
  },
  {
    surface: 'Wall-clock realtime',
    v1Rank: null,
    members: ['timenow'],
    note: 'Execution-time value, not derivable from deterministic bars.',
    settledSinceV1: 'Unchanged. No later vector or trace settled wall-clock execution-time behavior.',
    acquisitionCost: 'One copied Pine Logs recording across reload or live update. It is cheaper than the full synchronized request/security capture, but it still needs wall-clock observation because historical chart-data CSV cannot prove execution-time behavior.',
    terminalSteps: [
      'Open TradingView on a live chart, paste `tradingview-timenow-trace-v1.pine`, add it to the chart, and open Pine Logs.',
      'Copy `TS_TRACE_V1` lines after initial load, then either reload the chart or wait for a realtime update and copy the new lines.',
      'Save the copied Pine Logs text; each trace line carries declared version, symbol, timeframe, chart session, timezone, bar timestamps, OHLCV, `barstate.isrealtime`, and `timenow`.',
      'Import with `yarn workspace @tealstreet/tealscript tsx scripts/import-tradingview-realtime-trace.ts --kind timenow --input <pine-logs.txt> --output packages/tealscript/reports/tradingview-timenow-trace-expectations-v1.json`.',
    ],
  },
  {
    surface: 'Realtime varip replacement',
    v1Rank: null,
    members: ['varip'],
    note: 'Realtime rollback-escape language semantics for intrabar state.',
    settledSinceV1: 'Unchanged. Historical `var`/`varip` behavior is covered, but replacement-sensitive same-bar rollback escape still needs live observations.',
    acquisitionCost: 'One copied Pine Logs recording over repeated same-bar updates. Exposure is lower than the top three purchases, but a wrong result is silent realtime value drift rather than a loud failure.',
    terminalSteps: [
      'Open TradingView on a 1-minute chart for a liquid live symbol during market hours.',
      'Paste `tradingview-varip-replacement-trace-v1.pine`, add it to the chart, and open Pine Logs.',
      'Wait until the logs contain at least two `TS_TRACE_V1` lines with the same `time` value, then keep recording through the next bar transition.',
      'Copy the Pine Logs lines containing `TS_TRACE_V1` into a text file; the lines carry declared version, symbol, timeframe, chart session, timezone, bar timestamps, OHLCV, barstate flags, and paired `var`/`varip` scalar and array state.',
      'Import with `yarn workspace @tealstreet/tealscript tsx scripts/import-tradingview-realtime-trace.ts --kind varip --input <pine-logs.txt> --output packages/tealscript/reports/tradingview-varip-replacement-trace-expectations-v1.json`.',
    ],
  },
  {
    surface: 'Strategy risk and broker exactness',
    v1Rank: 2,
    members: [
      'strategy.risk.max_intraday_loss',
      'strategy.risk.max_drawdown',
      'strategy.risk.max_intraday_filled_orders',
    ],
    note: 'Risk halts and forced exits need broker/session traces.',
    settledSinceV1: 'Partly narrowed outside the top four. Deterministic commission, sizing, FIFO/ANY attribution, pyramiding, process-on-close, OCA, and risk-rule suppression vectors closed the documented historical money surface; broker-emulator sequencing, margin/liquidation, and exact intraday risk reset behavior remain trace-shaped.',
    acquisitionCost: 'A strategy trace with order/fill/risk state; materially more expensive than purchase one and should not be bundled into it.',
    terminalSteps: [
      'Paste a strategy that triggers each risk rule on deterministic bars.',
      'Export order list, fills, equity, open/closed trade fields, and plotted diagnostic values across enough bars/session boundaries to observe intraday resets.',
    ],
  },
  {
    surface: 'Provider event and seed data',
    v1Rank: 6,
    members: [
      'earnings.estimate',
      'earnings.future_time',
      'earnings.future_eps',
      'earnings.future_revenue',
      'request.seed',
    ],
    note: 'Provider-owned values and revision/alignment behavior.',
    settledSinceV1: 'Unchanged. Provider-owned values still require provider-backed observations.',
    acquisitionCost: 'Provider-specific fixture capture, not a generic realtime recording; needs symbols and dates with known earnings/seed observations.',
    terminalSteps: [
      'Choose symbols/dates with known provider observations, plot request outputs and alignment diagnostics, then export returned series with raw chart bars and provider context.',
    ],
  },
  {
    surface: 'Exchange session calendar',
    v1Rank: 7,
    members: ['session.isfirstbar', 'session.islastbar'],
    note: 'Calendar/session irregularities rather than language semantics.',
    settledSinceV1: 'Unchanged for exact exchange calendars. Synthetic session fixtures cover generated profiles, not TradingView exchange-calendar irregularities.',
    acquisitionCost: 'Calendar fixture capture across regular sessions, holidays, DST, or early closes; historical data is enough if the chosen window includes the irregularity.',
    terminalSteps: [
      'Choose an exchange symbol/date range spanning the target session boundary, plot `session.isfirstbar`, `session.islastbar`, `time`, and `time_close`, then export values with exchange timezone and chart session settings.',
    ],
  },
  {
    surface: 'Random sequence',
    v1Rank: null,
    members: ['math.random'],
    note: 'TradingView pseudo-random sequence needs observed parity.',
    settledSinceV1: 'Unchanged. No deterministic reference sequence has been acquired.',
    acquisitionCost: 'Static historical capture may be enough for seeded calls; unseeded behavior needs repeated reload observation.',
    terminalSteps: [
      'Paste a script plotting seeded and unseeded `math.random` calls, then export the first run and at least one reload.',
    ],
  },
  {
    surface: 'Live bid/ask quote fields',
    v1Rank: null,
    members: ['ask', 'bid'],
    note: 'Host live quote stream values.',
    settledSinceV1: 'Unchanged. Live quote fields remain host-feed observations.',
    acquisitionCost: 'Live quote capture only; historical bars do not contain bid/ask.',
    terminalSteps: [
      'Open a live symbol where bid/ask are populated, plot `ask`, `bid`, `close`, and `timenow`, and save values through at least one quote update.',
    ],
  },
];

function percent(part: number, total: number): string {
  return total === 0 ? '0.00%' : `${((part / total) * 100).toFixed(2)}%`;
}

function scriptCount(count: number): string {
  return `${count} ${count === 1 ? 'script' : 'scripts'}`;
}

function rowKey(row: Pick<CorpusExposureRow, 'corpus' | 'row'>): string {
  return `${row.corpus}/${row.row}`;
}

function unionRowsForMembers(rows: CorpusExposureRow[], members: readonly string[]): Set<string> {
  const wanted = new Set(members);
  const out = new Set<string>();
  for (const row of rows) {
    if (row.traceOrHostRequiredHits.some((hit) => wanted.has(hit.member))) out.add(rowKey(row));
  }
  return out;
}

async function listPineFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const filePath = join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...await listPineFiles(filePath));
    } else if (entry.isFile() && entry.name.endsWith('.pine')) {
      out.push(filePath);
    }
  }
  return out;
}

function stripCommentsAndStrings(source: string): string {
  return source
    .replace(/\/\/.*$/gm, '')
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

function corpusRowKeyFromFile(corpus: string, filePath: string): string {
  const match = filePath.match(/\/sources\/(\d{4})__/);
  return `${corpus}/${match?.[1] ?? filePath}`;
}

async function countSourceMemberUnion(corpusRoots: Array<[string, string | undefined]>, members: readonly string[]): Promise<number> {
  const patterns = members.map((member) => new RegExp(`\\b${member.replace('.', '\\.')}\\b`));
  const rows = new Set<string>();
  for (const [corpus, root] of corpusRoots) {
    if (!root) continue;
    const sourceRoot = join(root, 'sources');
    for (const filePath of await listPineFiles(sourceRoot)) {
      const source = stripCommentsAndStrings(await readFile(filePath, 'utf8'));
      if (patterns.some((pattern) => pattern.test(source))) {
        rows.add(corpusRowKeyFromFile(corpus, filePath));
      }
    }
  }
  return rows.size;
}

function interiorHoleMemberCounts(rows: CorpusExposureRow[]): MemberCount[] {
  const byMember = new Map<string, Set<string>>();
  for (const row of rows) {
    const members = new Set(
      row.unsettledCallExposures
        .filter((exposure) => exposure.exposure === 'interior-hole')
        .map((exposure) => exposure.member),
    );
    for (const member of members) {
      const memberRows = byMember.get(member) ?? new Set<string>();
      memberRows.add(rowKey(row));
      byMember.set(member, memberRows);
    }
  }
  return [...byMember]
    .map(([member, rowSet]) => ({ member, scripts: rowSet.size }))
    .sort((left, right) => right.scripts - left.scripts || left.member.localeCompare(right.member));
}

function topRows(rows: readonly MemberCount[], limit = 12): string {
  return rows
    .slice(0, limit)
    .map((row, index) => `| ${index + 1} | \`${row.member}\` | ${row.scripts} |`)
    .join('\n');
}

function buildMarkdown(args: {
  exposure: CorpusExposureReport;
  varipExposure: VaripExposureReport;
  surfaceSummaries: SurfaceSummary[];
  interiorCounts: MemberCount[];
  traceCounts: MemberCount[];
  requestSecurityHitCount: number;
  requestLowerTfHitCount: number;
}): string {
  const { exposure, varipExposure, surfaceSummaries, interiorCounts, traceCounts, requestSecurityHitCount, requestLowerTfHitCount } = args;
  const purchasable = surfaceSummaries
    .filter((surface) => !surface.surface.includes('runtime') && !surface.surface.includes('library'))
    .sort((left, right) => right.scripts - left.scripts || (left.v1Rank ?? 99) - (right.v1Rank ?? 99));
  const purchaseRows = purchasable
    .map((surface, index) => {
      const rank = surface.v1Rank === null ? 'unranked' : `rank ${surface.v1Rank}`;
      return `| ${index + 1} | ${surface.surface} | ${rank} | ${surface.scripts} | ${surface.members.map((member) => `\`${member}\``).join(', ')} |`;
    })
    .join('\n');
  const costRows = purchasable
    .map((surface, index) => {
      const steps = surface.terminalSteps.map((step) => `<br>${step}`).join('');
      return `| ${index + 1} | ${surface.surface} | ${surface.acquisitionCost} | ${steps} |`;
    })
    .join('\n');
  const surfaceRows = surfaceSummaries
    .map((surface) => {
      const rank = surface.v1Rank === null ? 'unranked' : String(surface.v1Rank);
      return `| ${surface.surface} | ${rank} | ${surface.scripts} | ${surface.members.map((member) => `\`${member}\``).join(', ')} | ${surface.note} |`;
    })
    .join('\n');

  return [
    '# Pine Trace Purchase Order V2',
    '',
    'Supersedes `pine-trace-purchase-order-v1.{md,json}`.',
    '',
    `Measurement SHA: \`${exposure.measurementSha}\`; \`varip\` exposure SHA: \`${varipExposure.measurementSha}\`; current value-vector SHA: \`0b1f0bfc48\`. Sources: \`pine-value-vector-corpus-exposure-v1.json\`, \`pine-varip-trace-exposure-v1.json\`, \`pine-barstate-lastconfirmedhistory-oracles-v1.md\`. TradingView export reference: https://www.tradingview.com/support/solutions/43000537255-how-to-export-chart-data/`,
    '',
    '## Decision Summary',
    '',
    `The two public corpora contain ${exposure.summary.corpusScripts} scripts. The actionable exposure is concentrated: ${exposure.summary.rowsWithInteriorHoleExposure} scripts have confirmed mid-series holes into unsettled TA policies, and ${exposure.summary.rowsTouchingTraceOrHostRequired} scripts touch trace/host-required members. Non-purchase surfaces dominate the raw trace count: \`runtime.error\` appears in 395 scripts and \`library\` in 26, but neither is settled by a synchronized TradingView recording.`,
    '',
    'The measured ranking still disagrees with the estimated rank in `PINE_TRACE_REQUIRED_v1`: rank 10 is the hottest practical exposure, while rank 1 is structurally common but not proven hot by this scan. Since V1, the historical `barstate.islastconfirmedhistory` boundary has been externally closed, so purchase 2 now buys only live tick/new-bar flags. It still narrowly outranks `timenow` by measured exposure: 36 scripts vs. 35.',
    '',
    '| Buy order | Trace package | V1 estimated rank | Scripts directly covered | Members settled |',
    '| ---: | --- | ---: | ---: | --- |',
    purchaseRows,
    '',
    'The measured priority disagrees with `PINE_TRACE_REQUIRED_v1`: rank 10, undocumented TA `na` policy, is the hottest practical purchase because 63 of the 66 confirmed interior-hole scripts are in the `ta.cross` family. Rank 1, unclosed-HTF `request.security`, is structurally common (`request.security` has 366 corpus hits and `request.security_lower_tf` has 34), but this member-level exposure scan does not prove which of those calls require an unclosed realtime HTF trace.',
    '',
    `The cheapest acquisition that meaningfully moves parity is unchanged: a static historical TradingView export for the seven unsettled TA functions fed by deliberate interior holes. It buys coverage for 66 of 2,000 measured user-written scripts without realtime observation, broker-emulator tracing, alert scheduling, or request-provider synchronization. Purchases two, three, and four are still browser-manual, but they are not recording-rig work: they use copied Pine Logs text because TradingView chart-data CSV cannot represent repeated live executions of one bar. Purchase 2 is now smaller than V1 because it no longer buys historical \`islastconfirmedhistory\`; purchase 3 remains unchanged at 35 scripts; purchase 4 remains unchanged at ${varipExposure.summary.replacementSensitiveScripts}/2,000 scripts and high consequence because wrong rollback escape produces silent live-value drift.`,
    '',
    'Paste script: `tradingview-ta-hole-trace-v1.pine`. Import command after export: `yarn workspace @tealstreet/tealscript tsx scripts/import-tradingview-ta-hole-trace.ts --input <TradingView CSV> --output packages/tealscript/reports/tradingview-ta-hole-trace-expectations-v1.json --symbol <symbol> --timeframe <timeframe> --timezone <timezone>`.',
    'Realtime scripts: `tradingview-realtime-barstate-trace-v1.pine`, `tradingview-timenow-trace-v1.pine`, and `tradingview-varip-replacement-trace-v1.pine`. Import copied Pine Logs with `scripts/import-tradingview-realtime-trace.ts`.',
    '',
    '## Acquisition Cost',
    '',
    '| Buy order | Trace package | Cost | Terminal steps |',
    '| ---: | --- | --- | --- |',
    costRows,
    '',
    '## What Changed Since V1',
    '',
    '| Trace package | Current value | Settled since V1 |',
    '| --- | --- | --- |',
    purchasable.map((surface) => `| ${surface.surface} | ${scriptCount(surface.scripts)}; ${surface.members.map((member) => `\`${member}\``).join(', ')} | ${surface.settledSinceV1} |`).join('\n'),
    '',
    '## Confirmed Interior-Hole Members',
    '',
    '| Rank | Member | Scripts |',
    '| ---: | --- | ---: |',
    topRows(interiorCounts),
    '',
    '## Trace/Host-Required Members',
    '',
    '| Rank | Member | Scripts |',
    '| ---: | --- | ---: |',
    topRows(traceCounts, 20),
    '',
    '## V1 Surface Crosswalk',
    '',
    '| Surface | V1 rank | Measured scripts | Members | Reading |',
    '| --- | ---: | ---: | --- | --- |',
    surfaceRows,
    '',
    '## Not Settled By This Purchase Order',
    '',
    `- Ordinary \`request.security\` live-bar behavior remains separately important: ${requestSecurityHitCount} corpus hits use \`request.security\`, and ${requestLowerTfHitCount} use \`request.security_lower_tf\`, but the current scan only ranks the 50 trace/host-required members and confirmed unsettled-NA holes.`,
    '- `runtime.error` should be tracked as an intentional exception surface, not purchased as a trace.',
    '- `library` is unsupported-by-design for third-party TradingView imports; official TradingView libraries are implemented as builtins.',
    `- ${exposure.summary.rowsWithUnknownExposure} scripts still have UDF/object-state exposure that the static scanner cannot classify safely.`,
    '- `barstate.islastconfirmedhistory` historical-boundary behavior is settled by `pine-barstate-lastconfirmedhistory-oracles-v1.md`; live repeated-tick barstate behavior is still purchased by item 2.',
    '',
  ].join('\n');
}

export async function buildPineTracePurchaseOrderReport(): Promise<{ json: unknown; markdown: string }> {
  const exposure = JSON.parse(await readFile(INPUT_EXPOSURE, 'utf8')) as CorpusExposureReport;
  const memberMap = JSON.parse(await readFile(INPUT_MEMBER_MAP, 'utf8')) as CorpusMemberMap;
  const varipExposure = JSON.parse(await readFile(INPUT_VARIP_EXPOSURE, 'utf8')) as VaripExposureReport;
  const interiorCounts = interiorHoleMemberCounts(exposure.rowsWithInteriorHoleExposure);
  const interiorMembers = interiorCounts.map((row) => row.member);
  const interiorScriptCount = new Set(
    exposure.rowsWithInteriorHoleExposure.map((row) => rowKey(row)),
  ).size;
  const realtimeBarstateScriptCount = await countSourceMemberUnion([
    ['v5', memberMap.basis.v5Corpus],
    ['v6', memberMap.basis.v6Corpus],
  ], ['barstate.isnew', 'barstate.isrealtime']);
  const surfaceSummaries: SurfaceSummary[] = PURCHASE_SURFACES.map((surface) => {
    if (surface.surface === 'Undocumented TA interior-hole policy') {
      return {
        surface: surface.surface,
        v1Rank: surface.v1Rank,
        members: interiorMembers,
        scripts: interiorScriptCount,
        note: surface.note,
        settledSinceV1: surface.settledSinceV1,
        acquisitionCost: surface.acquisitionCost,
        terminalSteps: surface.terminalSteps,
      };
    }
    if (surface.surface === 'Realtime barstate') {
      return {
        surface: surface.surface,
        v1Rank: surface.v1Rank,
        members: surface.members,
        scripts: realtimeBarstateScriptCount,
        note: surface.note,
        settledSinceV1: surface.settledSinceV1,
        acquisitionCost: surface.acquisitionCost,
        terminalSteps: surface.terminalSteps,
      };
    }
    if (surface.surface === 'Realtime varip replacement') {
      return {
        surface: surface.surface,
        v1Rank: surface.v1Rank,
        members: surface.members,
        scripts: varipExposure.summary.replacementSensitiveScripts,
        note: surface.note,
        settledSinceV1: surface.settledSinceV1,
        acquisitionCost: surface.acquisitionCost,
        terminalSteps: surface.terminalSteps,
      };
    }
    return {
      surface: surface.surface,
      v1Rank: surface.v1Rank,
      members: surface.members,
      scripts: unionRowsForMembers(exposure.rows, surface.members).size,
      note: surface.note,
      settledSinceV1: surface.settledSinceV1,
      acquisitionCost: surface.acquisitionCost,
      terminalSteps: surface.terminalSteps,
    };
  });
  const requestSecurityHitCount = memberMap.corpusMembers.find((row) => row.member === 'request.security')?.hitCount ?? 0;
  const requestLowerTfHitCount = memberMap.corpusMembers.find((row) => row.member === 'request.security_lower_tf')?.hitCount ?? 0;
  const markdown = buildMarkdown({
    exposure,
    varipExposure,
    surfaceSummaries,
    interiorCounts,
    traceCounts: exposure.traceOrHostRequiredMemberCounts,
    requestSecurityHitCount,
    requestLowerTfHitCount,
  });
  const json = {
    schemaVersion: 1,
    measurementSha: exposure.measurementSha,
    basis: {
      sourceExposureReport: 'pine-value-vector-corpus-exposure-v1.json',
      sourceCorpusMemberMap: 'pine-corpus-member-map-v1.json',
      sourceVaripExposureReport: 'pine-varip-trace-exposure-v1.json',
      totalScripts: exposure.summary.corpusScripts,
    },
    summary: {
      interiorHoleScripts: exposure.summary.rowsWithInteriorHoleExposure,
      traceOrHostRequiredScripts: exposure.summary.rowsTouchingTraceOrHostRequired,
      unknownUnsettledExposureScripts: exposure.summary.rowsWithUnknownExposure,
      varipReplacementSensitiveScripts: varipExposure.summary.replacementSensitiveScripts,
      requestSecurityCorpusHits: requestSecurityHitCount,
      requestSecurityLowerTfCorpusHits: requestLowerTfHitCount,
      realtimeBarstateTickScripts: realtimeBarstateScriptCount,
      barstateHistoricalBoundarySettledBy: 'pine-barstate-lastconfirmedhistory-oracles-v1.md',
    },
    purchaseOrder: surfaceSummaries
      .filter((surface) => surface.scripts > 0)
      .sort((left, right) => right.scripts - left.scripts || (left.v1Rank ?? 99) - (right.v1Rank ?? 99))
      .slice(0, 4),
    interiorHoleMemberCounts: interiorCounts,
    traceOrHostRequiredMemberCounts: exposure.traceOrHostRequiredMemberCounts,
    surfaceCrosswalk: surfaceSummaries,
  };
  return { json, markdown };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { json, markdown } = await buildPineTracePurchaseOrderReport();
  await mkdir(dirname(OUTPUT_BASE), { recursive: true });
  await writeFile(`${OUTPUT_BASE}.json`, `${JSON.stringify(json, null, 2)}\n`);
  await writeFile(`${OUTPUT_BASE}.md`, markdown);
  console.log(`Wrote ${OUTPUT_BASE}.md`);
  console.log(`Wrote ${OUTPUT_BASE}.json`);
}
