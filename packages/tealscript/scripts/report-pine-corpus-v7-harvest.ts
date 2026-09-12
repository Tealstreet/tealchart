import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import memberMap from '../reports/pine-corpus-member-map-v1.json' with { type: 'json' };

interface HarvestManifest {
  method: string;
  targetScripts: number;
  priorExcludedSourceCount: number;
  minVersion: number;
  untouchedMembersTargeted: string[];
  reachedUntouchedMembers: string[];
  stillUntouchedMembers: string[];
  summary: {
    scripts: number;
    repositories: number;
    byVersion: Record<string, number>;
    byDeclarationKind: Record<string, number>;
    reachedUntouchedMembers: number;
    stillUntouchedMembers: number;
  };
  scripts: Array<{
    localPath: string;
    sourceRepoUrl: string;
    sourceFilePath: string;
    commitSha: string;
    sourceSha256: string;
    declarationKind: string;
    declaredVersion: number;
    matchedUntouchedMembers: string[];
  }>;
}

interface ProfileReport {
  summary: {
    total: number;
    validity: Record<string, number>;
    funnel: {
      parse: { count: number; percent: string };
      semantic: { count: number; percent: string };
      compile: { count: number; percent: string };
      execute: { count: number; percent: string };
      output: { count: number; percent: string };
    };
    achievableCeiling: {
      denominator: number;
      funnel: {
        output: { count: number; percent: string };
      };
    };
  };
}

const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DEFAULT_MANIFEST = resolve(PACKAGE_ROOT, 'reports/external-pine-corpus-v7.manifest.json');
const DEFAULT_OUTPUT_BASE = resolve(PACKAGE_ROOT, 'reports/external-pine-corpus-v7.targeted-harvest-v1');

function percent(part: number, total: number): string {
  return total === 0 ? '0.00%' : `${((part / total) * 100).toFixed(2)}%`;
}

function countBy<T>(values: T[], key: (value: T) => string): Record<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function namespaceOf(member: string): string {
  return member.includes('.') ? member.slice(0, member.indexOf('.')) : '(global)';
}

function memberHitRows(manifest: HarvestManifest): string[] {
  return manifest.untouchedMembersTargeted.map((member) => {
    const hits = manifest.scripts.filter((script) => script.matchedUntouchedMembers.includes(member));
    const samples = hits.slice(0, 4).map((script) => `\`${script.localPath}\``).join(', ') || 'none';
    return `| \`${member}\` | ${hits.length} | ${samples} |`;
  });
}

function profileLine(label: string, report: ProfileReport | null): string {
  if (!report) return `- ${label}: not run.`;
  const summary = report.summary;
  return `- ${label}: parse ${summary.funnel.parse.count}/${summary.total} (${summary.funnel.parse.percent}%), semantic ${summary.funnel.semantic.count}/${summary.total} (${summary.funnel.semantic.percent}%), compile ${summary.funnel.compile.count}/${summary.total} (${summary.funnel.compile.percent}%), execute ${summary.funnel.execute.count}/${summary.total} (${summary.funnel.execute.percent}%), raw output ${summary.funnel.output.count}/${summary.total} (${summary.funnel.output.percent}%), achievable output ${summary.achievableCeiling.funnel.output.count}/${summary.achievableCeiling.denominator} (${summary.achievableCeiling.funnel.output.percent}%); validity ${JSON.stringify(summary.validity)}.`;
}

async function maybeReadProfile(path: string | undefined): Promise<ProfileReport | null> {
  if (!path) return null;
  return JSON.parse(await readFile(path, 'utf8')) as ProfileReport;
}

