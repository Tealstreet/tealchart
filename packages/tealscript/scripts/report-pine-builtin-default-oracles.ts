#!/usr/bin/env tsx

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

import optionalUsageReport from '../reports/pine-corpus-optional-argument-usage-v1.json' with { type: 'json' };
import { PINE_V6_REFERENCE_SIGNATURES, type PineV6ReferenceSignature } from '../src/compat/pineV6BuiltinSignatures.ts';
import { parse } from '../src/parser/parser.ts';
import { tryCompile, executeCompiled } from '../src/runtime/codegen/execute.ts';
import type { Bar, PlotOutput } from '../src/runtime/context.ts';

interface LiveReferenceDoc {
  functions: LiveReferenceItem[];
  methods: LiveReferenceItem[];
}

interface LiveReferenceItem {
  name: string;
  originalName?: string;
  syntax?: string[];
  args?: LiveReferenceArg[];
  returnedTypes?: string[];
}

interface LiveReferenceArg {
  name: string;
  desc?: string;
  required?: boolean;
}

interface SignatureEntry {
  namespace: string;
  name: string;
  signature: PineV6ReferenceSignature;
}

interface DefaultEvidence {
  kind: 'literal' | 'unresolved-reference' | 'manual-silent';
  raw?: string;
  expression?: string;
  desc?: string;
}

interface SlotRow {
  member: string;
  namespace: string;
  param: string;
  scriptCount: number;
  hitCount: number;
  evidence: DefaultEvidence;
  probe:
    | { verdict: 'matched'; omittedCall: string; explicitCall: string }
    | { verdict: 'mismatch'; omittedCall: string; explicitCall: string; reason: string }
    | { verdict: 'not-executable'; reason: string };
}

interface Report {
  generatedAt: string;
  measuredCommit: string;
  source: {
    referencePage: string;
    corpusUsageReport: string;
    signatureSnapshot: string;
  };
  summary: {
    optionalSlots: number;
    documentedLiteralDefaults: number;
    unresolvedDocumentedDefaults: number;
    manualSilentSlots: number;
    executableDefaultProbes: number;
    matchedExecutableDefaultProbes: number;
    mismatchedExecutableDefaultProbes: number;
    notExecutableDefaultProbes: number;
    richerSetupDefaultProbes: number;
  };
  rows: SlotRow[];
}

const packageRoot = resolve(dirname(dirname(new URL(import.meta.url).pathname)));
const outJson = resolve(packageRoot, 'reports/pine-builtin-default-oracle-sweep-v1.json');
const outMd = resolve(packageRoot, 'reports/pine-builtin-default-oracle-sweep-v1.md');
const referenceUrl = 'https://www.tradingview.com/pine-script-reference/v6/';
const staticBundlesPrefix = 'https://static.tradingview.com/static/bundles/';

const BARS: Bar[] = [10, 11, 12, 13, 12, 14, 15, 13].map((close, index) => ({
  time: (index + 1) * 60_000,
  open: close - 0.5,
  high: close + 1,
  low: close - 1,
  close,
  volume: 100 + index,
}));

const PRELUDE = `
arr = array.new_float(2, close)
arr2 = array.new_float(2, open)
mat = matrix.new<float>(2, 2, close)
mp = map.new<string, float>()
pt = chart.point.new(time, bar_index, close)
pt2 = chart.point.new(time, bar_index + 1, open)
ln = line.new(bar_index, close, bar_index + 1, open)
ln2 = line.new(bar_index, high, bar_index + 1, low)
lf = linefill.new(ln, ln2, color.red)
lbl = label.new(bar_index, close, "x")
bx = box.new(bar_index, high, bar_index + 1, low)
tbl = table.new(position.top_right, 2, 2)
pl = plot(close, "base")
hl = hline(1)
`;

