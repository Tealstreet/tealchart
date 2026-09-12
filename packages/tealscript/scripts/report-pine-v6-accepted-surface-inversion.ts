#!/usr/bin/env tsx

import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { PINE_V6_REFERENCE_SIGNATURES, type PineV6ReferenceSignature } from '../src/compat/pineV6BuiltinSignatures.ts';
import {
  committedPineV6BuiltinReferenceNames,
  flattenedAuditGroupNames,
  pineV6ReferenceManualBuiltinNames,
  PINE_V6_REFERENCE_MANUAL_LOCAL_EXTENSION_GROUPS,
} from '../src/compat/pineV6ReferenceManualAudit.ts';
import {
  builtinSignatureMapForCoverage,
  resolvesBuiltinReferenceNameForCoverage,
  type BuiltinSignatureShapeForCoverage,
} from '../src/semantic/checker.ts';

type Verdict = 'matches-manual' | 'labelled-local-extension' | 'needs-compile-evidence' | 'unlabelled-overacceptance-risk';

interface SurfaceRow {
  kind: 'extra-param' | 'extra-alias' | 'callable-without-reference-signature' | 'member-absent-from-manual';
  member: string;
  accepted: string;
  canonical?: string;
  verdict: Verdict;
  evidence: string;
}

const packageRoot = resolve(dirname(dirname(new URL(import.meta.url).pathname)));
const outJson = join(packageRoot, 'reports/pine-v6-accepted-surface-inversion-v1.json');
const outMd = join(packageRoot, 'reports/pine-v6-accepted-surface-inversion-v1.md');

function referenceSignatures(): Record<string, PineV6ReferenceSignature> {
  return Object.fromEntries(
    Object.values(PINE_V6_REFERENCE_SIGNATURES).flatMap((namespace) => Object.entries(namespace)),
  ) as Record<string, PineV6ReferenceSignature>;
}

function documentedParamNames(signature: PineV6ReferenceSignature): Set<string> {
  return new Set([
    ...signature.params,
    ...(signature.overloads?.flatMap((overload) => [...overload]) ?? []),
  ]);
}

function localExtensionReason(name: string): string | undefined {
  for (const group of Object.values(PINE_V6_REFERENCE_MANUAL_LOCAL_EXTENSION_GROUPS)) {
    if ((group.names as readonly string[]).includes(name)) return group.reason;
  }
  return undefined;
}

function classifyMember(name: string, manualNames: Set<string>, localExtensions: Set<string>): { verdict: Verdict; evidence: string } {
  if (manualNames.has(name)) {
    return {
      verdict: 'needs-compile-evidence',
      evidence: 'The member is in the manual index, but has no committed reference signature snapshot to compare accepted parameters against.',
    };
  }
  if (localExtensions.has(name)) {
    return {
      verdict: 'labelled-local-extension',
      evidence: localExtensionReason(name) ?? 'The member is labelled in the local extension allowlist.',
    };
  }
  return {
    verdict: 'needs-compile-evidence',
    evidence: 'The checker accepts this callable member, but it is absent from both the manual index and the labelled local-extension allowlist. Manual absence alone is not evidence that TradingView rejects it.',
  };
}

function auditRows(): SurfaceRow[] {
  const manualNames = new Set(pineV6ReferenceManualBuiltinNames());
  const reference = referenceSignatures();
  const referenceNames = new Set(Object.keys(reference));
  const localExtensions = new Set(flattenedAuditGroupNames(PINE_V6_REFERENCE_MANUAL_LOCAL_EXTENSION_GROUPS));
  const actual = builtinSignatureMapForCoverage({ pineVersion: 6 });
  const rows: SurfaceRow[] = [];

  for (const [member, signature] of Object.entries(actual) as [string, BuiltinSignatureShapeForCoverage][]) {
    const expected = reference[member];
    if (!expected) {
      const classification = classifyMember(member, manualNames, localExtensions);
      rows.push({
        kind: manualNames.has(member) ? 'callable-without-reference-signature' : 'member-absent-from-manual',
        member,
        accepted: member,
        ...classification,
      });
      continue;
    }

    const documented = documentedParamNames(expected);
    for (const param of signature.params) {
      if (documented.has(param)) continue;
      rows.push({
        kind: 'extra-param',
        member,
        accepted: param,
        verdict: 'unlabelled-overacceptance-risk',
        evidence: `The checker accepts parameter '${param}', but the committed v6 reference signature lists ${[...documented].map((name) => `'${name}'`).join(', ')}.`,
      });
    }

    for (const [alias, canonical] of Object.entries(signature.aliases ?? {})) {
      if (documented.has(alias)) continue;
      rows.push({
        kind: 'extra-alias',
        member,
        accepted: alias,
        canonical,
        verdict: 'needs-compile-evidence',
        evidence: `The checker accepts named alias '${alias}' for '${canonical}', but the committed v6 reference signature documents '${canonical}' only.`,
      });
    }
  }

  const committedNonManual = committedPineV6BuiltinReferenceNames()
    .filter((name) => !manualNames.has(name))
    .filter((name) => !Object.hasOwn(actual, name))
    .map<SurfaceRow>((name) => ({
      kind: 'member-absent-from-manual',
      member: name,
      accepted: name,
      verdict: localExtensions.has(name) ? 'labelled-local-extension' : 'unlabelled-overacceptance-risk',
      evidence: localExtensionReason(name)
        ?? (resolvesBuiltinReferenceNameForCoverage(name)
          ? 'The committed inventory and checker coverage resolve this non-manual member, but it is not labelled as a local extension.'
          : 'The committed inventory lists this non-manual member, but checker coverage does not resolve it.'),
    }));

  return [...rows, ...committedNonManual].sort((a, b) =>
    a.verdict.localeCompare(b.verdict)
      || a.kind.localeCompare(b.kind)
      || a.member.localeCompare(b.member)
      || a.accepted.localeCompare(b.accepted),
  );
}

