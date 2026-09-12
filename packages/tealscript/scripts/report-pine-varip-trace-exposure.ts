import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

interface CorpusMemberMap {
  basis: {
    v5Corpus: string;
    v6Corpus: string;
    v5SourceFiles: number;
    v6SourceFiles: number;
  };
}

interface VaripDeclaration {
  name: string;
  line: number;
  initializer: string;
}

interface VaripExposureRow {
  corpus: 'v5' | 'v6';
  file: string;
  declarations: VaripDeclaration[];
  replacementSensitive: boolean;
  reasons: string[];
}

const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const REPORTS_DIR = join(PACKAGE_ROOT, 'reports');
const MEMBER_MAP_PATH = join(REPORTS_DIR, 'pine-corpus-member-map-v1.json');
const OUTPUT_BASE = join(REPORTS_DIR, 'pine-varip-trace-exposure-v1');

const MUTATING_METHODS = new Set([
  'push',
  'pop',
  'shift',
  'unshift',
  'insert',
  'remove',
  'set',
  'clear',
  'fill',
  'concat',
  'sort',
  'reverse',
]);

function stripCommentsAndStrings(source: string): string {
  let result = '';
  let inString = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]!;
    const next = source[index + 1];
    if (inString) {
      if (char === '"' && next === '"') {
        index += 1;
      } else if (char === '"') {
        inString = false;
      }
      result += ' ';
      continue;
    }
    if (char === '"') {
      inString = true;
      result += ' ';
      continue;
    }
    if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') {
        result += ' ';
        index += 1;
      }
      result += '\n';
      continue;
    }
    result += char;
  }
  return result;
}

function stripTypePrefix(text: string): string {
  return text.replace(/^(?:series|simple|input|const)\s+/, '')
    .replace(/^(?:float|int|bool|string|color|line|label|box|table|polyline|linefill|chart\.point|array<[^>]+>|matrix<[^>]+>|map<[^>]+>|[A-Za-z_][\w.]*\s*\[\])\s+/, '');
}

function declarationsFor(source: string): VaripDeclaration[] {
  const clean = stripCommentsAndStrings(source);
  const declarations: VaripDeclaration[] = [];
  const lines = clean.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const match = /\bvarip\s+(.+?)(?::=|=)\s*(.*)$/.exec(line);
    if (!match) continue;
    const beforeEquals = stripTypePrefix(match[1]!.trim());
    const nameMatch = /^([A-Za-z_]\w*)\b/.exec(beforeEquals);
    if (!nameMatch) continue;
    declarations.push({
      name: nameMatch[1]!,
      line: index + 1,
      initializer: match[2]!.trim(),
    });
  }
  return declarations;
}