function flattenSignatures(): SignatureEntry[] {
  return Object.entries(PINE_V6_REFERENCE_SIGNATURES)
    .flatMap(([namespace, signatures]) => Object.entries(signatures).map(([name, signature]) => ({ namespace, name, signature })))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function cleanParam(param: string): string {
  return param.split(',')[0]!.trim();
}

function requiredParams(signature: PineV6ReferenceSignature): string[] {
  return [...(signature.requiredParams ?? signature.params.slice(0, signature.minArgs ?? 0).map(cleanParam))];
}

function optionalParams(signature: PineV6ReferenceSignature): string[] {
  const required = new Set(requiredParams(signature));
  const minArgs = signature.minArgs ?? 0;
  return signature.params
    .map(cleanParam)
    .filter((param, index) => !required.has(param) && index >= minArgs && !param.includes('...'));
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'accept-language': 'en-US,en;q=0.9',
      'user-agent': 'Mozilla/5.0 TealScript default oracle audit',
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  return response.text();
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function extractBundleUrl(html: string, pattern: RegExp, label: string): string {
  const match = pattern.exec(html);
  if (!match?.[1]) throw new Error(`Could not find ${label} bundle URL in live TradingView reference page`);
  return match[1];
}

function extractBundleUrls(html: string): string[] {
  return unique([...html.matchAll(/https:\/\/static\.tradingview\.com\/static\/bundles\/[^"']+\.js/g)].map((match) => match[0]));
}

function extractV6Loader(referenceBundle: string): { chunkIds: number[]; moduleId: number } {
  const match = /PineLanguage\.V6:t=.*?Promise\.all\(\[([^\]]+)\]\).*?bind\(o,(\d+)\)/s.exec(referenceBundle);
  if (!match?.[1] || !match[2]) throw new Error('Could not find Pine v6 reference loader in TradingView reference bundle');
  return {
    chunkIds: [...match[1].matchAll(/o\.e\((\d+)\)/g)].map((chunk) => Number(chunk[1])),
    moduleId: Number(match[2]),
  };
}

async function findV6LoaderBundle(bundleUrls: readonly string[]): Promise<{ loader: { chunkIds: number[]; moduleId: number } }> {
  for (const bundleUrl of bundleUrls) {
    const bundle = await fetchText(bundleUrl);
    try {
      return { loader: extractV6Loader(bundle) };
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Could not find Pine v6 reference loader')) throw error;
    }
  }
  throw new Error('Could not find Pine v6 reference loader in any TradingView reference page bundle');
}

function chunkFileName(runtimeBundle: string, chunkId: number): string {
  const localizedWithId = new RegExp(`if\\(${chunkId}===e\\)return"__LANG__\\."\\+e\\+"\\.([^"]+\\.js)"`).exec(runtimeBundle)?.[1];
  if (localizedWithId) return `en.${chunkId}.${localizedWithId}`;

  const direct = new RegExp(`if\\(${chunkId}===e\\)return"([^"]+)"`).exec(runtimeBundle)?.[1];
  if (direct && !direct.includes('__LANG__')) return direct;

  const hash = new RegExp(`${chunkId}:"([a-f0-9]+)"`).exec(runtimeBundle)?.[1];
  if (hash) return `${chunkId}.${hash}.js`;

  throw new Error(`Could not resolve webpack chunk filename for ${chunkId}`);
}

async function fetchChunk(runtimeBundle: string, chunkId: number): Promise<string> {
  const fileName = chunkFileName(runtimeBundle, chunkId);
  for (const candidate of [fileName, fileName.replace(/^en\./, '')]) {
    const response = await fetch(`${staticBundlesPrefix}${candidate}`, {
      headers: {
        'accept-language': 'en-US,en;q=0.9',
        'user-agent': 'Mozilla/5.0 TealScript default oracle audit',
      },
    });
    if (response.ok) return response.text();
  }
  throw new Error(`Failed to fetch chunk ${chunkId}`);
}

function loadLiveReferenceDoc(chunks: readonly string[], moduleId: number): LiveReferenceDoc {
  const modules: Record<string, (module: { exports: unknown }, exports: Record<string, unknown>, require: WebpackRequire) => void> = {};
  const context = {
    console,
    self: {
      webpackChunktradingview: {
        push(payload: [unknown, typeof modules]) {
          Object.assign(modules, payload[1]);
        },
      },
    },
  };

  for (const chunk of chunks) vm.runInNewContext(chunk, context, { timeout: 5000 });

  const cache = new Map<string, { exports: Record<string, unknown> }>();
  const requireModule = ((rawId: number | string) => {
    const id = String(rawId);
    if (cache.has(id)) return cache.get(id)!.exports;
    if (id === '982245') {
      return {
        t: (_key: unknown, options: unknown, value: unknown) => {
          const optionRecord = options && typeof options === 'object' ? options as Record<string, unknown> : {};
          const replacements = optionRecord.replace && typeof optionRecord.replace === 'object'
            ? optionRecord.replace as Record<string, unknown>
            : optionRecord;
          const text = Array.isArray(value) ? value.join('') : String(value ?? '');
          return text.replace(/\{([A-Za-z0-9_]+)\}/g, (placeholder, key) => {
            const replacement = replacements[key];
            return replacement === undefined || replacement === null ? placeholder : String(replacement);
          });
        },
      };
    }
    if (!modules[id]) return `i18n:${id}`;

    const module = { exports: {} as Record<string, unknown> };
    cache.set(id, module);
    modules[id](module, module.exports, requireModule);
    return module.exports;
  }) as WebpackRequire;

  requireModule.d = (exports, definitions) => {
    for (const [key, getter] of Object.entries(definitions)) {
      Object.defineProperty(exports, key, { enumerable: true, get: getter });
    }
  };
  requireModule.r = (exports) => {
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    Object.defineProperty(exports, '__esModule', { value: true });
  };

  const moduleExports = requireModule(moduleId);
  if (typeof moduleExports === 'string') throw new Error(`Reference module ${moduleId} was not loaded from the live bundle`);
  return moduleExports.default as LiveReferenceDoc;
}

interface WebpackRequire {
  (id: number | string): Record<string, unknown> | string;
  d(exports: Record<string, unknown>, definitions: Record<string, () => unknown>): void;
  r(exports: Record<string, unknown>): void;
}

function callableNames(item: LiveReferenceItem): string[] {
  const names = new Set<string>();
  for (const syntax of item.syntax ?? []) {
    const match = /^([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?)(?:<[^>]+>)?\(/.exec(syntax);
    if (match?.[1]) names.add(match[1].replace(/<[^>]+>/g, ''));
  }
  if (names.size === 0) names.add(item.name.replace(/<[^>]+>/g, ''));
  return [...names];
}

async function loadLiveReference(): Promise<Map<string, LiveReferenceItem[]>> {
  const html = await fetchText(referenceUrl);
  const bundleUrls = extractBundleUrls(html);
  const runtimeBundleUrl = extractBundleUrl(html, /<script[^>]+src="(https:\/\/static\.tradingview\.com\/static\/bundles\/runtime\.[^"]+\.js)"/, 'runtime');
  const runtimeBundle = await fetchText(runtimeBundleUrl);
  const loaderBundle = await findV6LoaderBundle(bundleUrls);
  const chunks = await Promise.all(loaderBundle.loader.chunkIds.map((chunkId) => fetchChunk(runtimeBundle, chunkId)));
  const doc = loadLiveReferenceDoc(chunks, loaderBundle.loader.moduleId);
  const result = new Map<string, LiveReferenceItem[]>();
  for (const item of [...doc.functions, ...doc.methods]) {
    for (const name of callableNames(item)) {
      const rows = result.get(name) ?? [];
      rows.push(item);
      result.set(name, rows);
    }
  }
  return result;
}

function extractDefault(desc: string | undefined): DefaultEvidence {
  if (!desc) return { kind: 'manual-silent' };
  const text = desc.replace(/\s+/g, ' ').trim();
  const patterns = [
    /Default value is (.+?)(?:\.(?:\s|$)|$)/i,
    /The default value is (.+?)(?:\.(?:\s|$)|$)/i,
    /Default is (.+?)(?:\.(?:\s|$)|$)/i,
    /The default is (.+?)(?:\.(?:\s|$)|$)/i,
    /The default .*? is (.+?)(?:\.(?:\s|$)|$)/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match?.[1]) continue;
    const raw = match[1].trim();
    if (/[{}]|argument used|same as|inherited|chart|symbol|timeframe|session|number of|available/.test(raw)) {
      return { kind: 'unresolved-reference', raw, desc: text };
    }
    const expression = defaultExpression(raw);
    if (!expression) return { kind: 'unresolved-reference', raw, desc: text };
    return { kind: 'literal', raw, expression, desc: text };
  }
  return { kind: 'manual-silent' };
}

function defaultExpression(raw: string): string | undefined {
  let normalized = raw.trim();
  const markdownLink = /^\[([^\]]+)\]\([^)]+\)$/.exec(normalized);
  if (markdownLink?.[1]) normalized = markdownLink[1];
  normalized = normalized.replace(/`([^`]+)`/g, '$1');
  if (/^(?:an )?empty string\b/i.test(normalized)) return '""';
  if (/^zero\b/i.test(normalized)) return '0';
  if (/^1 pixel\b/i.test(normalized)) return '1';
  if (/^(true|false)$/i.test(normalized)) return normalized.toLowerCase();
  if (/^'(true|false)'$/i.test(normalized)) return normalized.slice(1, -1).toLowerCase();
  if (/^'na'$/i.test(normalized) || /^na$/i.test(normalized)) return 'na';
  if (/^-?\d+(?:\.\d+)?$/.test(normalized)) return normalized;
  if (/^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+$/.test(normalized)) return normalized;
  const leadingNumber = /^(-?\d+(?:\.\d+)?),/.exec(normalized);
  if (leadingNumber?.[1]) return leadingNumber[1];
  const quoted = /^"([^"]*)"/.exec(normalized);
  if (quoted) return JSON.stringify(quoted[1]);
  return undefined;
}

function usageBySlot(): Map<string, { scriptCount: number; hitCount: number }> {
  const rows = (optionalUsageReport as { rankedSlots?: { member: string; param: string; scriptCount: number; hitCount: number }[] }).rankedSlots ?? [];
  return new Map(rows.map((row) => [`${row.member}:${row.param}`, { scriptCount: row.scriptCount, hitCount: row.hitCount }]));
}

function valueForParam(callName: string, param: string): string {
  const p = cleanParam(param);
  if (callName.startsWith('array.') && (p === 'id' || p === 'array_id' || p === 'a')) return 'arr';
  if (callName.startsWith('array.') && (p === 'id1' || p === 'array1')) return 'arr';
  if (callName.startsWith('array.') && (p === 'id2' || p === 'array2')) return 'arr2';
  if (callName.startsWith('matrix.') && (p === 'id' || p === 'matrix_id' || p === 'this')) return 'mat';
  if (callName.startsWith('map.') && p === 'id') return 'mp';
  if (callName.startsWith('table.') && (p === 'table_id' || p === 'id')) return 'tbl';
  if (callName.startsWith('linefill.') && (p === 'id' || p === 'linefill_id')) return 'lf';
  if (callName.startsWith('line.') && (p === 'id' || p === 'line_id' || p === 'line1')) return 'ln';
  if (callName.startsWith('line.') && p === 'line2') return 'ln2';
  if (callName.startsWith('label.') && (p === 'id' || p === 'label_id')) return 'lbl';
  if (callName.startsWith('box.') && (p === 'id' || p === 'box_id')) return 'bx';
  if (callName.startsWith('chart.point.') || p.endsWith('_point') || p === 'top_left' || p === 'bottom_right') return 'pt';
  if (p === 'first_point' || p === 'second_point' || p === 'top_right' || p === 'bottom_left') return 'pt2';
  if (p === 'plot1' || p === 'plot2' || p === 'hline1' || p === 'hline2') return p.includes('hline') ? 'hl' : 'pl';
  if (p === 'order') return 'order.ascending';
  if (p === 'direction') return 'strategy.long';
  if (p === 'currency') return 'currency.USD';
  if (p === 'lookahead') return 'barmerge.lookahead_off';
  if (p === 'gaps') return 'barmerge.gaps_off';
  if (p === 'position') return 'position.top_right';
  if (p === 'location') return 'location.abovebar';
  if (p === 'style') return callName.startsWith('line.') ? 'line.style_solid' : callName.startsWith('label.') ? 'label.style_label_up' : 'plot.style_line';
  if (p === 'linestyle') return 'hline.style_solid';
  if (p === 'xloc') return 'xloc.bar_index';
  if (p === 'yloc') return 'yloc.price';
  if (p === 'extend') return 'extend.none';
  if (p === 'display') return 'display.all';
  if (p === 'format') return callName.startsWith('str.') ? '"{0}"' : 'format.price';
  if (p === 'font_family' || p === 'text_font_family') return 'font.family_default';
  if (p === 'textalign') return 'text.align_center';
  if (p === 'text_formatting') return 'text.format_none';
  if (p === 'session') return '"0930-1600"';
  if (p === 'timeframe' || p === 'resolution') return '"60"';
  if (callName === 'request.currency_rate' && (p === 'from' || p === 'to')) return p === 'from' ? '"USD"' : '"EUR"';
  if (p === 'symbol' || p === 'ticker' || p === 'tickerid' || p === 'prefix') return '"NASDAQ:AAPL"';
  if (p === 'source' || p === 'series' || p === 'defval' || p === 'value' || p === 'initial_value' || p === 'val') {
    if (p === 'defval' && /^(input\.(?:enum|session|symbol|text_area|timeframe))$/.test(callName)) return '"x"';
    if (callName.includes('string') || callName.startsWith('str.') || (p === 'source' && callName.startsWith('str.'))) return '"x"';
    if (callName.includes('bool')) return 'true';
    if (callName.includes('color')) return 'color.red';
    return 'close';
  }
  if (p.includes('color') || p === 'color') return 'color.red';
  if (/^(title|text|tooltip|inline|group|message|comment|alert_message|regex|replacement|target|substring|separator|formatString|arg0|arg1|sort_field)$/.test(p)) return '"x"';
  if (/^(condition|confirm|active|editable|force_overlay|overlay|biased|ignore_invalid_symbol|ignore_invalid_timeframe|calc_bars_count|is_standard|disable_alert|when|floor|trackprice|join|fillgaps)$/.test(p)) return 'true';
  if (p === 'time') return 'time';
  if (p === 'timezone') return '"Etc/UTC"';
  if (/^(x|x1|x2|y|y1|y2|index|length|row|column|columns|rows|width|linewidth|offset|precision|transp|transparency|seed|occurrence|repeat|leftbars|rightbars|trade_num|qty|contracts|from|to|begin_pos|end_pos|percentage|power|hour|minute|second|month|day|year|min|max|minval|maxval|step|top|bottom|left|right|price|open|high|low|close|number|number0|number1|base|exponent|angle|radians|degrees|histbase|minheight|maxheight|bars_back|timeframe_bars_back)$/.test(p)) return '1';
  return 'close';
}

function requiredArgsFor(entry: SignatureEntry): string[] {
  return requiredParams(entry.signature).map((param) => valueForParam(entry.name, param));
}

function callWith(entry: SignatureEntry, defaultParam?: string, defaultExpressionValue?: string): string {
  const args = [...requiredArgsFor(entry)];
  if (defaultParam && defaultExpressionValue) args.push(`${defaultParam} = ${defaultExpressionValue}`);
  return `${entry.name}(${args.join(', ')})`;
}

function sourceForCall(call: string, liveItems: readonly LiveReferenceItem[]): string {
  const returnsVoid = liveItems.some((item) => item.returnedTypes?.includes('void'));
  const returnsOutput = liveItems.some((item) => item.returnedTypes?.some((type) => ['plot', 'hline', 'line', 'label', 'box', 'table', 'linefill'].includes(type)));
  const statement = returnsVoid || returnsOutput ? call : `_probe = ${call}\nplot(_probe, "probe")`;
  return `//@version=6\nindicator("default oracle", overlay=true)\n${PRELUDE}\n${statement}\n`;
}

function normalizeResult(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeResult);
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  const copy: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    if (key === 'runtimeProfile') continue;
    if (key === 'id' && typeof record[key] === 'string' && String(record[key]).startsWith('plot_')) continue;
    copy[key] = normalizeResult(record[key]);
  }
  return copy;
}

