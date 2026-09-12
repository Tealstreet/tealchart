#!/usr/bin/env tsx

import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import vm from 'node:vm';

import { PINE_V6_REFERENCE_SIGNATURES, type PineV6ReferenceSignature } from '../src/compat/pineV6BuiltinSignatures.ts';

interface LiveReferenceDoc {
  functions: LiveReferenceItem[];
  methods: LiveReferenceItem[];
}

interface LiveReferenceItem {
  name: string;
  originalName?: string;
  syntax?: string[];
  args?: { name: string; allowedTypeIDs?: string[]; displayType?: string; type?: string }[];
}

interface IntegrityRow {
  kind:
    | 'matches-live'
    | 'local-member-not-in-live-functions'
    | 'live-member-missing-from-snapshot'
    | 'snapshot-param-extra'
    | 'snapshot-param-missing'
    | 'snapshot-overload-shape-mismatch';
  member: string;
  param?: string;
  localParams?: string[];
  liveParams?: string[];
  localOverloads?: string[][];
  liveOverloads?: string[][];
  liveSyntax?: string[];
  note: string;
}

const packageRoot = resolve(dirname(dirname(new URL(import.meta.url).pathname)));
const outJson = join(packageRoot, 'reports/pine-v6-reference-snapshot-integrity-v1.json');
const outMd = join(packageRoot, 'reports/pine-v6-reference-snapshot-integrity-v1.md');
const referenceUrl = 'https://www.tradingview.com/pine-script-reference/v6/';
const staticBundlesPrefix = 'https://static.tradingview.com/static/bundles/';

