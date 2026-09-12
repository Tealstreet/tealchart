import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { parse } from '../src/parser/parser.ts';
import { PINE_V6_REFERENCE_SIGNATURES } from '../src/compat/pineV6BuiltinSignatures.ts';
import {
  CASES,
  officialMembersForValueVectorCase,
} from './run-pine-value-vectors.ts';

interface CallUse {
  caseId: string;
  member: string;
  positionalCount: number;
  namedParams: string[];
  usedParams: string[];
}

interface SignatureRow {
  member: string;
  params: readonly string[];
  minArgs: number;
  overloads: readonly (readonly string[])[];
}

function flattenSignatures(): Map<string, SignatureRow> {
  const rows = new Map<string, SignatureRow>();
  for (const namespace of Object.values(PINE_V6_REFERENCE_SIGNATURES)) {
    for (const [member, signature] of Object.entries(namespace)) {
      const overloads = signature.overloads
        ? overloadLists(member, signature.params, signature.overloads)
        : [signature.params];
      rows.set(member, {
        member,
        params: signature.params,
        minArgs: signature.minArgs ?? signature.requiredParams?.length ?? 0,
        overloads,
      });
    }
  }
  return rows;
}

function overloadLists(
  member: string,
  params: readonly string[],
  overloads: readonly (readonly string[])[],
): readonly (readonly string[])[] {
  if (member === 'input.int' || member === 'input.float') return overloads;
  return [params, ...overloads];
}

function calleeName(callee: any): string | null {
  if (!callee) return null;
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression') {
    const object = calleeName(callee.object);
    const property = calleeName(callee.property);
    return object && property ? `${object}.${property}` : null;
  }
  return null;
}

function declarationUse(caseId: string, node: any): CallUse | null {
  const member = node.type === 'IndicatorDeclaration'
    ? (node.declarationKind ?? node.sourceDeclarationKind ?? 'indicator')
    : node.type === 'StrategyDeclaration'
      ? 'strategy'
      : null;
  if (!member) return null;

  const usedParams = Object.entries(node)
    .filter(([key, value]) => !['type', 'loc', 'declarationKind', 'sourceDeclarationKind'].includes(key) && value !== null && value !== undefined)
    .map(([key]) => key);
  return {
    caseId,
    member,
    positionalCount: 0,
    namedParams: usedParams,
    usedParams,
  };
}

function callUse(caseId: string, node: any, signatureRows: Map<string, SignatureRow>): CallUse | null {
  if (node.type !== 'CallExpression') return null;
  const member = calleeName(node.callee);
  if (!member || !signatureRows.has(member)) return null;
  const signature = signatureRows.get(member)!;
  const namedParams = node.arguments
    .map((argument: any) => argument.name?.name)
    .filter((name: string | undefined): name is string => Boolean(name));
  const positionalCount = node.arguments.filter((argument: any) => !argument.name).length;
  const usedParams = [
    ...signature.params.slice(0, positionalCount),
    ...namedParams,
  ].filter((value, index, values) => values.indexOf(value) === index);
  return { caseId, member, positionalCount, namedParams, usedParams };
}

function visit(node: any, fn: (node: any) => void): void {
  if (!node || typeof node !== 'object') return;
  fn(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) visit(child, fn);
    } else if (value && typeof value === 'object') {
      visit(value, fn);
    }
  }
}

function extractUses(signatureRows: Map<string, SignatureRow>): { uses: CallUse[]; parseFailures: string[] } {
  const uses: CallUse[] = [];
  const parseFailures: string[] = [];
  for (const testCase of CASES) {
    let ast;
    try {
      ast = parse(testCase.pine);
    } catch {
      parseFailures.push(testCase.id);
      continue;
    }
    visit(ast, (node) => {
      const use = declarationUse(testCase.id, node) ?? callUse(testCase.id, node, signatureRows);
      if (use) uses.push(use);
    });
  }
  return { uses, parseFailures };
}

function requiredParams(signature: SignatureRow): readonly string[] {
  return signature.params.slice(0, signature.minArgs);
}

function optionalParams(signature: SignatureRow): readonly string[] {
  const required = new Set(requiredParams(signature));
  return signature.params.filter((param) => !required.has(param));
}