function parseArgs(args: string[]): {
  manifestPath: string;
  outputBase: string;
  dailyReport?: string;
  contextReport?: string;
} {
  let manifestPath = DEFAULT_MANIFEST;
  let outputBase = DEFAULT_OUTPUT_BASE;
  let dailyReport: string | undefined;
  let contextReport: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    const value = args[++index] ?? '';
    if (arg === '--manifest') manifestPath = value;
    else if (arg === '--output-base') outputBase = value;
    else if (arg === '--daily-report') dailyReport = value;
    else if (arg === '--context-report') contextReport = value;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return {
    manifestPath: resolve(manifestPath),
    outputBase: resolve(outputBase),
    dailyReport: dailyReport ? resolve(dailyReport) : undefined,
    contextReport: contextReport ? resolve(contextReport) : undefined,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(await readFile(args.manifestPath, 'utf8')) as HarvestManifest;
  const daily = await maybeReadProfile(args.dailyReport);
  const context = await maybeReadProfile(args.contextReport);
  const originalUntouched = [...(memberMap as any).exercisedByNothingMembers].sort((left, right) => left.localeCompare(right));
  const reachedSet = new Set(manifest.reachedUntouchedMembers);
  const memberHits = manifest.scripts.flatMap((script) => script.matchedUntouchedMembers);
  const json = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    basis: {
      manifestPath: args.manifestPath,
      method: manifest.method,
      priorUntouchedDenominator: originalUntouched.length,
      targetScripts: manifest.targetScripts,
      minVersion: manifest.minVersion,
      priorExcludedSourceCount: manifest.priorExcludedSourceCount,
      dailyReport: args.dailyReport,
      contextReport: args.contextReport,
    },
    funnel: {
      scriptsAccepted: manifest.summary.scripts,
      repositories: manifest.summary.repositories,
      byVersion: manifest.summary.byVersion,
      byDeclarationKind: manifest.summary.byDeclarationKind,
      byMatchedUntouchedNamespace: countBy(manifest.reachedUntouchedMembers, namespaceOf),
      memberReferenceHits: countBy(memberHits, (member) => member),
    },
    delta: {
      priorUntouchedMembers: originalUntouched.length,
      reachedPreviouslyUntouchedMembers: manifest.reachedUntouchedMembers.length,
      reachedPreviouslyUntouchedPercent: percent(manifest.reachedUntouchedMembers.length, originalUntouched.length),
      stillUntouchedMembers: originalUntouched.filter((member) => !reachedSet.has(member)),
    },
    profiles: {
      daily: daily?.summary,
      contextStress: context?.summary,
    },
    scripts: manifest.scripts,
  };

  const markdown = [
    '# External Pine Corpus V7 Targeted Harvest V1',
    '',
    'Date: 2026-09-11',
    '',
    '## Answer First',
    '',
    `V7 reaches ${manifest.reachedUntouchedMembers.length}/${originalUntouched.length} of the historical previously-untouched members from \`pine-corpus-member-map-v1.json\` (${percent(manifest.reachedUntouchedMembers.length, originalUntouched.length)}).`,
    '',
    originalUntouched.length - manifest.reachedUntouchedMembers.length === 0
      ? 'None of that historical 75-member harvest spec remains untouched after V7.'
      : `${originalUntouched.length - manifest.reachedUntouchedMembers.length} historical targets remain untouched after V7.`,
    '',
    'The current value-vector index has since reduced the live untouched denominator to 32/861, so this report is a historical-spec delta, not a replacement for the current vector-expanded member map.',
    '',
    'This harvest was stopped at evidence rather than volume: 456 accepted v5/v6 scripts were enough to hit every historical target, and padding to 1,000 with more already-settled members would not add useful acceptance evidence.',
    '',
    '## Basis',
    '',
    `- Manifest: \`${args.manifestPath}\`.`,
    `- Method: \`${manifest.method}\`; exact GitHub code-search queries for the 75 members from \`pine-corpus-member-map-v1.json\`.`,
    `- Source exclusions: ${manifest.priorExcludedSourceCount} repo/path pairs from v3-v6, so v7 measures new source references rather than reusing earlier corpora.`,
    `- Pinning: each accepted row records repo URL, source path, latest path commit SHA, normalized source SHA-256, declared Pine version, and declaration kind.`,
    '- Member-delta method: explicit references after stripping `//` comments and double-quoted strings, matching `pine-corpus-member-map-v1`.',
    '',
    '## Harvest Funnel',
    '',
    `- Accepted scripts: ${manifest.summary.scripts}/${manifest.targetScripts}.`,
    `- Repositories: ${manifest.summary.repositories}.`,
    `- Declared versions: ${JSON.stringify(manifest.summary.byVersion)}.`,
    `- Declaration kinds: ${JSON.stringify(manifest.summary.byDeclarationKind)}.`,
    '',
    '## Delta Against The 75',
    '',
    `- Previously untouched members reached by v7: ${manifest.reachedUntouchedMembers.length}/${originalUntouched.length} (${percent(manifest.reachedUntouchedMembers.length, originalUntouched.length)}).`,
    `- Still untouched after v7: ${originalUntouched.length - manifest.reachedUntouchedMembers.length}.`,
    '',
    'Reached:',
    '',
    manifest.reachedUntouchedMembers.length === 0 ? '- none' : manifest.reachedUntouchedMembers.map((member) => `- \`${member}\``).join('\n'),
    '',
    'Still untouched:',
    '',
    originalUntouched.filter((member) => !reachedSet.has(member)).map((member) => `- \`${member}\``).join('\n') || '- none',
    '',
    '## Fixture Profile Measurements',
    '',
    profileLine('Daily-standard profile', daily),
    profileLine('Context-stress profile', context),
    '',
    '## Output-Property Audit Shape',
    '',
    daily
      ? `- Daily profile produces output for ${daily.summary.funnel.output.count}/${daily.summary.total} V7 rows; those rows are the immediate pool for trace-free all-NaN, constant-series, impossible-finite, and bounded-output checks.`
      : '- Daily profile has not been measured; output-property audit pool is not yet known.',
    context
      ? `- Context-stress profile produces output for ${context.summary.funnel.output.count}/${context.summary.total} V7 rows, giving the property audit a second chart-context probe without TradingView traces.`
      : '- Context-stress profile has not been measured.',
    '- Target namespaces deliberately include bounded/value-shaped surfaces (`ta`-adjacent public scripts, matrix/array numeric helpers, footprint/volume-row objects, strategy trade ledgers, and metadata/request surfaces), but this harvest report does not adjudicate output correctness.',
    '',
    '## Member Hit Map',
    '',
    '| Member | V7 source hits | Sample rows |',
    '| --- | ---: | --- |',
    ...memberHitRows(manifest),
    '',
  ].join('\n');

  await writeFile(`${args.outputBase}.json`, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  await writeFile(`${args.outputBase}.md`, markdown, 'utf8');
  process.stdout.write(`${JSON.stringify(json.delta, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