function byVerdict(rows: readonly SurfaceRow[]): Record<Verdict, number> {
  return {
    'matches-manual': 0,
    'labelled-local-extension': rows.filter((row) => row.verdict === 'labelled-local-extension').length,
    'needs-compile-evidence': rows.filter((row) => row.verdict === 'needs-compile-evidence').length,
    'unlabelled-overacceptance-risk': rows.filter((row) => row.verdict === 'unlabelled-overacceptance-risk').length,
  };
}

function renderMarkdown(rows: SurfaceRow[], commit: string): string {
  const counts = byVerdict(rows);
  const referenceCount = Object.keys(referenceSignatures()).length;
  const actualSignatureCount = Object.keys(builtinSignatureMapForCoverage({ pineVersion: 6 })).length;
  const lines = [
    '# Pine v6 Accepted Surface Inversion V1',
    '',
    `Generated at ${new Date().toISOString()}. Measured at commit \`${commit.slice(0, 10)}\`.`,
    '',
    '## Headline',
    '',
    `Compared ${actualSignatureCount} checker-accepted callable signatures and ${referenceCount} committed v6 reference signatures in the over-acceptance direction.`,
    '',
    `- Documented callable signatures with extra accepted parameters: ${rows.filter((row) => row.kind === 'extra-param').length}`,
    `- Accepted named aliases absent from the committed reference signature: ${rows.filter((row) => row.kind === 'extra-alias').length}`,
    `- Accepted callable members without a committed reference signature: ${rows.filter((row) => row.kind === 'callable-without-reference-signature').length}`,
    `- Accepted or committed members absent from the manual index: ${rows.filter((row) => row.kind === 'member-absent-from-manual').length}`,
    '',
    `Verdicts: ${counts['labelled-local-extension']} labelled local extensions, ${counts['needs-compile-evidence']} need compile evidence, ${counts['unlabelled-overacceptance-risk']} unlabelled over-acceptance risks.`,
    '',
    '`iff()` is intentionally absent from the v6 accepted-signature count: the checker still carries the legacy signature for Pine v4, but declared Pine v5/v6 now reject it with the migration diagnostic.',
    '',
    '`matrix.sort:sort_field` exposed this audit\'s population boundary: the comparison catches checker parameters absent from the committed reference snapshot, but it cannot catch a parameter invented inside that snapshot itself. That parameter was removed from both the v6 reference snapshot and checker after external vector-lane evidence that Pine v6 documents `matrix.sort(id, column, order)` only.',
    '',
    'Manual absence alone is not treated as proof that TradingView rejects a form. Rows marked `needs-compile-evidence` are paste-test questions: accepted on TradingView means the manual snapshot is incomplete; rejected means TealScript is over-accepting ordinary Pine source.',
    '',
    '## Unlabelled Over-Acceptance Risks',
    '',
  ];

  const risks = rows.filter((row) => row.verdict === 'unlabelled-overacceptance-risk');
  if (risks.length === 0) lines.push('None.');
  for (const row of risks) lines.push(`- \`${row.member}\`${row.kind === 'extra-param' ? ` parameter \`${row.accepted}\`` : ''}: ${row.evidence}`);

  lines.push('', '## Compile Evidence Questions', '');
  const evidenceRows = rows.filter((row) => row.verdict === 'needs-compile-evidence');
  if (evidenceRows.length === 0) lines.push('None.');
  for (const row of evidenceRows) {
    const accepted = row.kind === 'extra-alias' ? `alias \`${row.accepted}\` -> \`${row.canonical}\`` : `member \`${row.member}\``;
    lines.push(`- \`${row.member}\` ${accepted}: ${row.evidence}`);
  }

  lines.push('', '## Labelled Local Extensions', '');
  const localRows = rows.filter((row) => row.verdict === 'labelled-local-extension');
  if (localRows.length === 0) lines.push('None.');
  for (const row of localRows) lines.push(`- \`${row.member}\`: ${row.evidence}`);

  lines.push('', '## Rows', '', '| Kind | Member | Accepted | Verdict | Evidence |', '| --- | --- | --- | --- | --- |');
  for (const row of rows) {
    const accepted = row.canonical ? `${row.accepted} -> ${row.canonical}` : row.accepted;
    lines.push(`| ${row.kind} | \`${row.member}\` | \`${accepted}\` | ${row.verdict} | ${row.evidence.replaceAll('|', '\\|')} |`);
  }

  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: packageRoot, encoding: 'utf8' }).trim();
  const rows = auditRows();
  await writeFile(outJson, `${JSON.stringify({ generatedAt: new Date().toISOString(), commit, rows }, null, 2)}\n`);
  await writeFile(outMd, renderMarkdown(rows, commit));

  const counts = byVerdict(rows);
  console.log(
    `accepted surface inversion: ${rows.length} rows; ${counts['unlabelled-overacceptance-risk']} unlabelled risks; ${counts['needs-compile-evidence']} need compile evidence; ${counts['labelled-local-extension']} labelled local extensions`,
  );
  if (counts['unlabelled-overacceptance-risk'] > 0) process.exitCode = 1;
}

void main();