function useMatchesOverload(use: CallUse, overload: readonly string[], minArgs: number): boolean {
  if (use.positionalCount > overload.length) return false;
  if (!use.namedParams.every((param) => overload.includes(param))) return false;
  const required = overload.slice(0, minArgs);
  if (!required.every((param, index) => index < use.positionalCount || use.namedParams.includes(param))) return false;
  return true;
}

function overloadMinArgs(signature: SignatureRow, overloadIndex: number): number {
  if (signature.member === 'line.new' || signature.member === 'label.new' || signature.member === 'box.new') {
    return overloadIndex === 0 ? signature.minArgs : 2;
  }
  return signature.minArgs;
}

function useDistinguishesOverload(use: CallUse, signature: SignatureRow, overloadIndex: number): boolean {
  const matches = signature.overloads
    .map((overload, index) => ({ overload, index }))
    .filter(({ overload, index }) => useMatchesOverload(use, overload, overloadMinArgs(signature, index)));
  return matches.length === 1 && matches[0]!.index === overloadIndex;
}

function percent(part: number, total: number): string {
  return total === 0 ? '0.00%' : `${((part / total) * 100).toFixed(2)}%`;
}

function byNamespace(members: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const member of members) {
    const namespace = member.includes('.') ? member.slice(0, member.indexOf('.')) : '(global)';
    counts[namespace] = (counts[namespace] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function list(values: readonly string[]): string {
  return values.length === 0 ? '- none' : values.map((value) => `- \`${value}\``).join('\n');
}

export function buildPineValueVectorDepthReport(): { json: unknown; markdown: string } {
  const signatureRows = flattenSignatures();
  const { uses, parseFailures } = extractUses(signatureRows);
  const usesByMember = new Map<string, CallUse[]>();
  for (const use of uses) {
    const list = usesByMember.get(use.member) ?? [];
    list.push(use);
    usesByMember.set(use.member, list);
  }

  const coveredMembers = [...new Set(CASES.flatMap((testCase) => officialMembersForValueVectorCase(testCase)))]
    .filter((member) => signatureRows.has(member))
    .sort((left, right) => left.localeCompare(right));

  const optionalSlots = coveredMembers.flatMap((member) => {
    const signature = signatureRows.get(member)!;
    const memberUses = usesByMember.get(member) ?? [];
    return optionalParams(signature).map((param) => ({
      member,
      param,
      covered: memberUses.some((use) => use.usedParams.includes(param)),
      cases: memberUses.filter((use) => use.usedParams.includes(param)).map((use) => use.caseId),
    }));
  });

  const overloadSlots = coveredMembers.flatMap((member) => {
    const signature = signatureRows.get(member)!;
    if (signature.overloads.length <= 1) return [];
    const memberUses = usesByMember.get(member) ?? [];
    return signature.overloads.map((overload, index) => ({
      member,
      overloadIndex: index,
      params: overload,
      lenientCovered: memberUses.some((use) => useMatchesOverload(use, overload, overloadMinArgs(signature, index))),
      strictCovered: memberUses.some((use) => useDistinguishesOverload(use, signature, index)),
      cases: memberUses
        .filter((use) => useMatchesOverload(use, overload, overloadMinArgs(signature, index)))
        .map((use) => use.caseId),
    }));
  });

  const coveredOptional = optionalSlots.filter((slot) => slot.covered);
  const coveredOverloadsLenient = overloadSlots.filter((slot) => slot.lenientCovered);
  const coveredOverloadsStrict = overloadSlots.filter((slot) => slot.strictCovered);
  const untouchedOptional = optionalSlots.filter((slot) => !slot.covered);
  const untouchedOverloadsStrict = overloadSlots.filter((slot) => !slot.strictCovered);

  const json = {
    schemaVersion: 1,
    basis: {
      coveredCallableMembers: coveredMembers.length,
      vectorCases: CASES.length,
      parseSkippedCases: parseFailures,
      note: 'Overload coverage is strict when a call uniquely selects that overload; lenient coverage means at least one call is compatible with it. Optional argument coverage is by member:param slot, reached by positional or named use.',
    },
    headline: {
      overloadRows: overloadSlots.length,
      overloadRowsCoveredLenient: coveredOverloadsLenient.length,
      overloadRowsCoveredLenientPercent: percent(coveredOverloadsLenient.length, overloadSlots.length),
      overloadRowsCoveredStrict: coveredOverloadsStrict.length,
      overloadRowsCoveredStrictPercent: percent(coveredOverloadsStrict.length, overloadSlots.length),
      optionalArgumentSlots: optionalSlots.length,
      optionalArgumentSlotsCovered: coveredOptional.length,
      optionalArgumentSlotsCoveredPercent: percent(coveredOptional.length, optionalSlots.length),
      optionalArgumentSlotsUntouched: untouchedOptional.length,
    },
    byNamespace: {
      optionalSlots: byNamespace(optionalSlots.map((slot) => `${slot.member}.${slot.param}`)),
      untouchedOptionalSlots: byNamespace(untouchedOptional.map((slot) => `${slot.member}.${slot.param}`)),
      overloadRows: byNamespace(overloadSlots.map((slot) => slot.member)),
      untouchedStrictOverloadRows: byNamespace(untouchedOverloadsStrict.map((slot) => slot.member)),
    },
    untouchedOptionalSlots: untouchedOptional,
    overloadRows: overloadSlots,
  };

  const markdown = [
    '# Pine Value Vector Depth Coverage V1',
    '',
    '## Basis',
    '',
    '- Source cases: `packages/tealscript/scripts/run-pine-value-vectors.ts` at current HEAD.',
    '- Signature source: `packages/tealscript/src/compat/pineV6BuiltinSignatures.ts`.',
    '- Scope: official members already covered by at least one value-vector case and present in the committed signature table.',
    '- Overload coverage is strict when a call uniquely selects that overload; lenient coverage means at least one call is compatible with it.',
    '- Optional argument coverage is by `member:param` slot, reached by either positional or named use.',
    '',
    '## Headline',
    '',
    `- Covered callable members measured for depth: ${coveredMembers.length}.`,
    `- Parse-skipped vector cases: ${parseFailures.length}${parseFailures.length ? ` (${parseFailures.map((id) => `\`${id}\``).join(', ')})` : ''}.`,
    `- Documented overload rows: ${overloadSlots.length}; lenient covered ${coveredOverloadsLenient.length}/${overloadSlots.length} (${percent(coveredOverloadsLenient.length, overloadSlots.length)}); strict covered ${coveredOverloadsStrict.length}/${overloadSlots.length} (${percent(coveredOverloadsStrict.length, overloadSlots.length)}).`,
    `- Documented optional argument slots: ${coveredOptional.length}/${optionalSlots.length} covered (${percent(coveredOptional.length, optionalSlots.length)}); ${untouchedOptional.length} untouched.`,
    '',
    '## Untouched Optional Argument Slots By Namespace',
    '',
    '| Namespace | Untouched optional slots |',
    '| --- | ---: |',
    ...Object.entries(byNamespace(untouchedOptional.map((slot) => `${slot.member}.${slot.param}`)))
      .map(([namespace, count]) => `| \`${namespace}\` | ${count} |`),
    '',
    '## Untouched Strict Overload Rows',
    '',
    list(untouchedOverloadsStrict.map((slot) => `${slot.member}#${slot.overloadIndex + 1}(${slot.params.join(', ')})`)),
    '',
    '## Untouched Optional Argument Slots',
    '',
    list(untouchedOptional.map((slot) => `${slot.member}:${slot.param}`)),
    '',
  ].join('\n');

  return { json, markdown };
}

async function main(): Promise<void> {
  const outputBase = process.argv[2] ?? 'packages/tealscript/reports/pine-value-vector-depth-v1';
  const { json, markdown } = buildPineValueVectorDepthReport();
  await mkdir(dirname(outputBase), { recursive: true });
  await writeFile(`${outputBase}.json`, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  await writeFile(`${outputBase}.md`, markdown, 'utf8');
  process.stdout.write(`${JSON.stringify((json as { headline: unknown }).headline, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