function referenceSignatures(): Record<string, PineV6ReferenceSignature> {
  return Object.fromEntries(
    Object.values(PINE_V6_REFERENCE_SIGNATURES).flatMap((namespace) => Object.entries(namespace)),
  ) as Record<string, PineV6ReferenceSignature>;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function sameArray(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function signatureParamsAreOverloadUnion(signature: PineV6ReferenceSignature): boolean {
  if (!signature.overloads?.length) return false;
  const overloadParams = new Set(signature.overloads.flatMap((overload) => [...overload]));
  return signature.params.every((param) => overloadParams.has(param));
}

function normalizeMemberName(name: string): string {
  return name.replace(/<[^>]+>/g, '');
}

function liveSyntaxCallableNames(item: LiveReferenceItem): string[] {
  const names = new Set<string>();
  for (const syntax of item.syntax ?? []) {
    const match = /^([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?)(?:<[^>]+>)?\(/.exec(syntax);
    if (match?.[1]) names.add(normalizeMemberName(match[1]));
  }
  if (names.size === 0) names.add(normalizeMemberName(item.name));
  return [...names];
}

function normalizeLiveArgName(name: string): string[] {
  if (!name.includes(',')) return [name];
  return name
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part !== '...');
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'accept-language': 'en-US,en;q=0.9',
      'user-agent': 'Mozilla/5.0 TealScript reference snapshot integrity audit',
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  return response.text();
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

async function findV6LoaderBundle(bundleUrls: readonly string[]): Promise<{ bundleUrl: string; bundle: string; loader: { chunkIds: number[]; moduleId: number } }> {
  for (const bundleUrl of bundleUrls) {
    const bundle = await fetchText(bundleUrl);
    try {
      return { bundleUrl, bundle, loader: extractV6Loader(bundle) };
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
  const localizedUrl = `${staticBundlesPrefix}${fileName}`;
  const localized = await fetch(localizedUrl, {
    headers: {
      'accept-language': 'en-US,en;q=0.9',
      'user-agent': 'Mozilla/5.0 TealScript reference snapshot integrity audit',
    },
  });
  if (localized.ok) return localized.text();

  const unlocalizedFileName = fileName.replace(/^en\./, '');
  const unlocalizedUrl = `${staticBundlesPrefix}${unlocalizedFileName}`;
  const unlocalized = await fetch(unlocalizedUrl, {
    headers: {
      'accept-language': 'en-US,en;q=0.9',
      'user-agent': 'Mozilla/5.0 TealScript reference snapshot integrity audit',
    },
  });
  if (unlocalized.ok) return unlocalized.text();

  throw new Error(`Failed to fetch chunk ${chunkId}: tried ${localizedUrl} and ${unlocalizedUrl}`);
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

  for (const chunk of chunks) {
    vm.runInNewContext(chunk, context, { timeout: 5000 });
  }

  const cache = new Map<string, { exports: Record<string, unknown> }>();
  const requireModule = ((rawId: number | string) => {
    const id = String(rawId);
    if (cache.has(id)) return cache.get(id)!.exports;
    if (id === '982245') return { t: (_key: unknown, _options: unknown, value: unknown) => String(value ?? '') };
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
  if (typeof moduleExports === 'string') {
    throw new Error(`Reference module ${moduleId} was not loaded from the live bundle`);
  }
  return moduleExports.default as LiveReferenceDoc;
}

interface WebpackRequire {
  (id: number | string): Record<string, unknown> | string;
  d(exports: Record<string, unknown>, definitions: Record<string, () => unknown>): void;
  r(exports: Record<string, unknown>): void;
}

function liveCallableMap(doc: LiveReferenceDoc): Map<string, LiveReferenceItem[]> {
  const result = new Map<string, LiveReferenceItem[]>();
  for (const item of [...doc.functions, ...doc.methods]) {
    if (!item.args && !item.syntax) continue;
    for (const callableName of liveSyntaxCallableNames(item)) {
      const group = result.get(callableName) ?? [];
      group.push(item);
      result.set(callableName, group);
    }
  }
  return result;
}

function compareSnapshot(doc: LiveReferenceDoc): IntegrityRow[] {
  const local = referenceSignatures();
  const live = liveCallableMap(doc);
  const rows: IntegrityRow[] = [];

  for (const [member, signature] of Object.entries(local)) {
    const liveItems = live.get(member);
    if (!liveItems) {
      rows.push({
        kind: 'local-member-not-in-live-functions',
        member,
        localParams: [...signature.params],
        note: 'The committed signature snapshot has this callable, but the live v6 reference does not expose a matching function or method entry. This may be a local extension, legacy alias, generated helper, or over-acceptance risk; it is not safe to classify from manual silence alone.',
      });
      continue;
    }

    const localParams = unique([
      ...signature.params.flatMap(normalizeLiveArgName),
      ...(signature.overloads?.flatMap((overload) => overload.flatMap(normalizeLiveArgName)) ?? []),
    ]);
    const liveParams = unique(liveItems.flatMap((item) => item.args?.flatMap((arg) => normalizeLiveArgName(arg.name)) ?? []));
    const liveSyntax = liveItems.flatMap((item) => item.syntax ?? []);

    let matches = true;
    for (const param of localParams) {
      if (liveParams.includes(param)) continue;
      matches = false;
      rows.push({
        kind: 'snapshot-param-extra',
        member,
        param,
        localParams,
        liveParams,
        liveSyntax,
        note: 'The committed snapshot names this parameter, but the live v6 reference does not. Some rows are real over-acceptance risks; some are local aliases or shorthand for variadic notation and need per-member judgement before changing behavior.',
      });
    }
    for (const param of liveParams) {
      if (localParams.includes(param)) continue;
      matches = false;
      rows.push({
        kind: 'snapshot-param-missing',
        member,
        param,
        localParams,
        liveParams,
        liveSyntax,
        note: 'The live v6 reference names this parameter, but the committed snapshot does not. If the checker uses the committed snapshot for named-argument binding, this is a potential false rejection.',
      });
    }

    if (signature.overloads) {
      const localOverloads = signatureParamsAreOverloadUnion(signature)
        ? signature.overloads.map((overload) => [...overload])
        : [[...signature.params], ...signature.overloads.map((overload) => [...overload])];
      const liveOverloads = liveItems.map((item) => item.args?.map((arg) => arg.name) ?? []);
      const missingLocal = localOverloads.filter((localOverload) => !liveOverloads.some((liveOverload) => sameArray(localOverload, liveOverload)));
      const missingLive = liveOverloads.filter((liveOverload) => !localOverloads.some((localOverload) => sameArray(localOverload, liveOverload)));
      if (missingLocal.length || missingLive.length) {
        matches = false;
        rows.push({
          kind: 'snapshot-overload-shape-mismatch',
          member,
          localOverloads,
          liveOverloads,
          liveSyntax,
          note: 'The member exists on both sides, but the documented overload shapes differ. This can affect positional binding even when the parameter union looks compatible.',
        });
      }
    }

    if (matches) {
      rows.push({
        kind: 'matches-live',
        member,
        localParams,
        liveParams,
        liveSyntax,
        note: 'The committed snapshot parameter union matches the live v6 reference.',
      });
    }
  }

  for (const member of live.keys()) {
    if (Object.hasOwn(local, member)) continue;
    const liveItems = live.get(member)!;
    rows.push({
      kind: 'live-member-missing-from-snapshot',
      member,
      liveParams: unique(liveItems.flatMap((item) => item.args?.map((arg) => arg.name) ?? [])),
      liveSyntax: liveItems.flatMap((item) => item.syntax ?? []),
      note: 'The live v6 reference documents this callable, but the committed signature snapshot has no row for it.',
    });
  }

  return rows.sort((a, b) => a.kind.localeCompare(b.kind) || a.member.localeCompare(b.member) || (a.param ?? '').localeCompare(b.param ?? ''));
}

function renderMarkdown(rows: readonly IntegrityRow[], commit: string, bundleInfo: { referenceBundleUrl: string; runtimeBundleUrl: string; chunkIds: number[]; moduleId: number }): string {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.kind, (counts.get(row.kind) ?? 0) + 1);
  const mismatchRows = rows.filter((row) => row.kind !== 'matches-live');
  const liveBacked = rows.filter((row) => row.kind === 'matches-live').length;
  const totalLocal = rows.filter((row) => row.kind !== 'live-member-missing-from-snapshot').map((row) => row.member);
  const localMembers = unique(totalLocal).length;
  const liveDocumentsSnapshotLacks = rows.filter((row) => row.kind === 'live-member-missing-from-snapshot' || row.kind === 'snapshot-param-missing').length;
  const snapshotHasLiveLacks = rows.filter((row) => row.kind === 'local-member-not-in-live-functions' || row.kind === 'snapshot-param-extra').length;
  const signatureShapeDifferences = rows.filter((row) => row.kind === 'snapshot-overload-shape-mismatch').length;

  const shortCommit = commit.endsWith('+dirty') ? `${commit.slice(0, 10)}+dirty` : commit.slice(0, 10);
  const lines = [
    '# Pine v6 Reference Snapshot Integrity V1',
    '',
    `Generated at ${new Date().toISOString()}. Measured at commit \`${shortCommit}\`.`,
    '',
    '## Method',
    '',
    `Fetched TradingView's live v6 reference page: ${referenceUrl}`,
    `Reference app bundle: \`${bundleInfo.referenceBundleUrl}\``,
    `Runtime bundle: \`${bundleInfo.runtimeBundleUrl}\``,
    `V6 reference module: \`${bundleInfo.moduleId}\`; chunks: ${bundleInfo.chunkIds.map((id) => `\`${id}\``).join(', ')}.`,
    '',
    'The script evaluates the deployed TradingView reference bundle in a Node VM with translation calls stubbed, then compares live `functions` plus `methods` signature entries against `PINE_V6_REFERENCE_SIGNATURES`. It deliberately does not derive the oracle from TealScript artifacts.',
    '',
    'Method boundary: this compares the live reference bundle, not a TradingView compiler trace. A live-documented parameter is strong reference evidence for acceptance; a live-missing parameter is not by itself proof that TradingView rejects it.',
    '',
    '## Headline',
    '',
    `Compared ${localMembers} committed snapshot callable members against ${counts.get('live-member-missing-from-snapshot') ?? 0} additional live-documented callable members absent from the snapshot.`,
    '',
    `- Exact live parameter-union matches: ${liveBacked}`,
    `- Local snapshot members absent from live callable entries: ${counts.get('local-member-not-in-live-functions') ?? 0}`,
    `- Live-documented members absent from the snapshot: ${counts.get('live-member-missing-from-snapshot') ?? 0}`,
    `- Snapshot parameters absent from live entries: ${counts.get('snapshot-param-extra') ?? 0}`,
    `- Live parameters absent from snapshot entries: ${counts.get('snapshot-param-missing') ?? 0}`,
    `- Overload shape mismatches: ${counts.get('snapshot-overload-shape-mismatch') ?? 0}`,
    '',
    'Action buckets:',
    '',
    `- Live documents but snapshot lacks: ${liveDocumentsSnapshotLacks} rows. These are potential false refusals or missing implementations.`,
    `- Snapshot has but live callable entries lack: ${snapshotHasLiveLacks} rows. These are possible over-acceptance risks, but ` + '`matrix.sort:sort_field`' + ' proved that absence from one source is not rejection evidence.',
    `- Signature shape differs: ${signatureShapeDifferences} rows. These are positional-binding risks: the call may be accepted but bound against the wrong arity/order.`,
    '',
    'The error rate is not near zero. The committed reference snapshot is materially out of date/thinner than TradingView\'s live v6 reference bundle, and one immediate conclusion reverses the previous `matrix.sort` finding: `sort_field` is live-documented for the UDT matrix overload, so treating it as invented was wrong.',
    '',
    'This supersedes the earlier `235` divergence count from the function-only comparison and the intermediate `409` breakdown from the raw method-label comparison. Including live reference methods is required for the callable surface, but method rows must be keyed from their syntax callables such as `array.get` and `matrix.sort`, not display labels such as `get` or `sort`. The current total reported here is the syntax-keyed callable count.',
    '',
    'Recommendation: do not silently refresh all denominators from live in place. Refreshing is the right direction, but it should be a named migration report because it will move the `861` official-name denominator, member maps, signature maps, and coverage fractions. Existing value oracles are lower blast radius than the signature/name instruments: the current provenance report says the value vectors cite live pages and hand derivations, not this committed snapshot.',
    '',
    '## Immediate Finding',
    '',
    '- `matrix.sort:sort_field` is present in the live v6 reference as `matrix.sort(id, column, order, sort_field)` for matrix values whose elements are UDT IDs. It is also described in TradingView\'s live matrices documentation under sorting matrices of user-defined types. This is not a corrupt snapshot row; the post-audit rejection was the corrupt state.',
    '',
    '## High-Signal Divergences',
    '',
  ];

  const highSignal = mismatchRows.filter((row) =>
    row.member === 'matrix.sort'
    || row.member === 'input.session'
    || row.member === 'plotbar'
    || row.member === 'plotcandle'
    || row.member === 'array.binary_search'
    || row.member === 'array.binary_search_leftmost'
    || row.member === 'array.binary_search_rightmost'
    || row.member === 'input.text_area'
    || row.member === 'bgcolor'
    || row.member === 'ticker.kagi',
  );
  for (const row of highSignal) {
    lines.push(`- ${row.kind}: \`${row.member}${row.param ? `:${row.param}` : ''}\` - ${row.note}`);
  }

  lines.push('', '## Rows', '', '| Kind | Member | Param | Local Params | Live Params | Live Syntax | Note |', '| --- | --- | --- | --- | --- | --- | --- |');
  for (const row of mismatchRows) {
    lines.push(`| ${[
      row.kind,
      `\`${row.member}\``,
      row.param ? `\`${row.param}\`` : '',
      row.localParams?.map((param) => `\`${param}\``).join(', ') ?? '',
      row.liveParams?.map((param) => `\`${param}\``).join(', ') ?? '',
      row.liveSyntax?.map((syntax) => `\`${syntax}\``).join('<br>') ?? '',
      row.note,
    ].join(' | ')} |`);
  }

  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: packageRoot, encoding: 'utf8' }).trim();
  const dirty = execFileSync('git', ['status', '--short'], { cwd: packageRoot, encoding: 'utf8' }).trim().length > 0;
  const measuredCommit = process.env.PINE_REFERENCE_MEASURED_COMMIT ?? (dirty ? `${commit}+dirty` : commit);
  const html = await fetchText(referenceUrl);
  const bundleUrls = extractBundleUrls(html);
  const runtimeBundleUrl = extractBundleUrl(html, /<script[^>]+src="(https:\/\/static\.tradingview\.com\/static\/bundles\/runtime\.[^"]+\.js)"/, 'runtime');
  const runtimeBundle = await fetchText(runtimeBundleUrl);
  const loaderBundle = await findV6LoaderBundle(bundleUrls);
  const referenceBundleUrl = loaderBundle.bundleUrl;
  const loader = loaderBundle.loader;
  const chunks = await Promise.all(loader.chunkIds.map((chunkId) => fetchChunk(runtimeBundle, chunkId)));
  const doc = loadLiveReferenceDoc(chunks, loader.moduleId);
  const rows = compareSnapshot(doc);
  const bundleInfo = { referenceBundleUrl, runtimeBundleUrl, chunkIds: loader.chunkIds, moduleId: loader.moduleId };

  await writeFile(outJson, `${JSON.stringify({ generatedAt: new Date().toISOString(), commit: measuredCommit, bundleInfo, rows }, null, 2)}\n`);
  await writeFile(outMd, renderMarkdown(rows, measuredCommit, bundleInfo));

  const mismatchCount = rows.filter((row) => row.kind !== 'matches-live').length;
  console.log(`reference snapshot integrity: ${mismatchCount} divergence rows; reports written`);
}

void main();