function hasName(source: string, name: string, pattern: (escaped: string) => RegExp): boolean {
  return pattern(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(source);
}

function classify(source: string, declarations: readonly VaripDeclaration[]): { replacementSensitive: boolean; reasons: string[] } {
  const clean = stripCommentsAndStrings(source);
  const reasons = new Set<string>();
  for (const declaration of declarations) {
    const name = declaration.name;
    if (hasName(clean, name, (escaped) => new RegExp(`\\b${escaped}\\s*(?::=|[+\\-*/%]=)`, 'm'))) {
      reasons.add(`${name}: reassigned after declaration`);
    }
    if (hasName(clean, name, (escaped) => new RegExp(`\\barray\\.(?:${[...MUTATING_METHODS].join('|')})\\s*\\(\\s*${escaped}\\b`, 'm'))) {
      reasons.add(`${name}: mutated by array namespace method`);
    }
    if (hasName(clean, name, (escaped) => new RegExp(`\\bmatrix\\.(?:${[...MUTATING_METHODS].join('|')})\\s*\\(\\s*${escaped}\\b`, 'm'))) {
      reasons.add(`${name}: mutated by matrix namespace method`);
    }
    if (hasName(clean, name, (escaped) => new RegExp(`\\bmap\\.(?:put|remove|clear)\\s*\\(\\s*${escaped}\\b`, 'm'))) {
      reasons.add(`${name}: mutated by map namespace method`);
    }
    if (hasName(clean, name, (escaped) => new RegExp(`\\b${escaped}\\.(?:${[...MUTATING_METHODS].join('|')}|put|remove)\\s*\\(`, 'm'))) {
      reasons.add(`${name}: mutated by receiver method`);
    }
    if (hasName(clean, name, (escaped) => new RegExp(`\\bbarstate\\.(?:isnew|isrealtime|isconfirmed|islast)\\b[\\s\\S]{0,400}\\b${escaped}\\s*(?::=|[+\\-*/%]=)`, 'm'))) {
      reasons.add(`${name}: mutation is near realtime barstate logic`);
    }
  }
  return { replacementSensitive: reasons.size > 0, reasons: [...reasons].sort() };
}

async function sourceFiles(corpusRoot: string): Promise<string[]> {
  const sourceRoot = join(corpusRoot, 'sources');
  return (await readdir(sourceRoot))
    .filter((file) => file.endsWith('.pine'))
    .sort()
    .map((file) => join(sourceRoot, file));
}

async function scanCorpus(corpus: 'v5' | 'v6', corpusRoot: string): Promise<VaripExposureRow[]> {
  const rows: VaripExposureRow[] = [];
  for (const file of await sourceFiles(corpusRoot)) {
    const source = await readFile(file, 'utf8');
    const declarations = declarationsFor(source);
    if (declarations.length === 0) continue;
    rows.push({
      corpus,
      file: relative(corpusRoot, file),
      declarations,
      ...classify(source, declarations),
    });
  }
  return rows;
}

function markdown(rows: readonly VaripExposureRow[], measurementSha: string, totalScripts: number): string {
  const sensitive = rows.filter((row) => row.replacementSensitive);
  const declarationOnly = rows.filter((row) => !row.replacementSensitive);
  const sampleRows = sensitive
    .slice(0, 30)
    .map((row) => `| ${row.corpus} | \`${row.file}\` | ${row.declarations.map((declaration) => `\`${declaration.name}\` L${declaration.line}`).join(', ')} | ${row.reasons.join('; ')} |`)
    .join('\n');
  return [
    '# Pine Varip Trace Exposure V1',
    '',
    `Measurement SHA: \`${measurementSha}\`. Source corpora: \`pine-corpus-v5-20260910\` and \`pine-corpus-v6-20260911\`.`,
    '',
    '## Summary',
    '',
    `The two pinned public corpora contain ${totalScripts} scripts. ${rows.length} scripts (${((rows.length / totalScripts) * 100).toFixed(2)}%) declare \`varip\`. ${sensitive.length} scripts (${((sensitive.length / totalScripts) * 100).toFixed(2)}%) use \`varip\` in a mutation shape where realtime same-bar replacement semantics can differ from \`var\`. ${declarationOnly.length} scripts declare \`varip\` only in shapes this static scan cannot distinguish from \`var\`.`,
    '',
    'Consequence is high even though exposure is modest: a wrong `varip` implementation can produce subtly wrong realtime values without parse, semantic, or historical-output failure. It should be purchased after the hotter TA-hole, barstate, and timenow traces unless Sam wants to close the final language trace boundary explicitly.',
    '',
    '## Counts',
    '',
    '| Bucket | Scripts |',
    '| --- | ---: |',
    `| Any \`varip\` declaration | ${rows.length} |`,
    `| Replacement-sensitive mutation shape | ${sensitive.length} |`,
    `| Declaration-only / static indistinguishable from \`var\` | ${declarationOnly.length} |`,
    '',
    '## Replacement-Sensitive Examples',
    '',
    '| Corpus | File | Declarations | Why replacement semantics can matter |',
    '| --- | --- | --- | --- |',
    sampleRows || '| - | - | - | - |',
    '',
    '## Acquisition Cost',
    '',
    'A `varip` trace is browser-manual like purchases two and three, not a static CSV export. It needs copied Pine Logs from repeated executions of the same realtime bar, because historical bars cannot exercise rollback escape. The existing `tradingview-realtime-barstate-trace-v1.pine` acquisition shape is the right transport: one pasted script, Pine Logs, repeated same-`time` lines, and `scripts/import-tradingview-realtime-trace.ts`. A fourth script should add paired `var` and `varip` accumulators over the same live updates so the trace records the exact divergence across intrabar replacements.',
    '',
  ].join('\n');
}

export async function buildPineVaripTraceExposureReport(): Promise<{ json: unknown; markdown: string }> {
  const memberMap = JSON.parse(await readFile(MEMBER_MAP_PATH, 'utf8')) as CorpusMemberMap;
  const measurementSha = (await import('node:child_process')).execFileSync('git', ['rev-parse', '--short=10', 'HEAD'], { encoding: 'utf8' }).trim();
  const rows = [
    ...(await scanCorpus('v5', memberMap.basis.v5Corpus)),
    ...(await scanCorpus('v6', memberMap.basis.v6Corpus)),
  ].sort((left, right) => `${left.corpus}/${left.file}`.localeCompare(`${right.corpus}/${right.file}`));
  const totalScripts = memberMap.basis.v5SourceFiles + memberMap.basis.v6SourceFiles;
  const sensitive = rows.filter((row) => row.replacementSensitive);
  const json = {
    schemaVersion: 1,
    measurementSha,
    basis: {
      memberMap: 'pine-corpus-member-map-v1.json',
      v5Corpus: memberMap.basis.v5Corpus,
      v6Corpus: memberMap.basis.v6Corpus,
      totalScripts,
      method: 'Static scan after stripping comments and strings. Replacement-sensitive means a varip declaration is reassigned or its collection is mutated, so realtime rollback escape can differ from var. This is conservative exposure, not proof the branch executes on every live tick.',
    },
    summary: {
      scriptsWithVarip: rows.length,
      replacementSensitiveScripts: sensitive.length,
      declarationOnlyScripts: rows.length - sensitive.length,
    },
    rows,
  };
  return { json, markdown: markdown(rows, measurementSha, totalScripts) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = await buildPineVaripTraceExposureReport();
  await mkdir(dirname(OUTPUT_BASE), { recursive: true });
  await writeFile(`${OUTPUT_BASE}.json`, `${JSON.stringify(report.json, null, 2)}\n`);
  await writeFile(`${OUTPUT_BASE}.md`, report.markdown);
  console.log(`Wrote ${OUTPUT_BASE}.json`);
  console.log(`Wrote ${OUTPUT_BASE}.md`);
}