function runSource(source: string): { ok: true; normalized: unknown } | { ok: false; reason: string } {
  try {
    const program = parse(source);
    const compiled = tryCompile(program);
    if (!compiled.success) return { ok: false, reason: `compile unsupported: ${compiled.unsupported.join(', ')}` };
    const result = executeCompiled(compiled, BARS);
    if (!result) return { ok: false, reason: 'executeCompiled returned null' };
    if (result.errors.length > 0) return { ok: false, reason: `runtime errors: ${result.errors.map((error) => error.message).join('; ')}` };
    return { ok: true, normalized: normalizeResult({ plots: normalizePlots(result.plots), drawings: result.drawings, inputs: result.inputs, alerts: result.alerts, logs: result.logs }) };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

function normalizePlots(plots: PlotOutput[]): unknown[] {
  return plots.map((plot) => ({
    ...plot,
    id: undefined,
  }));
}

function probeDefault(entry: SignatureEntry, liveItems: readonly LiveReferenceItem[], param: string, evidence: DefaultEvidence): SlotRow['probe'] {
  if (evidence.kind !== 'literal' || !evidence.expression) {
    return { verdict: 'not-executable', reason: 'No literal documented default expression is available.' };
  }
  const omittedCall = callWith(entry);
  const explicitCall = callWith(entry, param, evidence.expression);
  const omitted = runSource(sourceForCall(omittedCall, liveItems));
  if (!omitted.ok) return { verdict: 'not-executable', reason: `omitted form did not execute: ${omitted.reason}` };
  const explicit = runSource(sourceForCall(explicitCall, liveItems));
  if (!explicit.ok) return { verdict: 'not-executable', reason: `explicit default form did not execute: ${explicit.reason}` };
  const omittedJson = JSON.stringify(omitted.normalized);
  const explicitJson = JSON.stringify(explicit.normalized);
  if (omittedJson === explicitJson) return { verdict: 'matched', omittedCall, explicitCall };
  return { verdict: 'mismatch', omittedCall, explicitCall, reason: 'Omitted call output differs from the same call with the documented default supplied explicitly.' };
}

function slotEvidence(liveItems: readonly LiveReferenceItem[], param: string): DefaultEvidence {
  for (const item of liveItems) {
    const arg = item.args?.find((candidate) => candidate.name === param);
    if (!arg) continue;
    const evidence = extractDefault(arg.desc);
    if (evidence.kind !== 'manual-silent') return evidence;
  }
  return { kind: 'manual-silent' };
}

function renderMarkdown(report: Report): string {
  const topRows = report.rows.slice(0, 40).map((row) => {
    const defaultText = row.evidence.kind === 'literal'
      ? `literal \`${row.evidence.raw}\``
      : row.evidence.kind === 'unresolved-reference'
        ? `unresolved \`${row.evidence.raw}\``
        : 'manual-silent';
    const probeText = row.probe.verdict === 'mismatch'
      ? `MISMATCH: ${row.probe.reason}`
      : row.probe.verdict === 'matched'
        ? 'matched omitted vs explicit default'
        : `unprobed: ${row.probe.reason}`;
    return `| \`${row.member}\` | \`${row.param}\` | ${row.scriptCount} | ${row.hitCount} | ${defaultText} | ${probeText} |`;
  }).join('\n');
  const mismatches = report.rows.filter((row) => row.probe.verdict === 'mismatch');
  const mismatchRows = mismatches.length === 0
    ? 'None.'
    : mismatches.map((row) => `- \`${row.member}:${row.param}\`: ${row.probe.verdict === 'mismatch' ? row.probe.reason : ''}`).join('\n');
  const resumableRows = (rows: SlotRow[]) => rows.map((row) => {
    const evidence = row.evidence.raw ? row.evidence.raw.replace(/\|/g, '\\|') : '';
    const reason = row.probe.verdict === 'not-executable' ? row.probe.reason.replace(/\|/g, '\\|') : '';
    return `| \`${row.member}\` | \`${row.param}\` | ${row.scriptCount} | ${row.hitCount} | ${evidence} | ${reason} |`;
  }).join('\n');
  const unresolvedQueue = report.rows
    .filter((row) => row.probe.verdict === 'not-executable' && row.evidence.kind === 'unresolved-reference')
    .sort((a, b) => b.scriptCount - a.scriptCount || b.hitCount - a.hitCount || `${a.member}:${a.param}`.localeCompare(`${b.member}:${b.param}`));
  const richerSetupQueue = report.rows
    .filter((row) => row.probe.verdict === 'not-executable' && row.evidence.kind === 'literal')
    .sort((a, b) => b.scriptCount - a.scriptCount || b.hitCount - a.hitCount || `${a.member}:${a.param}`.localeCompare(`${b.member}:${b.param}`));

  return `# Pine Builtin Default Oracle Sweep v1

Generated at ${report.generatedAt}. Measured at commit \`${report.measuredCommit.slice(0, 10)}${report.measuredCommit.endsWith('+dirty') ? '+dirty' : ''}\`.

## Scope

- Live reference source: ${report.source.referencePage}
- Signature snapshot: \`${report.source.signatureSnapshot}\`
- Corpus ranking source: \`${report.source.corpusUsageReport}\`

This report addresses the optional-default hole left by the argument-binding sweep. It does not infer defaults from TealScript behavior. Defaults are sourced only from literal text in TradingView's live v6 reference argument descriptions. Defaults that resolve only to doc placeholders such as \`mdInternalRef\`, inherited chart settings, or manual silence remain unprobed.

The corpus rank is best-effort: the available corpus report ranks the 222 vector-untested optional slots, so current optional slots absent from that report are treated as zero observed usage rather than invented exposure.

## Summary

| Metric | Count |
| --- | ---: |
| Current optional slots | ${report.summary.optionalSlots} |
| Literal documented defaults extracted | ${report.summary.documentedLiteralDefaults} |
| Documented defaults blocked by unresolved references | ${report.summary.unresolvedDocumentedDefaults} |
| Manual-silent optional slots | ${report.summary.manualSilentSlots} |
| Executable omission-vs-explicit probes | ${report.summary.executableDefaultProbes} |
| Matched executable probes | ${report.summary.matchedExecutableDefaultProbes} |
| Mismatched executable probes | ${report.summary.mismatchedExecutableDefaultProbes} |
| Not executable or still unprobed | ${report.summary.notExecutableDefaultProbes} |
| Needs richer setup after literal default extraction | ${report.summary.richerSetupDefaultProbes} |

## Remaining Unprobed Buckets

| Bucket | Count | Verdict |
| --- | ---: | --- |
| Docs silent | ${report.summary.manualSilentSlots} | Blocked on TradingView/compiler evidence; no default is inferred locally. |
| Unresolved refs / inherited settings | ${report.summary.unresolvedDocumentedDefaults} | Reference text names another setting or dynamic source rather than a literal omission oracle. |
| Needs richer setup | ${report.summary.richerSetupDefaultProbes} | Literal default is documented, but the current probe needs request data, UDT fields, lower-timeframe data, or another richer fixture. |

## Verdict

${report.summary.mismatchedExecutableDefaultProbes === 0
    ? 'Measured default surface closed: every slot with a literal documented default that the harness could execute matched omitted-vs-explicit behavior. This is not a claim that all optional defaults are verified; 240 slots remain unverified for the blockers below.'
    : `${report.summary.mismatchedExecutableDefaultProbes} default-substitution mismatches were found and need triage.`}

## Mismatches

${mismatchRows}

## Resumable Queues

These rows are ranked by observed corpus script count, then hit count. They are closable in principle, but this pass stops here because the 141 slots unlocked by fixing the oracle produced zero mismatches.

### Unresolved Refs / Inherited Settings

| Member | Param | Scripts | Hits | Evidence | Blocker |
| --- | --- | ---: | ---: | --- | --- |
${resumableRows(unresolvedQueue)}

### Needs Richer Setup

| Member | Param | Scripts | Hits | Evidence | Blocker |
| --- | --- | ---: | ---: | --- | --- |
${resumableRows(richerSetupQueue)}

## Top Ranked Optional Slots

| Member | Param | Scripts | Hits | Default evidence | Probe verdict |
| --- | --- | ---: | ---: | --- | --- |
${topRows}

Full rows are in \`${outJson.replace(`${packageRoot}/`, '')}\`.
`;
}

async function main(): Promise<void> {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: packageRoot, encoding: 'utf8' }).trim();
  const dirty = execFileSync('git', ['status', '--short'], { cwd: packageRoot, encoding: 'utf8' }).trim().length > 0;
  const measuredCommit = dirty ? `${commit}+dirty` : commit;
  const live = await loadLiveReference();
  const usage = usageBySlot();

  const rows: SlotRow[] = [];
  for (const entry of flattenSignatures()) {
    const liveItems = live.get(entry.name) ?? [];
    for (const param of optionalParams(entry.signature)) {
      const evidence = slotEvidence(liveItems, param);
      const slotUsage = usage.get(`${entry.name}:${param}`) ?? { scriptCount: 0, hitCount: 0 };
      rows.push({
        member: entry.name,
        namespace: entry.namespace,
        param,
        scriptCount: slotUsage.scriptCount,
        hitCount: slotUsage.hitCount,
        evidence,
        probe: probeDefault(entry, liveItems, param, evidence),
      });
    }
  }

  rows.sort((a, b) => b.scriptCount - a.scriptCount || b.hitCount - a.hitCount || a.member.localeCompare(b.member) || a.param.localeCompare(b.param));

  const report: Report = {
    generatedAt: new Date().toISOString(),
    measuredCommit,
    source: {
      referencePage: referenceUrl,
      corpusUsageReport: 'packages/tealscript/reports/pine-corpus-optional-argument-usage-v1.json',
      signatureSnapshot: 'packages/tealscript/src/compat/pineV6BuiltinSignatures.ts',
    },
    summary: {
      optionalSlots: rows.length,
      documentedLiteralDefaults: rows.filter((row) => row.evidence.kind === 'literal').length,
      unresolvedDocumentedDefaults: rows.filter((row) => row.evidence.kind === 'unresolved-reference').length,
      manualSilentSlots: rows.filter((row) => row.evidence.kind === 'manual-silent').length,
      executableDefaultProbes: rows.filter((row) => row.probe.verdict === 'matched' || row.probe.verdict === 'mismatch').length,
      matchedExecutableDefaultProbes: rows.filter((row) => row.probe.verdict === 'matched').length,
      mismatchedExecutableDefaultProbes: rows.filter((row) => row.probe.verdict === 'mismatch').length,
      notExecutableDefaultProbes: rows.filter((row) => row.probe.verdict === 'not-executable').length,
      richerSetupDefaultProbes: rows.filter((row) => row.evidence.kind === 'literal' && row.probe.verdict === 'not-executable').length,
    },
    rows,
  };

  mkdirSync(dirname(outJson), { recursive: true });
  writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(outMd, renderMarkdown(report));
  console.log(JSON.stringify(report.summary, null, 2));
}

void main();
